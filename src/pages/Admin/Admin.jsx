import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api/index.js';
import { useToast } from '../../components/Toast/Toast.jsx';
import Modal from '../../components/Modal/Modal.jsx';
import { SkeletonCard, SkeletonText } from '../../components/Skeleton/Skeleton.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import OutcomeBadge from '../../components/OutcomeBadge/OutcomeBadge.jsx';
import TagList from '../../components/TagList/TagList.jsx';
import Avatar from '../../components/Avatar/Avatar.jsx';
import StatsCard from '../../components/StatsCard/StatsCard.jsx';
import AdminTable from '../../components/AdminTable/AdminTable.jsx';
import Pagination from '../../components/Pagination/Pagination.jsx';
import { Icon } from '../../utils/icons.jsx';
import { formatDate, timeAgo } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import '../Login/Login.css';
import './Admin.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'chart' },
  { id: 'moderation', label: 'Moderation', icon: 'shield' },
  { id: 'reports', label: 'Reports', icon: 'flag' },
  { id: 'users', label: 'Users', icon: 'user' },
  { id: 'categories', label: 'Categories', icon: 'folder' },
  { id: 'ai-review', label: 'AI Review', icon: 'sparkles' },
  { id: 'analytics', label: 'Analytics', icon: 'trending' },
];

const toArray = (res) => res?.data || res?.items || res || [];

function getLastSixMonths() {
  const names = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    names.push(d.toLocaleString('en', { month: 'short' }));
  }
  return names;
}

function hasAiStructure(exp) {
  return Boolean(exp?.aiStructured || exp?.ai_structured || exp?.metadata?.aiStructured);
}

function structuredSummary(exp) {
  return exp?.aiSummary || exp?.ai_summary || exp?.metadata?.aiSummary || '';
}

function structuredFields(exp) {
  const fields = exp?.aiStructuredData || exp?.metadata?.aiStructuredData;
  if (fields && typeof fields === 'object' && !Array.isArray(fields)) return fields;
  return null;
}

const initialTabState = () => ({ data: null, loading: false, error: '' });

export default function Admin() {
  useDocumentTitle('Admin Dashboard — DEADEND');
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [store, setStore] = useState({
    overview: initialTabState(),
    moderation: initialTabState(),
    reports: initialTabState(),
    users: initialTabState(),
    categories: initialTabState(),
    'ai-review': initialTabState(),
    analytics: initialTabState(),
  });

  // Modals
  const [viewExp, setViewExp] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [categoryModal, setCategoryModal] = useState(null); // { mode: 'create' | 'edit', category? }
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [savingCategory, setSavingCategory] = useState(false);
  const [aiEdit, setAiEdit] = useState(null);
  const [aiEditForm, setAiEditForm] = useState({ summary: '', tags: '' });
  const [userPage, setUserPage] = useState(1);

  const loadTab = useCallback(async (tab, force = false) => {
    let shouldLoad = false;
    setStore((s) => {
      if (!force && (s[tab].data !== null || s[tab].loading)) return s;
      shouldLoad = true;
      return { ...s, [tab]: { data: null, loading: true, error: '' } };
    });
    if (!shouldLoad) return;

    try {
      let data;
      switch (tab) {
        case 'overview':
          data = await api.adminOverview();
          break;
        case 'moderation':
          data = toArray(await api.adminQueue());
          break;
        case 'reports':
          data = toArray(await api.adminReports());
          break;
        case 'users':
          data = toArray(await api.adminUsers());
          break;
        case 'categories':
          data = toArray(await api.adminCategories());
          break;
        case 'ai-review': {
          const res = await api.listExperiences({ filters: {}, sort: 'recent', page: 1, perPage: 50 });
          data = toArray(res).filter(hasAiStructure);
          break;
        }
        case 'analytics':
          data = await api.adminAnalytics();
          break;
        default:
          data = null;
      }
      setStore((s) => ({ ...s, [tab]: { data, loading: false, error: '' } }));
    } catch (err) {
      setStore((s) => ({
        ...s,
        [tab]: { data: null, loading: false, error: err?.message || 'Failed to load. Please try again.' },
      }));
    }
  }, []);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  // Preload queue + reports so Overview can build recent activity.
  useEffect(() => {
    if (activeTab === 'overview') {
      loadTab('moderation');
      loadTab('reports');
    }
  }, [activeTab, loadTab]);

  const tab = (id) => store[id];
  const pendingCount = useMemo(() => (tab('moderation').data || []).length, [store]);
  const openReportsCount = useMemo(
    () => (tab('reports').data || []).filter((r) => r.status !== 'resolved').length,
    [store]
  );

  /* ---------- Moderation actions ---------- */
  const refreshAfterMod = () => {
    loadTab('moderation', true);
    loadTab('overview', true);
    loadTab('ai-review', true);
  };

  const handleApprove = async (id) => {
    try {
      await api.adminApprove(id);
      toast.success('Experience approved and published.');
      refreshAfterMod();
    } catch (err) {
      toast.error(err?.message || 'Could not approve the experience.');
    }
  };

  const openReject = (exp) => {
    setRejectTarget(exp);
    setRejectNote('');
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await api.adminReject(rejectTarget.id, rejectNote.trim());
      toast.success('Experience rejected.');
      setRejectTarget(null);
      setViewExp(null);
      refreshAfterMod();
    } catch (err) {
      toast.error(err?.message || 'Could not reject the experience.');
    } finally {
      setRejecting(false);
    }
  };

  /* ---------- Reports actions ---------- */
  const handleResolveReport = (id, action) => {
    if (action === 'remove') {
      setRemoveTarget(id);
      return;
    }
    doResolve(id, 'dismiss');
  };

  const doResolve = async (id, action) => {
    if (action === 'remove') setRemoving(true);
    try {
      await api.resolveReport(id, action);
      toast.success(action === 'remove' ? 'Content removed.' : 'Report dismissed.');
      setRemoveTarget(null);
      loadTab('reports', true);
      loadTab('overview', true);
    } catch (err) {
      toast.error(err?.message || 'Could not resolve the report.');
    } finally {
      if (action === 'remove') setRemoving(false);
    }
  };

  /* ---------- Users actions ---------- */
  const handleSuspend = async (user, suspend) => {
    try {
      await api.suspendUser(user.id, suspend);
      toast.success(suspend ? `${user.name || 'User'} suspended.` : `${user.name || 'User'} reinstated.`);
      loadTab('users', true);
    } catch (err) {
      toast.error(err?.message || 'Could not update the user.');
    }
  };

  /* ---------- Categories actions ---------- */
  const openCategoryModal = (mode, category = null) => {
    setCategoryModal({ mode, category });
    setCategoryForm({
      name: category?.name || '',
      description: category?.description || '',
    });
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required.');
      return;
    }
    setSavingCategory(true);
    try {
      if (categoryModal.mode === 'edit') {
        await api.updateCategory(categoryModal.category.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
        });
        toast.success('Category updated.');
      } else {
        await api.createCategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
        });
        toast.success('Category created.');
      }
      setCategoryModal(null);
      loadTab('categories', true);
    } catch (err) {
      toast.error(err?.message || 'Could not save the category.');
    } finally {
      setSavingCategory(false);
    }
  };

  /* ---------- AI review actions ---------- */
  const openAiEdit = (exp) => {
    setAiEdit(exp);
    setAiEditForm({
      summary: structuredSummary(exp),
      tags: (exp.tags || []).join(', '),
    });
  };

  const handleAiEditSave = () => {
    // Demo: metadata edits are applied locally; approvals/rejections go through the API.
    setStore((s) => ({
      ...s,
      'ai-review': {
        ...s['ai-review'],
        data: (s['ai-review'].data || []).map((exp) =>
          exp.id === aiEdit.id
            ? {
                ...exp,
                aiSummary: aiEditForm.summary,
                tags: aiEditForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
              }
            : exp
        ),
      },
    }));
    setAiEdit(null);
    toast.success('Metadata updated.');
  };

  /* ---------- Derived data ---------- */
  const recentActivity = useMemo(() => {
    const items = [];
    (tab('moderation').data || []).slice(0, 4).forEach((q) =>
      items.push({
        icon: 'doc',
        text: `${q.author?.name || 'Someone'} submitted "${q.title || 'Untitled'}"`,
        time: q.createdAt || q.submittedAt,
      })
    );
    (tab('reports').data || [])
      .filter((r) => r.status !== 'resolved')
      .slice(0, 4)
      .forEach((r) =>
        items.push({
          icon: 'flag',
          text: `Report filed: ${r.reason || 'no reason given'} on ${r.targetType || 'content'}`,
          time: r.createdAt,
        })
      );
    return items
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
      .slice(0, 6);
  }, [store]);

  const userColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'User',
        render: (u) => (
          <span className="admin-usercell">
            <Avatar name={u.name || u.email} />
            <span>{u.name || 'Unnamed'}</span>
          </span>
        ),
      },
      { key: 'email', header: 'Email', render: (u) => <span className="admin-muted">{u.email}</span> },
      {
        key: 'role',
        label: 'Role',
        render: (u) => <span className={`pill ${u.role === 'admin' ? 'pill-accent' : 'pill-neutral'}`}>{u.role}</span>,
      },
      { key: 'experiences', header: 'Experiences', render: (u) => u.experiences ?? 0 },
      {
        key: 'status',
        label: 'Status',
        render: (u) => (
          <span className={`pill ${u.status === 'suspended' ? 'pill-danger' : 'pill-success'}`}>
            {u.status === 'suspended' ? 'Suspended' : 'Active'}
          </span>
        ),
      },
      {
        key: 'joined',
        label: 'Joined',
        render: (u) => <span className="admin-muted">{u.joinedAt ? formatDate(u.joinedAt) : '—'}</span>,
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (u) =>
          u.status === 'suspended' ? (
            <button type="button" className="btn-small btn-small-success" onClick={() => handleSuspend(u, false)}>
              Unsuspend
            </button>
          ) : (
            <button type="button" className="btn-small btn-small-danger" onClick={() => handleSuspend(u, true)}>
              Suspend
            </button>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const usersPerPage = 10;
  const usersData = tab('users').data || [];
  const userTotalPages = Math.max(1, Math.ceil(usersData.length / usersPerPage));
  const pagedUsers = usersData.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

  const analytics = tab('analytics').data;
  const signups = analytics?.signupsByMonth || [];
  const outcomeData = analytics?.experiencesByOutcome || {};
  const topCategories = analytics?.topCategories || [];
  const outcomeTotal = Object.values(outcomeData).reduce((a, b) => a + (Number(b) || 0), 0);
  const maxSignups = Math.max(1, ...signups.map(Number));
  const maxCategory = Math.max(1, ...topCategories.map((c) => Number(c.count) || 0));

  const renderTabBody = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'moderation':
        return renderModeration();
      case 'reports':
        return renderReports();
      case 'users':
        return renderUsers();
      case 'categories':
        return renderCategories();
      case 'ai-review':
        return renderAiReview();
      case 'analytics':
        return renderAnalytics();
      default:
        return null;
    }
  };

  /* ================= OVERVIEW ================= */
  const renderOverview = () => {
    const { data, loading, error } = tab('overview');
    if (loading) {
      return (
        <div className="stat-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState title="Could not load overview" body={error} onRetry={() => loadTab('overview', true)} />;
    }
    const stats = data || {};
    const cards = [
      { label: 'Users', value: stats.users ?? 0, icon: 'user', hint: 'Total registered' },
      { label: 'Experiences', value: stats.experiences ?? 0, icon: 'doc', hint: 'Published' },
      { label: 'Decisions', value: stats.decisions ?? 0, icon: 'target', hint: 'Recorded' },
      { label: 'Pending moderation', value: stats.pending ?? 0, icon: 'shield', hint: 'Awaiting review' },
      { label: 'Reports', value: stats.reports ?? 0, icon: 'flag', hint: 'Open reports' },
      { label: 'Comments', value: stats.comments ?? 0, icon: 'message', hint: 'All time' },
    ];
    return (
      <>
        <div className="stat-grid">
          {cards.map((c) => (
            <StatsCard key={c.label} label={c.label} value={c.value} icon={c.icon} suffix={c.hint} />
          ))}
        </div>
        <div className="admin-panel">
          <h2 className="admin-panel-title">Recent activity</h2>
          {tab('moderation').loading || tab('reports').loading ? (
            <SkeletonText lines={4} />
          ) : recentActivity.length === 0 ? (
            <EmptyState icon="check" title="Nothing yet" body="Activity will appear here as submissions and reports come in." />
          ) : (
            <ul className="activity-list">
              {recentActivity.map((a, i) => (
                <li key={i} className="activity-item">
                  <span className="activity-icon"><Icon name={a.icon} /></span>
                  <span className="activity-text">{a.text}</span>
                  {a.time && <span className="activity-time">{timeAgo(a.time)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  };

  /* ================= MODERATION ================= */
  const renderModeration = () => {
    const { data, loading, error } = tab('moderation');
    if (loading) {
      return (
        <div className="admin-stack">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState title="Could not load moderation queue" body={error} onRetry={() => loadTab('moderation', true)} />;
    }
    if (!data || data.length === 0) {
      return <EmptyState icon="check" title="Queue is clear" body="No experiences are waiting for review right now." />;
    }
    return (
      <div className="admin-panel admin-panel-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>Outcome</th>
              <th>Submitted</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((exp) => (
              <tr key={exp.id}>
                <td className="admin-title-cell">{exp.title || 'Untitled'}</td>
                <td>
                  <span className="admin-usercell">
                    <Avatar name={exp.author?.name} />
                    <span>{exp.author?.name || 'Anonymous'}</span>
                  </span>
                </td>
                <td><span className="admin-muted">{exp.category?.name || exp.category || '—'}</span></td>
                <td>{exp.outcome ? <OutcomeBadge outcome={exp.outcome} /> : <span className="admin-muted">—</span>}</td>
                <td><span className="admin-muted">{exp.createdAt ? timeAgo(exp.createdAt) : '—'}</span></td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="btn-small" onClick={() => setViewExp(exp)}>
                      <Icon name="eye" /> View
                    </button>
                    <button type="button" className="btn-small btn-small-success" onClick={() => handleApprove(exp.id)}>
                      <Icon name="check" /> Approve
                    </button>
                    <button type="button" className="btn-small btn-small-danger" onClick={() => openReject(exp)}>
                      <Icon name="x" /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /* ================= REPORTS ================= */
  const renderReports = () => {
    const { data, loading, error } = tab('reports');
    if (loading) {
      return (
        <div className="admin-stack">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState title="Could not load reports" body={error} onRetry={() => loadTab('reports', true)} />;
    }
    const open = (data || []).filter((r) => r.status !== 'resolved');
    if (open.length === 0) {
      return <EmptyState icon="check" title="No open reports" body="All reports have been resolved." />;
    }
    return (
      <div className="admin-panel admin-panel-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Reason</th>
              <th>Reporter</th>
              <th>Date</th>
              <th className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {open.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="admin-target">{r.targetType || 'content'} #{r.targetId}</span>
                </td>
                <td className="admin-reason">{r.reason || 'No reason given'}</td>
                <td><span className="admin-muted">{r.reportedBy?.name || r.reportedBy || '—'}</span></td>
                <td><span className="admin-muted">{r.createdAt ? timeAgo(r.createdAt) : '—'}</span></td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="btn-small" onClick={() => handleResolveReport(r.id, 'dismiss')}>
                      Dismiss
                    </button>
                    <button type="button" className="btn-small btn-small-danger" onClick={() => handleResolveReport(r.id, 'remove')}>
                      <Icon name="trash" /> Remove content
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /* ================= USERS ================= */
  const renderUsers = () => {
    const { loading, error } = tab('users');
    if (loading) {
      return (
        <div className="admin-stack">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState title="Could not load users" body={error} onRetry={() => loadTab('users', true)} />;
    }
    if (usersData.length === 0) {
      return <EmptyState icon="user" title="No users" body="No registered users found." />;
    }
    return (
      <div className="admin-panel">
        <AdminTable columns={userColumns} rows={pagedUsers} emptyText="No users found." />
        {userTotalPages > 1 && (
          <div className="admin-pagination">
            <Pagination page={userPage} totalPages={userTotalPages} onChange={setUserPage} />
          </div>
        )}
      </div>
    );
  };

  /* ================= CATEGORIES ================= */
  const renderCategories = () => {
    const { data, loading, error } = tab('categories');
    if (loading) {
      return (
        <div className="admin-stack">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState title="Could not load categories" body={error} onRetry={() => loadTab('categories', true)} />;
    }
    return (
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2 className="admin-panel-title">Categories</h2>
          <button type="button" className="btn-small btn-small-primary" onClick={() => openCategoryModal('create')}>
            <Icon name="plus" /> New category
          </button>
        </div>
        {!data || data.length === 0 ? (
          <EmptyState icon="folder" title="No categories" body="Create the first category to organize experiences." />
        ) : (
          <ul className="category-list">
            {data.map((cat) => (
              <li key={cat.id} className="category-row">
                <span className="category-icon"><Icon name="folder" /></span>
                <div className="category-info">
                  <span className="category-name">{cat.name}</span>
                  {cat.description && <span className="category-desc">{cat.description}</span>}
                </div>
                {typeof cat.count === 'number' && <span className="pill pill-neutral">{cat.count}</span>}
                <button type="button" className="btn-small" onClick={() => openCategoryModal('edit', cat)}>
                  <Icon name="edit" /> Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  /* ================= AI REVIEW ================= */
  const renderAiReview = () => {
    const { data, loading, error } = tab('ai-review');
    if (loading) {
      return (
        <div className="admin-stack">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState title="Could not load AI-reviewed experiences" body={error} onRetry={() => loadTab('ai-review', true)} />;
    }
    if (!data || data.length === 0) {
      return (
        <EmptyState
          icon="sparkles"
          title="Nothing to review"
          body="No experiences with AI-structured metadata are waiting. AI-assisted structuring labels appear here for human verification."
        />
      );
    }
    return (
      <div className="admin-stack">
        {data.map((exp) => {
          const fields = structuredFields(exp);
          const summary = structuredSummary(exp);
          return (
            <article key={exp.id} className="ai-card">
              <div className="ai-card-head">
                <div>
                  <h3 className="ai-card-title">{exp.title || 'Untitled'}</h3>
                  <p className="ai-card-meta">
                    {exp.author?.name || 'Anonymous'} · {exp.createdAt ? timeAgo(exp.createdAt) : '—'}
                  </p>
                </div>
                <span className="pill pill-accent"><Icon name="sparkles" /> AI structured</span>
              </div>

              {exp.tags?.length > 0 && <TagList tags={exp.tags} />}

              <div className="ai-summary">
                <p className="ai-summary-label">Structured summary</p>
                {fields ? (
                  <dl className="ai-fields">
                    {Object.entries(fields).map(([k, v]) => (
                      <div key={k} className="ai-field">
                        <dt>{k}</dt>
                        <dd>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="ai-summary-text">{summary || 'No summary available.'}</p>
                )}
              </div>

              <div className="admin-actions ai-card-actions">
                <button type="button" className="btn-small btn-small-success" onClick={() => handleApprove(exp.id)}>
                  <Icon name="check" /> Approve
                </button>
                <button type="button" className="btn-small" onClick={() => openAiEdit(exp)}>
                  <Icon name="edit" /> Edit metadata
                </button>
                <button type="button" className="btn-small btn-small-danger" onClick={() => openReject(exp)}>
                  <Icon name="x" /> Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  /* ================= ANALYTICS ================= */
  const renderAnalytics = () => {
    const { loading, error } = tab('analytics');
    if (loading) {
      return (
        <div className="admin-stack">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }
    if (error) {
      return <ErrorState title="Could not load analytics" body={error} onRetry={() => loadTab('analytics', true)} />;
    }
    if (!analytics) {
      return <EmptyState icon="trending" title="No analytics" body="Analytics data is not available yet." />;
    }
    const months = getLastSixMonths();
    return (
      <div className="analytics-grid">
        <div className="admin-panel">
          <h2 className="admin-panel-title">Signups — last 6 months</h2>
          {signups.length === 0 ? (
            <EmptyState icon="trending" title="No signup data" body="Signup history is not available yet." />
          ) : (
            <div className="bar-chart">
              {signups.map((value, i) => (
                <div key={months[i]} className="bar-col">
                  <span className="bar-value">{Number(value) || 0}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${((Number(value) || 0) / maxSignups) * 100}%` }}
                    />
                  </div>
                  <span className="bar-label">{months[i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-panel">
          <h2 className="admin-panel-title">Experiences by outcome</h2>
          {outcomeTotal === 0 ? (
            <EmptyState icon="chart" title="No outcome data" body="Outcomes will appear here once experiences are recorded." />
          ) : (
            <div className="hbar-list">
              {Object.entries(outcomeData).map(([outcome, count]) => {
                const n = Number(count) || 0;
                const pct = outcomeTotal > 0 ? Math.round((n / outcomeTotal) * 100) : 0;
                const label = outcome.replace(/_/g, ' ');
                return (
                  <div key={outcome} className="hbar-row">
                    <span className="hbar-label">{label}</span>
                    <div className="hbar-track">
                      <div className="hbar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="hbar-value">{n} · {pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="admin-panel">
          <h2 className="admin-panel-title">Top categories</h2>
          {topCategories.length === 0 ? (
            <EmptyState icon="folder" title="No category data" body="Category usage will appear here." />
          ) : (
            <div className="hbar-list">
              {topCategories.map((c) => {
                const n = Number(c.count) || 0;
                return (
                  <div key={c.name} className="hbar-row">
                    <span className="hbar-label">{c.name}</span>
                    <div className="hbar-track">
                      <div
                        className="hbar-fill hbar-fill-accent"
                        style={{ width: `${maxCategory > 0 ? (n / maxCategory) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="hbar-value">{n}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ================= RENDER ================= */
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-sub">Moderate content, manage users, and keep the knowledge clean.</p>
        </div>
      </header>

      <nav className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`admin-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <Icon name={t.icon} />
            <span>{t.label}</span>
            {t.id === 'moderation' && pendingCount > 0 && (
              <span className="tab-badge">{pendingCount}</span>
            )}
            {t.id === 'reports' && openReportsCount > 0 && (
              <span className="tab-badge tab-badge-danger">{openReportsCount}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="admin-main">{renderTabBody()}</main>

      {/* View submission modal */}
      <Modal open={!!viewExp} onClose={() => setViewExp(null)} title="Review submission">
        {viewExp && (
          <div className="modal-body">
            <h3 className="modal-exp-title">{viewExp.title || 'Untitled'}</h3>
            <p className="modal-exp-meta">
              {viewExp.author?.name || 'Anonymous'} · {viewExp.category?.name || viewExp.category || '—'} ·{' '}
              {viewExp.createdAt ? timeAgo(viewExp.createdAt) : '—'}
            </p>
            {viewExp.outcome && <OutcomeBadge outcome={viewExp.outcome} />}
            {viewExp.summary && <p className="modal-exp-text">{viewExp.summary}</p>}
            {viewExp.body && <p className="modal-exp-text">{viewExp.body}</p>}
            {viewExp.tags?.length > 0 && <TagList tags={viewExp.tags} />}
            <div className="modal-actions">
              <button type="button" className="btn-small btn-small-success" onClick={() => handleApprove(viewExp.id)}>
                <Icon name="check" /> Approve
              </button>
              <button type="button" className="btn-small btn-small-danger" onClick={() => openReject(viewExp)}>
                <Icon name="x" /> Reject
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject experience">
        <div className="modal-body">
          <p className="modal-note">
            Rejecting <strong>{rejectTarget?.title || 'this experience'}</strong>. Add a note for
            the author (optional, but recommended).
          </p>
          <label className="field">
            <span className="field-label">Rejection note</span>
            <textarea
              className="input modal-textarea"
              rows={4}
              placeholder="Why is this being rejected? What could the author improve?"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setRejectTarget(null)}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={handleReject} disabled={rejecting}>
              {rejecting ? 'Rejecting…' : 'Reject experience'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Remove content confirm modal */}
      <Modal open={removeTarget !== null} onClose={() => setRemoveTarget(null)} title="Remove content">
        <div className="modal-body">
          <p className="modal-note">
            This will remove the reported content and resolve the report. This action cannot
            be undone from here.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={() => doResolve(removeTarget, 'remove')} disabled={removing}>
              {removing ? 'Removing…' : 'Remove content'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Category create/edit modal */}
      <Modal
        open={!!categoryModal}
        onClose={() => setCategoryModal(null)}
        title={categoryModal?.mode === 'edit' ? 'Edit category' : 'New category'}
      >
        <div className="modal-body">
          <label className="field">
            <span className="field-label">Name</span>
            <input
              type="text"
              className="input"
              placeholder="e.g. Career"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              className="input modal-textarea"
              rows={3}
              placeholder="What kinds of experiences belong here?"
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setCategoryModal(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSaveCategory} disabled={savingCategory}>
              {savingCategory ? 'Saving…' : categoryModal?.mode === 'edit' ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </div>
      </Modal>

      {/* AI metadata edit modal */}
      <Modal open={!!aiEdit} onClose={() => setAiEdit(null)} title="Edit structured metadata">
        <div className="modal-body">
          <p className="modal-note">
            Adjust the AI-generated summary and tags for <strong>{aiEdit?.title || 'this experience'}</strong>.
            The original submission is never altered.
          </p>
          <label className="field">
            <span className="field-label">Structured summary</span>
            <textarea
              className="input modal-textarea"
              rows={5}
              value={aiEditForm.summary}
              onChange={(e) => setAiEditForm((f) => ({ ...f, summary: e.target.value }))}
            />
          </label>
          <label className="field">
            <span className="field-label">Tags (comma separated)</span>
            <input
              type="text"
              className="input"
              value={aiEditForm.tags}
              onChange={(e) => setAiEditForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={() => setAiEdit(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleAiEditSave}>
              Save metadata
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

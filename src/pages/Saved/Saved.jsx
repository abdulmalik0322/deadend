import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import { useToast } from '../../components/Toast/Toast.jsx';
import { SkeletonCard } from '../../components/Skeleton/Skeleton.jsx';
import EmptyState from '../../components/EmptyState/EmptyState.jsx';
import ErrorState from '../../components/ErrorState/ErrorState.jsx';
import ExperienceCard from '../../components/ExperienceCard/ExperienceCard.jsx';
import FolderList from '../../components/FolderList/FolderList.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import './Saved.css';

export default function Saved() {
  useDocumentTitle('Saved · DEADEND');
  const revealRef = useReveal();
  const { toast } = useToast();

  const [folders, setFolders] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const loadFolders = useCallback(async () => {
    try {
      const data = await api.listFolders();
      setFolders(Array.isArray(data) ? data : data?.folders ?? []);
    } catch {
      // Folders are a convenience — the grid still works without them.
    }
  }, []);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSaved({
        folderId: activeFolderId,
        q: debouncedQuery || undefined,
      });
      setItems(Array.isArray(data) ? data : data?.items ?? []);
    } catch (err) {
      setError(err?.message || 'Could not load your saved experiences.');
    } finally {
      setLoading(false);
    }
  }, [activeFolderId, debouncedQuery]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const handleCreateFolder = async (name) => {
    try {
      await api.createFolder(name);
      toast.success(`Folder “${name}” created.`);
      loadFolders();
    } catch (err) {
      toast.error(err?.message || 'Could not create the folder.');
    }
  };

  const handleRenameFolder = async (id, name) => {
    try {
      await api.updateFolder(id, name);
      toast.success('Folder renamed.');
      loadFolders();
    } catch (err) {
      toast.error(err?.message || 'Could not rename the folder.');
    }
  };

  const handleDeleteFolder = async (id) => {
    try {
      await api.deleteFolder(id);
      toast.success('Folder deleted.');
      if (activeFolderId === id) setActiveFolderId(null);
      loadFolders();
      loadSaved();
    } catch (err) {
      toast.error(err?.message || 'Could not delete the folder.');
    }
  };

  return (
    <div ref={revealRef} className="page saved-page">
      <header className="page-head">
        <h1 className="page-title">Saved</h1>
        <p className="page-sub">
          The experiences you bookmarked — organized into folders, searchable, always here.
        </p>
      </header>

      <div className="saved-layout">
        <FolderList
          folders={folders}
          activeId={activeFolderId}
          onSelect={setActiveFolderId}
          onCreate={handleCreateFolder}
          onRename={handleRenameFolder}
          onDelete={handleDeleteFolder}
        />

        <main className="saved-main">
          <div className="saved-search">
            <Icon name="search" />
            <input
              className="input"
              type="text"
              placeholder="Search saved experiences…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search saved experiences"
            />
            {query && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <Icon name="x" />
              </button>
            )}
          </div>

          <div className="saved-grid-zone" aria-live="polite">
            {loading && (
              <div className="saved-grid">
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {!loading && error && (
              <ErrorState
                title="Saved failed to load"
                body={error}
                onRetry={loadSaved}
              />
            )}

            {!loading && !error && items.length === 0 && (
              <EmptyState
                icon="bookmark"
                title="No saved experiences yet."
                body="When you save an experience, it will live here — organized in folders and searchable."
              />
            )}

            {!loading && !error && items.length > 0 && (
              <div className="saved-grid">
                {items.map((e) => (
                  <ExperienceCard key={e.id} experience={e} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

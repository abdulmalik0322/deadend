import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api/index.js';
import { Icon } from '../../utils/icons.jsx';
import SearchBar from '../../components/SearchBar/SearchBar.jsx';
import ExperienceCard from '../../components/ExperienceCard/ExperienceCard.jsx';
import SimilarityCard from '../../components/SimilarityCard/SimilarityCard.jsx';
import { SkeletonCard, SkeletonText } from '../../components/Skeleton/Skeleton.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal, useCountUp } from '../../hooks/useReveal.js';
import './Home.css';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function RevealSection({ id, className = '', children }) {
  const ref = useReveal();
  return (
    <section id={id} ref={ref} className={`reveal home-section ${className}`.trim()}>
      <div className="home-wrap">{children}</div>
    </section>
  );
}

function SectionHead({ eyebrow, title, sub, center = true }) {
  return (
    <div className={`section-head${center ? ' is-center' : ''}`}>
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <h2 className="section-title">{title}</h2>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  );
}

function Stat({ icon, value, label }) {
  const count = useCountUp(value || 0);
  return (
    <div className="stat-card">
      <span className="stat-card__icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="stat-card__value">{Math.round(count).toLocaleString()}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}

/* Hero background: node-link network (no blobs) */
const NET_NODES = [
  { x: 60, y: 120 }, { x: 180, y: 60 }, { x: 320, y: 140 }, { x: 460, y: 70 },
  { x: 600, y: 150 }, { x: 740, y: 80 }, { x: 880, y: 150 }, { x: 1020, y: 90 },
  { x: 1140, y: 170 }, { x: 140, y: 270 }, { x: 300, y: 330 }, { x: 480, y: 280 },
  { x: 660, y: 350 }, { x: 840, y: 290 }, { x: 1020, y: 350 }, { x: 220, y: 460 },
  { x: 420, y: 490 }, { x: 620, y: 440 }, { x: 820, y: 490 }, { x: 1000, y: 460 },
];
const NET_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [2, 10], [4, 11], [6, 13], [8, 14], [9, 10], [10, 11],
  [11, 12], [12, 13], [13, 14], [9, 15], [10, 16], [12, 17],
  [13, 18], [14, 19], [15, 16], [16, 17], [17, 18], [18, 19],
];

function NetworkLayer({ className }) {
  return (
    <svg className={`hero-net ${className}`} viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {NET_LINKS.map(([a, b], i) => (
        <line
          key={i}
          x1={NET_NODES[a].x}
          y1={NET_NODES[a].y}
          x2={NET_NODES[b].x}
          y2={NET_NODES[b].y}
          className="hero-net__link"
        />
      ))}
      {NET_NODES.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={i % 5 === 0 ? 5 : 3} className="hero-net__node" />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Static content                                                      */
/* ------------------------------------------------------------------ */

const EXAMPLE_CHIPS = [
  'Starting freelancing',
  'Learning AI',
  'Starting a business',
  'Moving abroad',
  'Choosing a degree',
];

const STEPS = [
  {
    n: '01',
    title: 'Share',
    text: 'People document what they actually tried — the goal, the starting point, the timeline, the investment, and the outcome. Including the failures most people never talk about.',
  },
  {
    n: '02',
    title: 'Structure',
    text: 'Every experience is broken into the same consistent structure: starting point, timeline, investment, obstacles, and lessons. Stories become comparable data.',
  },
  {
    n: '03',
    title: 'Compare',
    text: 'Describe your goal and your constraints. DEADEND ranks experiences by how similar the situation was to yours — same budget, skills, and starting point.',
  },
  {
    n: '04',
    title: 'Learn',
    text: 'See what worked, what failed, what it cost, and what they would do differently. Then track your own decision and add your outcome back to the loop.',
  },
];

const FEATURES = [
  { icon: 'doc', title: 'Real Experiences', text: 'First-hand accounts of what people tried — goals, costs, timelines, and honest outcomes.' },
  { icon: 'layers', title: 'Similar Situations', text: 'Find people who started where you are: same budget, skills, and constraints.' },
  { icon: 'target', title: 'Decision Tracking', text: 'Log the decision you are weighing and keep a record of what you choose.' },
  { icon: 'chart', title: 'Outcome Tracking', text: 'Record what happened after you decided and build your own track record.' },
  { icon: 'eye', title: 'Before vs After', text: 'See the starting point and the result side by side — no highlight reels.' },
  { icon: 'sparkles', title: 'AI Analysis', text: 'Patterns across submitted experiences, summarized responsibly and transparently.' },
  { icon: 'search', title: 'Smart Search', text: 'Search by goal, obstacle, budget, or situation — not just keywords.' },
  { icon: 'lock', title: 'Private Decisions', text: 'Your decisions stay private unless you choose to share them.' },
];

const LOOP_NODES = [
  { title: 'Experience', text: 'Someone shares what they tried, honestly.' },
  { title: 'Data', text: 'It becomes structured, comparable data.' },
  { title: 'Similarity', text: 'You find situations like yours.' },
  { title: 'Decision', text: 'You decide with real context.' },
  { title: 'Outcome', text: 'Your result gets recorded.' },
  { title: 'New Experience', text: 'Your story guides the next person.' },
];

const TRUST_BADGES = [
  { icon: 'shield', title: 'Privacy controls', text: 'Control exactly what is visible.' },
  { icon: 'user', title: 'Anonymous sharing', text: 'Share without using your name.' },
  { icon: 'lock', title: 'Secure accounts', text: 'Protected sign-in and sessions.' },
  { icon: 'flag', title: 'Moderated content', text: 'Reviewed by human moderators.' },
  { icon: 'globe', title: 'Transparent data use', text: 'A clear, plain-language data policy.' },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  useDocumentTitle('DEADEND — Before You Decide, See What Happened');
  const navigate = useNavigate();

  const [heroQuery, setHeroQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [similar, setSimilar] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getStats().then((s) => { if (!cancelled) setStats(s); }).catch(() => { if (!cancelled) setStats({}); });
    api.listExperiences({ page: 1, perPage: 4, sort: 'recent' })
      .then((r) => { if (!cancelled) setFeatured(r.items || []); })
      .catch(() => { if (!cancelled) setFeatured([]); });
    api.findSimilar({ goal: 'Start freelancing', country: 'Pakistan', experienceLevel: 'Beginner', budget: 'Under $500', skills: 'web development' })
      .then((r) => { if (!cancelled) setSimilar((r.results || []).slice(0, 3)); })
      .catch(() => { if (!cancelled) setSimilar([]); });
    return () => { cancelled = true; };
  }, []);

  const heroSearch = (q) => navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');

  return (
    <div className="home">
      {/* (1) HERO */}
      <section className="hero">
        <div className="hero__bg" aria-hidden="true">
          <NetworkLayer className="hero-net--a" />
          <NetworkLayer className="hero-net--b" />
          <div className="hero__fade" />
        </div>
        <div className="home-wrap hero__content">
          <p className="hero__eyebrow">A SEARCH ENGINE FOR HUMAN EXPERIENCE</p>
          <h1 className="hero__title">
            Before You Decide,
            <br />
            <span className="hero__title-accent">See What Happened.</span>
          </h1>
          <p className="hero__sub">
            Explore real experiences from people who tried the path you are considering —
            including what worked, what failed, what it cost, and what they learned.
          </p>
          <div className="hero__search">
            <SearchBar key={heroQuery} size="lg" initialValue={heroQuery} onSearch={heroSearch} />
          </div>
          <div className="hero__chips" aria-label="Example searches">
            <span className="hero__chips-label">Try:</span>
            {EXAMPLE_CHIPS.map((chip) => (
              <button key={chip} type="button" className="chip" onClick={() => setHeroQuery(chip)}>
                {chip}
              </button>
            ))}
          </div>
          <div className="hero__cta">
            <Link className="btn btn-amber btn-lg" to="/explore">
              Explore Experiences <Icon name="arrowRight" size={16} />
            </Link>
            <Link className="btn btn-ghost btn-lg" to="/share">
              Share Your Experience
            </Link>
          </div>
        </div>
      </section>

      {/* (2) STATS */}
      <RevealSection className="home-section--stats">
        <div className="stats-grid">
          {stats ? (
            <>
              <Stat icon="doc" value={stats.experiences} label="Experiences shared" />
              <Stat icon="target" value={stats.decisions} label="Decisions tracked" />
              <Stat icon="user" value={stats.contributors} label="Contributors" />
              <Stat icon="globe" value={stats.countries} label="Countries" />
            </>
          ) : (
            <SkeletonText lines={1} />
          )}
        </div>
        <p className="stats-note">Live counts from the current demo dataset.</p>
      </RevealSection>

      {/* (3) HOW IT WORKS */}
      <RevealSection>
        <SectionHead
          eyebrow="HOW IT WORKS"
          title="From one person's story to your decision"
          sub="Four steps connect a stranger's experience to the choice in front of you."
        />
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n} className="step">
              <span className="step__n">{s.n}</span>
              <h3 className="step__title">{s.title}</h3>
              <p className="step__text">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="center">
          <Link className="text-link" to="/how-it-works">
            See how it works in detail <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </RevealSection>

      {/* (4) FEATURES */}
      <RevealSection className="home-section--alt">
        <SectionHead
          eyebrow="FEATURES"
          title="Built for decisions, not doomscrolling"
          sub="Everything on DEADEND exists to answer one question: what actually happened to people who tried this?"
        />
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-card__icon">
                <Icon name={f.icon} size={22} />
              </span>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__text">{f.text}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* (5) FEATURED EXPERIENCES */}
      <RevealSection>
        <SectionHead
          eyebrow="FEATURED"
          title="Experiences worth reading"
          sub="A few recent stories from people who tried, failed, adjusted, and kept going."
        />
        <div className="cards-grid cards-grid--4">
          {featured === null
            ? [0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)
            : featured.map((e) => <ExperienceCard key={e.id || e.slug} experience={e} />)}
        </div>
        <div className="center">
          <Link className="btn btn-ghost" to="/explore">
            Browse all experiences <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </RevealSection>

      {/* (6) DECISION TRACKING PREVIEW */}
      <RevealSection className="home-section--alt">
        <SectionHead
          eyebrow="DECISION TRACKING"
          title="Decide with a paper trail"
          sub="Log what you are weighing, what you chose, and why — then track the outcome."
        />
        <div className="preview-panel">
          <span className="preview-tag">Preview</span>
          <div className="decision-mock">
            <div className="decision-mock__head">
              <div>
                <p className="decision-mock__label">Decision</p>
                <h3 className="decision-mock__title">Should I quit my job to freelance full-time?</h3>
              </div>
              <span className="decision-mock__status">Decided</span>
            </div>
            <p className="decision-mock__conf">Confidence: high — based on 14 similar experiences</p>
            <ol className="mini-timeline">
              <li><span className="mini-timeline__dot" /> Researched the path</li>
              <li><span className="mini-timeline__dot" /> Compared 14 similar experiences</li>
              <li><span className="mini-timeline__dot" /> Decided: start part-time, keep the job</li>
              <li><span className="mini-timeline__dot is-now" /> Tracking outcome — month 2</li>
            </ol>
          </div>
        </div>
        <div className="center">
          <Link className="btn btn-amber" to="/decisions">
            Track your decisions <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </RevealSection>

      {/* (7) BEFORE VS AFTER PREVIEW */}
      <RevealSection>
        <SectionHead
          eyebrow="BEFORE VS AFTER"
          title="The starting point and the result, side by side"
          sub="No highlight reels. Just where they began and where they ended up."
        />
        <div className="preview-panel">
          <span className="preview-tag">Sample illustration</span>
          <div className="before-after">
            <div className="before-after__col before-after__col--before">
              <p className="before-after__label">Before</p>
              <ul>
                <li>0 clients</li>
                <li>$0 / month</li>
                <li>Coding after work, 2 hrs a night</li>
              </ul>
            </div>
            <span className="before-after__arrow" aria-hidden="true">
              <Icon name="arrowRight" size={24} />
            </span>
            <div className="before-after__col before-after__col--after">
              <p className="before-after__label">After · 6 months</p>
              <ul>
                <li>4 retainer clients</li>
                <li>$1,800 / month</li>
                <li>Full-time freelance</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="center">
          <Link className="btn btn-ghost" to="/decisions">
            Track your before &amp; after <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </RevealSection>

      {/* (8) SIMILARITY PREVIEW */}
      <RevealSection className="home-section--alt">
        <SectionHead
          eyebrow="SIMILARITY"
          title="People in situations like yours"
          sub="Ranked by how closely their starting point matches yours — not by popularity."
        />
        <div className="cards-grid cards-grid--3">
          {similar === null
            ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            : similar.map((r) => (
                <SimilarityCard
                  key={r.experience.id || r.experience.slug}
                  experience={r.experience}
                  score={r.score}
                  factors={r.factors}
                />
              ))}
        </div>
        <div className="center">
          <Link className="btn btn-amber" to="/similar">
            Find your matches <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </RevealSection>

      {/* (9) AI ANALYSIS PREVIEW */}
      <RevealSection>
        <SectionHead
          eyebrow="AI ANALYSIS"
          title="Patterns across thousands of stories"
          sub="Summaries generated from submitted experiences — transparent about what they are and what they are not."
        />
        <div className="preview-panel">
          <span className="preview-tag">Sample pattern</span>
          <div className="pattern-card">
            <span className="pattern-card__icon">
              <Icon name="sparkles" size={20} />
            </span>
            <p className="pattern-card__text">
              Freelancers who validated demand with 2+ paying clients before quitting
              stayed in the game 2.3x longer than those who quit first.
            </p>
            <p className="pattern-card__meta">Detected across 214 freelancing experiences</p>
          </div>
          <p className="responsible-note">
            <Icon name="info" size={14} />
            AI summaries describe patterns in submitted experiences. They are not predictions
            or advice — verify independently before deciding.
          </p>
        </div>
        <div className="center">
          <Link className="btn btn-ghost" to="/analysis">
            Explore AI analysis <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </RevealSection>

      {/* (10) THE LOOP */}
      <RevealSection className="home-section--alt">
        <SectionHead
          eyebrow="THE LOOP"
          title="Every decision makes the next one smarter"
          sub="DEADEND is a loop: experiences become data, data guides decisions, decisions become new experiences."
        />
        <div className="loop">
          {LOOP_NODES.map((node, i) => (
            <div className="loop__item" key={node.title}>
              <div className="loop__node">
                <span className="loop__n">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="loop__title">{node.title}</h3>
                <p className="loop__text">{node.text}</p>
              </div>
              {i < LOOP_NODES.length - 1 && (
                <span className="loop__connector" aria-hidden="true">
                  <Icon name="arrowRight" size={18} />
                </span>
              )}
            </div>
          ))}
        </div>
      </RevealSection>

      {/* (11) CONTRIBUTOR CTA BAND */}
      <RevealSection className="home-section--band">
        <p className="section-eyebrow">CONTRIBUTE</p>
        <h2 className="band-title">Your experience is data someone needs.</h2>
        <p className="band-sub">
          Someone is about to try what you already did. Share what happened —
          the wins and the failures — and help them decide with open eyes.
        </p>
        <Link className="btn btn-amber btn-lg" to="/share">
          Share Your Experience <Icon name="arrowRight" size={16} />
        </Link>
      </RevealSection>

      {/* (12) TRUST */}
      <RevealSection>
        <SectionHead
          eyebrow="TRUST"
          title="Built around real experiences."
          sub="Sharing honestly only works if you feel safe doing it."
        />
        <div className="trust-grid">
          {TRUST_BADGES.map((b) => (
            <div key={b.title} className="trust-badge">
              <span className="trust-badge__icon">
                <Icon name={b.icon} size={20} />
              </span>
              <h3 className="trust-badge__title">{b.title}</h3>
              <p className="trust-badge__text">{b.text}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* (13) FINAL CTA */}
      <RevealSection className="home-section--final">
        <h2 className="final-title">See what happened before you decide.</h2>
        <p className="final-sub">
          Search real experiences from people who walked the path first —
          then add your own story to the loop.
        </p>
        <div className="final-cta">
          <Link className="btn btn-amber btn-lg" to="/explore">
            Explore Experiences <Icon name="arrowRight" size={16} />
          </Link>
          <Link className="btn btn-ghost btn-lg" to="/share">
            Share Your Experience
          </Link>
        </div>
      </RevealSection>
    </div>
  );
}

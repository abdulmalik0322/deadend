import { Link } from 'react-router-dom';
import { Icon } from '../../utils/icons.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import './HowItWorks.css';

function RevealSection({ className = '', children }) {
  const ref = useReveal();
  return (
    <section ref={ref} className={`reveal hiw-section ${className}`.trim()}>
      <div className="hiw-wrap">{children}</div>
    </section>
  );
}

const STEPS = [
  {
    n: '01',
    icon: 'edit',
    title: 'Share',
    tagline: 'Tell us what you actually tried.',
    text: 'Write up your experience with the parts that matter for someone else\u2019s decision: what your goal was, where you started, what you tried step by step, what you invested, and how it turned out. The failures count as much as the wins — they are usually the part nobody talks about, and the part someone else needs most.',
    points: [
      'Your goal and your starting point',
      'A timeline of what you actually did',
      'Time, money, and tools invested',
      'The honest outcome — good or bad',
    ],
  },
  {
    n: '02',
    icon: 'layers',
    title: 'Structure',
    tagline: 'Stories become comparable data.',
    text: 'Every experience is broken into the same consistent structure: starting point, goal, timeline, investment, obstacles, what worked, and lessons. This is what turns a pile of anecdotes into something you can compare — two freelancing stories with different budgets and timelines can be read side by side, factor by factor.',
    points: [
      'Same fields for every experience',
      'Obstacles, costs, and timelines standardized',
      'Tags and categories for discovery',
    ],
  },
  {
    n: '03',
    icon: 'scale',
    title: 'Compare',
    tagline: 'Find people who started where you are.',
    text: 'Describe your own goal and constraints — your budget, experience level, available time, and skills. DEADEND ranks experiences by how similar the situation was to yours, so you read the stories that actually apply to you instead of generic advice written for someone with ten times your runway.',
    points: [
      'Match on budget, level, time, and skills',
      'Similarity scores show why a story matched',
      'Filter by outcome: see what worked and what failed',
    ],
  },
  {
    n: '04',
    icon: 'target',
    title: 'Learn',
    tagline: 'Decide with open eyes — then add your story.',
    text: 'Read what worked, what went wrong, what it cost, and what the author would do differently. Track your own decision and its outcome. When your journey plays out, your experience feeds back into the loop — and the next person deciding learns from you.',
    points: [
      'Before vs after, side by side',
      'Track your decision and its outcome',
      'Your outcome becomes someone else\u2019s data',
    ],
  },
];

const LOOP = [
  { title: 'Experience', text: 'Someone shares what they tried, honestly.' },
  { title: 'Data', text: 'It becomes structured, comparable data.' },
  { title: 'Similarity', text: 'You find situations like yours.' },
  { title: 'Decision', text: 'You decide with real context.' },
  { title: 'Outcome', text: 'Your result gets recorded.' },
  { title: 'New Experience', text: 'Your story guides the next person.' },
];

export default function HowItWorks() {
  useDocumentTitle('How It Works — DEADEND');

  return (
    <div className="hiw">
      {/* Intro */}
      <section className="hiw-hero">
        <div className="hiw-wrap">
          <p className="hiw-eyebrow">HOW IT WORKS</p>
          <h1 className="hiw-title">A search engine for human experience</h1>
          <p className="hiw-sub">
            DEADEND collects real experiences from people who tried the path you are
            considering — including what worked, what failed, what it cost, and what
            they learned — and helps you find the ones that match your situation.
          </p>
        </div>
      </section>

      {/* Steps */}
      <RevealSection>
        <ol className="hiw-steps">
          {STEPS.map((s, i) => (
            <li key={s.n} className={`hiw-step${i % 2 === 1 ? ' is-alt' : ''}`}>
              <div className="hiw-step__visual">
                <span className="hiw-step__n">{s.n}</span>
                <span className="hiw-step__icon">
                  <Icon name={s.icon} size={30} />
                </span>
              </div>
              <div className="hiw-step__body">
                <h2 className="hiw-step__title">{s.title}</h2>
                <p className="hiw-step__tagline">{s.tagline}</p>
                <p className="hiw-step__text">{s.text}</p>
                <ul className="hiw-step__points">
                  {s.points.map((p) => (
                    <li key={p}>
                      <Icon name="check" size={15} /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </RevealSection>

      {/* Loop */}
      <RevealSection className="hiw-section--alt">
        <div className="hiw-center-head">
          <p className="hiw-eyebrow">THE LOOP</p>
          <h2 className="hiw-h2">Every decision makes the next one smarter</h2>
          <p className="hiw-sub-sm">
            DEADEND is a loop: experiences become data, data guides decisions,
            decisions become new experiences.
          </p>
        </div>
        <div className="hiw-loop">
          {LOOP.map((node, i) => (
            <div className="hiw-loop__item" key={node.title}>
              <div className="hiw-loop__node">
                <span className="hiw-loop__n">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="hiw-loop__title">{node.title}</h3>
                <p className="hiw-loop__text">{node.text}</p>
              </div>
              {i < LOOP.length - 1 && (
                <span className="hiw-loop__connector" aria-hidden="true">
                  <Icon name="arrowRight" size={18} />
                </span>
              )}
            </div>
          ))}
        </div>
      </RevealSection>

      {/* Responsible AI */}
      <RevealSection>
        <div className="hiw-ai">
          <span className="hiw-ai__icon">
            <Icon name="shield" size={24} />
          </span>
          <div>
            <h2 className="hiw-h2">Responsible AI, stated plainly</h2>
            <ul className="hiw-ai__list">
              <li>
                Similarity scores describe how alike two <strong>situations</strong> are —
                they are not predictions of what will happen to you.
              </li>
              <li>
                AI summaries are generated from user-submitted experiences. They can be
                incomplete or wrong — verify anything important independently.
              </li>
              <li>
                Your private decisions are never used to train shared models without
                your explicit choice.
              </li>
            </ul>
          </div>
        </div>
      </RevealSection>

      {/* CTAs */}
      <RevealSection className="hiw-section--cta">
        <h2 className="hiw-cta__title">Ready to see what happened?</h2>
        <p className="hiw-cta__sub">
          Search the experiences, or add your own story to the loop.
        </p>
        <div className="hiw-cta__buttons">
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

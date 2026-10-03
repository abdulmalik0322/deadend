import { Icon } from '../../utils/icons.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import './About.css';

const LOOP_STEPS = [
  {
    title: 'Experience',
    text: 'Someone lives through a real decision — a career move, a product launch, a relocation — and records what happened, honestly and specifically.',
  },
  {
    title: 'Data',
    text: 'That experience is structured: the context, the options considered, the decision made, and the outcome that followed.',
  },
  {
    title: 'Similarity',
    text: 'When you face a similar choice, DEADEND surfaces the experiences closest to your situation — not generic advice.',
  },
  {
    title: 'Decision',
    text: 'You weigh real outcomes from people who were where you are, and make your call with more signal than guesswork.',
  },
  {
    title: 'Outcome',
    text: 'Later, you record how it went. Your outcome becomes data for the next person standing where you stood.',
  },
  {
    title: 'New Experience',
    text: 'The loop closes and reopens: every outcome feeds the next decision. The knowledge compounds.',
  },
];

const IS_POINTS = [
  {
    icon: 'layers',
    title: 'A structured knowledge platform',
    text: 'Experiences are captured in a consistent structure — situation, options, decision, outcome — so they can be compared, searched, and learned from.',
  },
  {
    icon: 'doc',
    title: 'A record of real decisions and outcomes',
    text: 'Every entry ties a choice to its consequence. We care about what actually happened, not what someone wishes had happened.',
  },
  {
    icon: 'target',
    title: 'Similarity over advice',
    text: 'We match your situation to situations like it. We do not tell you what to do — we show you what happened to people in similar positions.',
  },
];

const IS_NOT_POINTS = [
  {
    icon: 'x',
    title: 'Not a blog',
    text: 'There are no hot takes, no personal brands, no engagement bait. Long-form opinion has plenty of homes; this is not one of them.',
  },
  {
    icon: 'message',
    title: 'Not a social network',
    text: 'No followers, no feeds, no likes to chase. Your experience matters because it is data, not because it performed.',
  },
  {
    icon: 'zap',
    title: 'Not a prediction machine',
    text: 'We do not claim to know what will happen to you. Nobody can. We show you what happened before, and let you draw your own conclusions.',
  },
];

export default function About() {
  useDocumentTitle('About — DEADEND');
  const revealRef = useReveal();

  return (
    <div className="static-page" ref={revealRef}>
      <div className="static-hero">
        <p className="static-kicker">About DEADEND</p>
        <h1>Before you decide, see what happened.</h1>
        <p className="static-lede">
          DEADEND is a structured knowledge platform for learning from real human decisions
          and their outcomes — so fewer big choices are made in the dark.
        </p>
        <nav className="toc" aria-label="On this page">
          <a href="#mission">Mission</a>
          <a href="#what-it-is">What it is</a>
          <a href="#what-it-is-not">What it is not</a>
          <a href="#the-loop">The loop</a>
          <a href="#responsible-ai">Responsible AI</a>
        </nav>
      </div>

      <section id="mission" className="static-section">
        <h2>Our mission</h2>
        <p>
          The most important decisions in life — where to work, what to build, where to live,
          who to trust — are made with the least reliable data: anecdotes, survivorship-biased
          success stories, and whoever happened to be loudest in the room. Our mission is to
          change that by turning lived experience into structured, searchable knowledge.
        </p>
        <p>
          When thousands of people record what they decided and how it turned out, patterns
          emerge that no single story can carry. DEADEND exists to collect those patterns
          and hand them to the next person facing the same fork in the road.
        </p>
      </section>

      <section id="what-it-is" className="static-section">
        <h2>What DEADEND is</h2>
        <div className="about-cards">
          {IS_POINTS.map((point) => (
            <article key={point.title} className="about-card">
              <span className="about-card-icon"><Icon name={point.icon} /></span>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="what-it-is-not" className="static-section">
        <h2>What DEADEND is not</h2>
        <div className="about-cards">
          {IS_NOT_POINTS.map((point) => (
            <article key={point.title} className="about-card is-not">
              <span className="about-card-icon"><Icon name={point.icon} /></span>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="the-loop" className="static-section">
        <h2>The loop</h2>
        <p>
          DEADEND runs on a simple cycle. Each turn of the loop makes the platform smarter
          and the next decision better informed:
        </p>
        <ol className="loop-steps">
          {LOOP_STEPS.map((step, i) => (
            <li key={step.title} className="loop-step">
              <span className="loop-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="loop-arrow-note">
          Experience → Data → Similarity → Decision → Outcome → New Experience — and around again.
        </p>
      </section>

      <section id="responsible-ai" className="static-section">
        <h2>Responsible AI</h2>
        <p>
          DEADEND uses AI to assist — structuring submissions, matching similar situations,
          and summarizing long entries. AI never invents outcomes, and it never decides for you.
          Every outcome on the platform was reported by a real person about a real decision.
        </p>
        <p>
          We do not sell your personal data, we do not train models on your private entries,
          and we are transparent about where automation is involved: anything AI-structured
          is labeled as such, and you can always read the original submission underneath.
          If you choose Anonymous or Private visibility for an experience, that choice is
          enforced in how the data is stored and displayed — not just in the interface.
        </p>
        <p>
          AI is a lens, not an oracle. The knowledge belongs to the people who lived it.
        </p>
      </section>
    </div>
  );
}

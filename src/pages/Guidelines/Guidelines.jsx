import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import '../About/About.css';
import './Guidelines.css';

export default function Guidelines() {
  useDocumentTitle('Community Guidelines — DEADEND');
  const revealRef = useReveal();

  return (
    <div className="static-page" ref={revealRef}>
      <div className="static-hero">
        <p className="static-kicker">Community</p>
        <h1>Community Guidelines</h1>
        <p className="static-lede">
          DEADEND only works if the experiences are real, specific, and respectful.
          These rules keep it that way.
        </p>
        <nav className="toc" aria-label="On this page">
          <a href="#standard">The standard</a>
          <a href="#honesty">Write what happened</a>
          <a href="#outcomes">Outcomes matter</a>
          <a href="#advice">Not an advice column</a>
          <a href="#respect">Respect people</a>
          <a href="#anonymous">Anonymous posting</a>
          <a href="#moderation">Moderation and reports</a>
          <a href="#consequences">Consequences</a>
        </nav>
      </div>

      <section id="standard" className="static-section">
        <h2>1. The standard</h2>
        <p>
          Every entry on DEADEND becomes someone else's data. A vague story helps no one;
          an honest, specific record of a decision and its outcome can change a stranger's
          life. Hold yourself to that standard before you publish.
        </p>
      </section>

      <section id="honesty" className="static-section">
        <h2>2. Write what happened</h2>
        <ul>
          <li><strong>Be honest.</strong> Do not invent, exaggerate, or borrow someone else's story. Fabricated experiences will be removed.</li>
          <li><strong>Be specific.</strong> "I quit my job and it worked out" is not useful. What was the role, the timing, the trade-off, the result?</li>
          <li><strong>Be fair.</strong> You can criticize a company or a decision without distorting facts. Stick to what you know firsthand.</li>
        </ul>
      </section>

      <section id="outcomes" className="static-section">
        <h2>3. Outcomes matter</h2>
        <p>
          An experience without an outcome is a story, not data. When you publish, record
          the result — good, bad, or unresolved — and update it when things change. Mark
          the outcome honestly: a decision that failed is as valuable as one that succeeded.
        </p>
      </section>

      <section id="advice" className="static-section">
        <h2>4. Not an advice column</h2>
        <p>
          DEADEND is a record of what happened, not a place to dispense professional
          guidance. Do not present yourself as a doctor, lawyer, or financial advisor, and
          do not post medical, legal, or financial advice. Describing your own experience
          with a treatment, a lawsuit, or an investment is fine; telling others what they
          should do is not.
        </p>
      </section>

      <section id="respect" className="static-section">
        <h2>5. Respect people</h2>
        <ul>
          <li>No hate speech, harassment, threats, or personal attacks.</li>
          <li>No content targeting people based on race, gender, religion, disability, sexual orientation, or other protected characteristics.</li>
          <li>No publishing someone else's personal data — names, addresses, phone numbers, private messages — without their consent.</li>
          <li>No sexual content involving minors, ever. Zero tolerance.</li>
        </ul>
      </section>

      <section id="anonymous" className="static-section">
        <h2>6. Anonymous posting</h2>
        <p>
          Anonymous visibility exists so sensitive experiences can be shared safely. The
          same rules apply: anonymous does not mean unaccountable. Do not use anonymity
          to smear people, settle scores, or evade moderation. Remember that details in
          your story can identify you — write with that in mind.
        </p>
      </section>

      <section id="moderation" className="static-section">
        <h2>7. Moderation and reports</h2>
        <p>
          New experiences may be reviewed before they appear publicly. If you see content
          that breaks these guidelines, use the report button on the content itself and
          tell us why — reports with a clear reason are actioned fastest. Moderators
          review reports against these guidelines, not against personal opinion.
        </p>
      </section>

      <section id="consequences" className="static-section">
        <h2>8. Consequences</h2>
        <p>
          Minor issues get a warning and a chance to fix the content. Repeated or serious
          violations — fabrication, hate speech, harassment, doxxing — lead to content
          removal and account suspension or termination. If you think we got it wrong,
          appeal through the contact page and a different reviewer will take a second look.
        </p>
      </section>
    </div>
  );
}

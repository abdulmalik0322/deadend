import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import '../About/About.css';
import './Privacy.css';

export default function Privacy() {
  useDocumentTitle('Privacy Policy — DEADEND');
  const revealRef = useReveal();

  return (
    <div className="static-page" ref={revealRef}>
      <div className="static-hero">
        <p className="static-kicker">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="static-lede">Last updated: October 2026. Your data, your choice — enforced, not just promised.</p>
        <nav className="toc" aria-label="On this page">
          <a href="#collect">What we collect</a>
          <a href="#choices">Your privacy choices</a>
          <a href="#anonymous">Anonymous protections</a>
          <a href="#use">How we use data</a>
          <a href="#never">What we never do</a>
          <a href="#cookies">Cookies</a>
          <a href="#rights">Your rights</a>
          <a href="#security">Security</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>

      <section id="collect" className="static-section">
        <h2>1. What we collect</h2>
        <ul>
          <li><strong>Account data:</strong> your name, email address, and password (stored as a one-way hash — we never see your password).</li>
          <li><strong>Content you publish:</strong> experiences, decisions, outcomes, comments, and the visibility setting you choose for each.</li>
          <li><strong>Usage data:</strong> basic interaction logs that keep the service running and help us understand aggregate trends.</li>
        </ul>
        <p>We do not ask for government IDs, financial details, or biometric data, and we do not buy data about you from brokers.</p>
      </section>

      <section id="choices" className="static-section">
        <h2>2. Your privacy choices</h2>
        <p>
          Every experience you publish carries one of three visibility settings, chosen by you:
        </p>
        <ul>
          <li><strong>Public</strong> — visible to everyone, attributed to your profile.</li>
          <li><strong>Anonymous</strong> — visible to everyone, but not linked to your identity. See the protections below.</li>
          <li><strong>Private</strong> — visible only to you. Used for your personal decision journal; never shown to other users.</li>
        </ul>
        <p>You can change the visibility of any experience at any time, and the change takes effect immediately.</p>
      </section>

      <section id="anonymous" className="static-section">
        <h2>3. Anonymous protections</h2>
        <p>
          Anonymous is a technical guarantee, not a display trick. When you publish anonymously:
        </p>
        <ul>
          <li>Your name, avatar, and profile link are stripped from the published content.</li>
          <li>The experience is stored without an attribution link visible to other users or to moderators browsing the queue.</li>
          <li>Anonymous entries are excluded from public author pages and activity feeds.</li>
        </ul>
        <p>
          Be aware of what anonymity cannot do: details inside your story (names, places,
          rare circumstances) can identify you. Write accordingly — do not include
          information that would de-anonymize you or anyone else.
        </p>
      </section>

      <section id="use" className="static-section">
        <h2>4. How we use data — transparency</h2>
        <ul>
          <li>To operate the platform: accounts, publishing, search, and similarity matching.</li>
          <li>To keep the community safe: moderation review and abuse prevention.</li>
          <li>To improve the product: aggregate, de-identified analytics (e.g. which categories grow fastest).</li>
        </ul>
        <p>
          Anything AI-structured on the platform is labeled as such. AI assistance is used
          for structuring and summarization — it does not create outcomes, and we do not
          use your Private entries to train shared models.
        </p>
      </section>

      <section id="never" className="static-section">
        <h2>5. What we never do</h2>
        <ul>
          <li>We never sell your personal data to anyone.</li>
          <li>We never show your Private entries to other users.</li>
          <li>We never claim third-party security certifications we do not hold. We do not currently hold SOC 2, ISO 27001, or similar certifications, and we will not imply otherwise.</li>
          <li>We never use your content for advertising to you.</li>
        </ul>
      </section>

      <section id="cookies" className="static-section">
        <h2>6. Cookies</h2>
        <p>
          We use strictly necessary cookies to keep you signed in and to remember basic
          preferences. We do not use third-party advertising or cross-site tracking cookies.
        </p>
      </section>

      <section id="rights" className="static-section">
        <h2>7. Your rights</h2>
        <ul>
          <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
          <li><strong>Correction:</strong> fix inaccurate account information at any time in settings.</li>
          <li><strong>Deletion:</strong> delete individual experiences or your entire account; deletion removes public content, subject to limited backup retention.</li>
          <li><strong>Export:</strong> request your data in a portable format.</li>
        </ul>
        <p>To exercise any of these rights, contact us — we respond within 2 business days.</p>
      </section>

      <section id="security" className="static-section">
        <h2>8. Security</h2>
        <p>
          Passwords are hashed with a modern one-way algorithm, traffic is encrypted in
          transit, and access to production data is restricted to what is needed to run the
          service. No system is perfectly secure, and we will notify you promptly if we
          learn of a breach affecting your data.
        </p>
      </section>

      <section id="contact" className="static-section">
        <h2>9. Contact</h2>
        <p>
          Privacy questions or requests: use the contact page and select a relevant topic.
          We reply within 2 business days.
        </p>
      </section>
    </div>
  );
}

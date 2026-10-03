import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { useReveal } from '../../hooks/useReveal.js';
import '../About/About.css';
import './Terms.css';

export default function Terms() {
  useDocumentTitle('Terms of Service — DEADEND');
  const revealRef = useReveal();

  return (
    <div className="static-page" ref={revealRef}>
      <div className="static-hero">
        <p className="static-kicker">Legal</p>
        <h1>Terms of Service</h1>
        <p className="static-lede">Last updated: October 2026. Plain language, no traps.</p>
        <nav className="toc" aria-label="On this page">
          <a href="#acceptance">Acceptance</a>
          <a href="#accounts">Accounts</a>
          <a href="#content">Your content</a>
          <a href="#acceptable-use">Acceptable use</a>
          <a href="#moderation">Moderation</a>
          <a href="#privacy-choices">Privacy choices</a>
          <a href="#termination">Termination</a>
          <a href="#disclaimers">Disclaimers</a>
          <a href="#changes">Changes</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>

      <section id="acceptance" className="static-section">
        <h2>1. Acceptance</h2>
        <p>
          By creating an account or using DEADEND, you agree to these Terms. If you do not
          agree, do not use the service. You must be at least 16 years old, or the age of
          digital consent in your jurisdiction, to use DEADEND.
        </p>
      </section>

      <section id="accounts" className="static-section">
        <h2>2. Your account</h2>
        <ul>
          <li>You are responsible for keeping your login credentials confidential.</li>
          <li>One account per person. Do not create accounts to evade a suspension.</li>
          <li>Keep your account information accurate and up to date.</li>
        </ul>
      </section>

      <section id="content" className="static-section">
        <h2>3. Your content</h2>
        <p>
          You own the experiences you publish. By publishing on DEADEND, you grant us a
          worldwide, non-exclusive, royalty-free license to host, display, and distribute
          that content on the platform — including making it searchable and showing it to
          users with similar situations. This license ends when you delete the content,
          except for copies retained in backups for a limited time.
        </p>
        <p>
          You confirm that what you publish is true to the best of your knowledge and does
          not infringe anyone else's rights. Fabricated experiences undermine the entire
          platform and will be removed.
        </p>
      </section>

      <section id="acceptable-use" className="static-section">
        <h2>4. Acceptable use</h2>
        <p>You agree not to use DEADEND to:</p>
        <ul>
          <li>Publish false, misleading, or fabricated experiences or outcomes.</li>
          <li>Harass, threaten, or defame any person.</li>
          <li>Publish hate speech or content targeting protected characteristics.</li>
          <li>Share someone else's personal data without their consent.</li>
          <li>Provide professional advice you are not qualified to give — especially medical, legal, or financial advice.</li>
          <li>Spam, scrape at abusive scale, or interfere with the service.</li>
        </ul>
      </section>

      <section id="moderation" className="static-section">
        <h2>5. Moderation</h2>
        <p>
          New experiences may be reviewed before appearing publicly. We may remove content
          or suspend accounts that violate these Terms or the Community Guidelines, with or
          without prior notice for serious violations. If you believe a moderation decision
          was wrong, contact us and we will review it.
        </p>
      </section>

      <section id="privacy-choices" className="static-section">
        <h2>6. Privacy choices</h2>
        <p>
          For each experience you publish, you choose Public, Anonymous, or Private
          visibility. We honor that choice in storage and display, as described in the
          Privacy Policy. Anonymous experiences are not linked to your identity on the platform.
        </p>
      </section>

      <section id="termination" className="static-section">
        <h2>7. Termination</h2>
        <p>
          You may delete your account at any time; deletion removes your public profile
          and your published content, subject to backup retention. We may suspend or
          terminate accounts that repeatedly or seriously violate these Terms.
        </p>
      </section>

      <section id="disclaimers" className="static-section">
        <h2>8. Disclaimers</h2>
        <p>
          DEADEND shows you what happened to other people in similar situations. It does
          not predict your outcome and it is not professional advice. Decisions you make
          based on the platform are your own responsibility. The service is provided "as is"
          without warranties of any kind, to the maximum extent permitted by law.
        </p>
      </section>

      <section id="changes" className="static-section">
        <h2>9. Changes to these Terms</h2>
        <p>
          We may update these Terms as the platform evolves. Material changes will be
          announced in advance, and continued use after the effective date means you
          accept the updated Terms.
        </p>
      </section>

      <section id="contact" className="static-section">
        <h2>10. Contact</h2>
        <p>
          Questions about these Terms? Reach us through the contact page and we will
          respond within 2 business days.
        </p>
      </section>
    </div>
  );
}

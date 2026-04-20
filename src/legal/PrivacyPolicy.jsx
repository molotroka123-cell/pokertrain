import React from 'react';

export default function PrivacyPolicy({ onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#050b18', color: '#c0d0e0', fontFamily: "'Segoe UI', sans-serif", padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: '1px solid rgba(74,200,255,0.25)', borderRadius: '8px', color: '#4ac8ff', padding: '8px 16px', cursor: 'pointer', marginBottom: '20px', fontWeight: 700 }}>← Back</button>
      <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#4ac8ff', marginBottom: '20px' }}>Privacy Policy</h1>
      <p style={{ fontSize: '11px', color: '#4a7a9a', marginBottom: '20px' }}>Last updated: April 20, 2026</p>

      <Section title="1. Information We Collect">
        <p>IceCrown Poker Club ("the App") collects minimal data:</p>
        <ul>
          <li><b>Game Statistics</b>: Your poker decisions, hand histories, and performance metrics are stored locally on your device using browser localStorage.</li>
          <li><b>Leaderboard Data</b>: If you participate in the community leaderboard, we collect your chosen display name and aggregate gameplay statistics (GTO score, hands played, ROI).</li>
          <li><b>No Personal Information</b>: We do not collect your real name, email, phone number, location, or any personally identifiable information.</li>
        </ul>
      </Section>

      <Section title="2. How We Use Information">
        <ul>
          <li>To provide personalized training recommendations and track your poker improvement</li>
          <li>To display community leaderboards and rankings</li>
          <li>To generate AI-powered coaching feedback</li>
        </ul>
      </Section>

      <Section title="3. Data Storage">
        <p>All gameplay data is stored locally on your device. Leaderboard submissions are stored on our servers (Vercel Edge Network) and may be reset periodically. We do not sell or share your data with third parties.</p>
      </Section>

      <Section title="4. Third-Party Services">
        <ul>
          <li><b>Anthropic (Claude AI)</b>: In HARDCORE mode, anonymized game state data is sent to the Claude AI API for advanced opponent decisions. No personal data is included.</li>
          <li><b>Vercel</b>: Our hosting provider. See Vercel's privacy policy for infrastructure details.</li>
        </ul>
      </Section>

      <Section title="5. Data Deletion">
        <p>You can delete all your data at any time through the Statistics screen → "Clear All Data" button. This permanently removes all locally stored information. Leaderboard entries are cleared during periodic server resets.</p>
      </Section>

      <Section title="6. Children's Privacy">
        <p>This app is a poker training simulator. It does not involve real money gambling. The app is rated 12+ and does not knowingly collect data from children under 13.</p>
      </Section>

      <Section title="7. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. Changes will be reflected by the "Last updated" date at the top of this page.</p>
      </Section>

      <Section title="8. Contact">
        <p>For privacy questions, contact us through the app's GitHub repository or support channels.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#80d0ff', marginBottom: '8px' }}>{title}</h2>
      <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#8a9aaa' }}>{children}</div>
      <style>{`
        .legal-content ul { padding-left: 20px; margin: 8px 0; }
        .legal-content li { margin-bottom: 4px; }
      `}</style>
    </div>
  );
}

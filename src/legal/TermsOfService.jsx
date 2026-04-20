import React from 'react';

export default function TermsOfService({ onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#050b18', color: '#c0d0e0', fontFamily: "'Segoe UI', sans-serif", padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: '1px solid rgba(74,200,255,0.25)', borderRadius: '8px', color: '#4ac8ff', padding: '8px 16px', cursor: 'pointer', marginBottom: '20px', fontWeight: 700 }}>← Back</button>
      <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#4ac8ff', marginBottom: '20px' }}>Terms of Service</h1>
      <p style={{ fontSize: '11px', color: '#4a7a9a', marginBottom: '20px' }}>Last updated: April 20, 2026</p>

      <Section title="1. Acceptance of Terms">
        <p>By using IceCrown Poker Club ("the App"), you agree to these Terms of Service. If you do not agree, please do not use the App.</p>
      </Section>

      <Section title="2. Description of Service">
        <p>IceCrown Poker Club is a poker training simulator designed for educational purposes. The App simulates tournament and cash game poker scenarios with AI opponents. <b>No real money is involved.</b> All chips, balances, and prizes shown in the App are virtual and have no monetary value.</p>
      </Section>

      <Section title="3. Not Gambling">
        <p>This App is NOT a gambling application. It is a training tool that helps players improve their poker skills through:</p>
        <ul>
          <li>Simulated tournaments with AI opponents</li>
          <li>GTO (Game Theory Optimal) training drills</li>
          <li>Hand analysis and coaching</li>
          <li>Performance tracking and statistics</li>
        </ul>
        <p>No real money can be wagered, won, or lost through this App.</p>
      </Section>

      <Section title="4. User Conduct">
        <p>Users agree to use the App responsibly and not attempt to:</p>
        <ul>
          <li>Reverse engineer or modify the App's source code for malicious purposes</li>
          <li>Submit false or misleading data to leaderboards</li>
          <li>Use the App to promote real money gambling to minors</li>
        </ul>
      </Section>

      <Section title="5. Intellectual Property">
        <p>The App's design, code, training content, GTO data, and AI algorithms are the intellectual property of IceCrown Poker Club. Poker hand rankings and standard game rules are public domain.</p>
      </Section>

      <Section title="6. Disclaimer of Warranties">
        <p>The App is provided "as is" without warranties of any kind. We do not guarantee that the App will be error-free, uninterrupted, or that GTO recommendations will result in real-game profits.</p>
      </Section>

      <Section title="7. Limitation of Liability">
        <p>IceCrown Poker Club shall not be liable for any damages arising from the use of this App, including but not limited to losses incurred while playing real poker based on training received through the App.</p>
      </Section>

      <Section title="8. Age Requirement">
        <p>You must be at least 12 years old to use this App. By using the App, you confirm that you meet this age requirement.</p>
      </Section>

      <Section title="9. Changes to Terms">
        <p>We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the modified Terms.</p>
      </Section>

      <Section title="10. Contact">
        <p>For questions about these Terms, contact us through the app's support channels.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#80d0ff', marginBottom: '8px' }}>{title}</h2>
      <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#8a9aaa' }}>{children}</div>
    </div>
  );
}

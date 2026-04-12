// RealAnalysis.jsx — Beautiful dashboard for real money hand history analysis
import React, { useState } from 'react';
import { parseHandHistory, analyzeRealHands } from '../lib/hhParser.js';

export default function RealAnalysis({ onBack }) {
  const [analysis, setAnalysis] = useState(null);
  const [selectedTourney, setSelectedTourney] = useState(null);
  const [selectedHand, setSelectedHand] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.zip,.log';
    input.multiple = true;
    input.onchange = async (e) => {
      setLoading(true);
      let allText = '';
      for (const file of e.target.files) {
        const text = await file.text();
        allText += '\n' + text;
      }
      const hands = parseHandHistory(allText);
      const result = analyzeRealHands(hands);
      setAnalysis(result);
      setLoading(false);
    };
    input.click();
  };

  const s = {
    page: { minHeight: '100vh', background: '#060810', color: '#e0e0e0', fontFamily: "'Segoe UI', sans-serif" },
    container: { maxWidth: '540px', margin: '0 auto', padding: '16px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    title: { fontSize: '22px', fontWeight: 900, color: '#ffd700' },
    btn: (bg, color) => ({ padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: bg, color, fontWeight: 700, fontSize: '12px' }),
    card: { background: '#0d1118', borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid #1a2230' },
    statRow: { display: 'flex', gap: '8px', marginBottom: '10px' },
    stat: (color) => ({ flex: 1, textAlign: 'center', padding: '12px', background: '#080c14', borderRadius: '10px', border: '1px solid #141a22' }),
    statVal: (color) => ({ fontSize: '24px', fontWeight: 900, color }),
    statLabel: { fontSize: '9px', color: '#4a5a6a', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' },
    section: { fontSize: '13px', fontWeight: 700, color: '#e8d48b', marginBottom: '8px', marginTop: '14px' },
    row: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12px', borderBottom: '1px solid #141a22' },
    handCard: (won) => ({ padding: '10px 12px', borderRadius: '10px', marginBottom: '6px', cursor: 'pointer', background: won ? '#0a1a10' : '#1a0a0a', border: `1px solid ${won ? '#1a3a2a' : '#3a1a1a'}` }),
  };

  if (!analysis) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.header}>
            <div style={s.title}>Real Money Analysis</div>
            <button onClick={onBack} style={s.btn('#0d1118', '#6b7b8d')}>Back</button>
          </div>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>♠</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#c0d0e0', marginBottom: '8px' }}>Upload Hand History</div>
            <div style={{ fontSize: '12px', color: '#5a6a7a', marginBottom: '24px' }}>
              Supports GGPoker, PokerStars, 888poker .txt files
            </div>
            <button onClick={handleUpload} style={{
              padding: '16px 40px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #1a5a30, #27ae60)',
              color: '#fff', fontWeight: 800, fontSize: '16px',
              boxShadow: '0 4px 20px rgba(39,174,96,0.3)',
            }}>{loading ? 'Parsing...' : 'SELECT FILES'}</button>
          </div>
        </div>
      </div>
    );
  }

  // Tournament detail view
  if (selectedTourney) {
    const tHands = analysis.hands.filter(h => h.tournId === selectedTourney);
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.header}>
            <div style={s.title}>Tournament #{selectedTourney}</div>
            <button onClick={() => { setSelectedTourney(null); setSelectedHand(null); }} style={s.btn('#0d1118', '#6b7b8d')}>Back</button>
          </div>
          <div style={{ fontSize: '12px', color: '#5a6a7a', marginBottom: '12px' }}>{tHands.length} hands played</div>
          {tHands.map((h, i) => (
            <div key={i} onClick={() => setSelectedHand(selectedHand === i ? null : i)} style={s.handCard(h.result === 'won')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#ffd700', fontWeight: 700, marginRight: '8px' }}>{h.position}</span>
                  <span style={{ color: '#c0d0e0', fontWeight: 600 }}>{h.holeCards || 'folded'}</span>
                  {h.actions.length > 0 && <span style={{ color: '#5a6a7a', marginLeft: '6px', fontSize: '11px' }}>
                    {h.actions.map(a => a.action[0].toUpperCase()).join('→')}
                  </span>}
                </div>
                <div style={{ fontWeight: 700, color: h.result === 'won' ? '#27ae60' : h.result === 'lost' && h.actions.length > 1 ? '#e74c3c' : '#3a4a5a' }}>
                  {h.result === 'won' ? `+${h.potWon.toLocaleString()}` : h.actions.length <= 1 ? '-' : 'lost'}
                </div>
              </div>
              {selectedHand === i && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#060810', borderRadius: '8px', fontSize: '11px' }}>
                  <div style={{ color: '#6a7a8a' }}>Board: <b style={{ color: '#c0d0e0' }}>{h.community || '-'}</b></div>
                  <div style={{ color: '#6a7a8a' }}>Blinds: {h.blinds.sb}/{h.blinds.bb}{h.blinds.ante ? `/${h.blinds.ante}` : ''}</div>
                  <div style={{ color: '#6a7a8a' }}>Stack: {h.heroChipsBefore.toLocaleString()}</div>
                  {Object.keys(h.opponentCards).length > 0 && (
                    <div style={{ color: '#6a7a8a', marginTop: '4px' }}>
                      Opponents: {Object.entries(h.opponentCards).map(([n, c]) => `${n}: ${c}`).join(', ')}
                    </div>
                  )}
                  <div style={{ marginTop: '6px' }}>
                    {h.allActions.map((a, j) => (
                      <span key={j} style={{ color: a.isHero ? '#ffd700' : '#5a6a7a', marginRight: '4px' }}>
                        [{a.street[0].toUpperCase()}] {a.isHero ? 'Hero' : a.name} {a.action}{a.amount ? ' ' + a.amount.toLocaleString() : ''}
                        {j < h.allActions.length - 1 ? ' → ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main dashboard
  const a = analysis;
  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.title}>Real Money Stats</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleUpload} style={s.btn('#1a3a2a', '#27ae60')}>+ Add</button>
            <button onClick={onBack} style={s.btn('#0d1118', '#6b7b8d')}>Back</button>
          </div>
        </div>

        {/* Main stats */}
        <div style={s.statRow}>
          <div style={s.stat()}><div style={s.statVal('#c0d0e0')}>{a.totalHands}</div><div style={s.statLabel}>Hands</div></div>
          <div style={s.stat()}><div style={s.statVal(a.vpip <= 28 ? '#27ae60' : '#f39c12')}>{a.vpip}%</div><div style={s.statLabel}>VPIP</div></div>
          <div style={s.stat()}><div style={s.statVal('#3498db')}>{a.pfr}%</div><div style={s.statLabel}>PFR</div></div>
          <div style={s.stat()}><div style={s.statVal(a.vpipPfrGap <= 8 ? '#27ae60' : '#e74c3c')}>{a.vpipPfrGap}%</div><div style={s.statLabel}>V-P Gap</div></div>
        </div>

        <div style={s.statRow}>
          <div style={s.stat()}><div style={s.statVal('#e67e22')}>{a.limps}</div><div style={s.statLabel}>Limps</div></div>
          <div style={s.stat()}><div style={s.statVal('#9b59b6')}>{a.showdownCount}</div><div style={s.statLabel}>Showdowns</div></div>
          <div style={s.stat()}><div style={s.statVal('#e74c3c')}>{a.mistakes.length}</div><div style={s.statLabel}>Mistakes</div></div>
        </div>

        {/* Mistakes */}
        {a.mistakes.length > 0 && (
          <div style={s.card}>
            <div style={s.section}>Mistakes Found</div>
            {a.mistakes.slice(0, 10).map((m, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #141a22', fontSize: '12px' }}>
                <span style={{ color: '#e74c3c', fontWeight: 700 }}>{m.type}</span>
                <span style={{ color: '#8a9aaa', marginLeft: '8px' }}>{m.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Position Stats */}
        <div style={s.card}>
          <div style={s.section}>Position Stats</div>
          {Object.entries(a.positionStats).sort((a, b) => b[1].hands - a[1].hands).map(([pos, data]) => (
            <div key={pos} style={s.row}>
              <span style={{ color: '#ffd700', fontWeight: 700, width: '40px' }}>{pos}</span>
              <span style={{ color: '#6b7b8d' }}>{data.hands} hands</span>
              <span style={{ color: '#3498db' }}>VPIP {data.hands > 0 ? Math.round(data.vpip / data.hands * 100) : 0}%</span>
              <span style={{ color: data.won > 0 ? '#27ae60' : '#5a6a7a' }}>{data.won}W</span>
            </div>
          ))}
        </div>

        {/* Big Wins */}
        {a.bigWins.length > 0 && (
          <div style={s.card}>
            <div style={s.section}>Biggest Wins</div>
            {a.bigWins.map((h, i) => (
              <div key={i} style={s.row}>
                <span style={{ color: '#c0d0e0' }}>{h.position} {h.holeCards}</span>
                <span style={{ color: '#27ae60', fontWeight: 700 }}>+{h.potWon.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tournaments */}
        {a.tournaments.length > 0 && (
          <div style={s.card}>
            <div style={s.section}>Tournaments ({a.tournaments.length})</div>
            {a.tournaments.map((t, i) => (
              <div key={i} onClick={() => setSelectedTourney(t.id)} style={{
                ...s.row, cursor: 'pointer', padding: '8px 0',
              }}>
                <span style={{ color: '#c0d0e0' }}>#{t.id}</span>
                <span style={{ color: '#6b7b8d' }}>{t.hands} hands</span>
                <span style={{ color: '#ffd700' }}>View →</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

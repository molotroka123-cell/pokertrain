// DebriefScreen.jsx — Post-tournament debrief screen
import React, { useState } from 'react';
import HandReplay from '../replay/HandReplay.jsx';

const s = {
  container: { padding: '16px', maxWidth: '500px', margin: '0 auto' },
  header: {
    textAlign: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #1e2a3a',
  },
  title: { fontSize: '20px', fontWeight: 700, color: '#ffd700' },
  subtitle: { fontSize: '13px', color: '#6b7b8d', marginTop: '4px' },
  statsGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px',
  },
  stat: {
    background: '#111820', borderRadius: '10px', padding: '12px', textAlign: 'center',
    border: '1px solid #1e2a3a',
  },
  statLabel: { fontSize: '10px', color: '#6b7b8d', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statVal: { fontSize: '20px', fontWeight: 700, marginTop: '4px' },
  section: {
    background: '#111820', borderRadius: '12px', padding: '14px', marginBottom: '12px',
    border: '1px solid #1e2a3a',
  },
  sectionTitle: { fontSize: '14px', fontWeight: 700, color: '#ffd700', marginBottom: '10px' },
  mistakeCard: (severity) => ({
    padding: '12px', borderRadius: '8px', marginBottom: '8px',
    background: severity === 'critical' ? '#2a1010' : severity === 'high' ? '#2a2010' : '#1a2030',
    border: `1px solid ${severity === 'critical' ? '#5a2020' : severity === 'high' ? '#5a4020' : '#2a3a4a'}`,
    cursor: 'pointer',
  }),
  sevBadge: (severity) => ({
    fontSize: '10px', fontWeight: 700, display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
    background: severity === 'critical' ? '#e74c3c' : severity === 'high' ? '#f39c12' : '#2980b9',
    color: '#fff', marginRight: '6px',
  }),
  pattern: {
    padding: '10px', background: '#0d1118', borderRadius: '8px', marginBottom: '6px',
    border: '1px solid #1a2230',
  },
  summary: {
    padding: '14px', background: '#1a2a1a', borderRadius: '10px', marginBottom: '16px',
    border: '1px solid #2a4a2a', fontSize: '14px', color: '#c0d0e0', lineHeight: 1.6,
  },
  btn: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #1a5c3a, #27ae60)',
    border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '16px',
    cursor: 'pointer', marginTop: '8px',
  },
  exportBtn: {
    width: '100%', padding: '12px', background: '#1a2840', border: '1px solid #2a3a4a',
    borderRadius: '10px', color: '#8899aa', fontWeight: 600, fontSize: '13px',
    cursor: 'pointer', marginTop: '8px',
  },
};

export default function DebriefScreen({ debrief, finish, records, onClose, onExport, aiExploit }) {
  const [selectedMistake, setSelectedMistake] = useState(null);

  if (!debrief) return null;

  if (selectedMistake) {
    const rec = selectedMistake.decision;
    return (
      <div style={s.container}>
        <HandReplay
          hand={{
            handNumber: rec.handNumber,
            position: rec.position,
            holeCards: rec.holeCards,
            result: rec.handResult,
            potWon: rec.potWon,
            mistake: selectedMistake,
            actions: [],
          }}
          onClose={() => setSelectedMistake(null)}
        />
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>TOURNAMENT DEBRIEF</div>
        <div style={s.subtitle}>
          Finish: #{finish?.position || '?'}/{finish?.total || '?'} | Hands: {records?.length || 0}
          {finish?.apiCalls > 0 && (
            <span style={{ color: '#d4af37' }}> | AI calls: {finish.apiCalls} (~${(finish.apiCalls * 0.0005).toFixed(3)})</span>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div style={s.statsGrid}>
        <div style={s.stat}>
          <div style={s.statLabel}>Mistakes</div>
          <div style={{ ...s.statVal, color: debrief.totalMistakes > 5 ? '#e74c3c' : '#27ae60' }}>
            {debrief.totalMistakes}
          </div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>Critical</div>
          <div style={{ ...s.statVal, color: debrief.criticalMistakes > 0 ? '#e74c3c' : '#27ae60' }}>
            {debrief.criticalMistakes}
          </div>
        </div>
        <div style={s.stat}>
          <div style={s.statLabel}>EV Lost</div>
          <div style={{ ...s.statVal, color: '#f39c12' }}>
            ~{debrief.estimatedEVLost.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={s.summary}>{debrief.summary}</div>

      {/* Top mistakes */}
      {debrief.top5.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Top Mistakes</div>
          {debrief.top5.map((m, i) => (
            <div key={i} style={s.mistakeCard(m.severity)} onClick={() => setSelectedMistake(m)}>
              <div>
                <span style={s.sevBadge(m.severity)}>{m.severity}</span>
                <span style={{ fontSize: '13px', color: '#c0d0e0' }}>
                  Hand #{m.handNumber} — {m.type?.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#8899aa', marginTop: '4px' }}>
                {m.explanation?.what?.slice(0, 100)}...
              </div>
              <div style={{ fontSize: '11px', color: '#f39c12', marginTop: '4px' }}>
                EV lost: ~{m.evLost} | {m.drillRecommendation?.icon} {m.drillRecommendation?.drill}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patterns */}
      {debrief.patterns?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Detected Patterns</div>
          {debrief.patterns.map((p, i) => (
            <div key={i} style={s.pattern}>
              <div style={{ fontSize: '13px', color: p.severity === 'high' ? '#f39c12' : '#c0d0e0', lineHeight: 1.5 }}>
                {p.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chip Graph */}
      {records?.length > 5 && (() => {
        const handNums = [...new Map(records.map(r => [r.handNumber, r])).values()];
        const chips = handNums.filter(r => r.chipsAfter != null).map(r => r.chipsAfter);
        if (chips.length < 3) return null;
        const startChips = handNums[0]?.chipsBeforeHand || handNums[0]?.myChips || chips[0];
        const maxC = Math.max(...chips, startChips);
        const minC = Math.min(...chips);
        const range = maxC - minC || 1;
        const w = 300, h = 100;
        const points = chips.map((c, i) => `${(i / (chips.length - 1)) * w},${h - ((c - minC) / range) * h}`).join(' ');
        const startY = h - ((startChips - minC) / range) * h;
        return (
          <div style={s.section}>
            <div style={s.sectionTitle}>Stack Graph</div>
            <svg viewBox={`0 0 ${w} ${h + 10}`} style={{ width: '100%', height: '120px' }}>
              <line x1="0" y1={startY} x2={w} y2={startY} stroke="#3a4a5a" strokeWidth="0.5" strokeDasharray="4"/>
              <polyline points={points} fill="none" stroke={chips[chips.length - 1] >= startChips ? '#27ae60' : '#e74c3c'} strokeWidth="2"/>
              <text x="2" y={startY - 3} fill="#5a6a7a" fontSize="8">Start</text>
            </svg>
          </div>
        );
      })()}

      {/* Session Stats (HUD) */}
      {debrief.sessionStats && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Session Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
            {[
              { label: 'VPIP', val: debrief.sessionStats.vpip + '%', good: debrief.sessionStats.vpip >= 20 && debrief.sessionStats.vpip <= 30 },
              { label: 'PFR', val: debrief.sessionStats.pfr + '%', good: debrief.sessionStats.pfr >= 15 && debrief.sessionStats.pfr <= 25 },
              { label: 'AF', val: debrief.sessionStats.af, good: debrief.sessionStats.af >= 2 && debrief.sessionStats.af <= 4 },
              { label: 'WTSD%', val: debrief.sessionStats.wtsd + '%' },
              { label: 'W$SD%', val: debrief.sessionStats.wsd + '%', good: debrief.sessionStats.wsd >= 50 },
              { label: 'C-bet%', val: debrief.sessionStats.cbet + '%' },
              { label: 'Flop AF', val: debrief.sessionStats.flopAF || 0 },
              { label: 'Turn AF', val: debrief.sessionStats.turnAF || 0 },
              { label: 'River AF', val: debrief.sessionStats.riverAF || 0 },
              { label: 'Riv Bet%', val: (debrief.sessionStats.riverBetFreq || 0) + '%' },
            ].map((s2, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px', background: '#0d1118', borderRadius: '8px', border: '1px solid #1a2230' }}>
                <div style={{ fontSize: '10px', color: '#5a6a7a', textTransform: 'uppercase' }}>{s2.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: s2.good ? '#27ae60' : s2.good === false ? '#f39c12' : '#c0d0e0', marginTop: '2px' }}>{s2.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position Stats */}
      {debrief.positionStats && Object.keys(debrief.positionStats).length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Winrate by Position</div>
          {Object.entries(debrief.positionStats).sort((a, b) => b[1].avgProfit - a[1].avgProfit).map(([pos, data]) => (
            <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: '1px solid #1a2230' }}>
              <span style={{ color: '#8899aa', fontWeight: 600 }}>{pos}</span>
              <span style={{ color: '#6b7b8d' }}>{data.hands} hands</span>
              <span style={{ color: data.avgProfit >= 0 ? '#27ae60' : '#e74c3c', fontWeight: 700 }}>
                {data.avgProfit >= 0 ? '+' : ''}{data.avgProfit}/hand
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tournament Stage Analysis */}
      {debrief.stageAnalysis && Object.keys(debrief.stageAnalysis).length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Stage Analysis</div>
          {Object.entries(debrief.stageAnalysis).map(([stage, data]) => (
            <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', borderBottom: '1px solid #1a2230' }}>
              <span style={{ color: '#c0d0e0', fontWeight: 600, textTransform: 'capitalize' }}>{stage.replace('_', ' ')}</span>
              <span style={{ color: '#6b7b8d' }}>VPIP {data.vpip}% | PFR {data.pfr}%</span>
              <span style={{ color: data.mistakes > 0 ? '#f39c12' : '#27ae60' }}>{data.mistakes} err</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Exploit Report — What AI learned about you */}
      {debrief.tiltIndicator && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Tilt Analysis</div>
          <div style={{ fontSize: '12px', color: '#8899aa' }}>
            Avg decision: {debrief.tiltIndicator.avgDecisionTimeMs}ms
            {debrief.tiltIndicator.decisionTimeTrend && (
              <span> | 1st half: {debrief.tiltIndicator.decisionTimeTrend.firstHalf}ms → 2nd half: {debrief.tiltIndicator.decisionTimeTrend.secondHalf}ms</span>
            )}
          </div>
          {debrief.tiltIndicator.tiltDetected && (
            <div style={{ marginTop: '6px', padding: '8px', background: '#2a1010', borderRadius: '8px', border: '1px solid #5a2020' }}>
              <div style={{ fontSize: '12px', color: '#e74c3c', fontWeight: 700 }}>Tilt Detected</div>
              {debrief.tiltIndicator.tiltWindows.map((tw, i) => (
                <div key={i} style={{ fontSize: '11px', color: '#a08080', marginTop: '4px' }}>
                  Hands #{tw.lossStreakStart}-{tw.lossStreakEnd}: {tw.lossStreakLength} losses → {tw.speedupPct}% faster decisions, {tw.mistakesAfter} mistakes after
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Exploit Report */}
      {aiExploit && (
        <div style={s.section}>
          <div style={s.sectionTitle}>What AI Learned About You</div>
          {aiExploit.style && (
            <div style={{ fontSize: '14px', color: '#c0d0e0', marginBottom: '8px' }}>
              AI classified you as: <span style={{ color: '#d4af37', fontWeight: 700 }}>{aiExploit.style}</span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {aiExploit.vpip != null && (
              <div style={{ padding: '6px 10px', background: '#0d1118', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: '#6b7b8d' }}>VPIP: </span><span style={{ color: '#c0d0e0', fontWeight: 600 }}>{Math.round(aiExploit.vpip * 100)}%</span>
              </div>
            )}
            {aiExploit.pfr != null && (
              <div style={{ padding: '6px 10px', background: '#0d1118', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: '#6b7b8d' }}>PFR: </span><span style={{ color: '#c0d0e0', fontWeight: 600 }}>{Math.round(aiExploit.pfr * 100)}%</span>
              </div>
            )}
            {aiExploit.foldToCbet != null && (
              <div style={{ padding: '6px 10px', background: '#0d1118', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: '#6b7b8d' }}>Fold to c-bet: </span><span style={{ color: aiExploit.foldToCbet > 0.55 ? '#e74c3c' : '#c0d0e0', fontWeight: 600 }}>{Math.round(aiExploit.foldToCbet * 100)}%</span>
              </div>
            )}
            {aiExploit.threeBetDef != null && (
              <div style={{ padding: '6px 10px', background: '#0d1118', borderRadius: '8px', fontSize: '12px' }}>
                <span style={{ color: '#6b7b8d' }}>3-bet def: </span><span style={{ color: '#c0d0e0', fontWeight: 600 }}>{Math.round(aiExploit.threeBetDef * 100)}%</span>
              </div>
            )}
          </div>
          {aiExploit.exploits && aiExploit.exploits.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '11px', color: '#f39c12', fontWeight: 700, marginBottom: '4px' }}>AI Exploited:</div>
              {aiExploit.exploits.map((e, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#a08060', padding: '3px 0' }}>• {e}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <button onClick={onClose} style={s.btn}>Back to Lobby</button>
      {onExport && (
        <button onClick={onExport} style={s.exportBtn}>Export Session JSON (for Claude analysis)</button>
      )}
      <button onClick={() => {
        if (!records?.length) return;
        const hands = new Map();
        for (const r of records) {
          if (!hands.has(r.handNumber)) hands.set(r.handNumber, []);
          hands.get(r.handNumber).push(r);
        }
        let text = '';
        for (const [hn, recs] of hands) {
          const first = recs[0];
          text += `\n--- Hand #${hn} ---\n`;
          text += `Position: ${first.position} | Blinds: ${first.blinds} | Stack: ${first.myChips}\n`;
          text += `Cards: ${first.holeCards}\n`;
          for (const r of recs) {
            text += `  ${r.stage}: ${r.action}${r.raiseAmount ? ' ' + r.raiseAmount : ''}`;
            text += r.facingAction ? ` (vs ${r.facingAction.action} ${r.facingAction.amount || ''} from ${r.facingAction.position})` : '';
            text += r.community ? ` [${r.community}]` : '';
            text += ` | Equity: ${Math.round(r.equity * 100)}%`;
            text += r.mistakeType ? ` *** ${r.mistakeType} (EV lost: ${r.evLost}) ***` : '';
            text += '\n';
          }
          if (recs[recs.length - 1].handResult) text += `  Result: ${recs[recs.length - 1].handResult} | Pot: ${recs[recs.length - 1].potWon || 0}\n`;
        }
        navigator.clipboard?.writeText(text).then(() => alert('Hand history copied!')).catch(() => {});
      }} style={s.exportBtn}>Copy Hand History to Clipboard</button>
    </div>
  );
}

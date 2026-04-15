// DebriefScreen.jsx — Post-tournament debrief screen
import React, { useState } from 'react';
import HandReplay from '../replay/HandReplay.jsx';

const RANKS_ORDER = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

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

export default function DebriefScreen({ debrief, finish, records, onClose, onExport, aiExploit, onDrill }) {
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
            chipsAfter: rec.chipsAfter,
            chipsBeforeHand: rec.chipsBeforeHand,
            myChips: rec.myChips,
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
      {/* ═══ SESSION RESULT CARD ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1420, #101828)',
        borderRadius: '16px', padding: '24px 20px', marginBottom: '16px',
        border: '1px solid #1a2a3a', position: 'relative', overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '200px', borderRadius: '50%',
          background: finish?.position <= 3 ? 'radial-gradient(circle, rgba(212,175,55,0.15), transparent 70%)'
            : finish?.position <= Math.ceil((finish?.total || 100) * 0.15) ? 'radial-gradient(circle, rgba(39,174,96,0.1), transparent 70%)'
            : 'radial-gradient(circle, rgba(100,120,140,0.08), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ fontSize: '10px', color: '#4a5a6a', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>Tournament Result</div>
        <div style={{
          fontSize: '48px', fontWeight: 900, lineHeight: 1,
          color: finish?.position <= 3 ? '#ffd700' : finish?.position <= Math.ceil((finish?.total || 100) * 0.15) ? '#27ae60' : '#8a9aaa',
        }}>
          #{finish?.position || '?'}
        </div>
        <div style={{ fontSize: '13px', color: '#5a6a7a', marginTop: '4px' }}>
          of {finish?.total || '?'} players · {new Set(records?.map(r => r.handNumber)).size || 0} hands played
        </div>
        {debrief.prize > 0 && (
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffd700', marginTop: '6px' }}>
            +${debrief.prize.toLocaleString()} prize
          </div>
        )}
        {debrief.buyIn > 0 && (
          <div style={{ fontSize: '11px', color: '#5a6a7a', marginTop: '2px' }}>
            Buy-in: ${debrief.buyIn.toLocaleString()} | ROI: {debrief.prize > 0 ? `+${Math.round((debrief.prize / debrief.buyIn - 1) * 100)}%` : '-100%'}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: debrief.totalMistakes > 5 ? '#e74c3c' : '#27ae60' }}>{debrief.totalMistakes}</div>
            <div style={{ fontSize: '9px', color: '#4a5a6a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mistakes</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: debrief.criticalMistakes > 0 ? '#e74c3c' : '#27ae60' }}>{debrief.criticalMistakes}</div>
            <div style={{ fontSize: '9px', color: '#4a5a6a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Critical</div>
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f39c12' }}>~{debrief.estimatedEVLost.toLocaleString()}</div>
            <div style={{ fontSize: '9px', color: '#4a5a6a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EV Lost</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={s.summary}>{debrief.summary}</div>

      {/* AUTO-REVIEW: 3 worst hands with GTO comparison */}
      {debrief.top5?.length > 0 && (
        <div style={{ ...s.section, borderColor: '#5a2020' }}>
          <div style={s.sectionTitle}>Worst Hands — Auto Review</div>
          {debrief.top5.slice(0, 3).map((m, i) => (
            <div key={i} style={{ padding: '10px', background: '#0a0d12', borderRadius: '8px', marginBottom: '8px', border: '1px solid #1a1a22' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#e74c3c', marginBottom: '4px' }}>
                #{i + 1} — Hand {m.handNumber} ({m.type?.replace(/_/g, ' ')}) | EV lost: ~{m.evLost}
              </div>
              <div style={{ fontSize: '12px', color: '#8899aa', marginBottom: '6px' }}>
                {m.explanation?.what}
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                <div style={{ flex: 1, padding: '6px', background: '#1a1020', borderRadius: '6px', border: '1px solid #3a1a2a' }}>
                  <div style={{ color: '#8a5a6a', fontSize: '10px', fontWeight: 600 }}>YOUR ACTION</div>
                  <div style={{ color: '#e74c3c', fontWeight: 700, marginTop: '2px' }}>{m.decision?.action?.toUpperCase()}</div>
                </div>
                <div style={{ flex: 1, padding: '6px', background: '#1a2a1a', borderRadius: '6px', border: '1px solid #1a3a1a' }}>
                  <div style={{ color: '#5a8a5a', fontSize: '10px', fontWeight: 600 }}>GTO SAYS</div>
                  <div style={{ color: '#27ae60', fontWeight: 700, marginTop: '2px' }}>
                    {m.decision?.gtoAction?.toUpperCase() || '?'}
                    {m.decision?.solverResult?.bestFrequency ? ` (${m.decision.solverResult.bestFrequency}%)` : ''}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7b8d', marginTop: '6px' }}>
                {m.explanation?.why}
              </div>
            </div>
          ))}
        </div>
      )}

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
              <div style={{ fontSize: '11px', color: '#f39c12', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>EV lost: ~{m.evLost} | {m.drillRecommendation?.icon} {m.drillRecommendation?.drill}</span>
                {onDrill && m.drillRecommendation?.drill && (
                  <span onClick={(e) => { e.stopPropagation(); onDrill(m.mistakeType); }} style={{
                    padding: '3px 8px', background: '#1a3a1a', border: '1px solid #2a5a2a',
                    borderRadius: '6px', fontSize: '10px', color: '#27ae60', fontWeight: 700,
                    cursor: 'pointer',
                  }}>Practice</span>
                )}
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
            <svg viewBox={`0 0 ${w} ${h + 24}`} style={{ width: '100%', height: '150px' }}>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map(pct => (
                <line key={pct} x1="0" y1={h * (1 - pct)} x2={w} y2={h * (1 - pct)} stroke="#141a22" strokeWidth="0.5"/>
              ))}
              {/* Start line */}
              <line x1="0" y1={startY} x2={w} y2={startY} stroke="#3a4a5a" strokeWidth="0.5" strokeDasharray="4"/>
              {/* Stage markers */}
              {(() => {
                try {
                  const stages = [];
                  let lastStage = '';
                  handNums.forEach((r, i) => {
                    const st = r.isFinalTable ? 'FT' : r.isBubble ? 'Bubble' : r.blindLevel >= 8 ? 'Late' : r.blindLevel >= 4 ? 'Mid' : 'Early';
                    if (st !== lastStage) { stages.push({ i, stage: st }); lastStage = st; }
                  });
                  return stages.map(({ i, stage }) => {
                    const x = (i / Math.max(chips.length - 1, 1)) * w;
                    const colors = { Early: '#27ae60', Mid: '#f39c12', Late: '#e74c3c', Bubble: '#e74c3c', FT: '#ffd700' };
                    return <g key={i}>
                      <line x1={x} y1="0" x2={x} y2={h} stroke={colors[stage] || '#3a4a5a'} strokeWidth="0.5" strokeDasharray="2"/>
                      <text x={x + 2} y={h + 10} fill={colors[stage] || '#5a6a7a'} fontSize="7" fontWeight="600">{stage}</text>
                    </g>;
                  });
                } catch(e) { return null; }
              })()}
              {/* Gradient fill under the line */}
              <defs>
                <linearGradient id="chipFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chips[chips.length - 1] >= startChips ? '#27ae6040' : '#e74c3c40'}/>
                  <stop offset="100%" stopColor="transparent"/>
                </linearGradient>
              </defs>
              <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#chipFill)"/>
              {/* Actual chip line */}
              <polyline points={points} fill="none" stroke={chips[chips.length - 1] >= startChips ? '#27ae60' : '#e74c3c'} strokeWidth="2.5" strokeLinecap="round"/>
              {/* EV line */}
              {(() => {
                try {
                  let cumEV = startChips;
                  const evPoints = handNums.filter(r => r.chipsAfter != null).map((r, i) => {
                    cumEV += (r.evOfCall || 0);
                    const clampedEV = Math.max(minC, Math.min(maxC, cumEV));
                    return `${(i / Math.max(chips.length - 1, 1)) * w},${h - ((clampedEV - minC) / range) * h}`;
                  }).join(' ');
                  return <polyline points={evPoints} fill="none" stroke="#3498db" strokeWidth="1.5" strokeDasharray="4" opacity="0.6"/>;
                } catch(e) { return null; }
              })()}
              {/* Peak marker */}
              {(() => {
                const peakIdx = chips.indexOf(maxC);
                const peakX = (peakIdx / Math.max(chips.length - 1, 1)) * w;
                return <circle cx={peakX} cy={h - ((maxC - minC) / range) * h} r="3" fill="#ffd700" stroke="#0a0d12" strokeWidth="1"/>;
              })()}
              <text x="2" y={startY - 3} fill="#5a6a7a" fontSize="7">Start {startChips.toLocaleString()}</text>
              {/* Legend */}
              <line x1={w - 50} y1={h + 16} x2={w - 38} y2={h + 16} stroke="#27ae60" strokeWidth="2"/>
              <text x={w - 36} y={h + 19} fill="#5a6a7a" fontSize="6">Chips</text>
              <line x1={w - 20} y1={h + 16} x2={w - 10} y2={h + 16} stroke="#3498db" strokeWidth="1.5" strokeDasharray="2"/>
              <text x={w - 8} y={h + 19} fill="#5a6a7a" fontSize="6">EV</text>
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
              { label: 'V-P Gap', val: (debrief.sessionStats.vpipPfrGap || 0) + '%', good: (debrief.sessionStats.vpipPfrGap || 0) <= 6 },
              { label: 'Call Stn', val: (debrief.sessionStats.callingStationScore || 0) + '%', good: (debrief.sessionStats.callingStationScore || 0) <= 55 },
              { label: 'Quality', val: debrief.sessionStats.leakScore || 0, good: (debrief.sessionStats.leakScore || 0) >= 70 },
              { label: 'Fld cbet', val: (debrief.sessionStats.foldToCbet || 0) + '%', good: (debrief.sessionStats.foldToCbet || 0) <= 50 },
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

      {/* Tournament Stage Analysis — Visual */}
      {debrief.stageAnalysis && Object.keys(debrief.stageAnalysis).length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Stage Breakdown</div>
          {Object.entries(debrief.stageAnalysis).map(([stage, data]) => {
            const stageColors = { early: '#27ae60', middle: '#3498db', late: '#f39c12', bubble: '#e74c3c', final_table: '#ffd700' };
            const color = stageColors[stage] || '#6b7b8d';
            const stageNames = { early: 'Early Game', middle: 'Mid Game', late: 'Late Game', bubble: 'Bubble', final_table: 'Final Table' };
            return (
              <div key={stage} style={{ marginBottom: '10px', padding: '10px', background: '#0a0d12', borderRadius: '10px', border: '1px solid #141a22' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color }}>{stageNames[stage] || stage}</span>
                  <span style={{ fontSize: '10px', color: '#5a6a7a' }}>{data.hands} hands | M≈{data.avgM || '?'}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  {/* VPIP bar with GTO target */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '9px', color: '#4a5a6a' }}>VPIP</span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: (data.vpip >= 18 && data.vpip <= 32) ? '#27ae60' : data.vpip > 40 ? '#e74c3c' : '#f39c12' }}>{data.vpip}%</span>
                    </div>
                    <div style={{ height: '10px', background: '#141a22', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ height: '100%', width: `${Math.min(data.vpip || 0, 100)}%`, background: (data.vpip >= 18 && data.vpip <= 32) ? 'linear-gradient(90deg, #1a5a30, #27ae60)' : data.vpip > 40 ? 'linear-gradient(90deg, #8a2020, #e74c3c)' : 'linear-gradient(90deg, #8a6a10, #f39c12)', borderRadius: '5px', transition: 'width 0.5s' }}/>
                      {/* GTO target marker at 25% */}
                      <div style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, width: '2px', background: '#27ae6088', borderRadius: '1px' }}/>
                    </div>
                  </div>
                  {/* PFR bar with GTO target */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '9px', color: '#4a5a6a' }}>PFR</span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: (data.pfr >= 14 && data.pfr <= 26) ? '#27ae60' : data.pfr > 35 ? '#e74c3c' : '#f39c12' }}>{data.pfr}%</span>
                    </div>
                    <div style={{ height: '10px', background: '#141a22', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ height: '100%', width: `${Math.min(data.pfr || 0, 100)}%`, background: (data.pfr >= 14 && data.pfr <= 26) ? 'linear-gradient(90deg, #1a5a30, #27ae60)' : data.pfr > 35 ? 'linear-gradient(90deg, #8a2020, #e74c3c)' : 'linear-gradient(90deg, #8a6a10, #f39c12)', borderRadius: '5px', transition: 'width 0.5s' }}/>
                      <div style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: '2px', background: '#27ae6088', borderRadius: '1px' }}/>
                    </div>
                  </div>
                  {/* Errors badge */}
                  <div style={{ minWidth: '52px', textAlign: 'center', padding: '4px 6px', borderRadius: '8px', background: data.mistakes > 3 ? '#2a0a0a' : data.mistakes > 0 ? '#1a1a0a' : '#0a1a0a', border: `1px solid ${data.mistakes > 3 ? '#5a1a1a' : data.mistakes > 0 ? '#3a3a1a' : '#1a3a1a'}` }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: data.mistakes > 3 ? '#e74c3c' : data.mistakes > 0 ? '#f39c12' : '#27ae60' }}>{data.mistakes}</div>
                    <div style={{ fontSize: '7px', color: '#5a6a7a' }}>errors</div>
                    {data.evLost > 0 && <div style={{ fontSize: '8px', color: '#e74c3c', marginTop: '1px' }}>-{Math.round(data.evLost / 1000)}K</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Exploit Report — What AI learned about you */}
      {/* Error Heatmap — 13x13 hands colored by mistake frequency */}
      {records?.length > 10 && (() => {
        try {
          const errMap = {};
          for (const r of records) {
            if (!r.holeCards || !r.mistakeType) continue;
            const parts = r.holeCards.split(' ');
            if (parts.length < 2) continue;
            const r1 = parts[0][0], r2 = parts[1][0], suited = parts[0][1] === parts[1][1];
            const key = r1 === r2 ? r1+r2 : suited ? (RANKS_ORDER.indexOf(r1) < RANKS_ORDER.indexOf(r2) ? r1+r2+'s' : r2+r1+'s') : (RANKS_ORDER.indexOf(r1) < RANKS_ORDER.indexOf(r2) ? r1+r2+'o' : r2+r1+'o');
            errMap[key] = (errMap[key] || 0) + 1;
          }
          if (Object.keys(errMap).length < 2) return null;
          const maxErr = Math.max(...Object.values(errMap));
          return (
            <div style={s.section}>
              <div style={s.sectionTitle}>Error Heatmap</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '1px', justifyContent: 'center' }}>
                {RANKS_ORDER.map((r1, row) => RANKS_ORDER.map((r2, col) => {
                  const isPair = row === col, isSuited = row < col;
                  // In 13x13 grid: upper triangle = suited, lower = offsuit
                  // RANKS_ORDER[0]=A (strongest). row < col means r1 is stronger rank
                  // Label: always higher rank first (e.g. T5o not 5To)
                  const label = isPair ? r1+r2 : isSuited ? r1+r2+'s' : r2+r1+'o';
                  const errs = errMap[label] || 0;
                  const intensity = maxErr > 0 ? errs / maxErr : 0;
                  const bg = errs === 0 ? '#0a1a0a' : `rgba(231,76,60,${0.15 + intensity * 0.7})`;
                  return (
                    <div key={`${row}-${col}`} style={{
                      width: '100%', aspectRatio: '1', background: bg, borderRadius: '1px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '6px', color: errs > 0 ? '#fff' : '#2a3a2a', fontWeight: 600,
                    }}>{label}</div>
                  );
                }))}
              </div>
              <div style={{ fontSize: '10px', color: '#5a6a7a', textAlign: 'center', marginTop: '6px' }}>
                Red = frequent mistakes | Green = clean
              </div>
            </div>
          );
        } catch(e) { return null; }
      })()}

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

      {/* Leak Comparison vs Population */}
      {debrief.sessionStats && (
        <div style={s.section}>
          <div style={s.sectionTitle}>You vs Average Reg (NL50)</div>
          {[
            { label: 'VPIP', yours: debrief.sessionStats.vpip, reg: 24, unit: '%' },
            { label: 'PFR', yours: debrief.sessionStats.pfr, reg: 19, unit: '%' },
            { label: 'AF', yours: debrief.sessionStats.af, reg: 3.0, unit: '' },
            { label: 'Fold to Cbet', yours: debrief.sessionStats.foldToCbet, reg: 45, unit: '%' },
            { label: 'C-bet', yours: debrief.sessionStats.cbet, reg: 65, unit: '%' },
            { label: 'WTSD', yours: debrief.sessionStats.wtsd, reg: 28, unit: '%' },
            { label: 'V-P Gap', yours: debrief.sessionStats.vpipPfrGap, reg: 5, unit: '%' },
          ].map((s2, i) => {
            const diff = (s2.yours || 0) - s2.reg;
            const bad = Math.abs(diff) > (s2.reg * 0.3);
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #141a22', fontSize: '12px' }}>
                <span style={{ color: '#8899aa', flex: 1 }}>{s2.label}</span>
                <span style={{ color: bad ? '#e74c3c' : '#c0d0e0', fontWeight: 700, width: '55px', textAlign: 'right' }}>{s2.yours || 0}{s2.unit}</span>
                <span style={{ color: '#3a4a5a', width: '20px', textAlign: 'center' }}>vs</span>
                <span style={{ color: '#27ae60', width: '55px', textAlign: 'right' }}>{s2.reg}{s2.unit}</span>
                <span style={{ color: diff > 0 ? '#f39c12' : '#3498db', width: '55px', textAlign: 'right', fontSize: '11px' }}>
                  {diff > 0 ? '+' : ''}{typeof diff === 'number' ? diff.toFixed(s2.unit ? 0 : 1) : '?'}
                </span>
              </div>
            );
          })}
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
      <button onClick={() => {
        if (!records?.length) return;
        // Generate PokerStars-compatible hand history for GTO Wizard import
        const hands = new Map();
        for (const r of records) {
          if (!hands.has(r.handNumber)) hands.set(r.handNumber, []);
          hands.get(r.handNumber).push(r);
        }
        let hh = '';
        for (const [hn, recs] of hands) {
          const first = recs[0];
          hh += `PokerStars Hand #${hn}: Hold'em No Limit (${first.blinds || '?'}) - ${new Date(first.timestamp).toISOString()}\n`;
          hh += `Table 'Pokertrain' 9-max Seat #1 is the button\n`;
          hh += `Seat 1: Hero (${first.myChips || 0} in chips)\n`;
          hh += `*** HOLE CARDS ***\nDealt to Hero [${first.holeCards || '??'}]\n`;
          let lastStreet = 'preflop';
          for (const r of recs) {
            if (r.stage !== lastStreet) {
              if (r.stage === 'flop') hh += `*** FLOP *** [${r.community || ''}]\n`;
              else if (r.stage === 'turn') hh += `*** TURN *** [${r.community || ''}]\n`;
              else if (r.stage === 'river') hh += `*** RIVER *** [${r.community || ''}]\n`;
              lastStreet = r.stage;
            }
            hh += `Hero: ${r.action}${r.raiseAmount ? ' ' + r.raiseAmount : r.toCall > 0 && r.action === 'call' ? ' ' + r.toCall : ''}\n`;
          }
          const last = recs[recs.length - 1];
          if (last.handResult) hh += `*** SUMMARY ***\nTotal pot ${last.potSize || 0}\nHero ${last.handResult}\n`;
          hh += '\n\n';
        }
        const blob = new Blob([hh], { type: 'text/plain' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = `pokertrain_hands_${Date.now()}.txt`; a.click();
      }} style={s.exportBtn}>Download for GTO Wizard (.txt)</button>

      {/* GTO Wizard Study Cards */}
      {debrief.top5?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Study in GTO Wizard</div>
          <div style={{ fontSize: '11px', color: '#5a6a7a', marginBottom: '10px' }}>
            Open GTO Wizard → Solutions → Enter these spots
          </div>
          {debrief.top5.slice(0, 5).map((m, i) => {
            const d = m.decision || {};
            const stackBB = Math.round((d.myChips || 0) / Math.max(200, 1));
            return (
              <div key={i} style={{ background: '#0a0d12', borderRadius: '8px', padding: '10px', marginBottom: '6px', border: '1px solid #141a22', fontSize: '12px' }}>
                <div style={{ color: '#e8d48b', fontWeight: 700, marginBottom: '4px' }}>#{m.handNumber} — {m.type?.replace(/_/g, ' ')} <span style={{ color: '#e74c3c' }}>(-{m.evLost})</span></div>
                <div style={{ color: '#8899aa' }}>{d.holeCards} | {d.position} vs {d.facingAction?.position || '?'} | {d.community || 'preflop'}</div>
                <div style={{ color: '#6b7b8d', marginTop: '2px' }}>Stack: {stackBB}BB | Pot: {d.potSize} | To call: {d.toCall}</div>
                <div style={{ marginTop: '4px' }}><span style={{ color: '#e74c3c' }}>You: {d.action}</span> → <span style={{ color: '#27ae60' }}>GTO: {d.gtoAction}</span></div>
              </div>
            );
          })}
          <a href="https://gtowizard.com" target="_blank" rel="noopener noreferrer" style={{
            display: 'block', textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg, #1a3a6c, #2980b9)',
            borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none', marginTop: '8px',
          }}>Open GTO Wizard →</a>
        </div>
      )}

      {/* Claude AI Deep Analysis */}
      {(() => {
        const [aiText, setAiText] = React.useState(null);
        const [loading, setLoading] = React.useState(false);
        return (
          <>
            <button onClick={async () => {
              if (loading) return;
              setLoading(true);
              try {
                const trimmed = (records || []).slice(0, 50).map(r => ({
                  h: r.handNumber, s: r.stage, p: r.position, cards: r.holeCards,
                  board: r.community, pot: r.potSize, call: r.toCall, act: r.action,
                  eq: r.equity, err: r.mistakeType, ev: r.evLost, hand: r.madeHandStrength,
                }));
                const res = await fetch('/api/claude', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000,
                    messages: [{ role: 'user', content: `Ты покерный GTO-тренер. Анализ на русском. Найди ошибки и дай 3 задания.\n${JSON.stringify(trimmed)}` }] }),
                });
                if (!res.ok) throw new Error('API ' + res.status);
                const data = await res.json();
                setAiText(data.content?.[0]?.text || 'Нет ответа');
              } catch (e) { setAiText('Ошибка: ' + e.message + '. Нужен ANTHROPIC_API_KEY в Vercel.'); }
              setLoading(false);
            }} disabled={loading} style={{
              ...s.exportBtn, background: loading ? '#1a2230' : 'linear-gradient(135deg, #6c5ce7, #a855f7)',
              color: '#fff', fontWeight: 700, border: 'none', opacity: loading ? 0.6 : 1,
            }}>{loading ? '⏳ Анализирую...' : '🧠 Deep Analysis (Claude AI ~$0.03)'}</button>
            {aiText && (
              <div style={{ background: '#0d1118', borderRadius: '12px', padding: '14px', marginTop: '8px', border: '1px solid #6c5ce7', fontSize: '13px', color: '#c0d0e0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#a855f7', marginBottom: '6px' }}>🧠 Claude AI</div>
                {aiText}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

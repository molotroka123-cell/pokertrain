// DrillHubV2.jsx — IceCrown Engine 2.0 unified training hub.
// Replaces V1 DrillMenu + LeakDrillHome with one premium catalog by tier.
import React, { useMemo, useState } from 'react';
import { C, GRAD, SH, R, SP, F, EASE, DUR } from '../ui/tokens.js';
import {
  Btn, Panel, TopBar, ProgressRing, Screen, SectionTitle, Badge, ListItem, useCountUp,
} from '../ui/kit.jsx';
import { generateDailyPlan } from '../../drills/dailyPlanGenerator.js';
import { TIERS, CATALOG, getCatalogProgress } from './catalog.js';

function pctColor(pct) {
  if (pct >= 80) return C.green;
  if (pct >= 60) return C.orange;
  return C.red;
}

function readTotalXP() {
  try {
    const v = parseInt(localStorage.getItem('pokertrain_total_xp') || '0', 10);
    return Number.isFinite(v) ? v : 0;
  } catch (_) {
    return 0;
  }
}

export default function DrillHubV2({ onLaunch, onBack }) {
  const [filter, setFilter] = useState('all');

  const progress = useMemo(() => {
    try { return getCatalogProgress() || {}; } catch (_) { return {}; }
  }, []);

  const plan = useMemo(() => {
    try { return generateDailyPlan(); } catch (_) { return { drills: [], duration: 0, recommendation: '', focusAreas: [] }; }
  }, []);

  const totalXP = useMemo(readTotalXP, []);
  const xpTick = useCountUp(totalXP, 900);

  const { totalSessions, avgAcc, playedCount } = useMemo(() => {
    const entries = Object.values(progress);
    const sessions = entries.reduce((s, p) => s + (p?.sessions || 0), 0);
    const withPct = entries.filter(p => p && typeof p.pct === 'number');
    const acc = withPct.length
      ? Math.round(withPct.reduce((s, p) => s + p.pct, 0) / withPct.length)
      : 0;
    return { totalSessions: sessions, avgAcc: acc, playedCount: entries.length };
  }, [progress]);

  // Map a daily-plan legacy drill id → catalog entry
  const planEntries = useMemo(() => {
    const drills = (plan && plan.drills) || [];
    return drills
      .map(d => {
        const entry = CATALOG.find(e => e.kind === 'legacy' && e.target === d.id);
        return entry ? { entry, planDrill: d } : null;
      })
      .filter(Boolean);
  }, [plan]);

  const visibleTiers = TIERS.filter(t => filter === 'all' || filter === t.id);

  const launch = (entry) => {
    if (entry && typeof onLaunch === 'function') onLaunch(entry);
  };

  // Global row index for stagger across all sections
  let rowIdx = 0;

  const chips = [{ id: 'all', name: 'ALL', color: C.text }, ...TIERS];

  return (
    <Screen scroll pad>
      <TopBar
        title="Training"
        subtitle={`${CATALOG.length} drills · ${playedCount} started`}
        onBack={onBack}
      />

      {/* ── Hero: overall stats ── */}
      <Panel glow style={{ marginTop: SP.md, marginBottom: SP.lg, padding: SP.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.lg }}>
          <ProgressRing pct={avgAcc} size={84} stroke={7} color={pctColor(avgAcc)} label={`${avgAcc}%`} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...F.micro, color: C.textFaint }}>Overall Accuracy</div>
            <div style={{ display: 'flex', gap: SP.xl, marginTop: SP.sm }}>
              <div>
                <div style={{ ...F.micro, color: C.textDim }}>Total XP</div>
                <div style={{
                  ...F.h2, ...F.num, marginTop: 2,
                  background: GRAD.goldText, WebkitBackgroundClip: 'text',
                  backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent',
                }}>
                  {xpTick.toLocaleString ? xpTick.toLocaleString() : xpTick}
                </div>
              </div>
              <div>
                <div style={{ ...F.micro, color: C.textDim }}>Sessions</div>
                <div style={{ ...F.h2, ...F.num, color: C.cyan, marginTop: 2 }}>{totalSessions}</div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Daily Plan ── */}
      {planEntries.length > 0 && (
        <Panel tint="gold" style={{ marginBottom: SP.lg, padding: SP.lg }}>
          <div style={{ ...F.micro, color: C.gold, marginBottom: SP.sm }}>
            ⭐ Recommended for you today
          </div>
          {plan.recommendation ? (
            <div style={{ ...F.body, color: C.textDim, marginBottom: SP.md }}>
              {plan.recommendation}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: SP.sm, flexWrap: 'wrap' }}>
            {planEntries.map(({ entry, planDrill }) => (
              <Btn
                key={entry.id}
                variant="gold"
                size="sm"
                onClick={() => launch(entry)}
              >
                {entry.icon} {entry.name} · {planDrill.duration}m
              </Btn>
            ))}
          </div>
          <div style={{ ...F.small, color: C.textFaint, marginTop: SP.md }}>
            ~{plan.duration} min total
            {plan.focusAreas && plan.focusAreas.length > 0
              ? ` · Focus: ${plan.focusAreas.slice(0, 3).join(', ')}`
              : ''}
          </div>
        </Panel>
      )}

      {/* ── Filter chips ── */}
      <div style={{
        display: 'flex', gap: SP.sm, marginBottom: SP.lg,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2,
      }}>
        {chips.map(chip => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              style={{
                flex: '0 0 auto',
                padding: '10px 16px',
                minHeight: 44,
                borderRadius: R.pill,
                border: `1px solid ${active ? C.gold : C.line}`,
                background: active ? GRAD.gold : C.surface,
                color: active ? '#1a1408' : C.textDim,
                boxShadow: active ? SH.goldGlow : 'none',
                fontFamily: F.family,
                ...F.micro,
                fontSize: 10,
                cursor: 'pointer',
                transition: `all ${DUR.base}ms ${EASE.out}`,
                transform: active ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {chip.id === 'all' ? 'ALL' : `${chip.icon} ${chip.name}`}
            </button>
          );
        })}
      </div>

      {/* ── Tier sections ── */}
      {visibleTiers.map(tier => {
        const items = CATALOG.filter(e => e.tier === tier.id);
        if (items.length === 0) return null;
        return (
          <div key={`${tier.id}-${filter}`} style={{ marginBottom: SP.xl }}>
            <SectionTitle
              right={<Badge color={tier.color}>{items.length}</Badge>}
            >
              <span style={{ color: tier.color }}>{tier.icon}</span> {tier.name}
            </SectionTitle>

            {items.map(entry => {
              const p = progress[entry.id];
              const i = rowIdx++;
              return (
                <div
                  key={`${entry.id}-${filter}`}
                  style={{
                    animation: `ic-slide-up ${DUR.slow}ms ${EASE.out} both`,
                    animationDelay: `${Math.min(i * 45, 600)}ms`,
                    marginBottom: SP.sm,
                  }}
                >
                  <ListItem
                    icon={entry.icon}
                    iconBg={`${entry.color}22`}
                    title={entry.name}
                    desc={entry.desc}
                    isNew={entry.tier === 'leaklab' && !p}
                    badge={p ? `${p.sessions} plays` : null}
                    right={
                      p ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
                          <Badge color={pctColor(p.pct)}>{p.pct}%</Badge>
                          <span style={{ color: C.textFaint, fontSize: 16 }}>›</span>
                        </div>
                      ) : (
                        <span style={{ color: C.textFaint, fontSize: 16 }}>›</span>
                      )
                    }
                    onClick={() => launch(entry)}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </Screen>
  );
}

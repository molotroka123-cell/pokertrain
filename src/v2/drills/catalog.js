// catalog.js — IceCrown Engine 2.0 unified training catalog
// Single source of truth for every training in the app, organized by tier.
// kind: 'legacy' → V1 drill launched via DRILL_MAP (target = legacy drill id)
//       'leak'   → leak drill from src/drills/leak/ (target = leak drill id)
//       'screen' → standalone screen (target = screen key)

import { getDrillProgress } from '../../drills/dailyPlanGenerator.js';
import { getLeakProgress } from '../../drills/leak/engine/SessionStats.js';
import { C } from '../ui/tokens.js';

// ─── Tiers ───
export const TIERS = [
  { id: 'core',     name: 'CORE SKILLS', color: C.cyan,   icon: '🎯' },
  { id: 'leaklab',  name: 'LEAK LAB',    color: C.gold,   icon: '🔬' },
  { id: 'advanced', name: 'ADVANCED',    color: C.purple, icon: '⚡' },
  { id: 'tools',    name: 'TOOLS',       color: C.green,  icon: '🛠' },
];

// ─── Catalog ───
export const CATALOG = [
  // ── CORE SKILLS ──
  { id: 'core_rfi',      tier: 'core', name: 'RFI Drill',      desc: 'Open or fold from each position',        icon: '🎯', color: '#27ae60', kind: 'legacy', target: 'rfi' },
  { id: 'core_3bet',     tier: 'core', name: '3-Bet Drill',    desc: '3-bet, call, or fold vs opens',          icon: '🔥', color: '#f39c12', kind: 'legacy', target: '3bet' },
  { id: 'core_bbdef',    tier: 'core', name: 'BB Defense',     desc: 'Defend your big blind correctly',        icon: '🛡', color: '#2980b9', kind: 'legacy', target: 'bbdef' },
  { id: 'core_pushfold', tier: 'core', name: 'Push/Fold',      desc: 'Nash charts for short stacks',           icon: '💣', color: '#e74c3c', kind: 'legacy', target: 'pushfold' },
  { id: 'core_potodds',  tier: 'core', name: 'Pot Odds Quiz',  desc: 'Calculate pot odds + outs',              icon: '🧮', color: '#3498db', kind: 'legacy', target: 'potodds' },

  // ── LEAK LAB (12 targeted leak drills) ──
  { id: 'leak_broadway_chase',   tier: 'leaklab', name: 'Broadway Chase',   desc: 'KJ/AT/AJ dominated calls vs big aggression',       icon: '♠',  color: '#e74c3c', kind: 'leak', target: 'broadway_chase' },
  { id: 'leak_sb_play',          tier: 'leaklab', name: 'SB Play',          desc: 'Open, iso sizing, 3-bet, defend from Small Blind', icon: '♦',  color: '#f39c12', kind: 'leak', target: 'sb_play' },
  { id: 'leak_multiway_cbet',    tier: 'leaklab', name: 'Multi-way Cbet',   desc: 'Discipline in 3+ way pots — check or bet?',        icon: '♣',  color: '#27ae60', kind: 'leak', target: 'multiway_cbet' },
  { id: 'leak_iso_sizing',       tier: 'leaklab', name: 'Iso Sizing',       desc: 'Rule #19: 1 limper = 4x, 2 = 5x, 3 = 6x',          icon: '↑',  color: '#3498db', kind: 'leak', target: 'iso_sizing' },
  { id: 'leak_push_fold_nash',   tier: 'leaklab', name: 'Push/Fold Nash',   desc: 'Short stack 10-15BB mathematical Nash ranges',      icon: '💣', color: '#9b59b6', kind: 'leak', target: 'push_fold_nash' },
  { id: 'leak_bb_defend',        tier: 'leaklab', name: 'BB Defend',        desc: 'Close action with pot odds — defend wide',         icon: '🛡', color: '#1abc9c', kind: 'leak', target: 'bb_defend' },
  { id: 'leak_threebet_pot_oop', tier: 'leaklab', name: '3BP OOP Cbet',     desc: 'Range advantage in 3-bet pots OOP',                icon: '▲',  color: '#e67e22', kind: 'leak', target: 'threebet_pot_oop' },
  { id: 'leak_bubble_overfold',  tier: 'leaklab', name: 'Bubble ICM',       desc: 'Not too tight, not too loose on bubble',           icon: '⚠',  color: '#c0392b', kind: 'leak', target: 'bubble_overfold' },
  { id: 'leak_set_wet_board',    tier: 'leaklab', name: 'Set on Wet Board', desc: 'Fast-play sets vs completed draws',                icon: '✦',  color: '#16a085', kind: 'leak', target: 'set_wet_board' },
  { id: 'leak_paired_board',     tier: 'leaklab', name: 'Paired Board',     desc: 'Trips, overpair, double-paired navigation',        icon: '⋮⋮', color: '#8e44ad', kind: 'leak', target: 'paired_board' },
  { id: 'leak_river_sizing',     tier: 'leaklab', name: 'River Sizing',     desc: 'Thin value, nuts overbet, bluff balance',          icon: '➡',  color: '#d35400', kind: 'leak', target: 'river_sizing' },
  { id: 'leak_deep_cash',        tier: 'leaklab', name: 'Deep Cash (200+)', desc: 'Implied odds, 4/5-bet lines deep',                 icon: '∞',  color: '#2980b9', kind: 'leak', target: 'deep_cash' },

  // ── ADVANCED ──
  { id: 'adv_solverpf',     tier: 'advanced', name: 'Solver Push/Fold',  desc: 'Nash ICM — 7 stacks, push + call, weak spots', icon: '♠',  color: '#ff4444', kind: 'legacy', target: 'solverpf' },
  { id: 'adv_multiway',     tier: 'advanced', name: 'Multiway Postflop', desc: '3-way flop decisions — check or bet?',         icon: '👥', color: '#16a085', kind: 'legacy', target: 'multiway' },
  { id: 'adv_drawcomplete', tier: 'advanced', name: '3-Way River: Draws', desc: 'Фолд когда доехало, вэлью на scary борде',    icon: '🌊', color: '#e53935', kind: 'legacy', target: 'drawcomplete' },
  { id: 'adv_threebetpot',  tier: 'advanced', name: '3-Bet Pot Lines',   desc: 'IP/OOP play in 3-bet pots',                    icon: '⚡', color: '#8e44ad', kind: 'legacy', target: 'threebetpot' },
  { id: 'adv_ahighcbet',    tier: 'advanced', name: 'A-high Cbet',       desc: 'Automate cbet on A-high flops',                icon: '🅰', color: '#1a5490', kind: 'legacy', target: 'ahighcbet' },
  { id: 'adv_postflop',     tier: 'advanced', name: 'Postflop Spots',    desc: '25+ real postflop scenarios',                  icon: '🃏', color: '#9b59b6', kind: 'legacy', target: 'postflop' },
  { id: 'adv_sizing',       tier: 'advanced', name: 'Bet Sizing',        desc: 'Choose optimal bet size',                      icon: '📏', color: '#1abc9c', kind: 'legacy', target: 'sizing' },
  { id: 'adv_river',        tier: 'advanced', name: 'River Decisions',   desc: 'Value bet, bluff, or check/call river',        icon: '🌊', color: '#e67e22', kind: 'legacy', target: 'river' },

  // ── TOOLS ──
  { id: 'tool_personalized', tier: 'tools', name: 'Your Weak Spots',      desc: 'Drills from your actual mistakes',              icon: '🔍', color: '#e74c3c', kind: 'legacy', target: 'personalized' },
  { id: 'tool_custom',       tier: 'tools', name: 'Custom Drill',         desc: 'Build your own: pick position, stack, street',  icon: '🔧', color: '#6a8aaa', kind: 'legacy', target: 'custom' },
  { id: 'tool_handhistory',  tier: 'tools', name: 'Hand History Import',  desc: 'Load .txt hand histories to detect real leaks', icon: '📁', color: '#4ac8ff', kind: 'screen', target: 'handhistory' },
  { id: 'tool_drillhistory', tier: 'tools', name: 'Progress History',     desc: 'Weekly heatmap, EV trends, per-drill stats',    icon: '📈', color: '#8b5cf6', kind: 'screen', target: 'drillhistory' },
];

// ─── Progress merge ───
// Returns { [catalogId]: { pct, sessions } } for every catalog entry that has
// recorded progress. Legacy drills read pokertrain_drill_progress; leak drills
// read pokertrain_leak_drill_stats. Screens never have progress.
export function getCatalogProgress() {
  const out = {};

  let legacy = {};
  try {
    legacy = getDrillProgress() || {};
  } catch (_) {
    legacy = {};
  }

  for (const entry of CATALOG) {
    try {
      if (entry.kind === 'legacy') {
        const p = legacy[entry.target];
        if (p && (p.sessions || 0) > 0) {
          out[entry.id] = {
            pct: Math.max(0, Math.min(100, Math.round(p.bestPct || 0))),
            sessions: p.sessions || 0,
          };
        }
      } else if (entry.kind === 'leak') {
        const p = getLeakProgress(entry.target);
        if (p && (p.totalSessions || 0) > 0) {
          out[entry.id] = {
            pct: Math.max(0, Math.min(100, Math.round((p.currentAccuracy || 0) * 100))),
            sessions: p.totalSessions || 0,
          };
        }
      }
    } catch (_) { /* null-safe: skip broken entries */ }
  }

  return out;
}

// claudeAI.js — Claude Haiku powered bot for Hardcore mode
// Budget: shared pool of ~30 calls per game ($0.01-0.02 total)
// Only activates for significant decisions, fallback to local AI otherwise

export class ClaudeBossBot {
  // Shared call counter across all bots in game
  static totalCalls = 0;
  static maxTotalCalls = 30;
  static resetCalls() { ClaudeBossBot.totalCalls = 0; }

  constructor(localAI) {
    this.localAI = localAI; // AdaptiveAI fallback
    this.lastAPICall = 0;
  }

  shouldUseAPI(gs) {
    // Budget check
    if (ClaudeBossBot.totalCalls >= ClaudeBossBot.maxTotalCalls) return false;
    // Cooldown: min 3 hands between API calls per bot
    if (Date.now() - this.lastAPICall < 15000) return false;

    const potBBs = gs.pot / Math.max(gs.bigBlind, 1);
    const triggers =
      (potBBs > 15 ? 1 : 0) +
      (gs.toCall > gs.myChips * 0.3 ? 1 : 0) +  // Big decision
      (gs.stage === 'river' ? 1 : 0) +
      (gs.playersInHand === 2 ? 1 : 0) +         // Heads-up pot
      (gs.handStrength > 0.6 ? 1 : 0);            // Has a real hand

    return triggers >= 2;
  }

  async decide(gs) {
    // Always try local AI first
    const localDecision = this.localAI.decide(gs);

    // Only call API for key spots
    if (!this.shouldUseAPI(gs)) return localDecision;

    try {
      ClaudeBossBot.totalCalls++;
      this.lastAPICall = Date.now();

      const heroSummary = this.localAI.getHeroSummary?.() || {};

      const prompt = `You are an expert poker player in a 6-max sit-n-go. Make the optimal decision.

YOUR HAND: ${gs.holeCards?.join(' ') || '??'}
BOARD: ${gs.community?.join(' ') || 'preflop'}
STAGE: ${gs.stage}
POSITION: ${gs.position}
POT: ${gs.pot}
TO CALL: ${gs.toCall}
YOUR STACK: ${gs.myChips}
BLINDS: ${gs.bigBlind}
PLAYERS IN HAND: ${gs.playersInHand}

HERO (opponent) profile from ${heroSummary.hands || 0} hands:
VPIP ${heroSummary.vpip ? (heroSummary.vpip * 100).toFixed(0) : '?'}% | PFR ${heroSummary.pfr ? (heroSummary.pfr * 100).toFixed(0) : '?'}% | Style: ${heroSummary.style || '?'}
${heroSummary.foldsTooMuch ? 'Hero folds too much — bluff more' : ''}
${heroSummary.callsTooMuch ? 'Hero calls too much — value bet thinner, no bluffs' : ''}

Your local AI suggests: ${localDecision.action}${localDecision.amount ? ' ' + localDecision.amount : ''}

Reply ONLY JSON: {"action":"fold|check|call|raise","amount":NUMBER_OR_NULL}`;

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 100,
        }),
      });

      if (!res.ok) return localDecision;

      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json?|```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (parsed.action && ['fold', 'check', 'call', 'raise'].includes(parsed.action)) {
        parsed._isAI = true; // Mark for UI
        return parsed;
      }
    } catch (e) {
      // Silent fallback — API failure is fine
    }

    return localDecision;
  }

  // Proxy AdaptiveAI methods
  observeHeroAction(action, context) { this.localAI.observeHeroAction(action, context); }
  observeShowdown(cards, won) { this.localAI.observeShowdown?.(cards, won); }
  getHeroSummary() { return this.localAI.getHeroSummary?.() || {}; }
}

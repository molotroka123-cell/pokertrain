// claudeAI.js — Claude-powered boss bot for key spots
// Budget: ~50 API calls per tournament ($0.02 total with Haiku)

export class ClaudeBossBot {
  constructor(name, emoji) {
    this.name = name || 'BOSS';
    this.emoji = emoji || '🤖';
    this.callCount = 0;
    this.maxCalls = 50;
  }

  shouldUseAPI(gs) {
    if (this.callCount >= this.maxCalls) return false;
    const potBBs = gs.pot / Math.max(gs.bigBlind, 1);
    return (
      (potBBs > 30) +
      (gs.playersRemaining <= 9) +
      (gs.isAllInDecision) +
      (gs.isBubble) +
      (gs.stage === 'river' && potBBs > 15)
    ) >= 2; // At least 2 triggers
  }

  async decide(gs, heroModel) {
    if (!this.shouldUseAPI(gs)) return this.fallback(gs);

    this.callCount++;

    const prompt = `You are a world-class poker pro in a tournament. Make ONE decision.

SITUATION:
- Your cards: ${gs.myCards}
- Board: ${gs.board || "preflop"}
- Pot: ${gs.pot} chips
- To call: ${gs.toCall}
- Your chips: ${gs.myChips}
- Position: ${gs.myPosition}
- Stage: ${gs.stage}
- Players in hand: ${gs.playersInHand}
- Players remaining: ${gs.playersRemaining}
- Blinds: ${gs.sb}/${gs.bb}
- M-ratio: ${gs.mRatio}
${gs.isBubble ? "⚠️ BUBBLE - ICM pressure is high" : ""}

OPPONENT TENDENCIES (${heroModel?.hands || 0} hands):
- VPIP: ${heroModel ? (heroModel.vpip * 100).toFixed(0) : '?'}%
- PFR: ${heroModel ? (heroModel.pfr * 100).toFixed(0) : '?'}%
- Style: ${heroModel?.style || 'unknown'}
- Fold to cbet: ${heroModel ? (heroModel.foldToCbet * 100).toFixed(0) : '?'}%

Respond ONLY with JSON: {"action":"fold|check|call|raise","amount":NUMBER_IF_RAISE,"reasoning":"one sentence"}`;

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const json = JSON.parse(text.replace(/```json?|```/g, '').trim());
      return json;
    } catch (e) {
      return this.fallback(gs);
    }
  }

  fallback(gs) {
    // Local heuristic fallback
    if (gs.toCall === 0) return { action: 'check' };
    if (gs.handStrength > 0.6) return { action: 'call' };
    if (gs.handStrength > 0.3 && gs.toCall < gs.pot * 0.3) return { action: 'call' };
    return { action: 'fold' };
  }
}

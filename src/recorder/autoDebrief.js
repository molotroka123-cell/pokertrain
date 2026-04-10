// autoDebrief.js — Auto tournament debrief with 6-layer mistake explanations
// Per MASTER + CRITICAL-FIXES specs

export function generateDebrief(records) {
  if (!records || records.length === 0) {
    return { totalMistakes: 0, criticalMistakes: 0, top5: [], estimatedEVLost: 0, summary: 'No data.' };
  }

  const mistakes = [];

  for (const d of records) {
    if (!d.mistakeType) continue;

    const explanation = explainMistake(d);

    mistakes.push({
      handNumber: d.handNumber,
      severity: d.mistakeSeverity,
      type: d.mistakeType,
      evLost: d.evLost || 0,
      decision: d,
      explanation,
      drillRecommendation: recommendDrill(d.mistakeType),
    });
  }

  // Sort: critical first, then by EV lost
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  mistakes.sort((a, b) => {
    if (sevOrder[a.severity] !== sevOrder[b.severity])
      return sevOrder[a.severity] - sevOrder[b.severity];
    return b.evLost - a.evLost;
  });

  const totalEVLost = mistakes.reduce((a, m) => a + m.evLost, 0);

  // Detect patterns
  const patterns = detectPatterns(records);
  const positionStats = computePositionStats(records);
  const sessionStats = computeSessionStats(records);

  return {
    totalMistakes: mistakes.length,
    criticalMistakes: mistakes.filter(m => m.severity === 'critical').length,
    highMistakes: mistakes.filter(m => m.severity === 'high').length,
    top5: mistakes.slice(0, 5),
    allMistakes: mistakes,
    estimatedEVLost: totalEVLost,
    patterns,
    positionStats,
    sessionStats,
    summary: generateSummary(mistakes),
  };
}

// 6-layer explanation per CRITICAL-FIXES spec
function explainMistake(d) {
  return {
    // Layer 1: What happened
    what: `Рука #${d.handNumber}: ${d.action} с ${d.holeCards} на ${d.position}${d.stage !== 'preflop' ? ` на борде ${d.community}` : ''}${d.facingAction ? ` (фейсинг ${d.facingAction.action} ${d.facingAction.amount || ''} от ${d.facingAction.position || '?'})` : d.toCall > 0 ? ` фейсинг ставку ${d.toCall}` : ''}${d.draws?.drawType && d.draws.drawType !== 'none' ? ` [${d.draws.drawType}, ~${d.draws.outs} аутов]` : ''}.`,

    // Layer 2: Villain range context + what hero was facing
    villainRange: d.facingAction
      ? `Фейсишь ${d.facingAction.action} ${d.facingAction.amount || ''} от ${d.facingAction.position || '?'} (${d.opponents?.[0]?.style || '?'}). ${d.holeCards} имеет ~${Math.round(d.equity * 100)}% equity vs ${d.numOpponents || 1} оппонент(ов).`
      : d.opponents?.length > 0
        ? `Против ${d.opponents[0].position || '?'} (${d.opponents[0].style || '?'}) ${d.holeCards} имеет ~${Math.round(d.equity * 100)}% equity.`
        : `Против типичного диапазона ${d.holeCards} имеет ~${Math.round(d.equity * 100)}% equity.`,

    // Layer 3: Why it's wrong
    why: generateWhyExplanation(d),

    // Layer 4: What was better
    alternative: `Better play: ${d.gtoAction?.toUpperCase() || '?'}. ${describeAlternative(d)}`,

    // Layer 5: Pattern
    pattern: null, // Filled by detectPatterns

    // Layer 6: Drill recommendation
    drill: recommendDrill(d.mistakeType),
  };
}

function generateWhyExplanation(d) {
  switch (d.mistakeType) {
    case 'bad_fold':
      return `Ты сфолдил с ${Math.round(d.equity * 100)}% equity, но нужно было всего ${Math.round(d.potOdds * 100)}% для прибыльного колла. Пот давал ${d.potOdds > 0 ? ((1 / d.potOdds) - 1).toFixed(1) : '?'}:1 шансы. Фолд в таких спотах стоит ~${d.evLost} фишек.`;
    case 'bad_call':
      return `Ты заколлировал с ${Math.round(d.equity * 100)}% equity, но нужно было ${Math.round(d.potOdds * 100)}%. Каждый такой колл теряет фишки.`;
    case 'too_passive':
      return `Ты заколлировал с ${Math.round(d.equity * 100)}% equity — достаточно для рейза. Колл даёт дро дешёвые карты и не берёт вэлью с худших рук.`;
    case 'push_fold_error':
      return `С M=${d.mRatio} на ${d.position}, по Нэшу нужно пушить. На такой глубине стека фолд убивает — блайнды съедают стек.`;
    case 'icm_error':
      return `На баббле жизнь в турнире стоит дороже фишек. Даже если колл +chipEV, он -$EV — вылет тут стоит долю призового фонда.`;
    default:
      return `Это решение стоило примерно ${d.evLost} фишек в EV.`;
  }
}

function describeAlternative(d) {
  switch (d.mistakeType) {
    case 'bad_fold':
      return `Колл выигрывает ~${Math.round(d.equity * 100)}% — прибыльно при этих шансах.`;
    case 'bad_call':
      return `Фолд сохраняет ${d.toCall} фишек в -EV споте.`;
    case 'too_passive':
      return `Рейз наращивает банк в позиции силы и забирает вэлью с худших рук.`;
    case 'push_fold_error':
      return `Олл-ин создаёт максимальное давление и забирает мёртвые деньги в блайндах.`;
    case 'icm_error':
      return `Фолд сохраняет турнирную жизнь и долю в призовом фонде у баббла.`;
    default:
      return '';
  }
}

function recommendDrill(mistakeType) {
  const map = {
    'bad_fold': { drill: 'RFI Drill / Pot Odds', icon: '🎯', focus: 'Practice calling spots with correct odds' },
    'bad_call': { drill: 'Pot Odds Quiz', icon: '🧮', focus: 'Learn when to fold based on equity vs odds' },
    'too_passive': { drill: 'Bet Sizing Drill', icon: '📏', focus: 'Practice value betting with strong hands' },
    'push_fold_error': { drill: 'Push/Fold Drill', icon: '💣', focus: 'Master Nash push/fold charts' },
    'icm_error': { drill: 'Postflop Drill (bubble)', icon: '🃏', focus: 'Practice bubble ICM decisions' },
  };
  return map[mistakeType] || { drill: 'General Practice', icon: '📚', focus: 'Keep working on fundamentals' };
}

function detectPatterns(records) {
  const patterns = [];

  // Deduplicate: first preflop record per hand (avoid inflated counts)
  const pfByHand = new Map();
  for (const r of records) {
    if (r.stage === 'preflop' && !pfByHand.has(r.handNumber)) {
      pfByHand.set(r.handNumber, r);
    }
  }
  const pf = [...pfByHand.values()];

  // Паттерн: слишком тайтовый на поздних позициях
  const latePosHands = pf.filter(r => r.position === 'BTN' || r.position === 'CO');
  if (latePosHands.length > 10) {
    const lateFoldRate = latePosHands.filter(r => r.action === 'fold').length / latePosHands.length;
    if (lateFoldRate > 0.65) {
      patterns.push({
        type: 'too_tight_late_position',
        message: `Ты фолдишь ${Math.round(lateFoldRate * 100)}% на BTN/CO. Открывай шире — это самые прибыльные позиции.`,
        severity: 'medium',
      });
    }
  }

  // Паттерн: пассивность на постфлопе
  const postflop = records.filter(r => r.stage !== 'preflop');
  if (postflop.length > 15) {
    const raises = postflop.filter(r => r.action === 'raise').length;
    if (raises / postflop.length < 0.10) {
      patterns.push({
        type: 'passive_postflop',
        message: `Ты рейзишь только ${Math.round(raises / postflop.length * 100)}% постфлопа. Упускаешь вэлью-беты и блеф-споты.`,
        severity: 'high',
      });
    }
  }

  // Паттерн: фолдишь на агрессию
  const facingBet = records.filter(r => r.toCall > 0);
  if (facingBet.length > 15) {
    const foldRate = facingBet.filter(r => r.action === 'fold').length / facingBet.length;
    if (foldRate > 0.65) {
      patterns.push({
        type: 'fear_of_aggression',
        message: `Ты фолдишь ${Math.round(foldRate * 100)}% при фейсинге ставок. Оппоненты будут блефовать чаще.`,
        severity: 'high',
      });
    }
  }

  // Паттерн: сдаёшься на ривере
  const riverCheck = records.filter(r => r.stage === 'river' && r.toCall === 0);
  if (riverCheck.length > 5) {
    const checkRate = riverCheck.filter(r => r.action === 'check').length / riverCheck.length;
    if (checkRate > 0.80) {
      patterns.push({
        type: 'river_give_up',
        message: `Ты чекаешь ${Math.round(checkRate * 100)}% ривер-спотов. Оставляешь деньги на столе — бетай для вэлью и блефуй.`,
        severity: 'medium',
      });
    }
  }

  return patterns;
}

function generateSummary(mistakes) {
  if (mistakes.length === 0) return 'Чистая сессия. Серьёзных ошибок не обнаружено.';

  const types = {};
  for (const m of mistakes) {
    const t = m.type || 'other';
    types[t] = (types[t] || 0) + 1;
  }

  const biggest = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
  const messages = {
    bad_fold: 'Главная утечка: слишком много фолдов в прибыльных ситуациях. Ты оставляешь фишки на столе.',
    bad_call: 'Главная утечка: коллируешь без достаточной equity. Учись отпускать маргинальные руки.',
    too_passive: 'Главная утечка: пассивная игра с сильными руками. Рейзь больше для вэлью.',
    push_fold_error: 'Главная утечка: ошибки push/fold с коротким стеком. Изучи чарты Нэша.',
    icm_error: 'Главная утечка: ICM ошибки на баббле. Они стоят реальной турнирной equity.',
  };

  return messages[biggest?.[0]] || 'Работай над точностью решений.';
}

// Winrate / profit by position
function computePositionStats(records) {
  // Group hands by position (use first preflop record per hand for position)
  const handsByPos = {};
  const handsSeen = new Set();
  for (const r of records) {
    if (handsSeen.has(r.handNumber)) continue;
    handsSeen.add(r.handNumber);
    const pos = r.position || 'Unknown';
    if (!handsByPos[pos]) handsByPos[pos] = [];
    handsByPos[pos].push(r);
  }

  const stats = {};
  for (const [pos, hands] of Object.entries(handsByPos)) {
    // Use last record per hand for chipsAfter, first for myChips
    const handsWithResult = hands.filter(h => h.chipsAfter != null);
    let totalProfit = 0;
    for (const h of handsWithResult) {
      // Find all records for this hand to get first myChips and last chipsAfter
      const handRecs = records.filter(r => r.handNumber === h.handNumber);
      const firstRec = handRecs[0];
      const lastRec = handRecs[handRecs.length - 1];
      if (firstRec && lastRec?.chipsAfter != null) {
        totalProfit += lastRec.chipsAfter - firstRec.myChips;
      }
    }
    stats[pos] = {
      hands: hands.length,
      profit: Math.round(totalProfit),
      avgProfit: hands.length > 0 ? Math.round(totalProfit / hands.length) : 0,
    };
  }
  return stats;
}

// Session-wide HUD stats
function computeSessionStats(records) {
  if (records.length === 0) return null;

  // Dedup preflop by hand
  const pfByHand = new Map();
  for (const r of records) {
    if (r.stage === 'preflop' && !pfByHand.has(r.handNumber)) {
      pfByHand.set(r.handNumber, r);
    }
  }
  const pfUnique = [...pfByHand.values()];
  const totalHands = pfUnique.length;
  if (totalHands === 0) return null;

  // VPIP: voluntarily put $ in pot (call or raise preflop, not BB walk)
  const vpipCount = pfUnique.filter(r => r.action !== 'fold' && r.action !== 'bb_walk').length;
  const vpip = Math.round((vpipCount / totalHands) * 100);

  // PFR: preflop raise
  const pfrCount = pfUnique.filter(r => r.action === 'raise').length;
  const pfr = Math.round((pfrCount / totalHands) * 100);

  // AF: aggression factor = (raises) / (calls) across all streets
  const allCalls = records.filter(r => r.action === 'call').length;
  const allRaises = records.filter(r => r.action === 'raise').length;
  const af = allCalls > 0 ? Math.round((allRaises / allCalls) * 10) / 10 : allRaises > 0 ? 99 : 0;

  // WTSD%: went to showdown (hands with handResult set and player saw flop)
  const handsSeenFlop = new Set();
  for (const r of records) {
    if (r.stage !== 'preflop' && r.action !== 'fold') handsSeenFlop.add(r.handNumber);
  }
  const handsWithShowdown = new Set();
  for (const r of records) {
    if (handsSeenFlop.has(r.handNumber) && r.handResult) handsWithShowdown.add(r.handNumber);
  }
  const wtsd = handsSeenFlop.size > 0 ? Math.round((handsWithShowdown.size / handsSeenFlop.size) * 100) : 0;

  // C-bet%: bet flop when was preflop raiser
  const pfRaisers = new Set(pfUnique.filter(r => r.action === 'raise').map(r => r.handNumber));
  const flopActionsAsRaiser = records.filter(r => r.stage === 'flop' && pfRaisers.has(r.handNumber));
  const cbetCount = flopActionsAsRaiser.filter(r => r.action === 'raise').length;
  const cbet = flopActionsAsRaiser.length > 0 ? Math.round((cbetCount / flopActionsAsRaiser.length) * 100) : 0;

  // Fold to c-bet%: folded on flop when facing a bet and didn't raise preflop
  const pfCallers = new Set(pfUnique.filter(r => r.action === 'call').map(r => r.handNumber));
  const flopFacingBet = records.filter(r => r.stage === 'flop' && pfCallers.has(r.handNumber) && r.toCall > 0);
  const foldToCbetCount = flopFacingBet.filter(r => r.action === 'fold').length;
  const foldToCbet = flopFacingBet.length > 0 ? Math.round((foldToCbetCount / flopFacingBet.length) * 100) : 0;

  return { vpip, pfr, af, wtsd, cbet, foldToCbet, totalHands };
}

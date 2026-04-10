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

  return {
    totalMistakes: mistakes.length,
    criticalMistakes: mistakes.filter(m => m.severity === 'critical').length,
    highMistakes: mistakes.filter(m => m.severity === 'high').length,
    top5: mistakes.slice(0, 5),
    allMistakes: mistakes,
    estimatedEVLost: totalEVLost,
    patterns,
    summary: generateSummary(mistakes),
  };
}

// 6-layer explanation per CRITICAL-FIXES spec
function explainMistake(d) {
  return {
    // Layer 1: What happened
    what: `Hand #${d.handNumber}: You ${d.action}ed ${d.holeCards} on ${d.position} ${d.stage !== 'preflop' ? `on ${d.community}` : ''} ${d.toCall > 0 ? `facing a bet of ${d.toCall}` : ''}.`,

    // Layer 2: Villain range context
    villainRange: d.opponents?.length > 0
      ? `Villain on ${d.opponents[0].position || '?'} with style ${d.opponents[0].style || '?'}. Against their range your ${d.holeCards} has ~${Math.round(d.equity * 100)}% equity.`
      : `Against a typical range your ${d.holeCards} has ~${Math.round(d.equity * 100)}% equity.`,

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
      return `Calling wins ${Math.round(d.equity * 100)}% of the time — profitable at these odds.`;
    case 'bad_call':
      return `Folding saves ${d.toCall} chips in a -EV spot.`;
    case 'too_passive':
      return `Raising builds the pot when ahead and charges draws.`;
    case 'push_fold_error':
      return `All-in puts maximum pressure and captures dead money in blinds/antes.`;
    case 'icm_error':
      return `Folding preserves tournament life and prize pool equity near the money.`;
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
  const pf = records.filter(r => r.stage === 'preflop');

  // Pattern: too tight in late position
  const latePosFolds = pf.filter(r => (r.position === 'BTN' || r.position === 'CO') && r.action === 'fold');
  if (pf.filter(r => r.position === 'BTN' || r.position === 'CO').length > 10) {
    const lateFoldRate = latePosFolds.length / pf.filter(r => r.position === 'BTN' || r.position === 'CO').length;
    if (lateFoldRate > 0.65) {
      patterns.push({
        type: 'too_tight_late_position',
        message: `You fold ${Math.round(lateFoldRate * 100)}% on BTN/CO. Open wider — these are the most profitable positions.`,
        severity: 'medium',
      });
    }
  }

  // Pattern: never raises postflop
  const postflop = records.filter(r => r.stage !== 'preflop');
  if (postflop.length > 15) {
    const raises = postflop.filter(r => r.action === 'raise').length;
    if (raises / postflop.length < 0.10) {
      patterns.push({
        type: 'passive_postflop',
        message: `You only raise ${Math.round(raises / postflop.length * 100)}% postflop. You\'re missing value bets and bluff opportunities.`,
        severity: 'high',
      });
    }
  }

  // Pattern: folds to aggression
  const facingBet = records.filter(r => r.toCall > 0);
  if (facingBet.length > 15) {
    const foldRate = facingBet.filter(r => r.action === 'fold').length / facingBet.length;
    if (foldRate > 0.65) {
      patterns.push({
        type: 'fear_of_aggression',
        message: `You fold ${Math.round(foldRate * 100)}% when facing bets. Opponents will exploit this by bluffing more.`,
        severity: 'high',
      });
    }
  }

  // Pattern: river give-up
  const riverCheck = records.filter(r => r.stage === 'river' && r.toCall === 0);
  if (riverCheck.length > 5) {
    const checkRate = riverCheck.filter(r => r.action === 'check').length / riverCheck.length;
    if (checkRate > 0.80) {
      patterns.push({
        type: 'river_give_up',
        message: `You check ${Math.round(checkRate * 100)}% of river spots. You\'re leaving money on the table — bet for value and bluff occasionally.`,
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

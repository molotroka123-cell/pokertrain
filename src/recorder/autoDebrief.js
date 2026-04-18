// autoDebrief.js — Auto tournament debrief with 6-layer mistake explanations
// Uses exact GTO ranges for preflop mistake detection

// ═══ GTO RFI RANGES (exact Set-based, source: GTO Wizard) ═══
const GTO_RFI = {
  UTG: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","AKs","AQs","AJs","ATs","A9s","A5s","KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s","AKo","AQo"]),
  HJ: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","K8s","QJs","QTs","Q9s","JTs","J9s","T9s","98s","87s","76s","65s","54s","AKo","AQo","AJo","ATo","KQo","KJo"]),
  CO: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","K8s","K7s","QJs","QTs","Q9s","Q8s","JTs","J9s","J8s","T9s","T8s","98s","97s","87s","86s","76s","75s","65s","64s","54s","43s","AKo","AQo","AJo","ATo","A9o","KQo","KJo","KTo","QJo","QTo","JTo"]),
  BTN: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","K4s","K3s","K2s","QJs","QTs","Q9s","Q8s","Q7s","Q6s","Q5s","JTs","J9s","J8s","J7s","J6s","T9s","T8s","T7s","T6s","98s","97s","96s","87s","86s","85s","76s","75s","65s","64s","54s","53s","43s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","A4o","A3o","A2o","KQo","KJo","KTo","K9o","K8o","K7o","QJo","QTo","Q9o","Q8o","JTo","J9o","J8o","T9o","T8o","98o","97o","87o","76o"]),
  SB: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","K8s","K6s","QJs","QTs","Q9s","JTs","J9s","T9s","T8s","98s","87s","76s","65s","AKo","AQo","AJo","ATo","A9o","KQo","KJo","KTo","QJo"]),
};
const GTO_BB_DEFEND = {
  vs_BTN: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","QJs","QTs","Q9s","Q8s","Q7s","JTs","J9s","J8s","J7s","T9s","T8s","T7s","98s","97s","87s","86s","76s","75s","65s","64s","54s","53s","43s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","A4o","A3o","A2o","KQo","KJo","KTo","K9o","K8o","K7o","QJo","QTo","Q9o","Q8o","JTo","J9o","J8o","T9o","T8o","98o","97o","87o"]),
  vs_CO: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s","KQs","KJs","KTs","K9s","K8s","K7s","QJs","QTs","Q9s","Q8s","Q7s","JTs","J9s","J8s","J7s","T9s","T8s","T7s","98s","97s","96s","87s","86s","85s","76s","75s","74s","65s","64s","63s","54s","43s","AKo","AQo","AJo","ATo","A9o","A8o","A7o","KQo","KJo","KTo","K9o","QJo","QTo","Q9o","JTo","T9o"]),
  vs_UTG: new Set(["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22","AKs","AQs","AJs","ATs","A9s","KQs","KJs","QJs","JTs","T9s","98s","AKo","AQo"]),
};

// Normalize "Ah Ks" → "AKo", "Ah Kh" → "AKs", "7h 7d" → "77"
function normalizeHand(holeCards) {
  if (!holeCards || typeof holeCards !== 'string') return null;
  const parts = holeCards.split(' ');
  if (parts.length < 2) return null;
  const r1 = parts[0][0], s1 = parts[0][1], r2 = parts[1][0], s2 = parts[1][1];
  const RANK_ORDER = 'AKQJT98765432';
  const i1 = RANK_ORDER.indexOf(r1), i2 = RANK_ORDER.indexOf(r2);
  if (i1 < 0 || i2 < 0) return null;
  if (i1 === i2) return r1 + r2; // pair
  const suited = s1 === s2 ? 's' : 'o';
  return i1 < i2 ? r1 + r2 + suited : r2 + r1 + suited;
}

// Check if a preflop fold is a GTO mistake
function isGTOBadFold(holeCards, position, facingAction, openerPos) {
  const hand = normalizeHand(holeCards);
  if (!hand) return null;

  // RFI spot: folded to you, should you open?
  if (!facingAction || facingAction === 'fold' || facingAction === 'check') {
    const range = GTO_RFI[position];
    if (range && range.has(hand)) {
      return { reason: `${hand} в RFI диапазоне ${position}. Рейз, не фолд.` };
    }
    return null;
  }

  // BB vs raise: should you defend?
  if (position === 'BB' && facingAction === 'raise') {
    const key = openerPos ? 'vs_' + openerPos : 'vs_BTN';
    const range = GTO_BB_DEFEND[key] || GTO_BB_DEFEND.vs_BTN;
    if (range.has(hand)) {
      return { reason: `${hand} в BB defend диапазоне vs ${openerPos || 'open'}. Колл или 3-бет.` };
    }
    // Any pair from BB vs single raise = always call (set mining)
    if (hand.length === 2 && hand[0] === hand[1]) {
      return { reason: `Пара ${hand} из BB vs raise = всегда колл (set mining).` };
    }
    return null;
  }

  return null;
}

export function generateDebrief(records) {
  if (!records || records.length === 0) {
    return { totalMistakes: 0, criticalMistakes: 0, top5: [], estimatedEVLost: 0, summary: 'No data.' };
  }

  const mistakes = [];

  // INDEPENDENT mistake detection — recalculate from raw data
  for (const d of records) {
    const eq = d.equity || 0;
    const toCall = d.toCall || 0;
    const pot = d.potSize || 0;
    const odds = toCall > 0 ? toCall / (pot + toCall) : 0;
    const ev = toCall > 0 ? eq * (pot + toCall) - (1 - eq) * toCall : 0;
    const commit = d.myChips > 0 ? toCall / d.myChips : 0;
    const barrels = d.villainBarrels || 0;
    const mh = d.madeHandStrength || '';

    let mistake = null;

    // ═══ PREFLOP GTO CHECK (uses exact Set-based ranges, not equity) ═══
    if (d.stage === 'preflop' && d.action === 'fold' && d.holeCards) {
      const openerPos = d.facingAction?.position || null;
      const facingType = toCall > (d.blinds ? parseInt(String(d.blinds).split('/')[1]) || 0 : 0) ? 'raise' : (toCall > 0 ? 'raise' : 'fold');
      const gtoCheck = isGTOBadFold(d.holeCards, d.position, facingType, openerPos);
      if (gtoCheck) {
        const bb = d.blinds ? parseInt(String(d.blinds).split('/')[1]) || 200 : 200;
        mistake = { type: 'bad_fold', severity: 'medium', evLost: Math.round(bb * 2.5),
          reason: gtoCheck.reason };
      }
    }

    // SB flat call = always a mistake (SB = 3-bet or fold)
    if (d.stage === 'preflop' && d.action === 'call' && d.position === 'SB' && !mistake) {
      const bb = d.blinds ? parseInt(String(d.blinds).split('/')[1]) || 200 : 200;
      if (toCall > 0 && toCall <= bb * 5) { // vs normal raise, not vs shove
        mistake = { type: 'bad_call', severity: 'medium', evLost: Math.round(toCall * 0.3),
          reason: `SB flat call = ошибка. SB = 3-bet or fold, никогда лимп/колл.` };
      }
    }

    // Skip remaining checks for preflop folds without equity data
    if (!d.equity && d.action === 'fold' && d.stage === 'preflop' && !mistake) continue;

    // FOLD analysis (postflop or preflop with equity data)
    if (d.action === 'fold' && toCall > 0 && !mistake) {
      // Strong hand folded = critical mistake
      const strongHands = ['two_pair', 'trips', 'set', 'straight', 'flush', 'full_house', 'quads', 'straight_flush'];
      if (strongHands.includes(mh) && eq > odds + 0.05) {
        mistake = { type: 'bad_fold', severity: 'critical', evLost: Math.max(0, Math.round(ev)),
          reason: `Сфолдил ${mh} с ${Math.round(eq*100)}% equity. Сильные руки не фолдят.` };
      }
      // Committed >33% → should call
      else if (commit > 0.33 && eq > 0.30) {
        mistake = { type: 'bad_fold', severity: 'medium', evLost: Math.round(toCall * 0.3),
          reason: `Сфолдил вложив ${Math.round(commit*100)}% стека. При commit >33% — коллируй.` };
      }
      // Draw with correct odds
      else if (d.draws?.outs >= 8 && d.stage !== 'river') {
        const drawEq = d.draws.outs * (d.stage === 'flop' ? 0.04 : 0.02);
        if (drawEq > odds) {
          mistake = { type: 'draw_fold_error', severity: 'medium', evLost: Math.round(ev * 0.4),
            reason: `Сфолдил ${d.draws.drawType} (${d.draws.outs} аутов = ${Math.round(drawEq*100)}%) при pot odds ${Math.round(odds*100)}%.` };
        }
      }
      // Regular +EV fold (adjusted for barrels)
      else {
        let adjEq = eq;
        if (barrels >= 3) adjEq *= 0.50;
        else if (barrels >= 2) adjEq *= 0.70;
        else if (barrels >= 1) adjEq *= 0.85;
        const adjEv = adjEq * (pot + toCall) - (1 - adjEq) * toCall;
        if (adjEv > 0 && adjEq > odds + 0.08 && Math.abs(adjEv) > (d.blinds ? 200 : 50) * 2) {
          if (!(commit > 0.35 && ['high_card', 'bottom_pair'].includes(mh))) {
            mistake = { type: 'bad_fold', severity: 'medium', evLost: Math.round(adjEv),
              reason: `Equity ${Math.round(eq*100)}% (adj ${Math.round(adjEq*100)}%) > odds ${Math.round(odds*100)}%.` };
          }
        }
      }
    }

    // River call with nuts = too passive (should raise)
    if (!mistake && d.action === 'call' && d.stage === 'river' && toCall > 0) {
      const nutsHands = ['flush', 'full_house', 'quads', 'straight_flush', 'straight', 'set'];
      if (nutsHands.includes(mh) && eq > 0.75) {
        mistake = { type: 'too_passive', severity: 'medium', evLost: Math.round(pot * 0.25),
          reason: `Натс (${mh}) на ривере = рейз для вэлью, не колл! Упущено ~25% пота.` };
      }
    }

    // CALL analysis
    if (!mistake && d.action === 'call' && toCall > 0) {
      if (d.stage === 'river' && eq < odds - 0.08 && ev < -toCall * 0.10) {
        mistake = { type: 'bad_call', severity: eq < 0.05 ? 'critical' : 'medium', evLost: Math.round(Math.abs(ev)),
          reason: `Коллировал с ${Math.round(eq*100)}% equity при нужных ${Math.round(odds*100)}%. ${mh || 'Слабая рука'} не стоит колла.` };
      }
      // Too passive with strong hand
      if (eq > 0.65 && d.stage !== 'preflop') {
        const spr = pot > 0 ? d.myChips / pot : 20;
        if (spr < 4) {
          mistake = { type: 'too_passive', severity: 'medium', evLost: Math.round(eq * pot * 0.12),
            reason: `Коллировал с ${Math.round(eq*100)}% equity при SPR ${spr.toFixed(1)}. Нужно рейзить для вэлью.` };
        }
      }
    }

    // CHECK analysis — missed value on river
    if (d.action === 'check' && toCall === 0 && d.stage === 'river' && eq > 0.75) {
      mistake = { type: 'missed_value', severity: 'medium', evLost: 0,
        reason: `Зачекал ривер с ${Math.round(eq*100)}% equity. ${mh || 'Сильная рука'} — ставь 50-66% пота.` };
    }

    if (mistake) {
      // Use bot's detection too if it found something we didn't
      if (!mistake && d.mistakeType) {
        mistake = { type: d.mistakeType, severity: d.mistakeSeverity, evLost: d.evLost || 0 };
      }
      const explanation = explainMistake(d);
      mistakes.push({
        handNumber: d.handNumber,
        severity: mistake.severity,
        type: mistake.type,
        evLost: mistake.evLost || 0,
        reason: mistake.reason,
        decision: d,
        explanation,
        drillRecommendation: recommendDrill(mistake.type),
      });
    }
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
  const stageAnalysis = computeStageAnalysis(records);
  const tiltIndicator = computeTiltIndicator(records);

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
    stageAnalysis,
    tiltIndicator,
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
    case 'draw_fold_error':
      return `Ты сфолдил ${d.draws?.drawType || 'дро'} (~${d.draws?.outs || '?'} аутов) с ${Math.round(d.equity * 100)}% equity при пот-оддсах ${Math.round(d.potOdds * 100)}%. Дро с правильной ценой нужно доигрывать.`;
    case 'icm_error':
      return `На баббле жизнь в турнире стоит дороже фишек. Даже если колл +chipEV, он -$EV — вылет тут стоит долю призового фонда.`;
    default:
      return `Это решение стоило примерно ${d.evLost} фишек в EV.`;
  }
}

function describeAlternative(d) {
  switch (d.mistakeType) {
    case 'draw_fold_error':
      return `Колл с ${d.draws?.drawType || 'дро'} выигрывает ~${Math.round(d.equity * 100)}% — достаточно для продолжения.`;
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
    'draw_fold_error': { drill: 'Pot Odds Drill', icon: '🎯', focus: 'Practice continuing with draws when getting the right price' },
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

  // Multi-street паттерн: потеря инициативы (рейзил префлоп → чекнул флоп → сфолдил)
  const pfRaisers = new Set(pf.filter(r => r.action === 'raise').map(r => r.handNumber));
  if (pfRaisers.size > 10) {
    let lostInitCount = 0;
    for (const handNum of pfRaisers) {
      const handRecs = records.filter(r => r.handNumber === handNum);
      const flopRec = handRecs.find(r => r.stage === 'flop');
      const turnRec = handRecs.find(r => r.stage === 'turn');
      // Opened preflop but checked/folded flop
      if (flopRec && (flopRec.action === 'check' || flopRec.action === 'fold')) {
        lostInitCount++;
      }
    }
    const lostInitRate = lostInitCount / pfRaisers.size;
    if (lostInitRate > 0.50) {
      patterns.push({
        type: 'lost_initiative',
        message: `В ${Math.round(lostInitRate * 100)}% рук после префлоп-рейза ты сдаёшь инициативу на флопе (чек/фолд). Ставь c-bet чаще.`,
        severity: 'high',
      });
    }
  }

  // Multi-street паттерн: check-call-fold (колл флоп → колл тёрн → фолд ривер)
  const handNums = [...new Set(records.map(r => r.handNumber))];
  let ccfCount = 0;
  let multiStreetHands = 0;
  for (const hn of handNums) {
    const handRecs = records.filter(r => r.handNumber === hn);
    if (handRecs.length < 3) continue;
    const stages = handRecs.map(r => ({ stage: r.stage, action: r.action }));
    const flopAct = stages.find(s => s.stage === 'flop');
    const turnAct = stages.find(s => s.stage === 'turn');
    const riverAct = stages.find(s => s.stage === 'river');
    if (flopAct && turnAct) multiStreetHands++;
    if (flopAct?.action === 'call' && turnAct?.action === 'call' && riverAct?.action === 'fold') {
      ccfCount++;
    }
  }
  if (multiStreetHands > 10 && ccfCount / multiStreetHands > 0.15) {
    patterns.push({
      type: 'check_call_fold',
      message: `В ${Math.round(ccfCount / multiStreetHands * 100)}% мульти-стрит рук ты коллишь флоп+тёрн и фолдишь ривер. Либо фолди раньше, либо доигрывай до конца.`,
      severity: 'high',
    });
  }

  // Draw-aware паттерн: фолдишь дро с правильной ценой
  const drawFolds = records.filter(r =>
    r.action === 'fold' && r.draws?.drawType && r.draws.drawType !== 'none' &&
    r.draws.drawType !== 'backdoor_flush' && r.toCall > 0 && r.evOfCall > 0
  );
  if (drawFolds.length >= 3) {
    patterns.push({
      type: 'folding_draws_with_odds',
      message: `Ты сфолдил ${drawFolds.length} дро с правильной ценой. Дро с достаточными шансами нужно доигрывать.`,
      severity: 'high',
    });
  }

  // Draw-aware паттерн: переплачиваешь за дро
  const drawOverpays = records.filter(r =>
    r.action === 'call' && r.draws?.drawType && r.draws.drawType !== 'none' &&
    r.draws.drawType !== 'backdoor_flush' && r.toCall > 0 && r.evOfCall < 0
  );
  if (drawOverpays.length >= 3) {
    patterns.push({
      type: 'overpaying_draws',
      message: `Ты переплатил за ${drawOverpays.length} дро без правильной цены. Не все дро стоят колла — считай шансы банка.`,
      severity: 'medium',
    });
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
    draw_fold_error: 'Главная утечка: фолдишь дро с правильной ценой. Считай ауты и шансы банка.',
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
      // Use chipsBeforeHand (before blinds/antes) for accurate profit
      const handRecs = records.filter(r => r.handNumber === h.handNumber);
      const firstRec = handRecs[0];
      const lastRec = handRecs[handRecs.length - 1];
      if (firstRec && lastRec?.chipsAfter != null) {
        const startChips = firstRec.chipsBeforeHand || firstRec.myChips;
        if (startChips > 0) {
          const profit = lastRec.chipsAfter - startChips;
          // Sanity: cap per-hand profit to ±5x starting stack (avoids display bugs)
          totalProfit += Math.max(-startChips, Math.min(startChips * 5, profit));
        }
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

  // VPIP: voluntarily put $ in pot (call or raise preflop, not BB walk/check)
  const vpipCount = pfUnique.filter(r => {
    if (r.action === 'fold' || r.action === 'bb_walk') return false;
    if (r.action === 'check' && r.position === 'BB') return false;
    return true;
  }).length;
  const vpip = Math.round((vpipCount / totalHands) * 100);

  // PFR: preflop raise
  const pfrCount = pfUnique.filter(r => r.action === 'raise').length;
  const pfr = Math.round((pfrCount / totalHands) * 100);

  // AF: aggression factor = (bets + raises) / (calls) across all streets
  // Dedup: one action per hand per street to avoid inflating
  const afByHandStreet = new Map();
  for (const r of records) {
    const key = `${r.handNumber}_${r.stage}`;
    if (!afByHandStreet.has(key)) afByHandStreet.set(key, r.action);
  }
  const afActions = [...afByHandStreet.values()];
  const allCalls = afActions.filter(a => a === 'call').length;
  const allRaises = afActions.filter(a => a === 'raise').length;
  const af = allCalls > 0 ? Math.round((allRaises / allCalls) * 10) / 10 : allRaises > 0 ? 99 : 0;

  // WTSD%: went to showdown = saw flop AND did NOT fold on any postflop street
  const handsSeenFlop = new Set();
  for (const r of records) {
    if (r.stage !== 'preflop' && r.action !== 'fold') handsSeenFlop.add(r.handNumber);
  }
  // Remove hands where hero folded postflop
  const handsFolded = new Set();
  for (const r of records) {
    if (r.stage !== 'preflop' && r.action === 'fold') handsFolded.add(r.handNumber);
  }
  const handsWithShowdown = new Set();
  for (const hn of handsSeenFlop) {
    if (!handsFolded.has(hn)) handsWithShowdown.add(hn);
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

  // W$SD%: won $ at showdown (of hands that reached showdown and had a result)
  // "won" = net profit > 0 (not just handResult === 'won', which could be split with loss)
  const showdownWins = new Set();
  for (const hn of handsWithShowdown) {
    const handRecs = records.filter(r => r.handNumber === hn);
    const lastRec = handRecs[handRecs.length - 1];
    const firstRec = handRecs[0];
    if (lastRec?.chipsAfter != null && firstRec) {
      const startChips = firstRec.chipsBeforeHand || firstRec.myChips;
      const netProfit = lastRec.chipsAfter - startChips;
      if (netProfit > 0) showdownWins.add(hn);
    }
  }
  const wsd = handsWithShowdown.size > 0 ? Math.round((showdownWins.size / handsWithShowdown.size) * 100) : 0;

  // AF per street — deduplicated by unique hands (first action per hand per street)
  function streetAF(stage) {
    const byHand = new Map();
    for (const r of records) {
      if (r.stage !== stage) continue;
      const key = r.handNumber;
      if (!byHand.has(key)) byHand.set(key, r.action);
    }
    const actions = [...byHand.values()];
    const raises = actions.filter(a => a === 'raise').length;
    const calls = actions.filter(a => a === 'call').length;
    return calls > 0 ? Math.round((raises / calls) * 10) / 10 : raises > 0 ? 99 : 0;
  }
  const flopAF = streetAF('flop');

  const turnAF = streetAF('turn');
  const riverAF = streetAF('river');

  // River bet frequency (bets when checked to on river)
  const riverCheckedTo = records.filter(r => r.stage === 'river' && r.toCall === 0);
  const riverBets = riverCheckedTo.filter(r => r.action === 'raise').length;
  const riverBetFreq = riverCheckedTo.length > 0 ? Math.round((riverBets / riverCheckedTo.length) * 100) : 0;

  // ═══ NEW METRICS ═══

  // 1. VPIP-PFR gap (>10% = leak, calling too much without raising)
  const vpipPfrGap = vpip - pfr;

  // 2. Calling station score: % of postflop actions that are calls (not raises)
  const postflopCalls = records.filter(r => r.stage !== 'preflop' && r.action === 'call').length;
  const postflopActions = records.filter(r => r.stage !== 'preflop' && (r.action === 'call' || r.action === 'raise')).length;
  const callingStationScore = postflopActions > 0 ? Math.round((postflopCalls / postflopActions) * 100) : 0;

  // 3. Leak score: 0-100 composite quality score (100 = perfect GTO)
  // Weighted deviations from GTO benchmarks
  const mistakeRate = totalHands > 0 ? records.filter(r => r.mistakeType).length / totalHands : 0;
  const vpipDev = Math.min(1, Math.abs(vpip - 24) / 20); // ideal ~24%
  const pfrDev = Math.min(1, Math.abs(pfr - 19) / 15);   // ideal ~19%
  const afDev = Math.min(1, af > 0 ? Math.abs(af - 2.8) / 3 : 1);
  const gapDev = Math.min(1, Math.max(0, vpipPfrGap - 5) / 15); // gap >5 is leak
  const mistakePenalty = Math.min(1, mistakeRate * 5); // 20%+ mistakes = max penalty
  const leakScore = Math.max(0, Math.round(100 - (vpipDev * 15 + pfrDev * 15 + afDev * 15 + gapDev * 20 + mistakePenalty * 35)));

  return { vpip, pfr, af, flopAF, turnAF, riverAF, wtsd, wsd, cbet, foldToCbet, riverBetFreq, totalHands,
           vpipPfrGap, callingStationScore, leakScore };
}

// Tournament stage dynamics — how play changes across early/mid/late/bubble/FT
function computeStageAnalysis(records) {
  if (records.length === 0) return null;

  // Group by tournament format first — don't mix different tournaments
  const byFormat = {};
  for (const r of records) {
    const fmt = r.tournamentFormat || 'unknown';
    if (!byFormat[fmt]) byFormat[fmt] = [];
    byFormat[fmt].push(r);
  }

  // Use records from the CURRENT session's format (last record's format)
  const lastFormat = records[records.length - 1]?.tournamentFormat || 'unknown';
  const filteredRecords = byFormat[lastFormat] || records;
  const recsToUse = filteredRecords;

  // Skip stage analysis for cash games (no stages)
  const isCash = recsToUse.some(r => r.tournamentFormat?.startsWith('NL'));
  if (isCash) return null;

  // Classify each record into a tournament stage
  function getStage(r) {
    if (r.isFinalTable) return 'final_table';
    if (r.isBubble) return 'bubble';
    if (!r.playersRemaining || !r.totalPlayers) return 'unknown';
    const pct = r.playersRemaining / r.totalPlayers;
    if (pct > 0.65) return 'early';
    if (pct > 0.35) return 'middle';
    return 'late';
  }

  const stages = {};
  for (const r of recsToUse) {
    const stage = getStage(r);
    if (!stages[stage]) stages[stage] = [];
    stages[stage].push(r);
  }

  const result = {};
  for (const [stage, recs] of Object.entries(stages)) {
    // Dedup preflop by hand within this stage
    const pfByHand = new Map();
    for (const r of recs) {
      if (r.stage === 'preflop' && !pfByHand.has(r.handNumber)) {
        pfByHand.set(r.handNumber, r);
      }
    }
    const pfUnique = [...pfByHand.values()];
    const hands = pfUnique.length;
    if (hands === 0) continue;

    // VPIP = voluntarily put money in (excludes BB checks and walks)
    const vpip = Math.round(pfUnique.filter(r => {
      if (r.action === 'fold' || r.action === 'bb_walk') return false;
      if (r.action === 'check' && r.position === 'BB') return false; // BB check is not voluntary
      return true;
    }).length / hands * 100);
    const pfr = Math.round(pfUnique.filter(r => r.action === 'raise').length / hands * 100);
    const mistakes = recs.filter(r => r.mistakeType).length;
    const evLost = recs.filter(r => r.mistakeType).reduce((a, r) => a + (r.evLost || 0), 0);
    const avgM = pfUnique.reduce((a, r) => a + (r.mRatio || 0), 0) / hands;

    result[stage] = { hands, vpip, pfr, mistakes, evLost: Math.round(evLost), avgM: Math.round(avgM * 10) / 10 };
  }
  return result;
}

// Tilt indicator — decision speed trends after losses (JSON data only, no UI)
function computeTiltIndicator(records) {
  if (records.length < 10) return null;

  // Group records by hand, track decision times and results chronologically
  const handMap = new Map();
  for (const r of records) {
    if (!handMap.has(r.handNumber)) handMap.set(r.handNumber, []);
    handMap.get(r.handNumber).push(r);
  }

  const handOrder = [...handMap.keys()].sort((a, b) => a - b);
  const handData = handOrder.map(hn => {
    const recs = handMap.get(hn);
    const avgTime = recs.reduce((a, r) => a + (r.decisionTimeMs || 0), 0) / recs.length;
    const result = recs[recs.length - 1]?.handResult;
    const hasMistake = recs.some(r => r.mistakeType);
    // VPIP for this hand (did hero voluntarily put money in?)
    const pfRec = recs.find(r => r.stage === 'preflop');
    const didVpip = pfRec && pfRec.action !== 'fold' && pfRec.action !== 'bb_walk';
    return { handNumber: hn, avgDecisionMs: Math.round(avgTime), result, hasMistake, didVpip };
  });

  // Calculate vpipLast10 for tilt detection
  for (let i = 0; i < handData.length; i++) {
    const window = handData.slice(Math.max(0, i - 9), i + 1);
    const vpipCount = window.filter(h => h.didVpip).length;
    handData[i].vpipLast10 = Math.round(vpipCount / window.length * 100);
  }

  // Detect tilt windows: 3+ consecutive losses followed by faster decisions + more mistakes
  const windows = [];
  for (let i = 2; i < handData.length; i++) {
    // Check for 3+ loss streak ending at i
    let lossStreak = 0;
    for (let j = i; j >= 0 && handData[j].result === 'lost'; j--) lossStreak++;
    if (lossStreak < 3) continue;

    // Check next 5 hands after the loss streak
    const afterStart = i + 1;
    const afterEnd = Math.min(afterStart + 5, handData.length);
    const afterHands = handData.slice(afterStart, afterEnd);
    if (afterHands.length < 2) continue;

    const beforeAvgTime = handData.slice(Math.max(0, i - lossStreak - 5), i - lossStreak).reduce((a, h) => a + h.avgDecisionMs, 0) /
      Math.max(1, Math.min(5, i - lossStreak));
    const afterAvgTime = afterHands.reduce((a, h) => a + h.avgDecisionMs, 0) / afterHands.length;
    const afterMistakes = afterHands.filter(h => h.hasMistake).length;

    // Tilt signal: decisions got faster AND/OR mistakes increased AND/OR VPIP spiked
    const speedup = beforeAvgTime > 0 ? (beforeAvgTime - afterAvgTime) / beforeAvgTime : 0;
    const vpipSpike = afterHands.length > 0 && afterHands.some(h => h.vpipLast10 > 60);
    if ((speedup > 0.20 && afterMistakes >= 2) || (afterMistakes >= 2 && vpipSpike)) {
      windows.push({
        lossStreakStart: handData[i - lossStreak + 1].handNumber,
        lossStreakEnd: handData[i].handNumber,
        lossStreakLength: lossStreak,
        speedupPct: Math.round(speedup * 100),
        mistakesAfter: afterMistakes,
        handsAfter: afterHands.length,
      });
    }
  }

  // Overall stats
  const allTimes = handData.filter(h => h.avgDecisionMs > 0).map(h => h.avgDecisionMs);
  const avgDecisionTime = allTimes.length > 0 ? Math.round(allTimes.reduce((a, t) => a + t, 0) / allTimes.length) : 0;

  // Decision time trend (first half vs second half)
  const mid = Math.floor(allTimes.length / 2);
  const firstHalfAvg = mid > 0 ? Math.round(allTimes.slice(0, mid).reduce((a, t) => a + t, 0) / mid) : 0;
  const secondHalfAvg = mid > 0 ? Math.round(allTimes.slice(mid).reduce((a, t) => a + t, 0) / (allTimes.length - mid)) : 0;

  return {
    avgDecisionTimeMs: avgDecisionTime,
    decisionTimeTrend: { firstHalf: firstHalfAvg, secondHalf: secondHalfAvg },
    tiltWindows: windows,
    tiltDetected: windows.length > 0,
    handData, // Full per-hand timeline for analysis
  };
}

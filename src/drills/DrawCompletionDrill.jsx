// DrawCompletionDrill.jsx — 3-way river spots where draws complete
// Focus: folding when opponent hits, value-betting thin, sizing in multiway
import React, { useState, useCallback, useRef } from 'react';
import DrillShell, { drillStyles as ds, GTOFrequencies } from './DrillShell.jsx';
import Card from '../components/Card.jsx';
import { freshDeck, deal, cryptoRandom, cryptoRandomFloat } from '../engine/deck.js';
import { evaluateHand } from '../engine/evaluator.js';

const SUITS = ['h', 'd', 'c', 's'];
const POSITIONS = ['BTN', 'CO', 'HJ', 'BB', 'SB'];

function suitCount(cards, suit) {
  return cards.filter(c => c[1] === suit).length;
}

function hasThreeToStraight(board) {
  const vals = board.map(c => '23456789TJQKA'.indexOf(c[0]));
  vals.sort((a, b) => a - b);
  for (let i = 0; i < vals.length - 2; i++) {
    if (vals[i + 2] - vals[i] <= 4) return true;
  }
  return false;
}

function boardTexture(board5) {
  const flushComplete = SUITS.some(s => suitCount(board5, s) >= 3);
  const straightPossible = hasThreeToStraight(board5);

  const turnBoard = board5.slice(0, 4);
  const river = board5[4];
  const flushDrew = SUITS.some(s => suitCount(turnBoard, s) === 2 && river[1] === s && suitCount(board5, s) === 3);
  const fourFlush = SUITS.some(s => suitCount(board5, s) >= 4);

  return { flushComplete, fourFlush, straightPossible, flushDrew };
}

function genDrawCompletionSpot() {
  let attempts = 0;
  while (attempts < 200) {
    attempts++;
    const deck = freshDeck();
    const hero = deal(deck, 2);
    const board = deal(deck, 5);
    const opp1 = deal(deck, 2);
    const opp2 = deal(deck, 2);

    const tex = boardTexture(board);
    const isScary = tex.flushComplete || tex.fourFlush || tex.straightPossible;
    if (!isScary && attempts < 150) continue;

    const pos = POSITIONS[cryptoRandom(POSITIONS.length)];
    const v1Pos = POSITIONS[cryptoRandom(POSITIONS.length)];
    const v2Pos = POSITIONS.filter(p => p !== pos && p !== v1Pos)[0] || 'BB';
    const pot = (6 + cryptoRandom(25)) * 100;

    let heroHand, opp1Hand, opp2Hand;
    try {
      heroHand = evaluateHand(hero, board);
      opp1Hand = evaluateHand(opp1, board);
      opp2Hand = evaluateHand(opp2, board);
    } catch {
      continue;
    }

    const heroRank = heroHand?.rank || 1;
    const bestOppRank = Math.max(opp1Hand?.rank || 1, opp2Hand?.rank || 1);
    const heroWins = (heroHand?.value || 0) > Math.max(opp1Hand?.value || 0, opp2Hand?.value || 0);

    const facingBet = cryptoRandomFloat() > 0.35;
    const betSize = facingBet ? Math.max(100, Math.floor(pot * (0.4 + cryptoRandomFloat() * 0.6))) : 0;
    const facingRaise = facingBet && cryptoRandomFloat() > 0.7;
    const raiseSize = facingRaise ? Math.floor(betSize * 2.5) : 0;
    const toCall = facingRaise ? raiseSize : betSize;

    let freq, tip;

    if (tex.fourFlush) {
      if (facingBet) {
        if (heroRank >= 5) {
          freq = { call: 55, raise: 30, fold: 15 };
          tip = 'Flush+ на 4-flush борде 3-way: сильная рука, но будь осторожен с оверфлэшем. Call > raise.';
        } else if (heroRank >= 3) {
          freq = { fold: 60, call: 35, raise: 5 };
          tip = 'Two pair на 4-flush борде: часто фолд 3-way. Если у кого-то флэш — ты мёртв.';
        } else if (heroRank >= 2) {
          freq = { fold: 78, call: 20, raise: 2 };
          tip = 'Одна пара на 4-flush борде 3-way с бетом — почти всегда фолд. Только TP с блокером к натсу call.';
        } else {
          freq = { fold: 93, call: 5, raise: 2 };
          tip = 'Воздух на 4-flush борде 3-way: фолд. Bluff-catch невозможен без showdown value.';
        }
      } else {
        if (heroRank >= 5) {
          freq = { raise: 80, check: 20 };
          tip = 'Натс-флэш на 4-flush борде — бет для вэлью. Оппоненты c трипсом/парой заплатят.';
        } else if (heroRank >= 3) {
          freq = { check: 75, raise: 25 };
          tip = 'Two pair на 4-flush — check. В 3-way кто-то часто имеет флэш.';
        } else {
          freq = { check: 90, raise: 10 };
          tip = 'Слабая рука на scary борде 3-way — check-fold. Бетить — сжигать фишки.';
        }
      }
    } else if (tex.flushComplete) {
      if (facingBet) {
        if (heroRank >= 5) {
          freq = { raise: 40, call: 50, fold: 10 };
          tip = 'Флэш+ vs бет на 3-flush борде: рейз для вэлью тонко, call безопаснее 3-way.';
        } else if (heroRank >= 3) {
          freq = { fold: 55, call: 40, raise: 5 };
          tip = 'Two pair когда флэш доехал — сложный спот. 3-way с бетом: склоняйся к фолду.';
        } else if (heroRank >= 2) {
          freq = { fold: 62, call: 34, raise: 4 };
          tip = 'Пара на 3-flush борде 3-way: часто фолд, но top pair с блокером к флэшу можно call.';
        } else {
          freq = { fold: 88, call: 8, raise: 4 };
          tip = 'Air vs bet на flush-complete борде 3-way: snap fold.';
        }
      } else {
        if (heroRank >= 5) {
          freq = { raise: 75, check: 25 };
          tip = 'Натсовый флэш — бет 50-66% пота. Извлекай макс вэлью из трипсов и пар.';
        } else {
          freq = { check: 85, raise: 15 };
          tip = 'Без флэша на flush-complete борде 3-way: check. Кто-то из двоих часто доехал.';
        }
      }
    } else if (tex.straightPossible) {
      if (facingBet) {
        if (heroRank >= 5) {
          freq = { call: 55, raise: 35, fold: 10 };
          tip = 'Сильная рука на straight-possible борде: call > raise. В 3-way берегись натса.';
        } else if (heroRank >= 3) {
          freq = { call: 50, fold: 40, raise: 10 };
          tip = 'Two pair на straight-борде 3-way: тонкий call. Если второй оппонент тоже в банке — fold.';
        } else if (heroRank >= 2) {
          freq = { fold: 65, call: 30, raise: 5 };
          tip = 'Одна пара на connected борде 3-way: скорее фолд. Слишком много рук тебя бьют.';
        } else {
          freq = { fold: 90, call: 7, raise: 3 };
          tip = 'Воздух на straight-борде 3-way: фолд без вопросов.';
        }
      } else {
        if (heroRank >= 4) {
          freq = { raise: 70, check: 30 };
          tip = 'Стрит+ на straight-possible борде 3-way: бетим тонко. Вэлью от пар и хуже стритов.';
        } else if (heroRank >= 2) {
          freq = { check: 70, raise: 30 };
          tip = 'Средняя рука на connected борде: check для pot-control. Бет выдавит слабых, оставит лучших.';
        } else {
          freq = { check: 85, raise: 15 };
          tip = 'Слабая рука — check. Bluff 3-way на river — почти никогда не работает.';
        }
      }
    } else {
      if (facingBet) {
        if (heroRank >= 4) {
          freq = { raise: 45, call: 45, fold: 10 };
          tip = 'Сильная рука на сухом борде: raise для вэлью или call для trap.';
        } else if (heroRank >= 2) {
          freq = { call: 50, fold: 40, raise: 10 };
          tip = 'Пара на сухом борде 3-way: тонкий call. Блефов в multiway мало.';
        } else {
          freq = { fold: 85, call: 10, raise: 5 };
          tip = 'Воздух 3-way: фолд. Мультивей блеф-кэтч не оправдан.';
        }
      } else {
        if (heroRank >= 3) {
          freq = { raise: 65, check: 35 };
          tip = 'Two pair+ на сухом борде: тонкий вэлью бет. В 3-way могут вызвать с TPGK.';
        } else {
          freq = { check: 80, raise: 20 };
          tip = 'Сухой борд, слабая рука, 3-way: check. Бет фолдит хуже, а лучшее не фолдит.';
        }
      }
    }

    const boardLabel = tex.fourFlush ? '4-FLUSH'
      : tex.flushComplete ? '3-FLUSH'
      : tex.straightPossible ? 'STRAIGHT POSSIBLE'
      : 'DRY';

    return {
      hero, board, opp1, opp2, pos, v1Pos, v2Pos, pot,
      facingBet, facingRaise, betSize, raiseSize, toCall,
      heroHand, opp1Hand, opp2Hand, heroRank, bestOppRank, heroWins,
      freq, tip, boardLabel, tex,
    };
  }

  return {
    hero: ['As', 'Ks'], board: ['Qh', '7d', '2c', '5s', '3h'],
    opp1: ['Jh', 'Jd'], opp2: ['Tc', '9c'],
    pos: 'BTN', v1Pos: 'CO', v2Pos: 'BB', pot: 1800,
    facingBet: true, facingRaise: false, betSize: 600, raiseSize: 0, toCall: 600,
    heroHand: { rank: 1, name: 'High Card' }, opp1Hand: { rank: 2, name: 'Pair' },
    opp2Hand: { rank: 1, name: 'High Card' },
    heroRank: 1, bestOppRank: 2, heroWins: false,
    freq: { fold: 85, call: 10, raise: 5 },
    tip: 'AK no pair vs bet в 3-way — fold.',
    boardLabel: 'DRY', tex: {},
  };
}

export default function DrawCompletionDrill({ onBack }) {
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [spot, setSpot] = useState(() => genDrawCompletionSpot());
  const [feedback, setFeedback] = useState(null);
  const [answered, setAnswered] = useState(false);
  const answeredRef = useRef(false);

  const newSpot = useCallback(() => {
    setSpot(genDrawCompletionSpot());
    setFeedback(null);
    setAnswered(false);
    answeredRef.current = false;
  }, []);

  const answer = useCallback((action) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setAnswered(true);

    const f = spot.freq;
    const heroFreq = f[action] || 0;
    const bestFreq = Math.max(...Object.values(f));
    const isCorrect = heroFreq >= 28 || heroFreq >= bestFreq - 10;

    setTotal(t => t + 1);
    if (isCorrect) { setCorrect(c => c + 1); setStreak(s => s + 1); } else setStreak(0);

    setFeedback({
      isCorrect,
      frequencies: f,
      heroAction: action,
      explanation: `${spot.heroHand?.name || 'High Card'} (rank ${spot.heroRank}) на ${spot.boardLabel} борде.\n` +
        (spot.facingBet
          ? `Бет ${spot.betSize} в банк ${spot.pot} (${Math.round(spot.betSize / spot.pot * 100)}% пота)${spot.facingRaise ? ' + рейз до ' + spot.raiseSize : ''}.`
          : `Чекнуто. Банк: ${spot.pot}.`) +
        `\n${spot.heroWins ? 'Ты бы ВЫИГРАЛ на шоудауне.' : 'Ты бы ПРОИГРАЛ на шоудауне.'}` +
        `\n\n💡 ${spot.tip}`,
    });
  }, [spot]);

  const onTimeout = useCallback(() => {
    if (!answeredRef.current) answer(spot?.facingBet ? 'fold' : 'check');
  }, [answer, spot]);

  const actions = spot.facingBet
    ? [{ id: 'call', label: 'CALL', color: '#3498db' }, { id: 'raise', label: 'RAISE', color: '#27ae60' }, { id: 'fold', label: 'FOLD', color: '#e74c3c' }]
    : [{ id: 'raise', label: 'BET', color: '#27ae60' }, { id: 'check', label: 'CHECK', color: '#8899aa' }];

  return (
    <DrillShell title="3-Way River: Draw Completion" correct={correct} total={total} streak={streak}
      onBack={onBack} timerActive={!answered} onTimeout={onTimeout}>
      <div style={ds.card}>
        <div style={{ fontSize: '11px', color: '#6b7b8d', marginBottom: '6px' }}>
          <span style={{ color: '#4ac8ff', fontWeight: 700 }}>{spot.pos}</span>
          {' vs '}
          <span style={{ color: '#e74c3c' }}>{spot.v1Pos}</span>
          {' + '}
          <span style={{ color: '#e74c3c' }}>{spot.v2Pos}</span>
          {' | RIVER | '}
          <span style={{
            color: spot.tex?.fourFlush ? '#ff4444' : spot.tex?.flushComplete ? '#ff8844' : spot.tex?.straightPossible ? '#ffaa44' : '#44aa44',
            fontWeight: 800,
          }}>{spot.boardLabel}</span>
        </div>

        <div style={{ fontSize: '10px', color: '#5a6a7a', marginBottom: '4px', textAlign: 'center' }}>
          3-WAY POT · Pot: <span style={{ color: '#ffd700', fontWeight: 700 }}>{spot.pot}</span>
          {spot.facingBet && <> · Facing: <span style={{ color: '#e74c3c', fontWeight: 700 }}>{spot.toCall}</span></>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', margin: '6px 0' }}>
          {spot.board.map((c, i) => <Card key={c} card={c} mini delay={i * 80} />)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', margin: '8px 0' }}>
          {spot.hero.map((c, i) => <Card key={c} card={c} delay={200 + i * 100} />)}
        </div>

        {!answered && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {actions.map(a => (
              <button key={a.id} onClick={() => answer(a.id)} style={{
                flex: 1, padding: '12px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                background: `linear-gradient(135deg, ${a.color}88, ${a.color})`,
                color: '#fff', fontWeight: 800, fontSize: '14px',
              }}>{a.label}</button>
            ))}
          </div>
        )}

        {feedback && (
          <div style={{
            marginTop: '8px', padding: '10px', borderRadius: '8px',
            background: feedback.isCorrect ? '#0a1a10' : '#1a0a0a',
            border: `1px solid ${feedback.isCorrect ? '#1a4a2a' : '#4a1a1a'}`,
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: feedback.isCorrect ? '#27ae60' : '#e74c3c', marginBottom: '4px' }}>
              {feedback.isCorrect ? '✓ Верно!' : '✗ Ошибка'}
            </div>
            <div style={{ fontSize: '11px', color: '#a0b0c0', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{feedback.explanation}</div>
            <div style={{ display: 'flex', gap: '10px', margin: '6px 0' }}>
              <div>
                <span style={{ fontSize: '9px', color: '#5a6a7a' }}>Opp 1:</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {spot.opp1.map((c, i) => <Card key={c} card={c} mini delay={0} />)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#5a6a7a' }}>Opp 2:</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {spot.opp2.map((c, i) => <Card key={c} card={c} mini delay={0} />)}
                </div>
              </div>
            </div>
            <GTOFrequencies frequencies={feedback.frequencies} heroAction={feedback.heroAction} isCorrect={feedback.isCorrect} />
            <button onClick={newSpot} style={{
              marginTop: '6px', width: '100%', padding: '10px', borderRadius: '8px',
              background: '#1a3a2a', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer',
            }}>Следующий спот →</button>
          </div>
        )}
      </div>
    </DrillShell>
  );
}

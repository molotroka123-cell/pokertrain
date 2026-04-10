import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TournamentDirector } from './tournament/TournamentDirector.js';
import { FORMATS } from './data/tournamentFormats.js';
import { freshDeck, deal, cardName } from './engine/deck.js';
import { evaluateHand, compareHands } from './engine/evaluator.js';
import { handStrength as calcHandStrength, potOdds, mRatio } from './engine/equity.js';
import { getHandValue, handString, isInOpenRange } from './engine/ranges.js';
import { BaseAI, POSITIONS_9 } from './engine/ai.js';
import { AdaptiveAI } from './engine/adaptiveAI.js';
import Table from './tournament/Table.jsx';
import Controls from './tournament/Controls.jsx';
import TournamentDashboard from './tournament/TournamentDashboard.jsx';
import HandLog from './tournament/HandLog.jsx';

const app = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #0a0d12 0%, #151b28 100%)',
  color: '#e0e0e0',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
  maxWidth: '500px',
  margin: '0 auto',
};
const header = {
  padding: '12px 16px',
  textAlign: 'center',
  borderBottom: '1px solid #1e2a3a',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};
const hudBar = {
  display: 'flex',
  justifyContent: 'space-around',
  padding: '8px 12px',
  background: '#0d1118',
  borderBottom: '1px solid #1a2230',
  fontSize: '11px',
};
const hudItem = { textAlign: 'center' };
const hudLabel = { color: '#6b7b8d', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const hudValue = { color: '#ffd700', fontWeight: 700, fontSize: '14px' };

// ──── LOBBY SCREEN ────
function Lobby({ onStart }) {
  const [selectedFormat, setFormat] = useState('WSOP_Main');
  const [heroName, setHeroName] = useState('');

  return (
    <div style={app}>
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffd700', letterSpacing: '2px', marginTop: '40px' }}>
          WSOP POKER TRAINER
        </div>
        <div style={{ fontSize: '13px', color: '#6b7b8d', marginTop: '6px' }}>v3.0 — Full Tournament Emulator</div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#8899aa', display: 'block', marginBottom: '6px' }}>Your Name</label>
          <input
            value={heroName}
            onChange={e => setHeroName(e.target.value)}
            placeholder="Hero"
            style={{
              width: '100%', padding: '12px', background: '#111820', border: '1px solid #2a3a4a',
              borderRadius: '8px', color: '#e0e0e0', fontSize: '16px', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: '#8899aa', display: 'block', marginBottom: '6px' }}>Tournament Format</label>
          {Object.entries(FORMATS).map(([key, fmt]) => (
            <div
              key={key}
              onClick={() => setFormat(key)}
              style={{
                padding: '14px', background: selectedFormat === key ? '#1a3a5c' : '#111820',
                border: `1px solid ${selectedFormat === key ? '#2a6a9a' : '#1e2a3a'}`,
                borderRadius: '10px', marginBottom: '8px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '14px', color: selectedFormat === key ? '#ffd700' : '#c0d0e0' }}>
                {fmt.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7b8d', marginTop: '4px' }}>
                {fmt.players} players — {fmt.startingChips.toLocaleString()} chips — ${fmt.buyIn.toLocaleString()} buy-in
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onStart(selectedFormat, heroName || 'Hero')}
          style={{
            width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1a5c3a, #27ae60)',
            border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800,
            fontSize: '18px', cursor: 'pointer', letterSpacing: '1px',
          }}
        >
          START TOURNAMENT
        </button>
      </div>
    </div>
  );
}

// ──── HUD BAR ────
function HUDBar({ heroChips, pot, equity, potOddsVal, mVal, position, stage }) {
  return (
    <div style={hudBar}>
      <div style={hudItem}>
        <div style={hudLabel}>Stack</div>
        <div style={hudValue}>{formatChips(heroChips)}</div>
      </div>
      <div style={hudItem}>
        <div style={hudLabel}>Pot</div>
        <div style={{ ...hudValue, color: '#e0e0e0' }}>{formatChips(pot)}</div>
      </div>
      <div style={hudItem}>
        <div style={hudLabel}>Equity</div>
        <div style={{ ...hudValue, color: equity > 0.5 ? '#27ae60' : '#e74c3c' }}>
          {equity > 0 ? (equity * 100).toFixed(0) + '%' : '—'}
        </div>
      </div>
      <div style={hudItem}>
        <div style={hudLabel}>Pot Odds</div>
        <div style={{ ...hudValue, color: '#c0d0e0' }}>
          {potOddsVal > 0 ? (potOddsVal * 100).toFixed(0) + '%' : '—'}
        </div>
      </div>
      <div style={hudItem}>
        <div style={hudLabel}>M</div>
        <div style={{ ...hudValue, color: mVal < 10 ? '#e74c3c' : mVal < 20 ? '#f39c12' : '#27ae60' }}>
          {mVal.toFixed(0)}
        </div>
      </div>
      <div style={hudItem}>
        <div style={hudLabel}>Pos</div>
        <div style={{ ...hudValue, color: '#8899aa', fontSize: '12px' }}>{position}</div>
      </div>
    </div>
  );
}

function formatChips(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ──── GAME POSITIONS ────
function getPositions(numPlayers, dealerIdx) {
  const positions = new Array(numPlayers).fill('');
  positions[dealerIdx] = 'BTN';
  positions[(dealerIdx + 1) % numPlayers] = 'SB';
  positions[(dealerIdx + 2) % numPlayers] = 'BB';
  const remaining = numPlayers - 3;
  for (let i = 0; i < remaining; i++) {
    const seat = (dealerIdx + 3 + i) % numPlayers;
    if (i === 0) positions[seat] = 'UTG';
    else if (i === remaining - 1) positions[seat] = 'CO';
    else if (i === remaining - 2 && remaining > 2) positions[seat] = 'HJ';
    else if (i === 1 && remaining > 3) positions[seat] = 'UTG+1';
    else positions[seat] = 'MP';
  }
  return positions;
}

// ──── MAIN GAME ────
function Game({ director, onExit }) {
  const [view, setView] = useState('table'); // 'table' | 'dashboard'
  const [gameState, setGameState] = useState(null);
  const [handPhase, setHandPhase] = useState('waiting'); // waiting, preflop, flop, turn, river, showdown
  const [deck, setDeck] = useState([]);
  const [heroCards, setHeroCards] = useState([]);
  const [community, setCommunity] = useState([]);
  const [pot, setPot] = useState(0);
  const [bets, setBets] = useState({});
  const [currentBet, setCurrentBet] = useState(0);
  const [heroEquity, setHeroEquity] = useState(0);
  const [handLog, setHandLog] = useState([]);
  const [heroPosition, setHeroPosition] = useState('');
  const [waitingForAction, setWaitingForAction] = useState(false);

  const directorRef = useRef(director);
  const aiBotsRef = useRef({});
  const handInProgressRef = useRef(false);

  // Background simulation ticker
  useEffect(() => {
    const interval = setInterval(() => {
      if (!handInProgressRef.current) {
        directorRef.current.simulateBackgroundTick(3);
      }
      setGameState(directorRef.current.getState());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Init AI bots for hero table
  useEffect(() => {
    const state = directorRef.current.getState();
    if (state.heroTable) {
      const bots = {};
      for (const p of state.heroTable.players) {
        if (!p.isHero && p.profile) {
          bots[p.id] = new AdaptiveAI(p.profile);
        }
      }
      aiBotsRef.current = bots;
    }
    setGameState(state);
  }, []);

  // ──── PLAY A HAND ────
  const playHand = useCallback(async () => {
    if (handInProgressRef.current) return;
    handInProgressRef.current = true;

    const state = directorRef.current.getState();
    if (!state.heroTable || state.heroEliminated) return;

    const tablePlayers = state.heroTable.players.filter(p => !p.eliminated);
    if (tablePlayers.length < 2) return;

    const d = freshDeck();
    const blinds = state.blinds;
    const dealerIdx = state.heroTable.dealer % tablePlayers.length;
    const positions = getPositions(tablePlayers.length, dealerIdx);
    const heroIdx = tablePlayers.findIndex(p => p.isHero);
    const heroPos = positions[heroIdx];

    setHeroPosition(heroPos);

    // Deal hole cards
    const allHoleCards = {};
    for (const p of tablePlayers) {
      allHoleCards[p.id] = deal(d, 2);
    }
    const hCards = allHoleCards[tablePlayers[heroIdx].id];
    setHeroCards(hCards);
    setDeck(d);
    setCommunity([]);
    setHandPhase('preflop');

    // Post blinds
    let potTotal = 0;
    const betState = {};
    const sbIdx = (dealerIdx + 1) % tablePlayers.length;
    const bbIdx = (dealerIdx + 2) % tablePlayers.length;
    const sbPlayer = tablePlayers[sbIdx];
    const bbPlayer = tablePlayers[bbIdx];

    const sbAmount = Math.min(blinds.sb, sbPlayer.chips);
    const bbAmount = Math.min(blinds.bb, bbPlayer.chips);
    sbPlayer.chips -= sbAmount;
    bbPlayer.chips -= bbAmount;
    betState[sbPlayer.id] = sbAmount;
    betState[bbPlayer.id] = bbAmount;
    potTotal += sbAmount + bbAmount;

    // Antes
    if (blinds.ante > 0) {
      for (const p of tablePlayers) {
        const ante = Math.min(blinds.ante, p.chips);
        p.chips -= ante;
        potTotal += ante;
      }
    }

    setPot(potTotal);
    setBets(betState);
    setCurrentBet(bbAmount);

    // Estimate equity
    const eq = 1 - getHandValue(hCards[0], hCards[1]);
    setHeroEquity(eq);

    const newLog = [];

    // ──── BETTING ROUND ────
    async function bettingRound(stageName, board, startIdx) {
      let cBet = stageName === 'preflop' ? bbAmount : 0;
      const roundBets = stageName === 'preflop' ? { ...betState } : {};
      let lastRaiser = -1;
      let actionsRemaining = tablePlayers.length;
      let idx = startIdx;
      const folded = new Set();

      for (let actions = 0; actions < tablePlayers.length * 3; actions++) {
        if (actionsRemaining <= 0) break;
        const player = tablePlayers[idx % tablePlayers.length];
        idx++;

        if (folded.has(player.id) || player.eliminated || player.chips <= 0) continue;
        if (tablePlayers.filter(p => !folded.has(p.id) && !p.eliminated).length <= 1) break;

        const toCall = cBet - (roundBets[player.id] || 0);
        const pos = positions[tablePlayers.indexOf(player)];

        if (player.isHero) {
          // Hero's turn — wait for input
          const canCheck = toCall <= 0;
          const minRaise = Math.min(cBet + blinds.bb, player.chips);

          setWaitingForAction(true);
          const action = await new Promise(resolve => {
            window.__heroResolve = resolve;
          });
          setWaitingForAction(false);

          if (action.action === 'fold') {
            folded.add(player.id);
            newLog.push({ name: 'Hero', position: pos, action: 'fold', isHero: true });
          } else if (action.action === 'check') {
            newLog.push({ name: 'Hero', position: pos, action: 'check', isHero: true });
          } else if (action.action === 'call') {
            const callAmt = Math.min(toCall, player.chips);
            player.chips -= callAmt;
            roundBets[player.id] = (roundBets[player.id] || 0) + callAmt;
            potTotal += callAmt;
            newLog.push({ name: 'Hero', position: pos, action: 'call', amount: callAmt, isHero: true });
          } else if (action.action === 'raise') {
            const raiseAmt = Math.min(action.amount || minRaise, player.chips);
            const addedToPot = raiseAmt - (roundBets[player.id] || 0);
            player.chips -= addedToPot;
            roundBets[player.id] = raiseAmt;
            potTotal += addedToPot;
            cBet = raiseAmt;
            lastRaiser = tablePlayers.indexOf(player);
            actionsRemaining = tablePlayers.length - 1;
            newLog.push({ name: 'Hero', position: pos, action: 'raise', amount: raiseAmt, isHero: true });
          }

          // Notify adaptive AI
          for (const bot of Object.values(aiBotsRef.current)) {
            bot.observeHeroAction(action.action, {
              stage: stageName,
              position: pos,
              facingCbet: cBet > 0 && stageName !== 'preflop',
              facing3Bet: false,
              facingBet: toCall > 0,
            });
          }
        } else {
          // AI turn
          const ai = aiBotsRef.current[player.id];
          if (!ai) { idx++; continue; }

          const gs = {
            stage: stageName,
            holeCards: allHoleCards[player.id],
            community: board,
            pot: potTotal,
            toCall,
            myChips: player.chips,
            position: pos,
            bigBlind: blinds.bb,
            smallBlind: blinds.sb,
            ante: blinds.ante,
            playersInHand: tablePlayers.length - folded.size,
            playersAtTable: tablePlayers.length,
            currentBet: cBet,
            handStrength: 0.5,
          };

          // Quick hand strength for AI
          if (board.length > 0) {
            const eval_ = evaluateHand(allHoleCards[player.id], board);
            gs.handStrength = eval_ ? Math.min(1, eval_.rank / 10) : 0.5;
          } else {
            gs.handStrength = 1 - getHandValue(allHoleCards[player.id][0], allHoleCards[player.id][1]);
          }

          const decision = ai.decide(gs);

          if (decision.action === 'fold') {
            folded.add(player.id);
            newLog.push({ name: player.name, position: pos, action: 'fold' });
          } else if (decision.action === 'check') {
            newLog.push({ name: player.name, position: pos, action: 'check' });
          } else if (decision.action === 'call') {
            const callAmt = Math.min(toCall, player.chips);
            player.chips -= callAmt;
            roundBets[player.id] = (roundBets[player.id] || 0) + callAmt;
            potTotal += callAmt;
            newLog.push({ name: player.name, position: pos, action: 'call', amount: callAmt });
          } else if (decision.action === 'raise') {
            const raiseAmt = Math.min(decision.amount || cBet * 2, player.chips);
            const addedToPot = raiseAmt - (roundBets[player.id] || 0);
            player.chips -= Math.max(0, addedToPot);
            roundBets[player.id] = raiseAmt;
            potTotal += Math.max(0, addedToPot);
            cBet = raiseAmt;
            lastRaiser = tablePlayers.indexOf(player);
            actionsRemaining = tablePlayers.length - 1;
            newLog.push({ name: player.name, position: pos, action: 'raise', amount: raiseAmt });
          }

          // Brief delay for AI actions
          await new Promise(r => setTimeout(r, 300));
        }

        setPot(potTotal);
        setBets({ ...roundBets });
        setHandLog([...newLog]);
        actionsRemaining--;
      }

      return { folded, potTotal };
    }

    // ──── PLAY STREETS ────
    const startAction = (dealerIdx + 3) % tablePlayers.length;

    // Preflop
    let result = await bettingRound('preflop', [], startAction);
    let { folded } = result;
    potTotal = result.potTotal;

    const activePlayers = () => tablePlayers.filter(p => !folded.has(p.id) && !p.eliminated);

    if (activePlayers().length > 1) {
      // Flop
      const flop = deal(d, 3);
      setCommunity(flop);
      setHandPhase('flop');
      setBets({});
      await new Promise(r => setTimeout(r, 500));

      result = await bettingRound('flop', flop, (dealerIdx + 1) % tablePlayers.length);
      folded = result.folded;
      potTotal = result.potTotal;

      if (activePlayers().length > 1) {
        // Turn
        const turnCard = deal(d, 1);
        const turnBoard = [...flop, ...turnCard];
        setCommunity(turnBoard);
        setHandPhase('turn');
        setBets({});
        await new Promise(r => setTimeout(r, 400));

        result = await bettingRound('turn', turnBoard, (dealerIdx + 1) % tablePlayers.length);
        folded = result.folded;
        potTotal = result.potTotal;

        if (activePlayers().length > 1) {
          // River
          const riverCard = deal(d, 1);
          const riverBoard = [...turnBoard, ...riverCard];
          setCommunity(riverBoard);
          setHandPhase('river');
          setBets({});
          await new Promise(r => setTimeout(r, 400));

          result = await bettingRound('river', riverBoard, (dealerIdx + 1) % tablePlayers.length);
          folded = result.folded;
          potTotal = result.potTotal;
        }
      }
    }

    // ──── SHOWDOWN ────
    setHandPhase('showdown');
    const active = activePlayers();
    let winner;

    if (active.length === 1) {
      winner = active[0];
    } else {
      // Evaluate hands
      const finalBoard = community.length > 0 ? community : [];
      let bestHand = null;
      winner = active[0];
      for (const p of active) {
        const cards = allHoleCards[p.id];
        const board = finalBoard.length >= 3 ? finalBoard : [];
        if (board.length >= 3) {
          const hand = evaluateHand(cards, board);
          if (!bestHand || (hand && compareHands(hand, bestHand) > 0)) {
            bestHand = hand;
            winner = p;
          }
        }
      }
    }

    // Award pot
    winner.chips += potTotal;
    newLog.push({
      name: winner.isHero ? 'Hero' : winner.name,
      position: '',
      action: 'win',
      amount: potTotal,
      isHero: winner.isHero,
    });
    setHandLog([...newLog]);

    // Eliminate busted players
    for (const p of tablePlayers) {
      if (p.chips <= 0 && !p.eliminated) {
        directorRef.current.pool.eliminate(p.id);
      }
    }

    // Advance dealer
    const heroTable = directorRef.current.tableManager.getHeroTable();
    if (heroTable) {
      heroTable.dealer = (heroTable.dealer + 1) % heroTable.players.filter(p => !p.eliminated).length;
    }

    // Check blinds
    directorRef.current.checkBlindLevel();

    setPot(0);
    setBets({});
    setHandPhase('waiting');
    setGameState(directorRef.current.getState());
    handInProgressRef.current = false;
  }, []);

  // Hero action handler
  const handleAction = useCallback((action, amount) => {
    if (window.__heroResolve) {
      window.__heroResolve({ action, amount });
      window.__heroResolve = null;
    }
  }, []);

  if (!gameState) return <div style={app}>Loading...</div>;

  const blinds = gameState.blinds;
  const mVal = mRatio(gameState.heroChips, blinds.sb, blinds.bb, blinds.ante, 9);

  if (view === 'dashboard') {
    return (
      <div style={app}>
        <TournamentDashboard state={gameState} onBackToTable={() => setView('table')} />
      </div>
    );
  }

  return (
    <div style={app}>
      {/* Header */}
      <div style={header}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffd700' }}>
          {gameState.format.name}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setView('dashboard')}
            style={{
              padding: '6px 12px', background: '#1a2840', border: '1px solid #2a3a4a',
              borderRadius: '6px', color: '#8899aa', fontSize: '11px', cursor: 'pointer',
            }}
          >
            Dashboard
          </button>
          <div style={{ fontSize: '12px', color: '#6b7b8d', lineHeight: '28px' }}>
            {gameState.playersRemaining}/{gameState.totalPlayers}
          </div>
        </div>
      </div>

      {/* HUD */}
      <HUDBar
        heroChips={gameState.heroChips}
        pot={pot}
        equity={heroEquity}
        potOddsVal={currentBet > 0 ? potOdds(currentBet - (bets[0] || 0), pot) : 0}
        mVal={mVal}
        position={heroPosition}
        stage={handPhase}
      />

      {/* Table */}
      {gameState.heroTable && (
        <Table
          players={gameState.heroTable.players}
          community={community}
          pot={pot}
          dealer={gameState.heroTable.dealer}
          heroCards={heroCards}
          heroIndex={gameState.heroTable.players.findIndex(p => p.isHero)}
          bets={bets}
          stage={handPhase}
        />
      )}

      {/* Controls */}
      {waitingForAction ? (
        <Controls
          canCheck={currentBet <= 0 || (bets[0] || 0) >= currentBet}
          canCall={currentBet > 0}
          toCall={Math.max(0, currentBet - (bets[0] || 0))}
          pot={pot}
          myChips={gameState.heroChips}
          minRaise={Math.min(currentBet + blinds.bb, gameState.heroChips)}
          maxRaise={gameState.heroChips}
          onAction={handleAction}
        />
      ) : handPhase === 'waiting' ? (
        <div style={{ padding: '12px', textAlign: 'center' }}>
          <button
            onClick={playHand}
            style={{
              width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1a5c3a, #27ae60)',
              border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800,
              fontSize: '16px', cursor: 'pointer',
            }}
          >
            {gameState.heroEliminated ? 'ELIMINATED' : 'DEAL NEXT HAND'}
          </button>
        </div>
      ) : null}

      {/* Hand Log */}
      <HandLog entries={handLog} />

      {/* Bubble / FT alerts */}
      {gameState.isBubble && (
        <div style={{
          textAlign: 'center', padding: '8px', background: '#2a1010',
          color: '#e74c3c', fontWeight: 700, fontSize: '13px',
        }}>
          BUBBLE — {gameState.playersRemaining - gameState.payout.paidPlaces} from the money!
        </div>
      )}
    </div>
  );
}

// ──── ROOT APP ────
export default function App() {
  const [director, setDirector] = useState(null);

  const startTournament = (formatKey, heroName) => {
    const d = new TournamentDirector(formatKey, heroName);
    setDirector(d);
  };

  if (!director) {
    return <Lobby onStart={startTournament} />;
  }

  return <Game director={director} onExit={() => setDirector(null)} />;
}

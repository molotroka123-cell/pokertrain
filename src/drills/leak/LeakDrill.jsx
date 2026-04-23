// LeakDrill.jsx — Generic leak-focused drill runner
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { DrillEngine } from './engine/DrillEngine.js';
import { saveSession } from './engine/SessionStats.js';
import ScenarioDisplay from './components/ScenarioDisplay.jsx';
import DecisionPrompt from './components/DecisionPrompt.jsx';
import FeedbackPanel from './components/FeedbackPanel.jsx';
import DrillResults from './components/DrillResults.jsx';

import broadwayChase from './data/broadway_chase.json';
import sbPlay from './data/sb_play.json';
import multiwayCbet from './data/multiway_cbet.json';

const DRILL_DATA = {
  broadway_chase: broadwayChase,
  sb_play: sbPlay,
  multiway_cbet: multiwayCbet,
};

export default function LeakDrill({ leakId, onBack }) {
  const drillData = DRILL_DATA[leakId];
  if (!drillData) {
    return (
      <div style={{ padding: 20, color: '#e74c3c', textAlign: 'center' }}>
        Unknown leak: {leakId}
      </div>
    );
  }

  const engine = useMemo(() => new DrillEngine(drillData.scenarios), [leakId]);
  const [, forceUpdate] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const unsub = engine.subscribe(() => {
      forceUpdate(n => n + 1);
      if (engine.state === 'complete' && !completed) {
        saveSession(leakId, engine.getStats());
        setCompleted(true);
      }
    });
    return unsub;
  }, [engine, leakId, completed]);

  const handleSubmit = useCallback((action) => {
    engine.submitAction(action);
  }, [engine]);

  const handleNext = useCallback(() => {
    engine.advance();
  }, [engine]);

  const handleRetry = useCallback(() => {
    // Reset by creating a fresh engine via key change
    window.location.reload();
  }, []);

  if (engine.state === 'complete' || completed) {
    return (
      <div style={{ padding: 12, minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, maxWidth: 500, margin: '0 auto 14px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#d4af37' }}>Leak Drill</div>
          <button onClick={onBack} style={backBtn}>← Back</button>
        </div>
        <DrillResults
          stats={engine.getStats()}
          leak={leakId}
          leakTitle={drillData.title}
          onRetry={handleRetry}
          onHome={onBack}
        />
      </div>
    );
  }

  const scenario = engine.currentScenario;
  const decision = engine.currentDecision;
  const visibleBoard = engine.visibleBoard;

  const userAnswer = decision
    ? engine.userAnswers[engine.currentIdx]?.[decision.id]
    : null;

  const totalDecisions = scenario.decisions.length;
  const isLast =
    engine.currentIdx === engine.scenarios.length - 1 &&
    engine.currentDecisionIdx === totalDecisions - 1;

  return (
    <div style={{ padding: 12, maxWidth: 500, margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#d4af37' }}>{drillData.title}</div>
          <div style={{ fontSize: 10, color: '#6b7b8d', letterSpacing: 1, marginTop: 2 }}>LEAK FOCUS</div>
        </div>
        <button onClick={onBack} style={backBtn}>← Back</button>
      </div>

      <ScenarioDisplay
        scenario={scenario}
        visibleBoard={visibleBoard}
        decision={decision}
        scenarioIdx={engine.currentIdx}
        scenarioTotal={engine.scenarios.length}
      />

      {engine.state === 'presenting' && decision && (
        <DecisionPrompt
          decision={decision}
          onSubmit={handleSubmit}
          stackBB={scenario.hero.stack_bb}
        />
      )}

      {engine.state === 'showing_feedback' && userAnswer && (
        <FeedbackPanel
          evaluation={userAnswer.evaluation}
          userAction={userAnswer.action}
          onNext={handleNext}
          isLast={isLast}
        />
      )}
    </div>
  );
}

const backBtn = {
  padding: '6px 14px',
  background: 'rgba(10,20,40,0.8)',
  border: '1px solid rgba(74,200,255,0.25)',
  borderRadius: 10,
  color: '#4ac8ff',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 700,
};

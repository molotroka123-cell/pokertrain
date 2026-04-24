// HandHistoryScreen.jsx — Upload local .txt hand history folder + view parsed hands
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseFile } from '../../lib/handHistoryParser.js';
import { addHands, loadAll, clearAll } from '../../lib/handHistoryStore.js';
import { summarizeLeaks, detectLeaks } from './engine/leakDetector.js';

const LEAK_NAMES = {
  broadway_chase: 'Broadway Chase',
  sb_play: 'SB Play',
  multiway_cbet: 'Multi-way Cbet',
  iso_sizing: 'Iso Sizing',
  push_fold_nash: 'Push/Fold',
  bb_defend: 'BB Defend',
  threebet_pot_oop: '3BP OOP',
  set_wet_board: 'Set Wet Board',
  paired_board: 'Paired Board',
  river_sizing: 'River Sizing',
  deep_cash: 'Deep Cash',
};

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export default function HandHistoryScreen({ onBack }) {
  const [hands, setHands] = useState(() => loadAll());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    // Classify on mount
    hands.forEach(h => {
      if (!h.leakTags) h.leakTags = detectLeaks(h);
    });
  }, [hands]);

  const summary = useMemo(() => summarizeLeaks(hands), [hands]);

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => /\.txt$/i.test(f.name));
    if (files.length === 0) {
      setStatus({ type: 'error', text: 'No .txt files found in selection.' });
      return;
    }
    setImporting(true);
    setStatus(null);
    const allHands = [];
    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length, file: files[i].name });
      try {
        const text = await readFileText(files[i]);
        const { hands: parsed } = parseFile(text);
        parsed.forEach(h => { h.leakTags = detectLeaks(h); });
        allHands.push(...parsed);
      } catch (e) {
        console.warn('Failed to parse', files[i].name, e);
      }
    }
    const { added, total } = addHands(allHands);
    setHands(loadAll());
    setImporting(false);
    setProgress(null);
    setStatus({
      type: 'ok',
      text: `Imported ${added} new hands (${allHands.length - added} duplicates skipped). Total: ${total}.`,
    });
  }

  function handleClear() {
    if (!confirm('Remove all imported hands?')) return;
    clearAll();
    setHands([]);
    setStatus({ type: 'ok', text: 'Cleared all imported hands.' });
  }

  return (
    <div style={{ padding: 16, maxWidth: 500, margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#d4af37', letterSpacing: 1 }}>
          Hand History Import
        </div>
        <button onClick={onBack} style={backBtn}>← Back</button>
      </div>

      <div style={{
        padding: 12, marginBottom: 12, borderRadius: 12,
        background: 'rgba(74,200,255,0.05)', border: '1px solid rgba(74,200,255,0.2)',
      }}>
        <div style={{ fontSize: 11, color: '#4a8aba', letterSpacing: 1.2, fontWeight: 800, marginBottom: 4 }}>
          IMPORT FROM LOCAL FOLDER
        </div>
        <div style={{ fontSize: 12, color: '#a0b0c0', lineHeight: 1.4, marginBottom: 10 }}>
          Pick a folder with your tournament .txt hand histories (PokerStars / GG Poker format).
          Hands are parsed, classified by leak, and stored locally on your device.
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => folderInputRef.current?.click()} disabled={importing} style={primaryBtn}>
            📁 Pick folder
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing} style={secondaryBtn}>
            📄 Pick files
          </button>
          {hands.length > 0 && (
            <button onClick={handleClear} disabled={importing} style={dangerBtn}>
              🗑 Clear
            </button>
          )}
        </div>

        {/* Hidden folder input with webkitdirectory */}
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />

        {progress && (
          <div style={{ marginTop: 10, fontSize: 11, color: '#8a9aaa' }}>
            Parsing {progress.current}/{progress.total}: <span style={{ color: '#d4af37' }}>{progress.file}</span>
          </div>
        )}

        {status && (
          <div style={{
            marginTop: 10, padding: 8, borderRadius: 6,
            background: status.type === 'error' ? 'rgba(231,76,60,0.1)' : 'rgba(39,174,96,0.1)',
            border: `1px solid ${status.type === 'error' ? '#e74c3c' : '#27ae60'}40`,
            color: status.type === 'error' ? '#e74c3c' : '#27ae60',
            fontSize: 12, fontWeight: 600,
          }}>
            {status.text}
          </div>
        )}
      </div>

      {/* Summary */}
      {hands.length > 0 && (
        <div style={{
          padding: 12, marginBottom: 12, borderRadius: 12,
          background: 'rgba(10,16,28,0.8)', border: '1px solid rgba(212,175,55,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#d4af37', letterSpacing: 1.2, fontWeight: 800 }}>
              LEAK BREAKDOWN
            </div>
            <div style={{ fontSize: 11, color: '#8a9aaa' }}>
              {hands.length} hands imported
            </div>
          </div>
          {Object.keys(summary.counts).length === 0 ? (
            <div style={{ fontSize: 11, color: '#5a6a7a' }}>No leaks detected in these hands.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(summary.counts)
                .sort((a, b) => b[1] - a[1])
                .map(([leak, count]) => (
                  <div key={leak} style={{
                    padding: '4px 10px', borderRadius: 14,
                    background: 'rgba(74,200,255,0.08)',
                    border: '1px solid rgba(74,200,255,0.2)',
                    fontSize: 11, color: '#c0d0e0',
                  }}>
                    {LEAK_NAMES[leak] || leak} <span style={{ color: '#d4af37', fontWeight: 700 }}>{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Hand list (last 40) */}
      {hands.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#8a9aaa', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
            RECENT HANDS
          </div>
          {hands.slice(-40).reverse().map(h => (
            <div key={h.handId} style={{
              padding: 10, marginBottom: 6, borderRadius: 8,
              background: 'rgba(8,14,22,0.6)', border: '1px solid rgba(74,200,255,0.1)',
              fontSize: 11,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#d4af37', fontWeight: 700 }}>#{h.handId}</div>
                <div style={{ color: '#5a6a7a' }}>{h.timestamp || '—'}</div>
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: '#8a9aaa' }}>
                  {h.heroPosition || '?'} ·
                  <span style={{ color: '#e0e8f0', fontWeight: 700 }}> {(h.heroCards || []).join(' ')}</span>
                </span>
                {h.bigBlind > 0 && h.heroStack > 0 && (
                  <span style={{ color: '#5a6a7a' }}>
                    {Math.round(h.heroStack / h.bigBlind)}BB
                  </span>
                )}
              </div>
              {h.leakTags?.length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {h.leakTags.map(t => (
                    <span key={t} style={{
                      padding: '1px 6px', borderRadius: 8,
                      background: 'rgba(243,156,18,0.1)',
                      border: '1px solid rgba(243,156,18,0.3)',
                      fontSize: 9, color: '#f39c12', fontWeight: 700, letterSpacing: 0.5,
                    }}>
                      {LEAK_NAMES[t] || t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const backBtn = {
  padding: '8px 16px', background: 'rgba(10,20,40,0.8)',
  border: '1px solid rgba(74,200,255,0.25)', borderRadius: 10,
  color: '#4ac8ff', fontSize: 12, cursor: 'pointer', fontWeight: 700,
};
const primaryBtn = {
  padding: '10px 16px', background: 'linear-gradient(135deg, #1a5a30, #27ae60)',
  border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
  fontWeight: 700, fontSize: 12,
};
const secondaryBtn = {
  padding: '10px 16px', background: 'rgba(10,20,40,0.8)',
  border: '1px solid rgba(74,200,255,0.25)', borderRadius: 10,
  color: '#4ac8ff', cursor: 'pointer', fontWeight: 700, fontSize: 12,
};
const dangerBtn = {
  padding: '10px 16px', background: 'rgba(40,10,10,0.8)',
  border: '1px solid rgba(231,76,60,0.3)', borderRadius: 10,
  color: '#e74c3c', cursor: 'pointer', fontWeight: 700, fontSize: 12,
};

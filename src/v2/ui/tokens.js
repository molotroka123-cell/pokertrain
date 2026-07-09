// tokens.js — IceCrown Engine 2.0 design tokens. SINGLE SOURCE OF TRUTH.
// Every v2 module imports from here. Do not fork these values locally.

// ─── Colors ───
export const C = {
  // Base
  bg:        '#05070d',
  bgDeep:    '#020409',
  surface:   'rgba(13, 20, 33, 0.82)',
  surfaceHi: 'rgba(20, 30, 48, 0.92)',
  line:      'rgba(120, 160, 220, 0.10)',
  lineHi:    'rgba(120, 160, 220, 0.22)',

  // Text
  text:      '#e8eef6',
  textDim:   '#8b9bb0',
  textFaint: '#54637a',

  // Brand
  gold:      '#e8c15a',
  goldHi:    '#ffe9a8',
  goldDeep:  '#9a7b2d',
  cyan:      '#4ac8ff',
  cyanDeep:  '#1a6a9a',

  // Semantic
  green:     '#34d17b',
  greenDeep: '#156a3e',
  red:       '#ff5d5d',
  redDeep:   '#8a2525',
  orange:    '#ffab3d',
  purple:    '#a86aff',
  blue:      '#4a8dff',

  // Felt
  felt:      '#0f4d33',
  feltHi:    '#17724b',
  feltRim:   '#2c1a0e',
};

// ─── Gradients ───
export const GRAD = {
  gold:      'linear-gradient(135deg, #f6d87a 0%, #e8c15a 35%, #b8923a 70%, #d9b44f 100%)',
  goldText:  'linear-gradient(180deg, #ffe9a8 0%, #e8c15a 55%, #b8923a 100%)',
  green:     'linear-gradient(135deg, #2ea86a, #156a3e)',
  red:       'linear-gradient(135deg, #e05555, #8a2525)',
  cyan:      'linear-gradient(135deg, #4ac8ff, #1a6a9a)',
  purple:    'linear-gradient(135deg, #a86aff, #5c2ea8)',
  panel:     'linear-gradient(165deg, rgba(26,38,60,0.9) 0%, rgba(12,18,30,0.95) 100%)',
  sceneBg:   'radial-gradient(1200px 700px at 50% -10%, rgba(35,60,110,0.35) 0%, rgba(5,7,13,0) 60%), radial-gradient(800px 500px at 50% 110%, rgba(20,80,55,0.18) 0%, rgba(5,7,13,0) 55%), #05070d',
  felt:      'radial-gradient(ellipse at 50% 42%, #1a7a52 0%, #0f4d33 48%, #093524 78%, #062518 100%)',
  cardBack:  'linear-gradient(150deg, #22458a 0%, #10244d 55%, #0a1a3a 100%)',
};

// ─── Shadows ───
export const SH = {
  panel:   '0 10px 34px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
  pop:     '0 18px 50px rgba(0,0,0,0.6)',
  goldGlow:'0 0 24px rgba(232,193,90,0.35), 0 4px 16px rgba(0,0,0,0.5)',
  cyanGlow:'0 0 20px rgba(74,200,255,0.3)',
  greenGlow:'0 0 20px rgba(52,209,123,0.35)',
  redGlow: '0 0 20px rgba(255,93,93,0.35)',
  card:    '0 6px 18px rgba(0,0,0,0.55)',
  inner:   'inset 0 2px 12px rgba(0,0,0,0.5)',
};

// ─── Radii ───
export const R = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

// ─── Spacing ───
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 };

// ─── Typography ───
export const F = {
  family: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: "'Marcellus', 'Palatino Linotype', Georgia, serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
  num: { fontVariantNumeric: 'tabular-nums' },
  h1: { fontSize: 26, fontWeight: 800, letterSpacing: 0.4 },
  h2: { fontSize: 19, fontWeight: 800, letterSpacing: 0.3 },
  h3: { fontSize: 15, fontWeight: 700 },
  body: { fontSize: 13, fontWeight: 500, lineHeight: 1.5 },
  small: { fontSize: 11, fontWeight: 500 },
  micro: { fontSize: 9, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' },
};

// ─── Motion ───
export const EASE = {
  out:    'cubic-bezier(0.22, 1, 0.36, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  in:     'cubic-bezier(0.55, 0, 1, 0.45)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
};
export const DUR = { fast: 140, base: 240, scene: 300, slow: 480, deal: 420 };

// ─── Z-index layers ───
export const Z = { table: 10, seats: 20, cards: 30, chips: 40, hud: 60, topbar: 80, modal: 100, toast: 120, fx: 140 };

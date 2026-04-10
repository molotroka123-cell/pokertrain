// themes.js — 5 visual themes for tournament formats + final table

export const THEMES = {
  // ═══ T1: WSOP Main — Red/Dark Casino ═══
  WSOP_Main: {
    id: 'wsop', name: 'WSOP Main Event', logo: 'WSOP',
    bg: 'radial-gradient(ellipse at 50% 30%, #1a0d0d 0%, #0a0508 60%, #050304 100%)',
    rimBg: 'linear-gradient(180deg, #1a0a08 0%, #0d0504 50%, #050202 100%)',
    rimBorder: 'rgba(200,50,30,0.18)', rimEdge: 'rgba(200,50,30,0.1)',
    rimGlow: '0 0 25px rgba(200,50,30,0.12), 0 0 50px rgba(212,175,55,0.06), 0 8px 40px rgba(0,0,0,0.7)',
    feltBg: 'radial-gradient(ellipse at 50% 38%, #1a5c35 0%, #145028 25%, #0e4020 50%, #0a3018 75%, #062510 100%)',
    feltInner: 'rgba(200,50,30,0.08)', feltLight: 'rgba(255,200,100,0.02)',
    accent: '#d4af37', accentGlow: 'rgba(212,175,55,0.3)',
    potColor: '#fff0d0', potShadow: '0 0 15px rgba(212,175,55,0.25)',
    chipColor: '#d4af37', heroGlow: '0 0 20px rgba(200,50,30,0.2), 0 0 40px rgba(212,175,55,0.1)',
    avatarHero: 'linear-gradient(135deg, #6a1510, #c0392b)', avatarBot: 'linear-gradient(135deg, #1a1210, #2a1a18)',
    avatarWin: 'linear-gradient(135deg, #d4af37, #ff8c00)',
    allInBg: 'linear-gradient(90deg, #d4af37, #c0a030)', allInColor: '#0a0a00',
    winBg: 'rgba(10,4,4,0.9)', winBorder: 'rgba(212,175,55,0.25)',
    winGlow: '0 4px 24px rgba(212,175,55,0.2), 0 0 60px rgba(200,50,30,0.08)',
    headerBg: 'rgba(10,4,4,0.92)', headerColor: '#e8c860',
    ambientColor: 'rgba(200,50,30,0.03)', logoColor: '#c0392b',
  },

  // ═══ T2: WSOP Daily — Blue/Neon Esports ═══
  WSOP_Daily: {
    id: 'esports', name: 'EPT Esports', logo: 'EPT',
    bg: 'radial-gradient(ellipse at 50% 30%, #060818 0%, #030510 60%, #020308 100%)',
    rimBg: 'linear-gradient(180deg, #060815 0%, #030510 50%, #020208 100%)',
    rimBorder: 'rgba(0,180,255,0.2)', rimEdge: 'rgba(0,180,255,0.15)',
    rimGlow: '0 0 35px rgba(0,180,255,0.18), 0 0 70px rgba(0,120,200,0.08), 0 8px 40px rgba(0,0,0,0.7)',
    feltBg: 'radial-gradient(ellipse at 50% 38%, #0e2838 0%, #0a2030 25%, #081828 50%, #061020 75%, #040a18 100%)',
    feltInner: 'rgba(0,180,255,0.12)', feltLight: 'rgba(0,200,255,0.03)',
    accent: '#00b4ff', accentGlow: 'rgba(0,180,255,0.4)',
    potColor: '#d0f0ff', potShadow: '0 0 15px rgba(0,180,255,0.3)',
    chipColor: '#60c0ff', heroGlow: '0 0 20px rgba(0,180,255,0.3), 0 0 40px rgba(0,120,200,0.15)',
    avatarHero: 'linear-gradient(135deg, #0040a0, #00b4ff)', avatarBot: 'linear-gradient(135deg, #0a1020, #152030)',
    avatarWin: 'linear-gradient(135deg, #00b4ff, #60e0ff)',
    allInBg: 'linear-gradient(90deg, #00b4ff, #60e0ff)', allInColor: '#001020',
    winBg: 'rgba(3,5,15,0.9)', winBorder: 'rgba(0,180,255,0.3)',
    winGlow: '0 4px 24px rgba(0,180,255,0.25), 0 0 60px rgba(0,120,200,0.1)',
    headerBg: 'rgba(3,5,12,0.92)', headerColor: '#60c0ff',
    ambientColor: 'rgba(0,180,255,0.04)', logoColor: '#00b4ff',
  },

  // ═══ T3: EPT Main — Monaco Luxury Green/Teal ═══
  EPT_Main: {
    id: 'luxury', name: 'Monaco Casino', logo: 'Monaco',
    bg: 'radial-gradient(ellipse at 50% 20%, #0d1815 0%, #060d0a 60%, #030604 100%)',
    rimBg: 'linear-gradient(180deg, #0a1510 0%, #060e0a 50%, #030804 100%)',
    rimBorder: 'rgba(0,200,120,0.15)', rimEdge: 'rgba(0,200,120,0.1)',
    rimGlow: '0 0 25px rgba(0,200,120,0.12), 0 0 50px rgba(0,180,100,0.06), 0 8px 40px rgba(0,0,0,0.7)',
    feltBg: 'radial-gradient(ellipse at 50% 38%, #1a7048 0%, #146038 25%, #0e5028 50%, #0a4020 75%, #063015 100%)',
    feltInner: 'rgba(0,200,120,0.1)', feltLight: 'rgba(100,255,180,0.025)',
    accent: '#00dc82', accentGlow: 'rgba(0,220,130,0.3)',
    potColor: '#d0ffe0', potShadow: '0 0 15px rgba(0,220,130,0.25)',
    chipColor: '#40e090', heroGlow: '0 0 20px rgba(0,220,130,0.25), 0 0 40px rgba(0,180,100,0.1)',
    avatarHero: 'linear-gradient(135deg, #0a4030, #00dc82)', avatarBot: 'linear-gradient(135deg, #0a1810, #152820)',
    avatarWin: 'linear-gradient(135deg, #00dc82, #60ffa0)',
    allInBg: 'linear-gradient(90deg, #00dc82, #60ffa0)', allInColor: '#001a0a',
    winBg: 'rgba(4,8,6,0.9)', winBorder: 'rgba(0,220,130,0.3)',
    winGlow: '0 4px 24px rgba(0,220,130,0.2), 0 0 60px rgba(0,180,100,0.08)',
    headerBg: 'rgba(4,8,6,0.92)', headerColor: '#40e890',
    ambientColor: 'rgba(0,220,130,0.04)', logoColor: '#00dc82',
  },

  // ═══ T4: WPT 500 — LVPO Warm Gold/Red ═══
  WPT_500: {
    id: 'lvpo', name: 'Las Vegas Poker Open', logo: 'LVPO',
    bg: 'radial-gradient(ellipse at 50% 20%, #1a1208 0%, #0d0a04 60%, #050402 100%)',
    rimBg: 'linear-gradient(180deg, #201810 0%, #150e08 50%, #0a0804 100%)',
    rimBorder: 'rgba(255,180,50,0.18)', rimEdge: 'rgba(255,180,50,0.1)',
    rimGlow: '0 0 30px rgba(255,180,50,0.15), 0 0 60px rgba(200,100,30,0.08), 0 8px 40px rgba(0,0,0,0.7)',
    feltBg: 'radial-gradient(ellipse at 50% 38%, #1a5530 0%, #154828 25%, #103a20 50%, #0a2c18 75%, #062010 100%)',
    feltInner: 'rgba(255,180,50,0.1)', feltLight: 'rgba(255,200,80,0.025)',
    accent: '#ffa830', accentGlow: 'rgba(255,180,50,0.35)',
    potColor: '#fff5d0', potShadow: '0 0 18px rgba(255,180,50,0.3)',
    chipColor: '#ffc040', heroGlow: '0 0 22px rgba(255,180,50,0.3), 0 0 45px rgba(200,100,30,0.12)',
    avatarHero: 'linear-gradient(135deg, #5a3010, #ffa830)', avatarBot: 'linear-gradient(135deg, #1a1510, #2a2018)',
    avatarWin: 'linear-gradient(135deg, #ffa830, #ffc860)',
    allInBg: 'linear-gradient(90deg, #ffa830, #ffc860)', allInColor: '#1a1000',
    winBg: 'rgba(10,8,4,0.9)', winBorder: 'rgba(255,180,50,0.3)',
    winGlow: '0 4px 28px rgba(255,180,50,0.25), 0 0 70px rgba(200,100,30,0.1)',
    headerBg: 'rgba(10,8,4,0.92)', headerColor: '#e8b040',
    ambientColor: 'rgba(255,180,50,0.04)', logoColor: '#ffa830',
  },

  // ═══ FINAL TABLE — Red & Gold Championship ═══
  FINAL_TABLE: {
    id: 'final', name: 'Championship Final', logo: 'FINAL TABLE',
    bg: 'radial-gradient(ellipse at 50% 20%, #1a0808 0%, #0a0304 60%, #050202 100%)',
    rimBg: 'linear-gradient(180deg, #200808 0%, #100404 50%, #080202 100%)',
    rimBorder: 'rgba(255,50,30,0.2)', rimEdge: 'rgba(255,50,30,0.12)',
    rimGlow: '0 0 35px rgba(255,50,30,0.15), 0 0 70px rgba(212,175,55,0.1), 0 8px 40px rgba(0,0,0,0.7)',
    feltBg: 'radial-gradient(ellipse at 50% 38%, #1a3525 0%, #152d20 25%, #0e2518 50%, #0a1d12 75%, #06150a 100%)',
    feltInner: 'rgba(255,50,30,0.08)', feltLight: 'rgba(255,150,80,0.025)',
    accent: '#ff4020', accentGlow: 'rgba(255,50,30,0.35)',
    potColor: '#ffd8c8', potShadow: '0 0 20px rgba(255,50,30,0.3)',
    chipColor: '#ffc040', heroGlow: '0 0 28px rgba(255,50,30,0.3), 0 0 55px rgba(212,175,55,0.15)',
    avatarHero: 'linear-gradient(135deg, #8a1510, #ff4020)', avatarBot: 'linear-gradient(135deg, #1a0d0d, #2a1818)',
    avatarWin: 'linear-gradient(135deg, #ff4020, #ffc040)',
    allInBg: 'linear-gradient(90deg, #ff4020, #ffc040)', allInColor: '#1a0500',
    winBg: 'rgba(10,3,3,0.9)', winBorder: 'rgba(255,50,30,0.3)',
    winGlow: '0 4px 30px rgba(255,50,30,0.25), 0 0 80px rgba(212,175,55,0.12)',
    headerBg: 'rgba(10,3,3,0.92)', headerColor: '#ff6040',
    ambientColor: 'rgba(255,50,30,0.04)', logoColor: '#ff4020',
  },
};

export function getTheme(formatKey) {
  return THEMES[formatKey] || THEMES.WSOP_Main;
}

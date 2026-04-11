// cashFormats.js — Cash game stake configurations
// Fixed blinds, 100BB buy-in, auto-rebuy, rake

export const CASH_FORMATS = {
  NL2: {
    name: 'NL2 (1c/2c)',
    speed: 'Cash',
    smallBlind: 1,
    bigBlind: 2,
    buyIn: 200,       // 100BB
    minBuyIn: 80,     // 40BB
    maxBuyIn: 400,    // 200BB
    rebuyThreshold: 100, // Auto-rebuy when below 50BB
    rake: 0.05,       // 5%
    rakeCap: 6,       // Cap at 3BB
    playersPerTable: 6, // 6-max (standard online)
    fieldLevel: 'micro',
    isCash: true,
  },
  NL5: {
    name: 'NL5 (2c/5c)',
    speed: 'Cash',
    smallBlind: 2,
    bigBlind: 5,
    buyIn: 500,
    minBuyIn: 200,
    maxBuyIn: 1000,
    rebuyThreshold: 250,
    rake: 0.05,
    rakeCap: 10,
    playersPerTable: 6,
    fieldLevel: 'micro',
    isCash: true,
  },
  NL10: {
    name: 'NL10 (5c/10c)',
    speed: 'Cash',
    smallBlind: 5,
    bigBlind: 10,
    buyIn: 1000,
    minBuyIn: 400,
    maxBuyIn: 2000,
    rebuyThreshold: 500,
    rake: 0.045,
    rakeCap: 20,
    playersPerTable: 6,
    fieldLevel: 'low',
    isCash: true,
  },
  NL25: {
    name: 'NL25 (10c/25c)',
    speed: 'Cash',
    smallBlind: 10,
    bigBlind: 25,
    buyIn: 2500,
    minBuyIn: 1000,
    maxBuyIn: 5000,
    rebuyThreshold: 1250,
    rake: 0.04,
    rakeCap: 50,
    playersPerTable: 6,
    fieldLevel: 'low',
    isCash: true,
  },
};

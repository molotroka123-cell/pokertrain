// aiProfiles.js — 500 player names + countries + profile generation
// Distribution: 30% TAG, 25% LAG, 20% Nit+Fish, 15% SemiLAG, 10% Maniac+Tilter

import { cryptoRandomFloat, cryptoRandom } from '../engine/deck.js';

const FIRST_NAMES = [
  'Mike','Daniel','Phil','Chris','Antonio','Jamie','Gus','Tom','Erik','Sam',
  'Viktor','Fedor','Igor','Dmitry','Alexey','Sergei','Mikhail','Pavel','Andrei','Oleg',
  'Pierre','Jean','Laurent','Nicolas','Francois','Luc','Hugo','Leon','Louis','Marcel',
  'Hans','Klaus','Stefan','Wolfgang','Friedrich','Markus','Tobias','Lukas','Moritz','Felix',
  'Carlos','Juan','Pedro','Diego','Miguel','Rafael','Pablo','Javier','Sergio','Alvaro',
  'Marco','Luca','Giovanni','Andrea','Matteo','Alessandro','Lorenzo','Giuseppe','Franco','Roberto',
  'Kenji','Yuki','Takashi','Hiroshi','Ryo','Satoshi','Haruki','Akira','Daiki','Kenta',
  'Wei','Chen','Li','Zhang','Wang','Liu','Yang','Huang','Ming','Jun',
  'Jin','Soo','Hyun','Min','Jae','Dong','Sung','Woo','Tae','Kyu',
  'Ali','Omar','Hassan','Ahmed','Yousef','Karim','Tariq','Samir','Nabil','Rami',
  'James','Robert','John','David','William','Richard','Joseph','Thomas','Charles','Edward',
  'Olaf','Sven','Bjorn','Lars','Magnus','Nils','Axel','Leif','Thor','Anders',
  'Ivan','Nikolai','Boris','Vladimir','Yuri','Artem','Kirill','Maxim','Ilya','Roman',
  'Jack','Harry','Oliver','George','Oscar','Leo','Archie','Charlie','Noah','Arthur',
  'Liam','Ethan','Mason','Logan','Jacob','Lucas','Jackson','Aiden','Elijah','Luke',
  'Raj','Arjun','Vikram','Ravi','Amit','Sahil','Rohan','Arun','Nikhil','Dev',
  'Mehmet','Emre','Burak','Cem','Murat','Hakan','Eren','Selim','Kaan','Baris',
  'Piotr','Jakub','Tomasz','Michal','Kamil','Wojciech','Adam','Dawid','Mateusz','Filip',
  'Joao','Pedro','Tiago','Rafael','Bruno','Andre','Diogo','Nuno','Rui','Hugo',
  'Mateo','Santiago','Thiago','Bautista','Joaquin','Valentino','Benicio','Felipe','Sebastian','Dante',
];

const LAST_SUFFIXES = [
  '_TX','44','_Pro','888','_GTO','Runner','Luck','AceHigh','Shark','Fish',
  '_NL','Big','All1n','Bluff','Check','Raise','_99','_KK','Grinder','Crusher',
  'Royal','Flush','Nuts','Edge','Stack','Chip','Felt','River','Turn','Flop',
  '','','','','','','','','','', // 10 empty = just first name
  '77','22','_Jr','_Sr','_OG','55','TT','JJ','QQ','_0',
];

const COUNTRIES = [
  '🇺🇸','🇺🇸','🇺🇸','🇬🇧','🇬🇧','🇩🇪','🇩🇪','🇫🇷','🇫🇷','🇪🇸',
  '🇮🇹','🇷🇺','🇷🇺','🇧🇷','🇨🇦','🇦🇺','🇯🇵','🇰🇷','🇨🇳','🇮🇳',
  '🇳🇱','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇵🇱','🇨🇿','🇦🇹','🇨🇭','🇧🇪',
  '🇵🇹','🇲🇽','🇦🇷','🇨🇱','🇨🇴','🇹🇷','🇮🇱','🇿🇦','🇺🇦','🇷🇴',
];

export function generatePlayerName(id) {
  const first = FIRST_NAMES[id % FIRST_NAMES.length];
  const suffix = LAST_SUFFIXES[cryptoRandom(LAST_SUFFIXES.length)];
  return first + suffix;
}

export function generateCountry() {
  return COUNTRIES[cryptoRandom(COUNTRIES.length)];
}

// Fish profile types from CRITICAL-FIXES spec
const FISH_TYPES = ['STATION', 'LIMPER', 'TILTER', 'SCARED_MONEY', 'MANIAC_FISH'];

export function generateProfile(id) {
  const roll = cryptoRandomFloat();
  let style, vpip, pfr, af, threeBet, tiltProbability = 0, quirks = [];

  if (roll < 0.25) {
    // TAG — 25%
    style = 'TAG';
    vpip = 0.15 + cryptoRandomFloat() * 0.08;
    pfr = vpip - 0.02 - cryptoRandomFloat() * 0.04;
    af = 2.5 + cryptoRandomFloat() * 1.5;
    threeBet = 0.04 + cryptoRandomFloat() * 0.05;
  } else if (roll < 0.45) {
    // LAG — 20%
    style = 'LAG';
    vpip = 0.24 + cryptoRandomFloat() * 0.10;
    pfr = vpip - 0.03 - cryptoRandomFloat() * 0.04;
    af = 3.0 + cryptoRandomFloat() * 2.0;
    threeBet = 0.08 + cryptoRandomFloat() * 0.07;
  } else if (roll < 0.58) {
    // Nit — 13%
    style = 'Nit';
    vpip = 0.10 + cryptoRandomFloat() * 0.06;
    pfr = vpip - 0.02 - cryptoRandomFloat() * 0.03;
    af = 1.8 + cryptoRandomFloat() * 1.2;
    threeBet = 0.02 + cryptoRandomFloat() * 0.03;
  } else if (roll < 0.70) {
    // SemiLAG — 12%
    style = 'SemiLAG';
    vpip = 0.22 + cryptoRandomFloat() * 0.08;
    pfr = vpip - 0.03 - cryptoRandomFloat() * 0.04;
    af = 2.5 + cryptoRandomFloat() * 1.5;
    threeBet = 0.06 + cryptoRandomFloat() * 0.05;
  } else if (roll < 0.78) {
    // Calling Station (fish) — 8%
    style = 'STATION';
    vpip = 0.38 + cryptoRandomFloat() * 0.15;
    pfr = 0.05 + cryptoRandomFloat() * 0.05;
    af = 0.8 + cryptoRandomFloat() * 0.5;
    threeBet = 0.01 + cryptoRandomFloat() * 0.02;
  } else if (roll < 0.84) {
    // Limper (fish) — 6%
    style = 'LIMPER';
    vpip = 0.35 + cryptoRandomFloat() * 0.10;
    pfr = 0.04 + cryptoRandomFloat() * 0.04;
    af = 0.6 + cryptoRandomFloat() * 0.6;
    threeBet = 0.01 + cryptoRandomFloat() * 0.01;
  } else if (roll < 0.90) {
    // Tilter — 6%
    style = 'TILTER';
    vpip = 0.22 + cryptoRandomFloat() * 0.08;
    pfr = vpip - 0.04 - cryptoRandomFloat() * 0.03;
    af = 2.0 + cryptoRandomFloat() * 1.5;
    threeBet = 0.05 + cryptoRandomFloat() * 0.05;
    tiltProbability = 0.4 + cryptoRandomFloat() * 0.4;
  } else if (roll < 0.95) {
    // Scared Money — 5%
    style = 'SCARED_MONEY';
    vpip = 0.18 + cryptoRandomFloat() * 0.06;
    pfr = vpip - 0.03 - cryptoRandomFloat() * 0.03;
    af = 1.5 + cryptoRandomFloat() * 1.0;
    threeBet = 0.02 + cryptoRandomFloat() * 0.03;
  } else {
    // Maniac — 5%
    style = 'Maniac';
    vpip = 0.40 + cryptoRandomFloat() * 0.15;
    pfr = vpip - 0.05 - cryptoRandomFloat() * 0.06;
    af = 4.0 + cryptoRandomFloat() * 2.5;
    threeBet = 0.12 + cryptoRandomFloat() * 0.10;
  }

  // Random quirks (1-2 per bot)
  const allQuirks = [
    'overbets_river', 'min_raises_pre', 'slowplays_sets', 'always_cbets_ip',
    'check_raises_often', 'donk_bets', 'limp_reraises', 'snap_calls',
    'tanks_then_folds', 'sizes_tells', 'never_bluffs_river', 'always_bluffs_river',
  ];
  const numQuirks = 1 + cryptoRandom(2);
  for (let i = 0; i < numQuirks; i++) {
    quirks.push(allQuirks[cryptoRandom(allQuirks.length)]);
  }

  return {
    style, vpip, pfr, af, threeBet, tiltProbability, quirks,
    name: generatePlayerName(id),
    emoji: generateCountry(),
  };
}

export function generateField(numPlayers) {
  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({ id: i + 1, ...generateProfile(i) });
  }
  return players;
}

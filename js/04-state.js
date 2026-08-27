/* ---------------------------------------------------------------------
   2. STATE INITIALIZATION
--------------------------------------------------------------------- */
function newProvince(id, name) {
  const pop = RI(40, 300) * 1000;

  return {
    id,
    name,

    population: pop,

    culture: pick(CULTURES),
    religion: pick(RELIGIONS),

    loyalty: RI(50, 80),
    prosperity: RI(40, 65),
    development: RI(30, 55),

    foodProd: Math.round(pop * (0.9 + R() * 0.3)),

    buildings: [],

    unrest: RI(0, 15),
    militaryPresence: RI(0, 3) * 500
  };
}

function newCourtCharacter(title){
  return {
    name: pick(RULER_NAMES.concat(CONSORT_NAMES)),
    title,
    skills:{ diplomacy:RI(20,90), stewardship:RI(20,90), intrigue:RI(20,90), martial:RI(20,90) },
    loyalty: RI(35,85),
    ambition: pick(["Low","Moderate","High"]),
    opinion: RI(-20,40),
    secret: pick([
      "Quietly building ties with a rival noble house.",
      "Believes they deserve a greater title.",
      "Has been diverting a portion of funds under their control.",
      "Fears being replaced and is currying favor with the court.",
      "Genuinely loyal, but resents being overlooked for honors.",
      "Corresponds secretly with a foreign kingdom."
    ])
  };
}

function newAIKingdom(name){
  return {
    name,
    personality: pick(AI_PERSONALITIES),
    strength: RI(3000,15000),
    economy: RI(30,80),
    opinion: RI(-10,40),
    trust: RI(20,60),
    alliance:false,
    atWar:false,
    warScore:0
  };
}

function initGame(seedInput) {
  const seed = seedInput || (Date.now() & 0xffffffff);

  // Initialize seeded RNG
  rand = mulberry32(seed);

  // ==========================================
  // PROVINCES
  // ==========================================

  // Random province count: 5–12
  const provinceCount = RI(5, 12);

  // Shuffle province names using seeded RNG
  const shuffledProvinceNames = [...PROVINCE_NAMES];

  for (let i = shuffledProvinceNames.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));

    [shuffledProvinceNames[i], shuffledProvinceNames[j]] =
      [shuffledProvinceNames[j], shuffledProvinceNames[i]];
  }

  const provinces = [];

  for (let i = 0; i < provinceCount; i++) {
    const provinceName =
      shuffledProvinceNames[i % shuffledProvinceNames.length];

    provinces.push(newProvince(i, provinceName));
  }


  // ==========================================
  // AI KINGDOMS
  // ==========================================

  // Shuffle AI names using seeded RNG
  const shuffledAINames = [...AI_NAMES];

  for (let i = shuffledAINames.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));

    [shuffledAINames[i], shuffledAINames[j]] =
      [shuffledAINames[j], shuffledAINames[i]];
  }

  const aiKingdoms = shuffledAINames
    .slice(0, 7)
    .map(name => newAIKingdom(name));


  // ==========================================
  // GAME STATE
  // ==========================================

  const state = {

    seed,

    year: RI(1180, 1310),

    ruler: {
      name: pick(RULER_NAMES),

      dynasty:
        pick(KINGDOM_NAMES) +
        (R() < 0.5 ? "ian" : "ic"),

      age: RI(24, 42),

      traits: [
        pick(TRAIT_POOL),
        pick(TRAIT_POOL)
      ].filter(
        (v, i, a) => a.indexOf(v) === i
      ),

      skills: {
        diplomacy: RI(20, 80),
        martial: RI(20, 80),
        stewardship: RI(20, 80),
        intrigue: RI(20, 80),
        learning: RI(20, 80)
      },

      health: RI(70, 95),
      legitimacy: RI(70, 95),
      prestige: RI(20, 50)
    },


    heir: {
      name: pick(HEIR_NAMES),
      age: RI(1, 10)
    },


    // ==========================================
    // KINGDOM
    // ==========================================

    kingdom: {

      name: pick(KINGDOM_NAMES),

      // Capital is one of the generated provinces
      capital: provinces[0].name,

      treasury: RI(6000, 12000),

      lastIncome: 0,
      lastExpenses: 0,

      economy: null,

      stability: RI(55, 75),
      prosperity: RI(45, 65),
      approval: RI(50, 70),
      corruption: RI(5, 15),
      unrest: RI(5, 20),

      foodReserves: RI(5000, 15000),

      taxRates: {
        peasant: "normal",
        trade: "normal",
        noble: "normal"
      }
    },


    // ==========================================
    // MILITARY
    // ==========================================

    military: {
      infantry: 1200,
      archers: 400,
      cavalry: 100,
      knights: 0,
      siege: 0,
      morale: 70,
      warDeath: 0
    },


    // ==========================================
    // COURT
    // ==========================================

    court: [
      newCourtCharacter("Chancellor"),
      newCourtCharacter("Marshal"),
      newCourtCharacter("Treasurer"),
      newCourtCharacter("Spymaster")
    ],


    // ==========================================
    // FACTIONS
    // ==========================================

    factions: [
      {
        name: "Nobility",
        influence: 60,
        satisfaction: 55
      },
      {
        name: "Clergy",
        influence: 40,
        satisfaction: 60
      },
      {
        name: "Merchants",
        influence: 45,
        satisfaction: 55
      },
      {
        name: "Peasantry",
        influence: 70,
        satisfaction: 55
      }
    ],

    // ==========================================
    // PROVINCES
    // ==========================================

    provinces,

    // ==========================================
    // AI KINGDOMS
    // ==========================================

    aiKingdoms,


    // ==========================================
    // CONSTRUCTION
    // ==========================================

    // { province, type, yearsLeft }
    buildQueue: [],

    // ==========================================
    // TECHNOLOGY
    // ==========================================

    tech: {
      points: 0,
      perYear: 0,
      researched: [],
      focus: null,
      progress: 0
    },

    techFlags: defaultTechFlags(),

    // ==========================================
    // EVENTS
    // ==========================================

    pendingEvent: null,

    eventCooldowns: {
      treasury_low: 1,
      famine: 1,
      noble_conspiracy: 1
    },

    // ==========================================
    // HISTORY / LOG
    // ==========================================

    history: [],

    // Reset each year, drives chronicle
    turnLog: []
  };

  return state;
}


let S = initGame();


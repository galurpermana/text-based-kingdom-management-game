/* ---------------------------------------------------------------------
   1. DATA TABLES (config, kept separate from engine logic)
--------------------------------------------------------------------- */
const KINGDOM_NAMES = ["Arandor","Valeth","Ostmark","Cardovia","Elandris","Vornheld","Solmere","Tyrreth"];
const PROVINCE_NAMES = ["Northmarch","Rivenfell","Aldergate","Thornwick","Brackenmoor","Duskhaven","Highvale","Saltmere","Wolfscairn","Redmere","Stormwatch","Ironhold","Frosthelm","Glenhaven","Ravenholt","Mirewood","Eryndor","Dunwarren","Havencrest","Quenndralis"];
const CULTURES = ["Aran","Ostic","Veldan","Sorric"];
const RELIGIONS = ["Solari Faith","Old Rites","Order of the Veil"];
const RULER_NAMES = ["Edward","Alaric","Osric","Cedric","Roderic","Baldwin","Aldous","Tristan"];
const CONSORT_NAMES = ["Eleanor","Isolde","Marguerite","Rosalind","Cathrine","Adelheid"];
const HEIR_NAMES = ["Aldric","Owen","Cecily","Mira","Godric","Wilhelmina","Leofric","Isolde","Rowena","Edric"];
const TRAIT_POOL = ["Just","Ambitious","Pious","Cruel","Generous","Paranoid","Charismatic","Frugal","Reckless","Wise","Vengeful","Patient"];
const AI_NAMES = ["Valoria","Kethmoor","Draskhold","Ilmarra","Frosthelm","Dunwarren","Eryndor","Galdoria","Havencrest","Ironhold","Jorvath","Korrath","Lunaris","Mirewood","Nethralis","Orrendale","Peregrine","Quenndralis","Ravenholt","Stormwatch"];
const AI_PERSONALITIES = ["aggressive","diplomatic","defensive","economic","expansionist","isolationist","opportunistic","paranoid"];

const BUILDINGS = {
  farm:      { name:"Farm",      cost:500,  duration:1, maintenance:15,  desc:"+food production" },
  market:    { name:"Market",    cost:800,  duration:1, maintenance:25,  desc:"+prosperity, +trade income" },
  road:      { name:"Road",      cost:600,  duration:1, maintenance:10,  desc:"+prosperity, +trade income" },
  barracks:  { name:"Barracks",  cost:1000, duration:2, maintenance:40,  desc:"+recruitment capacity, +local defense" },
  walls:     { name:"Walls",     cost:1500, duration:2, maintenance:50,  desc:"+local defense, +stability" },
  temple:    { name:"Temple",    cost:700,  duration:1, maintenance:20,  desc:"+loyalty, +stability" },
  university:{ name:"University",cost:2500, duration:3, maintenance:80,  desc:"+development, +prestige" }
};

const UNIT_WAGE = { infantry:1.4, archers:1.7, cavalry:3.5, knights:6, siege:9 };
const UNIT_RECRUIT_COST = { infantry:6, archers:8, cavalry:18, knights:34, siege:65 };

const TAX_LEVELS = { low:0.6, normal:1.0, high:1.5 };


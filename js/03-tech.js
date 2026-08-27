/* ---------------------------------------------------------------------
   1b. TECHNOLOGY TREE
   Five branches x four tiers. Each tech has a one-time "onComplete"
   effect (state mutation) and/or contributes to S.techFlags, which are
   read every year by the economy/food/population/military/war engine
   functions below. Nothing here bypasses the engine — completing a
   tech just changes what the next engine tick computes with.
--------------------------------------------------------------------- */
const TECH_TREE = {
  military: {
    label:"Military",
    techs:[
      { id:'better_weapons', name:'Better Weapons', tier:1, cost:100, reqs:[],
        desc:'+10% infantry combat weight.',
        onComplete: s=>{ s.techFlags.infantryWeight += 0.1; } },
      { id:'better_armor', name:'Better Armor', tier:2, cost:180, reqs:['better_weapons'],
        desc:'+8 warscore swing in your favor during wars.',
        onComplete: s=>{ s.techFlags.warScoreBonus += 8; } },
      { id:'cavalry_tactics', name:'Cavalry Tactics', tier:2, cost:160, reqs:['better_weapons'],
        desc:'Unlocks Knights (elite cavalry) for recruitment.',
        onComplete: s=>{ s.techFlags.unlockedUnits.push('knights'); s.techFlags.cavalryWeight += 0.3; } },
      { id:'siege_engineering', name:'Siege Engineering', tier:3, cost:260, reqs:['better_armor'],
        desc:'Unlocks Siege units; larger warscore swings each year of war.',
        onComplete: s=>{ s.techFlags.unlockedUnits.push('siege'); s.techFlags.warScoreBonus += 6; } },
      { id:'naval_technology', name:'Naval Technology', tier:3, cost:240, reqs:['cavalry_tactics'],
        desc:'Coastal trade fleets expand — +6% trade income.',
        onComplete: s=>{ s.techFlags.tradeMult += 0.06; } }
    ]
  },
  agriculture: {
    label:"Agriculture",
    techs:[
      { id:'crop_rotation', name:'Crop Rotation', tier:1, cost:90, reqs:[],
        desc:'+8% food production in every province.',
        onComplete: s=>{ s.techFlags.foodMult += 0.08; } },
      { id:'irrigation', name:'Irrigation', tier:2, cost:150, reqs:['crop_rotation'],
        desc:'+10% food production; famine becomes less likely.',
        onComplete: s=>{ s.techFlags.foodMult += 0.10; s.techFlags.famineResist += 1500; } },
      { id:'fertilization', name:'Fertilization', tier:2, cost:150, reqs:['crop_rotation'],
        desc:'+0.3% population growth per year, realm-wide.',
        onComplete: s=>{ s.techFlags.popGrowthFlat += 0.003; } },
      { id:'improved_tools', name:'Improved Tools', tier:3, cost:220, reqs:['irrigation'],
        desc:'+6% food production; faster provincial development.',
        onComplete: s=>{ s.techFlags.foodMult += 0.06; s.techFlags.devGrowthFlat += 0.4; } }
    ]
  },
  economy: {
    label:"Economy",
    techs:[
      { id:'banking', name:'Banking', tier:1, cost:100, reqs:[],
        desc:'+5% trade income.',
        onComplete: s=>{ s.techFlags.tradeMult += 0.05; } },
      { id:'accounting', name:'Accounting', tier:2, cost:170, reqs:['banking'],
        desc:'-6 corruption.',
        onComplete: s=>{ s.techFlags.corruptionFlat -= 6; } },
      { id:'trade_networks', name:'Trade Networks', tier:2, cost:170, reqs:['banking'],
        desc:'Markets and roads become 15% more effective.',
        onComplete: s=>{ s.techFlags.tradeMult += 0.08; } },
      { id:'manufacturing', name:'Manufacturing', tier:3, cost:250, reqs:['trade_networks'],
        desc:'Provincial prosperity grows faster over time.',
        onComplete: s=>{ s.techFlags.prosperityGrowthFlat += 0.5; } }
    ]
  },
  government: {
    label:"Government",
    techs:[
      { id:'bureaucracy', name:'Bureaucracy', tier:1, cost:110, reqs:[],
        desc:'-5 corruption, +2 stability baseline.',
        onComplete: s=>{ s.techFlags.corruptionFlat -= 5; s.techFlags.stabilityFlat += 2; } },
      { id:'census', name:'Census', tier:2, cost:160, reqs:['bureaucracy'],
        desc:'+6% tax efficiency from accurate records.',
        onComplete: s=>{ s.techFlags.tradeMult += 0.03; s.techFlags.tradeMult += 0.03; } },
      { id:'legal_reforms', name:'Legal Reforms', tier:2, cost:160, reqs:['bureaucracy'],
        desc:'+0.3 legitimacy per year; factions settle faster.',
        onComplete: s=>{ s.techFlags.legitimacyGrowthFlat += 0.3; } },
      { id:'administrative_systems', name:'Administrative Systems', tier:3, cost:240, reqs:['census'],
        desc:'+4 approval baseline.',
        onComplete: s=>{ s.techFlags.stabilityFlat += 4; } }
    ]
  },
  science: {
    label:"Science",
    techs:[
      { id:'mathematics', name:'Mathematics', tier:1, cost:90, reqs:[],
        desc:'+25% research point generation.',
        onComplete: s=>{ s.techFlags.researchMult += 0.25; } },
      { id:'medicine', name:'Medicine', tier:2, cost:150, reqs:['mathematics'],
        desc:'Plague becomes rarer; +0.2% population growth.',
        onComplete: s=>{ s.techFlags.plagueResist += 1; s.techFlags.popGrowthFlat += 0.002; } },
      { id:'engineering', name:'Engineering', tier:2, cost:150, reqs:['mathematics'],
        desc:'-10% construction cost, -1 year off long builds.',
        onComplete: s=>{ s.techFlags.constructionCostMult -= 0.10; s.techFlags.constructionDurationFlat -= 1; } },
      { id:'astronomy', name:'Astronomy', tier:3, cost:230, reqs:['engineering'],
        desc:'+20% further research generation, +6 prestige.',
        onComplete: s=>{ s.techFlags.researchMult += 0.20; s.ruler.prestige = clamp(s.ruler.prestige+6,0,100); } }
    ]
  }
};
function allTechs(){ return Object.values(TECH_TREE).flatMap(b=>b.techs); }
function findTech(id){ return allTechs().find(t=>t.id===id || t.name.toLowerCase()===String(id).toLowerCase()); }
function techAvailable(t, s){
  if(s.tech.researched.includes(t.id)) return false;
  return t.reqs.every(r=>s.tech.researched.includes(r));
}
function defaultTechFlags(){
  return {
    infantryWeight:0, cavalryWeight:0, warScoreBonus:0,
    foodMult:0, famineResist:0, popGrowthFlat:0, devGrowthFlat:0,
    tradeMult:0, corruptionFlat:0, prosperityGrowthFlat:0,
    stabilityFlat:0, legitimacyGrowthFlat:0, researchMult:0,
    plagueResist:0, constructionCostMult:0, constructionDurationFlat:0,
    unlockedUnits:[]
  };
}


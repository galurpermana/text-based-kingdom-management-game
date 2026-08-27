/* ---------------------------------------------------------------------
   4. ENGINE — the only functions allowed to mutate state
--------------------------------------------------------------------- */

function findProvince(nameOrId){
  const byId = S.provinces.find(p=>String(p.id)===String(nameOrId));
  if(byId) return byId;
  const lname = String(nameOrId).toLowerCase();
  return S.provinces.find(p=>p.name.toLowerCase().startsWith(lname));
}
function findAI(name){
  const l = String(name).toLowerCase();
  return S.aiKingdoms.find(k=>k.name.toLowerCase().startsWith(l));
}

function engineQueueBuild(province, type){
  const spec = BUILDINGS[type];
  if(!spec){
    const guess = closestFromList(type, Object.keys(BUILDINGS));
    return {ok:false,msg:`Unknown building type "${type}".${guess?` Did you mean "${guess}"?`:''} Try: ${Object.keys(BUILDINGS).join(', ')}`};
  }
  const cost = Math.round(spec.cost * (1+S.techFlags.constructionCostMult));
  const duration = Math.max(1, spec.duration + S.techFlags.constructionDurationFlat);
  if(S.kingdom.treasury < cost) return {ok:false,msg:`Not enough gold. ${spec.name} costs ${fmt(cost)}, treasury holds ${fmt(S.kingdom.treasury)}.`};
  S.kingdom.treasury -= cost;
  S.buildQueue.push({ provinceId: province.id, type, yearsLeft: duration });
  return {ok:true, msg:`Construction of ${spec.name} begun in ${province.name}. Completion in ${duration} year(s).`};
}

function armyManpower(){
  return S.military.infantry+S.military.archers+S.military.cavalry+(S.military.knights||0)+(S.military.siege||0);
}
function armyCapacity(){
  return S.provinces.reduce((a,p)=> a + Math.round(p.population*0.03) + p.militaryPresence, 0);
}

function engineRecruit(unitType, n){
  if(!UNIT_RECRUIT_COST[unitType]) return {ok:false,msg:`Unknown unit type. Try: infantry, archers, cavalry.`};
  if((unitType==='knights'||unitType==='siege') && !S.techFlags.unlockedUnits.includes(unitType)){
    return {ok:false,msg:`${unitType[0].toUpperCase()+unitType.slice(1)} require a technology you haven't researched yet.`};
  }
  const capacity = armyCapacity();
  const used = armyManpower();
  const room = capacity - used;
  if(room <= 0){
    return {ok:false,msg:`Army is at full capacity (${fmt(used)}/${fmt(capacity)}). Grow your provinces' population or build barracks to raise capacity.`};
  }
  let capped = false;
  if(n > room){ n = room; capped = true; }
  const cost = UNIT_RECRUIT_COST[unitType]*n;
  if(S.kingdom.treasury < cost) return {ok:false,msg:`Recruiting ${n} ${unitType} costs ${fmt(cost)} gold; treasury holds ${fmt(S.kingdom.treasury)}.`};
  S.kingdom.treasury -= cost;
  S.military[unitType]+=n;
  const capNote = capped ? ` Capacity reached (${fmt(capacity)}) — recruitment capped at ${fmt(n)}.` : '';
  return {ok:true,msg:`${n} ${unitType} recruited for ${fmt(cost)} gold.${capNote}`};
}

function engineDisband(unitType,n){
  if(!S.military[unitType] && S.military[unitType]!==0) return {ok:false,msg:"Unknown unit type."};
  n = Math.min(n, S.military[unitType]);
  S.military[unitType]-=n;
  return {ok:true,msg:`${n} ${unitType} disbanded.`};
}

function engineSetTax(category, level){
  if(!S.kingdom.taxRates[category]) return {ok:false,msg:`Unknown tax category. Try: peasant, trade, noble.`};
  if(!TAX_LEVELS[level]) return {ok:false,msg:`Unknown level. Try: low, normal, high.`};
  S.kingdom.taxRates[category]=level;
  return {ok:true,msg:`${category[0].toUpperCase()+category.slice(1)} tax set to ${level}.`};
}

function engineImproveRelations(ai){
  const cost = 300;
  if(S.kingdom.treasury<cost) return {ok:false,msg:`Sending gifts to ${ai.name} costs ${fmt(cost)} gold; not enough in treasury.`};
  S.kingdom.treasury-=cost;
  ai.opinion = clamp(ai.opinion + RI(6,14),-100,100);
  ai.trust = clamp(ai.trust+RI(2,6),0,100);
  return {ok:true,msg:`Gifts and envoys sent to ${ai.name}. Opinion improves to ${ai.opinion}.`};
}

function engineAlliance(ai){
  if(ai.atWar) return {ok:false,msg:`${ai.name} is at war with you — they will not consider an alliance.`};
  if(ai.opinion<55) return {ok:false,msg:`${ai.name}'s opinion of you (${ai.opinion}) is too low to propose an alliance. Improve relations first.`};
  ai.alliance = true;
  return {ok:true,msg:`${ai.name} has agreed to an alliance with ${S.kingdom.name}.`};
}

function engineDeclareWar(ai){
  ai.atWar = true;
  ai.alliance = false;
  ai.warScore = 0;
  ai.opinion = clamp(ai.opinion-30,-100,100);
  return {ok:true,msg:`War is declared upon ${ai.name}! The court braces for the consequences.`};
}

function armyStrength(){
  return S.military.infantry*(1+S.techFlags.infantryWeight)
       + S.military.archers*1.2
       + S.military.cavalry*(2.2+S.techFlags.cavalryWeight)
       + (S.military.knights||0)*4.5
       + (S.military.siege||0)*6;
}

/* ---- War casualties & territory (stakes of an active war) ---- */

function applyCasualties(rate){
  let totalLost = 0;
  ['infantry','archers','cavalry','knights','siege'].forEach(k=>{
    const count = S.military[k]||0;
    if(count<=0) return;
    const lost = Math.min(count, Math.round(count*rate));
    S.military[k] = count-lost;
    totalLost += lost;
  });
  if(totalLost>0) S.military.warDeaths = (S.military.warDeaths||0)+totalLost;
  return totalLost;
}

function annexProvinceFromEnemy(ai){
  const newId = S.provinces.length ? Math.max(...S.provinces.map(p=>p.id))+1 : 0;
  const prov = newProvince(newId);
  prov.name = `${prov.name} (ceded by ${ai.name})`;
  prov.loyalty = RI(15,35); // freshly conquered land starts resentful
  prov.unrest = RI(30,55);
  S.provinces.push(prov);
  ai.strength = Math.max(500, Math.round(ai.strength*0.7));
  return prov;
}

function loseProvinceToEnemy(ai){
  if(S.provinces.length <= 3) return null; // never collapse the realm entirely
  let idx = 0, worst = Infinity;
  S.provinces.forEach((p,i)=>{ if(p.loyalty < worst){ worst=p.loyalty; idx=i; } });
  const [lost] = S.provinces.splice(idx,1);
  S.buildQueue = S.buildQueue.filter(b=>b.provinceId !== lost.id);
  ai.strength = Math.round(ai.strength + lost.population/40);
  return lost;
}

function engineSeekPeace(ai){
  if(!ai.atWar) return {ok:false,msg:`You are not at war with ${ai.name}.`};
  let outcome;
  if(ai.warScore >= 75){
    const gold = RI(800,2000);
    S.kingdom.treasury += gold;
    const prov = annexProvinceFromEnemy(ai);
    outcome = `Decisive victory! ${ai.name} cedes ${prov.name.split(' (')[0]} and pays ${fmt(gold)} gold in reparations.`;
    S.ruler.prestige = clamp(S.ruler.prestige+15,0,100);
  } else if(ai.warScore > 25){
    const gold = RI(500,1500);
    S.kingdom.treasury += gold;
    outcome = `${ai.name} sues for peace and pays ${fmt(gold)} gold in reparations.`;
    S.ruler.prestige = clamp(S.ruler.prestige+5,0,100);
  } else if(ai.warScore <= -75){
    const lost = loseProvinceToEnemy(ai);
    if(lost){
      outcome = `Crushing defeat. ${ai.name} annexes ${lost.name} and dictates a humiliating peace.`;
      S.ruler.prestige = clamp(S.ruler.prestige-15,0,100);
    } else {
      const gold = RI(600,1400);
      S.kingdom.treasury = Math.max(0,S.kingdom.treasury-gold);
      outcome = `Forced to sue for peace, paying a heavy tribute of ${fmt(gold)} gold to ${ai.name} (the realm is too small to partition further).`;
      S.ruler.prestige = clamp(S.ruler.prestige-10,0,100);
    }
  } else if(ai.warScore < -25){
    const gold = RI(300,900);
    S.kingdom.treasury = Math.max(0,S.kingdom.treasury-gold);
    outcome = `Forced to sue for peace, paying ${fmt(gold)} gold in tribute to ${ai.name}.`;
    S.ruler.prestige = clamp(S.ruler.prestige-5,0,100);
  } else {
    outcome = `A white peace is agreed with ${ai.name}. No territory or gold changes hands.`;
  }
  ai.atWar=false; ai.warScore=0;
  return {ok:true,msg:outcome};
}

/* ---- Yearly simulation ---- */

function resolveConstruction(){
  const done=[];
  S.buildQueue.forEach(b=>b.yearsLeft--);
  S.buildQueue = S.buildQueue.filter(b=>{
    if(b.yearsLeft<=0){
      const prov = S.provinces.find(p=>p.id===b.provinceId);
      if(prov){
        prov.buildings.push(b.type);
        const spec = BUILDINGS[b.type];
        if(b.type==='farm') prov.foodProd += prov.population*0.25;
        if(b.type==='market'||b.type==='road') prov.prosperity = clamp(prov.prosperity+8,0,100);
        if(b.type==='barracks') prov.militaryPresence += 800;
        if(b.type==='walls'){ prov.militaryPresence += 400; prov.loyalty = clamp(prov.loyalty+3,0,100); }
        if(b.type==='temple') prov.loyalty = clamp(prov.loyalty+8,0,100);
        if(b.type==='university'){ prov.development = clamp(prov.development+12,0,100); S.ruler.prestige = clamp(S.ruler.prestige+4,0,100); }
        done.push(`${spec.name} completed in ${prov.name}.`);
      }
      return false;
    }
    return true;
  });
  return done;
}

function calcEconomy(){
  const tp = TAX_LEVELS[S.kingdom.taxRates.peasant];
  const tt = TAX_LEVELS[S.kingdom.taxRates.trade];
  const tn = TAX_LEVELS[S.kingdom.taxRates.noble];

  let peasantTax=0, tradeTax=0, nobleTax=0;
  const byProvince=[];
  S.provinces.forEach(p=>{
    const base = (p.population/1000) * (p.prosperity/100);
    const pPeasant = base * 5 * tp;
    const pTrade = base * 3.5 * tt * (1+ p.buildings.filter(b=>b==='market'||b==='road').length*0.15);
    const pNoble = base * 1.5 * tn;
    peasantTax += pPeasant; tradeTax += pTrade; nobleTax += pNoble;
    byProvince.push({ name:p.name, total: pPeasant+pTrade+pNoble });
  });

  const preTechGross = peasantTax+tradeTax+nobleTax;
  const effCorruption = Math.max(0, S.kingdom.corruption + S.techFlags.corruptionFlat);
  const corruptionLoss = preTechGross * (effCorruption/200);
  const afterCorruption = preTechGross - corruptionLoss;
  const techBonus = afterCorruption * S.techFlags.tradeMult;
  const income = afterCorruption + techBonus;

  const wageInfantry = S.military.infantry*UNIT_WAGE.infantry;
  const wageArchers = S.military.archers*UNIT_WAGE.archers;
  const wageCavalry = S.military.cavalry*UNIT_WAGE.cavalry;
  const wageKnights = (S.military.knights||0)*UNIT_WAGE.knights;
  const wageSiege = (S.military.siege||0)*UNIT_WAGE.siege;
  const militaryWages = wageInfantry+wageArchers+wageCavalry+wageKnights+wageSiege;

  const maintenanceByType = {};
  S.provinces.forEach(p=> p.buildings.forEach(b=>{
    maintenanceByType[b] = (maintenanceByType[b]||0) + BUILDINGS[b].maintenance;
  }));
  const buildingMaintenance = Object.values(maintenanceByType).reduce((a,b)=>a+b,0);
  const courtUpkeep = 150;
  const activeWars = S.aiKingdoms.filter(ai=>ai.atWar).length;
  const warExpenditure = activeWars * 250; // supply lines, campaigning, mobilization

  const expenses = militaryWages + buildingMaintenance + courtUpkeep + warExpenditure;

  S.kingdom.lastIncome = income;
  S.kingdom.lastExpenses = expenses;
  S.kingdom.treasury += (income-expenses);

  S.kingdom.economy = {
    peasantTax, tradeTax, nobleTax, preTechGross, corruptionLoss, techBonus, income,
    militaryWages: { infantry:wageInfantry, archers:wageArchers, cavalry:wageCavalry, knights:wageKnights, siege:wageSiege, total:militaryWages },
    maintenanceByType, buildingMaintenance, courtUpkeep, warExpenditure, activeWars, expenses,
    byProvince: byProvince.sort((a,b)=>b.total-a.total)
  };

  return {income,expenses};
}

function calcFood(){
  let totalFood=0, totalConsumption=0;
  S.provinces.forEach(p=>{
    totalFood += p.foodProd*(1+S.techFlags.foodMult);
    totalConsumption += p.population*1.05;
  });
  const delta = totalFood-totalConsumption;
  S.kingdom.foodReserves = clamp(S.kingdom.foodReserves+delta*0.001+S.techFlags.famineResist*0.02, -20000, 60000);
  return delta;
}

function calcPopulationAndStability(foodDelta){
  const famine = S.kingdom.foodReserves < 0;
  const tp = S.kingdom.taxRates.peasant, tn=S.kingdom.taxRates.noble, tt=S.kingdom.taxRates.trade;

  S.provinces.forEach(p=>{
    let growth = 0.006 + S.techFlags.popGrowthFlat;
    growth += (p.prosperity-50)/4000;
    growth += (S.kingdom.stability-50)/5000;
    if(famine) growth -= 0.02;
    if(p.unrest>50) growth -= 0.01;
    p.population = Math.max(5000, Math.round(p.population*(1+growth)));
    p.foodProd = p.population*(0.9+R()*0.3) + p.buildings.filter(b=>b==='farm').length*p.population*0.25;

    let unrestDelta = 0;
    if(tp==='high') unrestDelta += 4;
    if(tp==='low') unrestDelta -= 1.5;
    if(famine) unrestDelta += 6;
    unrestDelta -= (p.loyalty-50)/20;
    p.unrest = clamp(p.unrest+unrestDelta+RI(-2,2),0,100);
    p.prosperity = clamp(p.prosperity + (tt==='high'?-1.5:tt==='low'?0.5:0) + (p.unrest>50?-1:0.3) + S.techFlags.prosperityGrowthFlat, 0,100);
    p.loyalty = clamp(p.loyalty + (tn==='high'?-1:tn==='low'?0.5:0), 0,100);
    p.development = clamp(p.development + S.techFlags.devGrowthFlat, 0,100);
  });

  const avgUnrest = S.provinces.reduce((a,p)=>a+p.unrest,0)/S.provinces.length;
  S.kingdom.unrest = clamp(avgUnrest,0,100);
  S.kingdom.prosperity = clamp(S.provinces.reduce((a,p)=>a+p.prosperity,0)/S.provinces.length,0,100);

  let stabilityDelta = 0;
  if(tp==='high') stabilityDelta -= 3;
  if(tn==='high') stabilityDelta -= 2;
  if(famine) stabilityDelta -= 5;
  stabilityDelta -= (S.kingdom.unrest-30)/15;
  stabilityDelta += (S.ruler.legitimacy-70)/30;
  stabilityDelta += S.techFlags.stabilityFlat/10;
  S.kingdom.stability = clamp(S.kingdom.stability+stabilityDelta,0,100);
  S.ruler.legitimacy = clamp(S.ruler.legitimacy + S.techFlags.legitimacyGrowthFlat, 0,100);

  S.kingdom.approval = clamp(
    (S.kingdom.stability*0.4 + (100-S.kingdom.unrest)*0.3 + S.kingdom.prosperity*0.3) + S.techFlags.stabilityFlat/5 ,0,100);

  return {famine};
}

function calcResearch(){
  const uniCount = S.provinces.reduce((a,p)=>a+p.buildings.filter(b=>b==='university').length,0);
  const devSum = S.provinces.reduce((a,p)=>a+p.development,0);
  let perYear = devSum/50 + uniCount*6 + S.ruler.skills.learning/8;
  perYear *= (1+S.techFlags.researchMult);
  S.tech.perYear = perYear;
  S.tech.points += perYear;

  const notes = [];
  if(S.tech.focus){
    const tech = findTech(S.tech.focus);
    if(tech){
      S.tech.progress += perYear;
      if(S.tech.progress >= tech.cost){
        S.tech.researched.push(tech.id);
        tech.onComplete(S);
        notes.push(`Research complete: ${tech.name} (${TECH_TREE[Object.keys(TECH_TREE).find(k=>TECH_TREE[k].techs.includes(tech))].label}). ${tech.desc}`);
        S.tech.focus = null;
        S.tech.progress = 0;
      }
    } else {
      S.tech.focus = null;
    }
  }
  return notes;
}

function engineSetResearchFocus(idOrName){
  const tech = findTech(idOrName);
  if(!tech) return {ok:false, msg:`No technology found matching "${idOrName}". Use "technology" to list options.`};
  if(!techAvailable(tech,S)) return {ok:false, msg:`${tech.name} is already researched or its prerequisites are unmet.`};
  S.tech.focus = tech.id;
  S.tech.progress = 0;
  return {ok:true, msg:`Research focus set to ${tech.name} (${tech.cost} points needed, generating ~${S.tech.perYear.toFixed(1)}/year).`};
}

function aiTurn(){
  const notes=[];
  S.aiKingdoms.forEach(ai=>{
    ai.opinion += RI(-2,2);
    ai.opinion = clamp(ai.opinion,-100,100);

    if(ai.atWar){
      const diff = (armyStrength()-ai.strength)/Math.max(armyStrength(),ai.strength);
      ai.warScore = clamp(ai.warScore + diff*10 + RI(-4,4) + S.techFlags.warScoreBonus/10, -100,100);

      const playerCasualtyRate = clamp(0.02 - diff*0.03 + RI(-1,1)/100, 0.005, 0.10);
      const aiCasualtyRate = clamp(0.02 + diff*0.03 + RI(-1,1)/100, 0.005, 0.10);
      const playerLosses = applyCasualties(playerCasualtyRate);
      ai.strength = Math.max(400, Math.round(ai.strength*(1-aiCasualtyRate)));
      if(playerLosses>0) notes.push(`The war with ${ai.name} claims ${fmt(playerLosses)} soldiers this year.`);

      // war exhaustion: fighting wears down the provinces regardless of who's winning
      S.provinces.forEach(p=> p.unrest = clamp(p.unrest+0.6,0,100));

      if(R()<0.25 && Math.abs(ai.warScore)>40){
        const res = engineSeekPeace(ai);
        notes.push(`${ai.name}: ${res.msg}`);
      }
      return;
    }

    if(ai.personality==='aggressive' && ai.strength>armyStrength()*1.3 && ai.opinion<0 && R()<0.12){
      engineDeclareWar(ai);
      notes.push(`${ai.name} (${ai.personality}) has declared war on ${S.kingdom.name}!`);
    } else if((ai.personality==='diplomatic'||ai.personality==='economic') && ai.opinion>50 && !ai.alliance && R()<0.15){
      ai.alliance=true;
      notes.push(`${ai.name} proposes and signs an alliance with ${S.kingdom.name}.`);
    } else if(ai.personality==='expansionist' && R()<0.05 && ai.opinion<20){
      ai.opinion -= 5;
      notes.push(`${ai.name} presses territorial claims near your border, souring relations.`);
    }
    ai.strength = Math.max(500, Math.round(ai.strength*(1+ (R()*0.04-0.01))));
  });
  return notes;
}

function courtDrift(){
  const notes=[];
  S.court.forEach(c=>{
    c.loyalty = clamp(c.loyalty + RI(-3,3),0,100);
    c.opinion = clamp(c.opinion + RI(-2,2),-100,100);
    if(c.loyalty<25 && R()<0.15){
      notes.push(`${c.name}, your ${c.title}, is losing faith in your rule (loyalty ${c.loyalty}%).`);
    }
  });
  return notes;
}

function agingAndSuccession(){
  const notes=[];
  S.ruler.age++;
  S.heir.age++;
  const deathChance = S.ruler.age>70 ? 0.10 : S.ruler.age>55 ? 0.04 : 0.008;
  if(R()<deathChance){
    notes.push(`King ${S.ruler.name} of House ${S.ruler.dynasty} has died at age ${S.ruler.age}.`);
    if(S.heir.age>=16){
      const oldName=S.ruler.name;
      S.ruler.name = S.heir.name;
      S.ruler.age = S.heir.age;
      S.ruler.legitimacy = clamp(RI(55,85),0,100);
      S.ruler.prestige = Math.round(S.ruler.prestige*0.6);
      S.ruler.skills = { diplomacy:RI(20,80), martial:RI(20,80), stewardship:RI(20,80), intrigue:RI(20,80), learning:RI(20,80) };
      S.ruler.traits = [pick(TRAIT_POOL), pick(TRAIT_POOL)];
      S.heir = { name: pick(HEIR_NAMES), age: RI(0,3) };
      notes.push(`${S.ruler.name} ascends the throne of ${S.kingdom.name}, successor to ${oldName}.`);
      S.kingdom.stability = clamp(S.kingdom.stability-8,0,100);
    } else {
      notes.push(`With the heir too young to rule, a regency council governs ${S.kingdom.name} in ${S.heir.name}'s name.`);
      S.kingdom.stability = clamp(S.kingdom.stability-15,0,100);
      S.ruler.legitimacy = clamp(S.ruler.legitimacy-10,0,100);
    }
  }
  return notes;
}

/* ---- Dynamic event pool ---- */
const EVENT_POOL = [
  {
    id:'treasury_low',
    cond: s=>s.kingdom.treasury<500,
    title:"THE ROYAL COFFERS RUN DRY",
    text: s=>`The treasury holds a mere ${fmt(s.kingdom.treasury)} gold. Merchants grumble about unpaid contracts and the garrison has not been paid this quarter.`,
    choices:[
      {label:"Raise emergency taxes", effect:s=>{s.kingdom.treasury+=1200; s.kingdom.taxRates.peasant='high'; s.kingdom.unrest=clamp(s.kingdom.unrest+8,0,100); return "Emergency levies raised 1,200 gold, but peasant tax jumps to 'high' and unrest rises.";}},
      {label:"Borrow from noble houses", effect:s=>{s.kingdom.treasury+=1000; s.factions.find(f=>f.name==='Nobility').satisfaction=clamp(s.factions.find(f=>f.name==='Nobility').satisfaction-10,0,100); return "The nobility lends 1,000 gold at a political cost — they will remember this.";}},
      {label:"Do nothing, ride it out", effect:s=>{s.kingdom.stability=clamp(s.kingdom.stability-6,0,100); return "The crisis passes slowly. Stability suffers as bills go unpaid.";}}
    ]
  },
  {
    id:'famine',
    cond: s=>s.kingdom.foodReserves<0,
    title:"FAMINE STALKS THE LAND",
    text: s=>`Granaries stand empty in several provinces. Reports of starvation reach the capital.`,
    choices:[
      {label:"Open royal granaries", effect:s=>{s.kingdom.treasury=Math.max(0,s.kingdom.treasury-800); s.kingdom.foodReserves+=3000; s.kingdom.approval=clamp(s.kingdom.approval+8,0,100); return "800 gold spent importing grain; the people are grateful.";}},
      {label:"Let local nobles handle it", effect:s=>{s.kingdom.unrest=clamp(s.kingdom.unrest+10,0,100); s.provinces.forEach(p=>p.population=Math.round(p.population*0.98)); return "Relief is uneven. Some provinces suffer badly; population declines.";}},
      {label:"Relocate population to richer provinces", effect:s=>{const rich=s.provinces.reduce((a,b)=>a.prosperity>b.prosperity?a:b); const poor=s.provinces.reduce((a,b)=>a.prosperity<b.prosperity?a:b); const moved=Math.round(poor.population*0.1); poor.population-=moved; rich.population+=moved; return `${fmt(moved)} people resettled from ${poor.name} to ${rich.name}.`;}}
    ]
  },
  {
    id:'noble_conspiracy',
    cond: s=>s.factions.find(f=>f.name==='Nobility').satisfaction<35,
    title:"WHISPERS OF CONSPIRACY",
    text: s=>`The Spymaster reports that disgruntled nobles have been meeting in secret. Their satisfaction with the crown is dangerously low.`,
    choices:[
      {label:"Arrest the ringleaders", effect:s=>{s.kingdom.stability=clamp(s.kingdom.stability+5,0,100); s.factions.find(f=>f.name==='Nobility').satisfaction=clamp(s.factions.find(f=>f.name==='Nobility').satisfaction-15,0,100); return "The plot is crushed, but the nobility's resentment deepens.";}},
      {label:"Offer concessions and titles", effect:s=>{s.factions.find(f=>f.name==='Nobility').satisfaction=clamp(s.factions.find(f=>f.name==='Nobility').satisfaction+20,0,100); s.ruler.legitimacy=clamp(s.ruler.legitimacy-4,0,100); return "Concessions calm the nobles, though it sets a costly precedent.";}},
      {label:"Ignore the rumors", effect:s=>{if(R()<0.5){s.kingdom.stability=clamp(s.kingdom.stability-15,0,100); return "The rumors proved true — a minor revolt breaks out before it is contained.";} return "The rumors fade without incident, for now.";}}
    ]
  },
  {
    id:'plague',
    cond: s=>R()<Math.max(0.01, 0.05-s.techFlags.plagueResist*0.02),
    title:"PLAGUE IN THE PROVINCES",
    text: s=>{const p=pick(s.provinces); s._plagueProvince=p.id; return `A wasting sickness has broken out in ${p.name}.`;},
    choices:[
      {label:"Quarantine the province", effect:s=>{const p=s.provinces.find(x=>x.id===s._plagueProvince); p.population=Math.round(p.population*0.95); p.unrest=clamp(p.unrest+10,0,100); return `${p.name} is sealed off. Losses are contained but resentment grows.`;}},
      {label:"Send royal physicians", effect:s=>{s.kingdom.treasury=Math.max(0,s.kingdom.treasury-400); const p=s.provinces.find(x=>x.id===s._plagueProvince); p.population=Math.round(p.population*0.98); p.loyalty=clamp(p.loyalty+5,0,100); return `400 gold spent on physicians; ${p.name} suffers fewer losses and remains loyal.`;}}
    ]
  },
  {
    id:'border_raid',
    cond: s=>s.military.infantry+s.military.archers+s.military.cavalry < 1000,
    title:"RAIDERS ON THE BORDER",
    text: s=>`With the army thin, raiders have struck a frontier village, seizing livestock and grain.`,
    choices:[
      {label:"Send cavalry in pursuit", effect:s=>{if(s.military.cavalry>=100){s.military.cavalry-=RI(10,40); return "The raiders are hunted down, at the cost of some cavalry losses.";} return "There is no cavalry to spare — the raiders escape.";}},
      {label:"Fortify the border instead", effect:s=>{s.kingdom.treasury=Math.max(0,s.kingdom.treasury-300); return "300 gold spent on hasty fortifications to deter further raids.";}}
    ]
  },
  {
    id:'good_harvest',
    cond: s=>R()<0.08,
    title:"A BOUNTIFUL HARVEST",
    text: s=>`Favorable weather has blessed the realm's farmlands this year.`,
    choices:[
      {label:"Celebrate with a festival", effect:s=>{s.kingdom.approval=clamp(s.kingdom.approval+10,0,100); s.kingdom.treasury=Math.max(0,s.kingdom.treasury-200); return "A grand festival lifts the people's spirits.";}},
      {label:"Stockpile the surplus quietly", effect:s=>{s.kingdom.foodReserves+=4000; return "The surplus is stored away against leaner years.";}}
    ]
  }
];

function maybeGenerateEvent(){
  const eligible = EVENT_POOL.filter(e=>{
    const cd = S.eventCooldowns[e.id]||0;
    return cd<=0 && e.cond(S);
  });
  if(eligible.length===0) return null;
  const chosen = pick(eligible);
  S.eventCooldowns[chosen.id]=3;
  Object.keys(S.eventCooldowns).forEach(k=>{ if(k!==chosen.id) S.eventCooldowns[k]=Math.max(0,S.eventCooldowns[k]-1); });
  const textResult = chosen.text(S);
  S.pendingEvent = { id:chosen.id, title:chosen.title, text:textResult, choices:chosen.choices };
  return S.pendingEvent;
}

/* ---- Year advance orchestration ---- */
function advanceYear(){
  if(S.pendingEvent){
    print(`An unresolved matter awaits your decision. Use <b>choose &lt;number&gt;</b> first.`, 'warn');
    return;
  }
  S.turnLog = [];
  const built = resolveConstruction();
  built.forEach(m=>S.turnLog.push(m));

  const {income,expenses} = calcEconomy();
  const foodDelta = calcFood();
  const {famine} = calcPopulationAndStability(foodDelta);
  const techNotes = calcResearch();
  const aiNotes = aiTurn();
  const courtNotes = courtDrift();
  const succNotes = agingAndSuccession();

  techNotes.forEach(n=>S.turnLog.push(n));
  aiNotes.forEach(n=>S.turnLog.push(n));
  courtNotes.forEach(n=>S.turnLog.push(n));
  succNotes.forEach(n=>S.turnLog.push(n));
  if(famine) S.turnLog.push("Food reserves have run out — famine conditions reported.");

  S.history.push({ year:S.year, income, expenses, treasury:S.kingdom.treasury,
    stability:S.kingdom.stability, population:totalPopulation(), notes:[...S.turnLog] });

  S.year++;

  renderYearReport(income,expenses,famine,built,aiNotes,courtNotes,succNotes,techNotes);

  const ev = maybeGenerateEvent();
  renderDashboard();
  if(ev) renderEvent(ev);
}

function renderYearReport(income,expenses,famine,built,aiNotes,courtNotes,succNotes,techNotes){
  rule();
  heading(`YEAR ${S.year-1} — END OF YEAR REPORT`);
  print(`Income: <span class="pos">+${fmt(income)}</span>  Expenses: <span class="neg">-${fmt(expenses)}</span>  Net: <span class="${income-expenses>=0?'pos':'neg'}">${income-expenses>=0?'+':''}${fmt(income-expenses)}</span>`);
  print(`Treasury now: <span class="num">${fmt(S.kingdom.treasury)}</span> gold  |  Population: ${fmt(totalPopulation())}`);
  if(built.length) built.forEach(b=>print(`✓ ${b}`,'good'));
  if(famine) print(`⚠ Famine reported in the realm.`,'warn');
  (techNotes||[]).forEach(n=>print(`✦ ${n}`,'good'));
  aiNotes.forEach(n=>print(`• ${n}`, n.includes('war')? 'warn':'dim'));
  courtNotes.forEach(n=>print(`• ${n}`,'warn'));
  succNotes.forEach(n=>print(`✦ ${n}`,'hd'));
  rule();
}

function renderEvent(ev){
  const box = document.createElement('div');
  box.className='event-box';
  let html = `<div class="event-title">⚠ ${ev.title}</div><div>${ev.text}</div><div style="margin-top:8px;">`;
  ev.choices.forEach((c,i)=> html += `<div class="choice link" onclick="processCommand('choose ${i+1}')"><span class="n">${i+1}.</span> ${c.label}</div>`);
  html += `</div><div class="dim" style="margin-top:6px;">Click a choice above, or type: choose &lt;number&gt;</div>`;
  box.innerHTML = html;
  term.appendChild(box);
  term.scrollTop = term.scrollHeight;
  jumpBtn.style.display='none';
  updateInputPlaceholder();
}

function resolveChoice(n){
  if(!S.pendingEvent) return {ok:false,msg:"There is no pending decision."};
  const idx = n-1;
  const ev = S.pendingEvent;
  if(idx<0||idx>=ev.choices.length) return {ok:false,msg:`Choose a number between 1 and ${ev.choices.length}.`};
  const resultText = ev.choices[idx].effect(S);
  S.pendingEvent = null;
  return {ok:true,msg:resultText};
}


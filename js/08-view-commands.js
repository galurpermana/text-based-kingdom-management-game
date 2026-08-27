/* ---------------------------------------------------------------------
   5. VIEW COMMANDS (read-only prints)
--------------------------------------------------------------------- */
function viewEconomy(){
  const e = S.kingdom.economy;
  heading("ROYAL TREASURY — ECONOMIC REPORT");
  if(!e){
    print(`No figures yet — advance a year to generate the first economic report.`,'dim');
    return;
  }
  print(`Treasury: <span class="num">${fmt(S.kingdom.treasury)}</span> gold`);
  rule();
  print(`<b>INCOME</b> — total <span class="pos">+${fmt(e.income)}</span>`);
  print(`  Peasant/land tax  <span class="dim">(${S.kingdom.taxRates.peasant})</span>  ${fmt(e.peasantTax)}`);
  print(`  Trade tax         <span class="dim">(${S.kingdom.taxRates.trade})</span>  ${fmt(e.tradeTax)}`);
  print(`  Noble tax         <span class="dim">(${S.kingdom.taxRates.noble})</span>  ${fmt(e.nobleTax)}`);
  print(`  <span class="dim">— gross before corruption/tech: ${fmt(e.preTechGross)}</span>`);
  print(`  Corruption losses  <span class="neg">-${fmt(e.corruptionLoss)}</span> <span class="dim">(effective corruption ${Math.round(S.kingdom.corruption+S.techFlags.corruptionFlat)}%)</span>`);
  print(`  Trade tech bonus   <span class="pos">+${fmt(e.techBonus)}</span> <span class="dim">(+${Math.round(S.techFlags.tradeMult*100)}% from research)</span>`);
  rule();
  print(`<b>EXPENSES</b> — total <span class="neg">-${fmt(e.expenses)}</span>`);
  print(`  Military wages: ${fmt(e.militaryWages.total)}`);
  print(`    Infantry ${fmt(e.militaryWages.infantry)}  Archers ${fmt(e.militaryWages.archers)}  Cavalry ${fmt(e.militaryWages.cavalry)}${e.militaryWages.knights?`  Knights ${fmt(e.militaryWages.knights)}`:''}${e.militaryWages.siege?`  Siege ${fmt(e.militaryWages.siege)}`:''}`);
  print(`  Building maintenance: ${fmt(e.buildingMaintenance)}`);
  if(Object.keys(e.maintenanceByType).length){
    print('  ' + Object.entries(e.maintenanceByType).map(([b,v])=>`${BUILDINGS[b].name} ${fmt(v)}`).join('   '), 'dim');
  }
  print(`  Court upkeep: ${fmt(e.courtUpkeep)}`);
  if(e.activeWars>0) print(`  War expenditure: <span class="neg">${fmt(e.warExpenditure)}</span> <span class="dim">(${e.activeWars} active war${e.activeWars>1?'s':''} — supply lines and mobilization)</span>`);
  rule();
  print(`<b>NET</b>: <span class="${e.income-e.expenses>=0?'pos':'neg'}">${e.income-e.expenses>=0?'+':''}${fmt(e.income-e.expenses)}</span>/year`);
  rule();
  print(`<b>Income by province</b> (top contributors)`);
  e.byProvince.slice(0,6).forEach(p=> print(`  ${p.name}: ${fmt(p.total)}`,'dim'));
}

function viewKingdom(){
  heading(`KINGDOM OF ${S.kingdom.name.toUpperCase()}`);
  print(`Ruler: ${S.ruler.name} of House ${S.ruler.dynasty}  (age ${S.ruler.age}, traits: ${S.ruler.traits.join(', ')})`);
  print(`Heir: ${S.heir.name} (age ${S.heir.age})`);
  print(`Year: ${S.year}   Capital: ${S.kingdom.capital}`);
  print(`Treasury: <span class="num">${fmt(S.kingdom.treasury)}</span> gold   Last net: ${fmt(S.kingdom.lastIncome-S.kingdom.lastExpenses)}`);
  print(`Stability ${Math.round(S.kingdom.stability)}%   Prosperity ${Math.round(S.kingdom.prosperity)}%   Approval ${Math.round(S.kingdom.approval)}%   Unrest ${Math.round(S.kingdom.unrest)}%`);
  print(`Legitimacy ${S.ruler.legitimacy}%   Prestige ${S.ruler.prestige}   Corruption ${S.kingdom.corruption}%`);
  print(`Food reserves: ${fmt(S.kingdom.foodReserves)}`);
  print(`Taxes — peasant: ${S.kingdom.taxRates.peasant}, trade: ${S.kingdom.taxRates.trade}, noble: ${S.kingdom.taxRates.noble}`);
  print(`Population: ${fmt(totalPopulation())} across ${S.provinces.length} provinces`);
  print(`Research: ${S.tech.points.toFixed(1)} points (~${S.tech.perYear.toFixed(1)}/yr)${S.tech.focus? ' — focused on '+findTech(S.tech.focus).name+' ('+Math.round(S.tech.progress)+'/'+findTech(S.tech.focus).cost+')' : ' — no focus set'}`);
  if(S.buildQueue.length){
    print(`Under construction: ` + S.buildQueue.map(b=>{
      const p = S.provinces.find(x=>x.id===b.provinceId);
      return `${BUILDINGS[b.type].name} in ${p.name} (${b.yearsLeft}yr left)`;
    }).join('; '));
  }
}

function viewProvinces(){
  heading("PROVINCES");
  S.provinces.forEach(p=>{
    print(`[${p.id}] <span class="link" onclick="processCommand('province ${p.name}')"><b>${p.name}</b></span> — pop ${fmt(p.population)}, ${p.culture}/${p.religion}, prosperity ${Math.round(p.prosperity)}%, loyalty ${Math.round(p.loyalty)}%, unrest ${Math.round(p.unrest)}%`);
  });
  print(`<span class="dim">Click a province name, or type: province &lt;name&gt;</span>`);
}

function viewProvince(name){
  const p = findProvince(name);
  if(!p) return print(`No province found matching "${name}".`,'warn');
  heading(p.name.toUpperCase());
  print(`Culture: ${p.culture}   Religion: ${p.religion}`);
  print(`Population: ${fmt(p.population)}`);
  print(`Prosperity ${Math.round(p.prosperity)}%   Development ${Math.round(p.development)}%   Loyalty ${Math.round(p.loyalty)}%   Unrest ${Math.round(p.unrest)}%`);
  print(`Food production: ${fmt(p.foodProd)}   Military presence: ${fmt(p.militaryPresence)}`);
  print(`Buildings: ${p.buildings.length ? p.buildings.map(b=>BUILDINGS[b].name).join(', ') : 'none'}`);
}

function viewCourt(){
  heading("ROYAL COURT");
  S.court.forEach(c=>{
    print(`<b>${c.name}</b> — ${c.title}`);
    print(`  Diplomacy ${c.skills.diplomacy}  Stewardship ${c.skills.stewardship}  Intrigue ${c.skills.intrigue}  Martial ${c.skills.martial}`);
    print(`  Loyalty ${c.loyalty}%   Ambition: ${c.ambition}   Opinion of ruler: ${c.opinion}`);
    print(`  <span class="dim">Secret: ${c.secret}</span>`);
  });
}

function viewArmy(){
  heading("ARMED FORCES");
  const capacity = armyCapacity(), used = armyManpower();
  print(`Capacity: ${fmt(used)}/${fmt(capacity)}${used>=capacity?' <span class="warn">(full)</span>':''} <span class="dim">— raised by population and barracks/walls</span>`);
  print(`Infantry: ${fmt(S.military.infantry)} <span class="dim">(${UNIT_RECRUIT_COST.infantry}g ea, ${UNIT_WAGE.infantry}g/yr upkeep)</span>`);
  print(`Archers: ${fmt(S.military.archers)} <span class="dim">(${UNIT_RECRUIT_COST.archers}g ea, ${UNIT_WAGE.archers}g/yr upkeep)</span>`);
  print(`Cavalry: ${fmt(S.military.cavalry)} <span class="dim">(${UNIT_RECRUIT_COST.cavalry}g ea, ${UNIT_WAGE.cavalry}g/yr upkeep)</span>`);
  if(S.techFlags.unlockedUnits.includes('knights')) print(`Knights: ${fmt(S.military.knights)} <span class="dim">(${UNIT_RECRUIT_COST.knights}g ea, ${UNIT_WAGE.knights}g/yr upkeep)</span>`);
  else print(`Knights: <span class="dim">🔒 locked — requires further research</span>`);
  if(S.techFlags.unlockedUnits.includes('siege')) print(`Siege: ${fmt(S.military.siege)} <span class="dim">(${UNIT_RECRUIT_COST.siege}g ea, ${UNIT_WAGE.siege}g/yr upkeep)</span>`);
  else print(`Siege: <span class="dim">🔒 locked — requires further research</span>`);
  print(`Total fighting strength (weighted): ${fmt(armyStrength())}`);
  print(`Morale: ${S.military.morale}%`);
  const upkeep = S.military.infantry*UNIT_WAGE.infantry + S.military.archers*UNIT_WAGE.archers + S.military.cavalry*UNIT_WAGE.cavalry
    + (S.military.knights||0)*UNIT_WAGE.knights + (S.military.siege||0)*UNIT_WAGE.siege;
  print(`Upkeep: ${fmt(upkeep)}/year`);
  print(`<span class="dim">Tip: open the Army tab in the side panel for one-click recruit/disband controls.</span>`);
}

function viewDiplomacy(name){
  if(name){
    const ai = findAI(name);
    if(!ai) return print(`No kingdom found matching "${name}".`,'warn');
    heading(ai.name.toUpperCase());
    print(`Personality: ${ai.personality}`);
    print(`Military strength: ${fmt(ai.strength)}   Economy: ${ai.economy}`);
    print(`Opinion of you: ${ai.opinion}   Trust: ${ai.trust}%`);
    print(`Alliance: ${ai.alliance?'Yes':'No'}   At war: ${ai.atWar?'Yes (warscore '+ai.warScore+')':'No'}`);
    if(ai.atWar){
      if(ai.warScore>=75) print(`<span class="good">Decisive victory in reach — suing for peace now would annex one of ${ai.name}'s provinces.</span>`);
      else if(ai.warScore<=-75) print(`<span class="warn">On the brink of a crushing defeat — suing for peace now would cost you a province.</span>`);
      print(`<span class="dim">War is costing lives and gold every year it continues (see 'army' and 'economy').</span>`);
    }
    return;
  }
  heading("FOREIGN KINGDOMS");
  S.aiKingdoms.forEach(ai=>{
    print(`<span class="link" onclick="processCommand('diplomacy ${ai.name}')"><b>${ai.name}</b></span> (${ai.personality}) — strength ${fmt(ai.strength)}, opinion ${ai.opinion}${ai.alliance?', <span class="good">allied</span>':''}${ai.atWar?', <span class="warn">AT WAR</span>':''}`);
  });
  print(`<span class="dim">Click a kingdom, or: diplomacy &lt;k&gt; | relations &lt;k&gt; improve | alliance &lt;k&gt; | war &lt;k&gt; | peace &lt;k&gt;</span>`);
}

function viewTechnology(){
  heading("TECHNOLOGY");
  print(`Research points: <span class="num">${S.tech.points.toFixed(1)}</span>   Generation: ~${S.tech.perYear.toFixed(1)}/year`);
  if(S.tech.focus){
    const t = findTech(S.tech.focus);
    print(`Current focus: <b>${t.name}</b> — ${Math.round(S.tech.progress)}/${t.cost} points`);
  } else {
    print(`No research focus set. Use: research &lt;technology name&gt;`, 'dim');
  }
  rule();
  Object.entries(TECH_TREE).forEach(([key,branch])=>{
    print(`<b>${branch.label}</b>`);
    branch.techs.forEach(t=>{
      let status;
      if(S.tech.researched.includes(t.id)) status = '<span class="good">[researched]</span>';
      else if(S.tech.focus===t.id) status = '<span class="num">[researching]</span>';
      else if(techAvailable(t,S)) status = '<span class="dim">[available]</span>';
      else status = `<span class="dim">[locked — needs ${t.reqs.map(r=>findTech(r).name).join(', ')}]</span>`;
      const nameHtml = techAvailable(t,S) ? `<span class="link" onclick="processCommand('research ${t.name}')">${t.name}</span>` : t.name;
      print(`  T${t.tier} ${nameHtml} (${t.cost}pt) ${status} <span class="dim">— ${t.desc}</span>`);
    });
  });
  rule();
  print(`<span class="dim">Click an available technology to research it, or type: research &lt;name&gt;</span>`);
}

function viewHistory(){
  if(S.history.length===0) return print("No history recorded yet. Advance a year to begin the chronicle.",'dim');
  heading("ROYAL CHRONICLE");
  S.history.slice(-10).forEach(h=>{
    print(`<b>Year ${h.year}</b> — treasury ${fmt(h.treasury)}, stability ${Math.round(h.stability)}%, population ${fmt(h.population)}`);
    h.notes.forEach(n=>print(`   · ${n}`,'dim'));
  });
}

function viewHelp(){
  heading("COMMANDS");
  const rows = [
    ["kingdom","Full kingdom dashboard"],
    ["economy","Itemized income/expense report"],
    ["provinces","List all provinces"],
    ["province <name>","Detail on one province"],
    ["court","View royal court advisors"],
    ["army","View military forces"],
    ["diplomacy [kingdom]","View foreign kingdoms, or detail on one"],
    ["technology","View the tech tree and current research"],
    ["research <name>","Set your research focus"],
    ["tax <peasant|trade|noble> <low|normal|high>","Set a tax rate"],
    ["build [type] [province]","Build: "+Object.keys(BUILDINGS).join(', ')+" — or just 'build' for the catalog, or use the Build tab to click-to-build"],
    ["recruit <infantry|archers|cavalry> <n>","Recruit troops (limited by treasury and army capacity)"],
    ["disband <infantry|archers|cavalry> <n>","Disband troops"],
    ["relations <kingdom> improve","Send gifts, raise opinion"],
    ["alliance <kingdom>","Propose an alliance (needs high opinion)"],
    ["war <kingdom>","Declare war — casualties, war costs, and territory are now at stake"],
    ["peace <kingdom>","Seek peace: gold changes hands normally; a decisive war (score \u2265\u00b175) can annex or lose a province"],
    ["choose <n>","Resolve a pending event"],
    ["advance","Advance to the next year"],
    ["history","Review the royal chronicle"],
    ["save / load","Persist or restore your kingdom in this browser"],
    ["export / import","Download/paste a portable save file, or load one in"],
    ["new","Begin a new reign (new random kingdom)"]
  ];
  rows.forEach(r=>print(`<b>${r[0]}</b><span class="dim"> — ${r[1]}</span>`));
  rule();
  print(`<span class="dim">This build implements Phases 1–3 of a full kingdom sim: economy, provinces, population, food, construction, court, military, a 20-tech tree across 5 branches, simplified diplomacy/warfare, dynastic succession, and a reactive event engine. Laws/government types and deep siege warfare with quests are natural next phases — say the word and they can be added.</span>`);
}


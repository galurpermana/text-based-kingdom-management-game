/* ---------------------------------------------------------------------
   3b. SIDE PANEL — persistent at-a-glance reference (does not scroll
   away like the terminal log; always reflects current state)
--------------------------------------------------------------------- */
let sideTab = 'crown';
const SIDE_TABS = ['crown','provinces','court','army','diplomacy','factions','economy','construction','tech','chronicle'];
const SIDE_TAB_LABELS = { crown:'Crown', provinces:'Provinces', court:'Court', army:'Army', diplomacy:'Diplomacy',
  factions:'Factions', economy:'Economy', construction:'Build', tech:'Tech', chronicle:'History' };

function sideCrownHTML(){
  const r = S.ruler;
  let html = `<div class="sp-item">
    <div><b>${r.name}</b> <span class="dim">of House ${r.dynasty}</span></div>
    <div class="dim">Age ${r.age}   Health ${r.health}%</div>
    <div class="dim">Traits: ${r.traits.join(', ')}</div>
    <div class="sp-row" style="margin-top:6px;"><span class="sp-label">Legit.</span>${barHTML(r.legitimacy,100,r.legitimacy<40?'danger':'good')}<span class="dim">${r.legitimacy}%</span></div>
    <div class="sp-row"><span class="sp-label">Prestige</span>${barHTML(r.prestige,100)}<span class="dim">${r.prestige}</span></div>
  </div>
  <div class="sp-item">
    <div class="dim" style="margin-bottom:3px;">Skills</div>
    <div class="sp-row"><span class="sp-label">Diplo.</span>${barHTML(r.skills.diplomacy,100)}<span class="dim">${r.skills.diplomacy}</span></div>
    <div class="sp-row"><span class="sp-label">Martial</span>${barHTML(r.skills.martial,100)}<span class="dim">${r.skills.martial}</span></div>
    <div class="sp-row"><span class="sp-label">Steward</span>${barHTML(r.skills.stewardship,100)}<span class="dim">${r.skills.stewardship}</span></div>
    <div class="sp-row"><span class="sp-label">Intrigue</span>${barHTML(r.skills.intrigue,100)}<span class="dim">${r.skills.intrigue}</span></div>
    <div class="sp-row"><span class="sp-label">Learning</span>${barHTML(r.skills.learning,100)}<span class="dim">${r.skills.learning}</span></div>
  </div>
  <div class="sp-item">
    <div class="dim">Heir</div>
    <div><b>${S.heir.name}</b> <span class="dim">— age ${S.heir.age}${S.heir.age<16?' (too young to inherit)':''}</span></div>
  </div>`;
  return html;
}

function sideFactionsHTML(){
  return S.factions.map(f=>`
    <div class="sp-item">
      <div><b>${f.name}</b></div>
      <div class="sp-row"><span class="sp-label">Influence</span>${barHTML(f.influence,100)}<span class="dim">${Math.round(f.influence)}%</span></div>
      <div class="sp-row"><span class="sp-label">Satisf.</span>${barHTML(f.satisfaction,100, f.satisfaction<35?'danger':'good')}<span class="dim">${Math.round(f.satisfaction)}%</span></div>
    </div>`).join('');
}

function sideEconomyHTML(){
  const e = S.kingdom.economy;
  if(!e) return `<div class="sp-item dim">No figures yet — advance a year first.</div>`;
  return `
    <div class="sp-item">
      <div class="dim">Income</div><div><b class="pos">+${fmt(e.income)}</b></div>
      <div class="dim" style="margin-top:4px;">Peasant ${fmt(e.peasantTax)}<br>Trade ${fmt(e.tradeTax)}<br>Noble ${fmt(e.nobleTax)}</div>
      <div class="dim">Corruption <span class="neg">-${fmt(e.corruptionLoss)}</span>   Tech <span class="pos">+${fmt(e.techBonus)}</span></div>
    </div>
    <div class="sp-item">
      <div class="dim">Expenses</div><div><b class="neg">-${fmt(e.expenses)}</b></div>
      <div class="dim" style="margin-top:4px;">Wages ${fmt(e.militaryWages.total)}<br>Maintenance ${fmt(e.buildingMaintenance)}<br>Court ${fmt(e.courtUpkeep)}${e.activeWars>0?`<br><span class="warn">War upkeep ${fmt(e.warExpenditure)}</span>`:''}</div>
    </div>
    <div class="sp-item">
      <div class="dim">Net / year</div>
      <div><b class="${e.income-e.expenses>=0?'pos':'neg'}">${e.income-e.expenses>=0?'+':''}${fmt(e.income-e.expenses)}</b></div>
    </div>
    <div class="dim link" onclick="processCommand('economy')">Full breakdown →</div>`;
}

function viewBuildCatalog(){
  heading("CONSTRUCTION CATALOG");
  Object.entries(BUILDINGS).forEach(([key,spec])=>{
    const cost = Math.round(spec.cost*(1+S.techFlags.constructionCostMult));
    print(`<b>${spec.name}</b> — ${fmt(cost)}g, ${Math.max(1,spec.duration+S.techFlags.constructionDurationFlat)}yr <span class="dim">— ${spec.desc}</span>`);
  });
  print(`<span class="dim">Use: build &lt;type&gt; &lt;province&gt; — or open the Build tab in the side panel to build with one click.</span>`);
}

let buildSelectedProvince = null;
function setBuildProvince(name){ buildSelectedProvince = name; renderSidePanel(); }

function sideConstructionHTML(){
  if(!buildSelectedProvince) buildSelectedProvince = S.provinces[0].name;
  let html = '';

  if(S.buildQueue.length){
    html += `<div class="dim" style="margin-bottom:2px;">Under construction</div>`;
    html += S.buildQueue.map(b=>{
      const p = S.provinces.find(x=>x.id===b.provinceId);
      const spec = BUILDINGS[b.type];
      return `<div class="sp-item">
        <div><b>${spec.name}</b></div>
        <div class="dim"><span class="link" onclick="processCommand('province ${p.name}')">${p.name}</span> — ${b.yearsLeft} year(s) left</div>
      </div>`;
    }).join('');
  }

  const prov = findProvince(buildSelectedProvince) || S.provinces[0];
  html += `<div class="sp-item">
    <div class="dim" style="margin-bottom:4px;">Build in:</div>
    <select onchange="setBuildProvince(this.value)" style="width:100%;background:#000;color:var(--parchment);border:1px solid var(--line);padding:5px;font-family:inherit;font-size:11px;">
      ${S.provinces.map(p=>`<option value="${p.name}" ${p.name===prov.name?'selected':''}>${p.name}</option>`).join('')}
    </select>
  </div>`;

  html += Object.entries(BUILDINGS).map(([key,spec])=>{
    const count = prov.buildings.filter(b=>b===key).length;
    const cost = Math.round(spec.cost*(1+S.techFlags.constructionCostMult));
    const duration = Math.max(1, spec.duration+S.techFlags.constructionDurationFlat);
    const affordable = S.kingdom.treasury >= cost;
    return `<div class="sp-item">
      <div><span class="link" onclick="processCommand('build ${key} ${prov.name}')"><b>${spec.name}</b></span>${count?` <span class="dim">(built ×${count})</span>`:''}</div>
      <div class="dim">${spec.desc}</div>
      <div class="${affordable?'good':'neg'}">${fmt(cost)}g · ${duration}yr${affordable?'':' · insufficient funds'}</div>
    </div>`;
  }).join('');

  return html;
}

function sideChronicleHTML(){
  if(S.history.length===0) return `<div class="sp-item dim">No history yet — advance a year to begin the chronicle.</div>`;
  const recent = S.history.slice(-5).reverse();
  let html = recent.map(h=>`
    <div class="sp-item">
      <div><b>Year ${h.year}</b></div>
      <div class="dim">Treasury ${fmt(h.treasury)}   Stability ${Math.round(h.stability)}%</div>
      ${h.notes.slice(0,2).map(n=>`<div class="dim">· ${n}</div>`).join('')}
    </div>`).join('');
  html += `<div class="dim link" onclick="processCommand('history')">Full chronicle →</div>`;
  return html;
}

function sideProvincesHTML(){
  return S.provinces.map(p=>`
    <div class="sp-item">
      <div><span class="link" onclick="processCommand('province ${p.name}')"><b>${p.name}</b></span> <span class="dim">${fmt(p.population)}</span></div>
      <div class="sp-row"><span class="sp-label">Prosp.</span>${barHTML(p.prosperity,100)}<span class="dim">${Math.round(p.prosperity)}%</span></div>
      <div class="sp-row"><span class="sp-label">Loyal.</span>${barHTML(p.loyalty,100,'good')}<span class="dim">${Math.round(p.loyalty)}%</span></div>
      <div class="sp-row"><span class="sp-label">Unrest</span>${barHTML(p.unrest,100,'danger')}<span class="dim">${Math.round(p.unrest)}%</span></div>
    </div>`).join('');
}

function sideCourtHTML(){
  return S.court.map(c=>`
    <div class="sp-item">
      <div><b>${c.name}</b> <span class="dim">— ${c.title}</span></div>
      <div class="sp-row"><span class="sp-label">Loyal.</span>${barHTML(c.loyalty,100, c.loyalty<30?'danger':'good')}<span class="dim">${c.loyalty}%</span></div>
      <div class="dim">Opinion ${c.opinion}   Ambition ${c.ambition}</div>
    </div>`).join('');
}

const ARMY_UNIT_META = [
  {key:'infantry', label:'Infantry'},
  {key:'archers',  label:'Archers'},
  {key:'cavalry',  label:'Cavalry'},
  {key:'knights',  label:'Knights'},
  {key:'siege',    label:'Siege'},
];

function sideArmyHTML(){
  const total = armyManpower();
  const capacity = armyCapacity();
  const room = Math.max(0, capacity-total);
  const treasury = S.kingdom.treasury;
  const upkeep = S.military.infantry*UNIT_WAGE.infantry + S.military.archers*UNIT_WAGE.archers + S.military.cavalry*UNIT_WAGE.cavalry
    + (S.military.knights||0)*UNIT_WAGE.knights + (S.military.siege||0)*UNIT_WAGE.siege;
  const atCap = room<=0;

  let html = `<div class="sp-item">
      <div class="sp-row"><span class="sp-label">Troops</span><b>${fmt(total)}</b></div>
      <div class="sp-row"><span class="sp-label">Capacity</span>${barHTML(total,capacity, atCap?'danger':'good')}<span class="dim">${fmt(total)}/${fmt(capacity)}</span></div>
      ${atCap ? `<div class="warn" style="font-size:10px; margin-top:2px;">At full capacity — build barracks or grow population to expand.</div>` : `<div class="dim" style="font-size:10px; margin-top:2px;">${fmt(room)} slots free</div>`}
      <div class="sp-row" style="margin-top:6px;"><span class="sp-label">Strength</span><b>${fmt(armyStrength())}</b></div>
      <div class="sp-row"><span class="sp-label">Morale</span>${barHTML(S.military.morale,100, S.military.morale<40?'danger':'good')}<span class="dim">${S.military.morale}%</span></div>
      <div class="sp-row"><span class="sp-label">Upkeep</span><span class="dim">${fmt(upkeep)}g/yr</span> · <span class="sp-label" style="min-width:0;">Treasury</span><span class="dim">${fmt(treasury)}g</span></div>
      ${S.military.warDeaths ? `<div class="dim" style="font-size:10px; margin-top:2px;">Lost to war so far: ${fmt(S.military.warDeaths)}</div>` : ''}
    </div>`;

  ARMY_UNIT_META.forEach(u=>{
    const locked = (u.key==='knights'||u.key==='siege') && !S.techFlags.unlockedUnits.includes(u.key);
    if(locked){
      html += `<div class="sp-item">
        <div class="sp-row"><b class="dim">${u.label}</b><span class="mil-locked" style="margin-left:auto;">🔒 unresearched</span></div>
      </div>`;
      return;
    }
    const count = S.military[u.key]||0;
    const cost = UNIT_RECRUIT_COST[u.key];
    const wage = UNIT_WAGE[u.key];
    const maxAfford = Math.max(0, Math.min(room, Math.floor(treasury/cost)));
    html += `<div class="sp-item">
      <div class="sp-row"><b>${u.label}</b><span style="margin-left:auto;">${fmt(count)}</span></div>
      <div class="dim" style="font-size:10px;">${cost}g to recruit · ${wage}g/yr upkeep each</div>
      <div class="sp-row" style="margin-top:5px; gap:4px; flex-wrap:wrap;">
        <span class="link mil-btn ${(atCap||treasury<cost*10||room<10)?'disabled':''}" onclick="processCommand('recruit ${u.key} 10')">+10</span>
        <span class="link mil-btn ${(atCap||treasury<cost*100||room<100)?'disabled':''}" onclick="processCommand('recruit ${u.key} 100')">+100</span>
        <span class="link mil-btn ${maxAfford<1?'disabled':''}" onclick="processCommand('recruit ${u.key} ${maxAfford}')" title="Recruit as many as gold and capacity allow">max</span>
      </div>
      <div class="sp-row" style="margin-top:3px; gap:4px; flex-wrap:wrap;">
        <span class="link mil-btn danger-btn ${count<10?'disabled':''}" onclick="processCommand('disband ${u.key} 10')">-10</span>
        <span class="link mil-btn danger-btn ${count<100?'disabled':''}" onclick="processCommand('disband ${u.key} 100')">-100</span>
        <span class="link mil-btn danger-btn ${count<1?'disabled':''}" onclick="processCommand('disband ${u.key} ${count}')">disband all</span>
      </div>
    </div>`;
  });

  html += `<div class="dim link" onclick="processCommand('army')">Full report →</div>`;
  return html;
}

function sideDiplomacyHTML(){
  return S.aiKingdoms.map(ai=>{
    let warBlock = '';
    if(ai.atWar){
      const decisive = ai.warScore>=75 ? 'winning decisively — victory would annex their land'
        : ai.warScore<=-75 ? 'losing decisively — defeat would cost you a province'
        : ai.warScore>25 ? 'winning' : ai.warScore<-25 ? 'losing' : 'stalemate';
      warBlock = `
        <div class="sp-row" style="margin-top:4px;">${barHTML(ai.warScore+100,200, ai.warScore>=0?'good':'danger')}<span class="dim">${ai.warScore}</span></div>
        <div class="warn" style="font-size:10px;">AT WAR — ${decisive}</div>
        <div class="sp-row" style="margin-top:4px;"><span class="link mil-btn" onclick="processCommand('peace ${ai.name}')">Sue for peace</span></div>`;
    }
    return `
    <div class="sp-item">
      <div><span class="link" onclick="processCommand('diplomacy ${ai.name}')"><b>${ai.name}</b></span> <span class="dim">(${ai.personality})</span></div>
      <div class="dim">Opinion ${ai.opinion}   Strength ${fmt(ai.strength)}</div>
      <div>${ai.alliance?'<span class="good">Allied</span>':''}${!ai.alliance&&!ai.atWar?'<span class="dim">At peace</span>':''}</div>
      ${warBlock}
    </div>`;
  }).join('');
}

function sideTechHTML(){
  let html = '';
  if(S.tech.focus){
    const t = findTech(S.tech.focus);
    html += `<div class="sp-item"><div class="dim">Researching</div><div><b>${t.name}</b></div>
      <div class="sp-row">${barHTML(S.tech.progress, t.cost)}<span class="dim">${Math.round(S.tech.progress)}/${t.cost}</span></div></div>`;
  } else {
    html += `<div class="sp-item dim">No research focus set.</div>`;
  }
  Object.entries(TECH_TREE).forEach(([key,branch])=>{
    const done = branch.techs.filter(t=>S.tech.researched.includes(t.id)).length;
    html += `<div class="sp-item"><div><b>${branch.label}</b> <span class="dim">${done}/${branch.techs.length}</span></div>`;
    branch.techs.forEach(t=>{
      if(S.tech.researched.includes(t.id)) return;
      if(!techAvailable(t,S)) return;
      html += `<div class="dim" style="margin-top:2px;"><span class="link" onclick="processCommand('research ${t.name}')">${t.name}</span> (${t.cost}pt)</div>`;
    });
    html += `</div>`;
  });
  return html;
}

function renderSidePanel(){
  const tabsEl = document.getElementById('sideTabs');
  if(tabsEl.children.length===0){
    tabsEl.innerHTML = SIDE_TABS.map(t=>`<button class="qbtn side-tab" data-tab="${t}">${SIDE_TAB_LABELS[t]}</button>`).join('');
    tabsEl.querySelectorAll('.side-tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{ sideTab = btn.dataset.tab; renderSidePanel(); });
    });
  }
  tabsEl.querySelectorAll('.side-tab').forEach(b=> b.classList.toggle('active', b.dataset.tab===sideTab));
  const content = document.getElementById('sideContent');
  if(sideTab==='crown') content.innerHTML = sideCrownHTML();
  else if(sideTab==='provinces') content.innerHTML = sideProvincesHTML();
  else if(sideTab==='court') content.innerHTML = sideCourtHTML();
  else if(sideTab==='army') content.innerHTML = sideArmyHTML();
  else if(sideTab==='diplomacy') content.innerHTML = sideDiplomacyHTML();
  else if(sideTab==='factions') content.innerHTML = sideFactionsHTML();
  else if(sideTab==='economy') content.innerHTML = sideEconomyHTML();
  else if(sideTab==='construction') content.innerHTML = sideConstructionHTML();
  else if(sideTab==='tech') content.innerHTML = sideTechHTML();
  else if(sideTab==='chronicle') content.innerHTML = sideChronicleHTML();

  const toggle = document.getElementById('panelToggle');
  if(toggle) toggle.classList.toggle('has-alert', !!S.pendingEvent);
}

function isMobilePanel(){ return window.innerWidth<=860; }
function togglePanel(){
  const panel = document.getElementById('sidePanel');
  const backdrop = document.getElementById('sideBackdrop');
  if(isMobilePanel()){
    const opening = !panel.classList.contains('open');
    panel.classList.toggle('open', opening);
    backdrop.classList.toggle('show', opening);
  } else {
    panel.classList.toggle('collapsed');
  }
}
function closePanel(){
  const panel = document.getElementById('sidePanel');
  const backdrop = document.getElementById('sideBackdrop');
  panel.classList.remove('open');
  backdrop.classList.remove('show');
}


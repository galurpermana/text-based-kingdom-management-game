/* ---------------------------------------------------------------------
   3. RENDERING (terminal + dashboard) — read-only views of state
--------------------------------------------------------------------- */
const term = document.getElementById('terminal');
const jumpBtn = document.getElementById('jumpBtn');
function isNearBottom(){
  return term.scrollTop + term.clientHeight >= term.scrollHeight - 60;
}
function print(html, cls){
  const wasNear = isNearBottom();
  const div = document.createElement('div');
  div.className = 'line' + (cls?(' '+cls):'');
  div.innerHTML = html;
  term.appendChild(div);
  if(wasNear){
    term.scrollTop = term.scrollHeight;
    jumpBtn.style.display='none';
  } else {
    jumpBtn.style.display='block';
  }
}
jumpBtn.addEventListener('click', ()=>{
  term.scrollTop = term.scrollHeight;
  jumpBtn.style.display='none';
  input.focus();
});
function printEcho(cmd){ print(cmd, 'echo'); }
function rule(){ print('─'.repeat(46), 'rule'); }
function heading(t){ print(t, 'hd'); }

function barHTML(value, max, cls){
  const pct = clamp(value/max,0,1)*100;
  return `<div class="bar-track"><div class="bar-fill ${cls||''}" style="width:${pct}%"></div></div>`;
}

function renderDashboard(){
  document.getElementById('kName').textContent = `KINGDOM OF ${S.kingdom.name.toUpperCase()}`;
  document.getElementById('rulerLine').textContent = `${S.ruler.name} of House ${S.ruler.dynasty}`;
  document.getElementById('yearLine').textContent = `Year ${S.year}`;
  const grid = document.getElementById('dashGrid');
  const net = S.kingdom.lastIncome - S.kingdom.lastExpenses;
  grid.innerHTML = `
    <div class="stat-row"><span class="stat-label">Treasury</span><span class="stat-val num">${fmt(S.kingdom.treasury)}</span></div>
    <div class="stat-row"><span class="stat-label">Net/yr</span><span class="stat-val ${net>=0?'pos':'neg'}">${net>=0?'+':''}${fmt(net)}</span></div>
    <div class="stat-row"><span class="stat-label">Population</span><span class="stat-val">${fmt(totalPopulation())}</span></div>
    <div class="stat-row"><span class="stat-label">Army</span><span class="stat-val">${fmt(armyManpower())}/${fmt(armyCapacity())}</span></div>
    <div class="stat-row"><span class="stat-label">Stability</span>${barHTML(S.kingdom.stability,100, S.kingdom.stability<35?'danger':'good')}<span class="stat-val">${Math.round(S.kingdom.stability)}%</span></div>
    <div class="stat-row"><span class="stat-label">Prosperity</span>${barHTML(S.kingdom.prosperity,100)}<span class="stat-val">${Math.round(S.kingdom.prosperity)}%</span></div>
    <div class="stat-row"><span class="stat-label">Approval</span>${barHTML(S.kingdom.approval,100, S.kingdom.approval<35?'danger':'good')}<span class="stat-val">${Math.round(S.kingdom.approval)}%</span></div>
    <div class="stat-row"><span class="stat-label">Unrest</span>${barHTML(S.kingdom.unrest,100,'danger')}<span class="stat-val">${Math.round(S.kingdom.unrest)}%</span></div>
    <div class="stat-row"><span class="stat-label">Research</span><span class="stat-val">${S.tech.points.toFixed(0)}pt</span></div>
  `;
  renderSidePanel();
}

function totalPopulation(){ return S.provinces.reduce((a,p)=>a+p.population,0); }


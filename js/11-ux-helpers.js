/* ---------------------------------------------------------------------
   8. UX HELPERS — command correction, confirmation, autocomplete, history
--------------------------------------------------------------------- */
const KNOWN_COMMANDS = ['help','kingdom','economy','treasury','provinces','province','court','army',
  'diplomacy','technology','tech','research','tax','build','recruit','disband','relations','alliance',
  'war','peace','choose','advance','history','save','load','export','import','new','clear'];

function levenshtein(a,b){
  const m=a.length,n=b.length;
  const dp = Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  }
  return dp[m][n];
}
function closestCommand(verb){
  let best=null, bestDist=99;
  KNOWN_COMMANDS.forEach(c=>{
    const d = levenshtein(verb.toLowerCase(), c);
    if(d<bestDist){ bestDist=d; best=c; }
  });
  return bestDist<=2 ? best : null;
}
function closestFromList(word, list){
  let best=null, bestDist=99;
  list.forEach(c=>{
    const d = levenshtein(String(word).toLowerCase(), String(c).toLowerCase());
    if(d<bestDist){ bestDist=d; best=c; }
  });
  return bestDist<=2 ? best : null;
}

function renderConfirmNewGame(){
  const box = document.createElement('div');
  box.className='event-box';
  box.innerHTML = `<div class="event-title">⚠ BEGIN A NEW REIGN?</div>
    <div>This will discard the current kingdom of ${S.kingdom.name} unless you've exported it. This cannot be undone in-session.</div>
    <div style="margin-top:8px;">
      <div class="choice link" onclick="processCommand('new confirm')"><span class="n">1.</span> Yes — start a new reign</div>
      <div class="choice link" onclick="this.closest('.event-box').remove()"><span class="n">2.</span> Cancel</div>
    </div>`;
  term.appendChild(box);
  term.scrollTop = term.scrollHeight;
  jumpBtn.style.display='none';
}

function updateInputPlaceholder(){
  if(S.pendingEvent) input.placeholder = "An event awaits — click a choice above, or type: choose <number>";
  else input.placeholder = "type a command… (try 'help')";
}

/* Autocomplete: suggests the next token based on what's already typed */
const suggestBox = document.getElementById('suggestBox');
let suggestItems = [];
let suggestIndex = -1;

function computeSuggestions(text){
  const parts = text.split(/\s+/);
  const verb = (parts[0]||'').toLowerCase();
  if(parts.length<=1){
    if(!verb) return [];
    return KNOWN_COMMANDS.filter(c=>c.startsWith(verb) && c!==verb);
  }
  let pool = [];
  let prefixParts = [verb];
  if(verb==='build') pool = Object.keys(BUILDINGS);
  else if(verb==='province') pool = S.provinces.map(p=>p.name);
  else if(['diplomacy','relations','alliance','war','peace'].includes(verb)) pool = S.aiKingdoms.map(a=>a.name);
  else if(verb==='research') pool = allTechs().filter(t=>techAvailable(t,S)).map(t=>t.name);
  else if(verb==='recruit'||verb==='disband') pool = Object.keys(UNIT_RECRUIT_COST);
  else if(verb==='tax'){
    if(parts.length===2){ pool=['peasant','trade','noble']; }
    else { pool=['low','normal','high']; prefixParts=[verb, parts[1]]; }
  }
  else return [];

  const restStr = (verb==='tax' && prefixParts.length===2 ? parts.slice(2) : parts.slice(1)).join(' ').toLowerCase();
  const matches = pool.filter(p=>p.toLowerCase().startsWith(restStr) && p.toLowerCase()!==restStr);
  return matches.map(m => prefixParts.join(' ') + ' ' + m);
}

function renderSuggestions(items){
  suggestItems = items; suggestIndex = -1;
  if(items.length===0){ suggestBox.style.display='none'; suggestBox.innerHTML=''; return; }
  suggestBox.innerHTML = items.slice(0,8).map((s,i)=>`<div class="sugg-item" data-i="${i}">${s}</div>`).join('');
  suggestBox.style.display='block';
  suggestBox.querySelectorAll('.sugg-item').forEach(el=>{
    el.addEventListener('click', ()=>{
      input.value = items[parseInt(el.dataset.i,10)] + ' ';
      suggestBox.style.display='none';
      input.focus();
    });
  });
}

let cmdHistory = [];
let historyIndex = -1;


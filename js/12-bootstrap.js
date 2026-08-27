/* ---------------------------------------------------------------------
   9. BOOTSTRAP
--------------------------------------------------------------------- */
function printIntro(){
  heading(`═══ THE REALM OF ${S.kingdom.name.toUpperCase()} AWAITS ═══`);
  print(`It is the year ${S.year}. ${S.ruler.name} of House ${S.ruler.dynasty}, known for being ${S.ruler.traits.join(' and ')}, sits the throne.`);
  print(`The kingdom holds ${S.provinces.length} provinces and ${fmt(totalPopulation())} subjects.`);
  print(`Type <b>help</b> to see what you can do, or <b>kingdom</b> for the full dashboard.`);
  print(`<span class="dim">The panel on the right (☰ info) keeps provinces, court, army, diplomacy and tech in view at a glance — it updates as you play.</span>`);
  rule();
}

const input = document.getElementById('cmdInput');

input.addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    if(suggestIndex>=0 && suggestItems[suggestIndex]!==undefined){
      input.value = suggestItems[suggestIndex] + ' ';
      suggestBox.style.display='none';
      return;
    }
    const v = input.value;
    input.value='';
    suggestBox.style.display='none';
    if(v.trim()){
      if(cmdHistory[cmdHistory.length-1]!==v) cmdHistory.push(v);
      historyIndex = cmdHistory.length;
    }
    processCommand(v);
  } else if(e.key==='ArrowUp'){
    if(suggestItems.length){
      e.preventDefault();
      suggestIndex = suggestIndex<=0 ? suggestItems.length-1 : suggestIndex-1;
      suggestBox.querySelectorAll('.sugg-item').forEach((el,i)=> el.classList.toggle('active', i===suggestIndex));
    } else if(cmdHistory.length){
      e.preventDefault();
      historyIndex = Math.max(0, historyIndex-1);
      input.value = cmdHistory[historyIndex] || '';
    }
  } else if(e.key==='ArrowDown'){
    if(suggestItems.length){
      e.preventDefault();
      suggestIndex = suggestIndex>=suggestItems.length-1 ? 0 : suggestIndex+1;
      suggestBox.querySelectorAll('.sugg-item').forEach((el,i)=> el.classList.toggle('active', i===suggestIndex));
    } else if(cmdHistory.length){
      e.preventDefault();
      historyIndex = Math.min(cmdHistory.length, historyIndex+1);
      input.value = cmdHistory[historyIndex] || '';
    }
  } else if(e.key==='Escape'){
    suggestBox.style.display='none';
    suggestItems=[]; suggestIndex=-1;
  } else if(e.key==='Tab'){
    if(suggestItems.length){
      e.preventDefault();
      input.value = suggestItems[suggestIndex>=0?suggestIndex:0] + ' ';
      suggestBox.style.display='none';
    }
  }
});

input.addEventListener('input', ()=>{
  renderSuggestions(computeSuggestions(input.value));
});
document.addEventListener('click', (e)=>{
  if(e.target!==input && !suggestBox.contains(e.target)) suggestBox.style.display='none';
});

document.querySelectorAll('.qbtn').forEach(btn=>{
  if(btn.id==='panelToggle' || btn.id==='sideClose' || btn.classList.contains('side-tab')) return;
  btn.addEventListener('click', ()=> processCommand(btn.dataset.cmd));
});
document.getElementById('panelToggle').addEventListener('click', togglePanel);
document.getElementById('sideClose').addEventListener('click', closePanel);
document.getElementById('sideBackdrop').addEventListener('click', closePanel);

printIntro();
renderDashboard();
updateInputPlaceholder();
input.focus();

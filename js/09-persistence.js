/* ---------------------------------------------------------------------
   6. SAVE / LOAD (persistent artifact storage)
--------------------------------------------------------------------- */
async function saveGame() {
  try {
    localStorage.setItem('kingdom-save', JSON.stringify(S));

    print("Kingdom saved.", 'good');

  } catch (e) {
    print("Save failed: " + e.message, 'warn');
  }
}

async function loadGame() {
  try {
    const value = localStorage.getItem('kingdom-save');

    if (value) {
      S = JSON.parse(value);

      // Restore seeded RNG
      rand = mulberry32((S.seed || Date.now()) ^ S.year);

      print("Kingdom restored from the last save.", 'good');

      renderDashboard();

    } else {
      print("No saved kingdom found.", 'dim');
    }

  } catch (e) {
    print("Load failed: " + e.message, 'warn');
  }
}

/* ---- Export / Import (portable JSON, independent of window.storage) ---- */
function renderExportBox(jsonStr, filename){
  const box = document.createElement('div');
  box.className = 'event-box';
  const title = document.createElement('div');
  title.className = 'event-title';
  title.textContent = `⤓ EXPORT — ${filename}`;
  box.appendChild(title);

  const desc = document.createElement('div');
  desc.className = 'dim';
  desc.style.marginBottom = '6px';
  desc.textContent = 'Save this file or copy the text — you can restore this exact kingdom later with "import".';
  box.appendChild(desc);

  const ta = document.createElement('textarea');
  ta.readOnly = true;
  ta.value = jsonStr;
  ta.style.cssText = 'width:100%;height:130px;background:#000;color:var(--parchment);border:1px solid var(--line);font-family:inherit;font-size:10.5px;padding:6px;resize:vertical;';
  box.appendChild(ta);

  const row = document.createElement('div');
  row.style.cssText = 'margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'qbtn';
  copyBtn.textContent = 'Copy to clipboard';
  copyBtn.onclick = async ()=>{
    try{
      await navigator.clipboard.writeText(jsonStr);
    }catch(e){
      ta.focus(); ta.select();
      try{ document.execCommand('copy'); }catch(e2){}
    }
    copyBtn.textContent = 'Copied!';
    setTimeout(()=> copyBtn.textContent='Copy to clipboard', 1500);
  };
  row.appendChild(copyBtn);

  const dlBtn = document.createElement('button');
  dlBtn.className = 'qbtn';
  dlBtn.textContent = 'Download .json';
  dlBtn.onclick = ()=>{
    try{
      const blob = new Blob([jsonStr], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }catch(e){
      print('Download was blocked by the browser — use "Copy to clipboard" instead.', 'warn');
    }
  };
  row.appendChild(dlBtn);

  box.appendChild(row);
  term.appendChild(box);
  term.scrollTop = term.scrollHeight;
}

function exportGame(){
  const jsonStr = JSON.stringify(S, null, 2);
  const filename = `kingdom-${S.kingdom.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-year${S.year}.json`;
  print(`Preparing export — ${fmt(jsonStr.length)} characters of kingdom data.`, 'dim');
  renderExportBox(jsonStr, filename);
}

function applyImportedJSON(text){
  try{
    const parsed = JSON.parse(text);
    if(!parsed.kingdom || !parsed.provinces || !parsed.ruler) throw new Error('That does not look like valid kingdom data.');
    S = parsed;
    if(!S.techFlags) S.techFlags = defaultTechFlags();
    if(!S.tech) S.tech = { points:0, perYear:0, researched:[], focus:null, progress:0 };
    if(!S.kingdom.economy) S.kingdom.economy = null;
    rand = mulberry32((S.seed||Date.now()) ^ S.year);
    renderDashboard();
    print(`Kingdom data imported: ${S.kingdom.name}, year ${S.year}, ruled by ${S.ruler.name}.`, 'good');
  }catch(e){
    print(`Import failed: ${e.message}`, 'warn');
  }
}

function renderImportBox(){
  const box = document.createElement('div');
  box.className = 'event-box';
  const title = document.createElement('div');
  title.className = 'event-title';
  title.textContent = '⤒ IMPORT KINGDOM DATA';
  box.appendChild(title);

  const desc = document.createElement('div');
  desc.className = 'dim';
  desc.style.marginBottom = '6px';
  desc.textContent = 'Paste previously exported JSON below, or choose a .json file. This replaces your current reign.';
  box.appendChild(desc);

  const ta = document.createElement('textarea');
  ta.placeholder = 'Paste exported JSON here…';
  ta.style.cssText = 'width:100%;height:100px;background:#000;color:var(--parchment);border:1px solid var(--line);font-family:inherit;font-size:10.5px;padding:6px;resize:vertical;';
  box.appendChild(ta);

  const row = document.createElement('div');
  row.style.cssText = 'margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;';

  const loadBtn = document.createElement('button');
  loadBtn.className = 'qbtn';
  loadBtn.textContent = 'Load pasted JSON';
  loadBtn.onclick = ()=>{
    if(!ta.value.trim()){ print('Paste some JSON first.', 'warn'); return; }
    applyImportedJSON(ta.value);
  };
  row.appendChild(loadBtn);

  const fileBtn = document.createElement('button');
  fileBtn.className = 'qbtn';
  fileBtn.textContent = 'Choose file…';
  fileBtn.onclick = ()=> document.getElementById('importFile').click();
  row.appendChild(fileBtn);

  box.appendChild(row);
  term.appendChild(box);
  term.scrollTop = term.scrollHeight;
}

document.getElementById('importFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> applyImportedJSON(String(reader.result));
  reader.onerror = ()=> print('Could not read that file.', 'warn');
  reader.readAsText(file);
  e.target.value = '';
});


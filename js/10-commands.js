/* ---------------------------------------------------------------------
   7. COMMAND PARSER
--------------------------------------------------------------------- */
function processCommand(raw){
  const cmd = raw.trim();
  if(!cmd) return;
  printEcho(cmd);
  const parts = cmd.split(/\s+/);
  const verb = parts[0].toLowerCase();

  try{
    switch(verb){
      case 'help': viewHelp(); break;
      case 'kingdom': viewKingdom(); break;
      case 'economy': case 'treasury': viewEconomy(); break;
      case 'provinces': viewProvinces(); break;
      case 'province': viewProvince(parts.slice(1).join(' ')); break;
      case 'court': viewCourt(); break;
      case 'army': viewArmy(); break;
      case 'diplomacy': viewDiplomacy(parts.slice(1).join(' ')||null); break;
      case 'history': viewHistory(); break;
      case 'technology': case 'tech': viewTechnology(); break;
      case 'research': {
        const name = parts.slice(1).join(' ');
        if(!name){ print("Specify a technology, e.g. research crop rotation", 'warn'); break; }
        const r = engineSetResearchFocus(name);
        print(r.msg, r.ok?'good':'warn');
        break;
      }
      case 'advance': advanceYear(); break;

      case 'tax': {
        const [,cat,level] = parts;
        const r = engineSetTax(cat,level);
        print(r.msg, r.ok?'good':'warn');
        if(r.ok) renderDashboard();
        break;
      }
      case 'build': {
        if(!parts[1]){ viewBuildCatalog(); break; }
        const type = parts[1];
        let provName = parts.slice(2).join(' ');
        if(!provName && buildSelectedProvince){
          provName = buildSelectedProvince;
          print(`(no province given — using ${provName}, as selected in the Build tab)`, 'dim');
        }
        if(!provName){ print(`Specify a province, e.g. build ${type} ${S.provinces[0].name}`, 'warn'); break; }
        const prov = findProvince(provName);
        if(!prov){
          const guess = closestFromList(provName, S.provinces.map(p=>p.name));
          print(`No province found matching "${provName}".${guess?` Did you mean "${guess}"?`:''}`,'warn');
          break;
        }
        const r = engineQueueBuild(prov, type);
        print(r.msg, r.ok?'good':'warn');
        if(r.ok){ buildSelectedProvince = prov.name; renderDashboard(); }
        break;
      }
      case 'recruit': {
        const unit = parts[1]; const n = parseInt(parts[2],10);
        if(!n || n<=0){ print("Specify a positive number, e.g. recruit infantry 500",'warn'); break; }
        const r = engineRecruit(unit,n);
        print(r.msg, r.ok?'good':'warn');
        if(r.ok) renderDashboard();
        break;
      }
      case 'disband': {
        const unit = parts[1]; const n = parseInt(parts[2],10);
        if(!n || n<=0){ print("Specify a positive number, e.g. disband cavalry 50",'warn'); break; }
        const r = engineDisband(unit,n);
        print(r.msg, r.ok?'good':'warn');
        if(r.ok) renderDashboard();
        break;
      }
      case 'relations': {
        const kName = parts[1];
        const ai = findAI(kName);
        if(!ai){ print(`No kingdom found matching "${kName}".`,'warn'); break; }
        const r = engineImproveRelations(ai);
        print(r.msg, r.ok?'good':'warn');
        if(r.ok) renderDashboard();
        break;
      }
      case 'alliance': {
        const ai = findAI(parts.slice(1).join(' '));
        if(!ai){ print(`No kingdom found matching that name.`,'warn'); break; }
        const r = engineAlliance(ai);
        print(r.msg, r.ok?'good':'warn');
        break;
      }
      case 'war': {
        const ai = findAI(parts.slice(1).join(' '));
        if(!ai){ print(`No kingdom found matching that name.`,'warn'); break; }
        const r = engineDeclareWar(ai);
        print(r.msg,'warn');
        break;
      }
      case 'peace': {
        const ai = findAI(parts.slice(1).join(' '));
        if(!ai){ print(`No kingdom found matching that name.`,'warn'); break; }
        const r = engineSeekPeace(ai);
        print(r.msg, r.ok?'good':'warn');
        break;
      }
      case 'choose': {
        const n = parseInt(parts[1],10);
        const r = resolveChoice(n);
        print(r.msg, r.ok?'good':'warn');
        if(r.ok){ renderDashboard(); updateInputPlaceholder(); }
        break;
      }
      case 'save': saveGame(); break;
      case 'load': loadGame(); break;
      case 'export': exportGame(); break;
      case 'import': renderImportBox(); break;
      case 'new': {
        if(parts[1]==='confirm'){
          S = initGame();
          term.innerHTML='';
          jumpBtn.style.display='none';
          printIntro();
          renderDashboard();
          updateInputPlaceholder();
        } else {
          renderConfirmNewGame();
        }
        break;
      }
      case 'clear': term.innerHTML=''; jumpBtn.style.display='none'; break;

      default: {
        const suggestion = closestCommand(verb);
        if(suggestion){
          print(`Unrecognized command: "${cmd}". Did you mean <span class="link" onclick="processCommand('${suggestion}${parts.length>1?' '+parts.slice(1).join(' '):''}')">${suggestion}</span>? Type <b>help</b> for a list of commands.`,'warn');
        } else {
          print(`Unrecognized command: "${cmd}". Type <b>help</b> for a list of commands.`,'warn');
        }
      }
    }
  }catch(e){
    print(`The court scribes report an error: ${e.message}`,'warn');
  }
}


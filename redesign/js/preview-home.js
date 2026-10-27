(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let currentSite = {}, currentChampionship = {}, currentRace = null, magazinePages = [], magazineIndex = 0, magazineZoom = 1;
  const fallbackCalendar = [{"round":1,"stage":1,"flag":"🇦🇺","name":"Australia","circuit":"Albert Park · Melbourne","date":"08 MAR","trackAsset":"img/tracks/albert-park.svg"},{"round":2,"stage":1,"flag":"🇨🇳","name":"China","circuit":"Shanghai International Circuit","date":"15 MAR","trackAsset":"img/tracks/shanghai.svg"},{"round":3,"stage":1,"flag":"🇯🇵","name":"Japón","circuit":"Suzuka Circuit","date":"29 MAR","trackAsset":"img/tracks/suzuka.svg"},{"round":4,"stage":1,"flag":"🇧🇭","name":"Bahrain","circuit":"Bahrain International Circuit","date":"12 ABR","trackAsset":"img/tracks/bahrain.svg"},{"round":5,"stage":1,"flag":"🇸🇦","name":"Arabia Saudita","circuit":"Jeddah Corniche Circuit","date":"19 ABR","trackAsset":"img/tracks/jeddah.svg"},{"round":6,"stage":1,"flag":"🇺🇸","name":"Miami","circuit":"Miami International Autodrome","date":"03 MAY","trackAsset":"img/tracks/miami.svg"},{"round":7,"stage":2,"flag":"🇨🇦","name":"Canadá","circuit":"Circuit Gilles Villeneuve","date":"24 MAY","trackAsset":"img/tracks/montreal.svg"},{"round":8,"stage":2,"flag":"🇲🇨","name":"Mónaco","circuit":"Circuit de Monaco","date":"07 JUN","trackAsset":"img/tracks/monaco.svg"},{"round":9,"stage":2,"flag":"🇪🇸","name":"España","circuit":"Circuit de Barcelona-Catalunya","date":"14 JUN","trackAsset":"img/tracks/barcelona.svg"},{"round":10,"stage":2,"flag":"🇦🇹","name":"Austria","circuit":"Red Bull Ring · Spielberg","date":"28 JUN","trackAsset":"img/tracks/red-bull-ring.svg"},{"round":11,"stage":2,"flag":"🇬🇧","name":"Gran Bretaña","circuit":"Silverstone Circuit","date":"05 JUL","trackAsset":"img/tracks/silverstone.svg"},{"round":12,"stage":2,"flag":"🇧🇪","name":"Bélgica","circuit":"Circuit de Spa-Francorchamps","date":"19 JUL","trackAsset":"img/tracks/spa-francorchamps.svg"},{"round":13,"stage":3,"flag":"🇭🇺","name":"Hungría","circuit":"Hungaroring · Budapest","date":"16 AGO","trackAsset":"img/tracks/hungaroring.svg"},{"round":14,"stage":3,"flag":"🇳🇱","name":"Países Bajos","circuit":"Circuit Zandvoort","date":"23 AGO","trackAsset":"img/tracks/zandvoort.svg"},{"round":15,"stage":3,"flag":"🇮🇹","name":"Italia","circuit":"Autodromo Nazionale Monza","date":"06 SEP","trackAsset":"img/tracks/monza.svg"},{"round":16,"stage":3,"flag":"🇪🇸","name":"Madrid","circuit":"Madring · Madrid","date":"13 SEP","trackAsset":"img/tracks/madring.svg"},{"round":17,"stage":3,"flag":"🇦🇿","name":"Azerbaiyán","circuit":"Baku City Circuit","date":"26 SEP","trackAsset":"img/tracks/baku.svg"},{"round":18,"stage":3,"flag":"🇲🇾","name":"Malasia","circuit":"Sepang International Circuit","date":"04 OCT","trackAsset":"img/tracks/sepang.svg"},{"round":19,"stage":4,"flag":"🇸🇬","name":"Singapur","circuit":"Marina Bay Street Circuit","date":"11 OCT","trackAsset":"img/tracks/singapore.svg"},{"round":20,"stage":4,"flag":"🇲🇽","name":"México","circuit":"Autódromo Hermanos Rodríguez","date":"25 OCT","trackAsset":"img/tracks/mexico-city.svg"},{"round":21,"stage":4,"flag":"🇧🇷","name":"Brasil","circuit":"Autódromo José Carlos Pace","date":"08 NOV","trackAsset":"img/tracks/interlagos.svg"},{"round":22,"stage":4,"flag":"🇺🇸","name":"Las Vegas","circuit":"Las Vegas Street Circuit","date":"21 NOV","trackAsset":"img/tracks/las-vegas.svg"},{"round":23,"stage":4,"flag":"🇶🇦","name":"Qatar","circuit":"Lusail International Circuit","date":"29 NOV","trackAsset":"img/tracks/lusail.svg"},{"round":24,"stage":4,"flag":"🇦🇪","name":"Abu Dhabi","circuit":"Yas Marina Circuit","date":"06 DIC","trackAsset":"img/tracks/yas-marina.svg"}];

  const setText = (selector, value) => { const node=$(selector); if(node && value!==undefined && value!==null) node.textContent=String(value); };
  const safeJson = async (path, fallback) => {
    try { const response=await fetch(path,{cache:"no-store"}); if(!response.ok) throw new Error(path); return await response.json(); }
    catch (_) { return fallback || {}; }
  };
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const formatTime = value => {
    const ms=Number(value); if(!Number.isFinite(ms) || ms<=0) return "—";
    const minutes=Math.floor(ms/60000), seconds=Math.floor((ms%60000)/1000), hundredths=Math.floor((ms%1000)/10);
    return minutes+":"+String(seconds).padStart(2,"0")+"."+String(hundredths).padStart(2,"0");
  };
  const formatDate = (value, time=false) => {
    if(!value) return "FECHA A CONFIRMAR";
    const date=new Date(value); if(Number.isNaN(date.getTime())) return "FECHA A CONFIRMAR";
    const opts={timeZone:"America/Argentina/Buenos_Aires",day:"2-digit",month:"short"};
    if(time){opts.hour="2-digit";opts.minute="2-digit";opts.hour12=false;}
    return new Intl.DateTimeFormat("es-AR",opts).format(date).replace(".", "").toUpperCase();
  };
  const latestRace = championship => (championship?.races || []).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")))[0] || null;
  const raceWinner = race => (race?.results || []).slice().sort((a,b)=>Number(a.pos||999)-Number(b.pos||999)).find(r=>String(r.status||"OK").toUpperCase()!=="DSQ") || null;
  const getTrack = (name) => {
    const aliases=currentSite.trackAliases || {};
    if(aliases[name]) return aliases[name];
    const key=normalize(name);
    return Object.entries(aliases).map(([alias,value])=>({alias:normalize(alias),value}))
      .filter(item=>item.alias.length>3 && (key.includes(item.alias)||item.alias.includes(key)))
      .sort((a,b)=>b.alias.length-a.alias.length)[0]?.value || {};
  };
  function computeDrivers(){
    const pointsTable=currentChampionship?.meta?.points || [20,17,14,12,10,8,6,4,2,1], drivers=new Map();
    (currentChampionship?.races || []).forEach(race=>{
      const multiplier=Number(race.pointsMultiplier)||1;
      (race.results||[]).filter(r=>Number(r.pos)>0 && String(r.status||"OK").toUpperCase()!=="DSQ")
        .slice().sort((a,b)=>Number(a.pos)-Number(b.pos)).forEach((result,index)=>{
          const name=String(result.driverName||"").trim(); if(!name) return;
          const current=drivers.get(name)||{name,team:result.team||"",points:0,wins:0,starts:0};
          const explicit=[result.points,result.pts,result.score,result.puntos].map(Number).find(Number.isFinite);
          current.points+=(explicit===undefined ? Number(pointsTable[index]||0) : explicit)*multiplier;
          if(Number(result.pos)===1) current.wins+=1;
          current.starts+=1;
          if(!current.team && result.team) current.team=result.team;
          drivers.set(name,current);
        });
    });
    return Array.from(drivers.values()).sort((a,b)=>b.points-a.points || b.wins-a.wins || a.name.localeCompare(b.name));
  }
  function teamConfig(name){
    const entries=Object.entries(currentSite.teams||{});
    return entries.find(([label])=>normalize(label)===normalize(name))?.[1] || {};
  }
  function makeLogo(name,className){
    const cfg=teamConfig(name);
    if(!cfg.asset) return null;
    const img=document.createElement("img");img.className=className||"teamLogo";img.src=cfg.asset;img.alt="Logo de "+name;img.loading="lazy";img.addEventListener("error",()=>img.remove(),{once:true});return img;
  }
  function setupNavigation(){
    const ids=new Set($$(".view").map(panel=>panel.dataset.view));
    function activate(id,write=true){
      if(!ids.has(id)) id="inicio";
      $$(".navTab").forEach(button=>{
        const active=button.dataset.tab===id;
        button.classList.toggle("isActive",active);
        button.setAttribute("aria-selected",active?"true":"false");
        button.tabIndex=active?0:-1;
      });
      $$(".view").forEach(panel=>{
        const active=panel.dataset.view===id;
        panel.classList.toggle("isActive",active);
        panel.hidden=!active;
      });
      if(write && location.hash!=="#"+id) history.pushState({view:id},"","#"+id);
      setText("#statusLive","Sección "+id+" abierta");
      if(id==="herramientas") loadToolFrame("telemetria");
      window.scrollTo({top:0,behavior:"smooth"});
    }
    const tabs=$(".navTab");
    tabs.forEach((tab,index)=>tab.addEventListener("keydown",event=>{
      if(!["ArrowRight","ArrowLeft","Home","End"].includes(event.key))return;
      event.preventDefault();
      const target=event.key==="Home"?tabs[0]:event.key==="End"?tabs[tabs.length-1]:tabs[(index+(event.key==="ArrowRight"?1:tabs.length-1))%tabs.length];
      target.focus();activate(target.dataset.tab);
    }));
    document.addEventListener("click",event=>{
      const nav=event.target.closest("[data-tab]");
      if(nav){event.preventDefault();activate(nav.dataset.tab);return;}
      const go=event.target.closest("[data-go]");
      if(go){event.preventDefault();if($("#magazineModal")?.open) $("#magazineModal").close();activate(go.dataset.go);return;}
    });
    window.addEventListener("popstate",()=>activate(location.hash.slice(1),false));
    window.addEventListener("hashchange",()=>activate(location.hash.slice(1),false));
    const initial=location.hash.slice(1);
    activate(initial && ids.has(initial)?initial:"inicio",false);
  }
  function renderTopRows(race){
    const rows=(race?.results||[]).slice().sort((a,b)=>Number(a.pos||999)-Number(b.pos||999));
    const host=$("#homeTopThree");
    if(host) host.replaceChildren(...rows.slice(0,3).map((result,index)=>{
      const li=document.createElement("li");li.className="homeResultRow";
      const pos=document.createElement("span");pos.textContent=String(result.pos||index+1).padStart(2,"0");
      const identity=document.createElement("div");const name=document.createElement("strong");name.textContent=result.driverName||"—";
      const team=document.createElement("small");team.textContent=result.team||"—";identity.append(name,team);
      const clock=document.createElement("b");clock.textContent=formatTime(result.finalTimeMs);
      li.append(pos,identity,clock);return li;
    }));
    const standings=computeDrivers(), pointsHost=$("#homeTopPoints");
    if(pointsHost) pointsHost.replaceChildren(...standings.slice(0,5).map((driver,index)=>{
      const li=document.createElement("li");li.className="homePointRow";
      const pos=document.createElement("span");pos.textContent=String(index+1).padStart(2,"0");
      const identity=document.createElement("div");const name=document.createElement("strong");name.textContent=driver.name;
      const team=document.createElement("small");team.textContent=driver.team||"—";identity.append(name,team);
      const points=document.createElement("b");points.className="pts";points.textContent=String(driver.points);
      li.append(pos,identity,points);return li;
    }));
  }
  function renderResults(race,races){
    const alias=getTrack(race?.trackName), name=alias.name||race?.trackName||"Última carrera", winner=raceWinner(race);
    setText("#resultTitle",name.toUpperCase());
    setText("#resultSummary",(alias.circuit||name)+" · "+(race?.laps||"—")+" vueltas");
    setText("#resultWinner",winner?.driverName||"—");setText("#resultLaps",race?.laps||"—");
    setText("#resultDate",formatDate(race?.date));setText("#resultCount",(race?.results||[]).filter(r=>Number(r.pos)>0).length);
    setText("#resultTrackCircuit",alias.circuit||name);
    const body=$("#raceResults");
    if(body) body.replaceChildren(...(race?.results||[]).slice().sort((a,b)=>Number(a.pos||999)-Number(b.pos||999)).map(result=>{
      const tr=document.createElement("tr");
      const pos=document.createElement("td");pos.textContent=String(result.pos||"—").padStart(2,"0");
      const driver=document.createElement("td");const strong=document.createElement("strong");strong.textContent=result.driverName||"—";driver.append(strong);
      const team=document.createElement("td");team.className="teamCell";const logo=makeLogo(result.team,"teamLogo");if(logo)team.append(logo);const teamName=document.createElement("span");teamName.textContent=result.team||"—";team.append(teamName);
      const grid=document.createElement("td");grid.textContent=result.grid?String(result.grid):"—";
      const tyres=document.createElement("td");tyres.textContent=Array.isArray(result.tyresUsed)?result.tyresUsed.join(" / "):"—";
      const clock=document.createElement("td");clock.textContent=formatTime(result.finalTimeMs);
      const status=document.createElement("td");status.textContent=result.status||"OK";
      tr.append(pos,driver,team,grid,tyres,clock,status);return tr;
    }));
    const history=$("#raceHistory");
    if(history) history.replaceChildren(...races.slice(1).map(old=>{
      const row=document.createElement("div");row.className="historyRace";
      const date=document.createElement("span");date.textContent=formatDate(old.date);
      const details=document.createElement("strong");const track=getTrack(old.trackName);details.textContent=(track.name||old.trackName||"Carrera")+" · "+(raceWinner(old)?.driverName||"Sin ganador");
      const time=document.createElement("b");time.textContent=formatTime(raceWinner(old)?.finalTimeMs);
      row.append(date,details,time);return row;
    }));
  }
  function renderStandings(){
    const drivers=computeDrivers(), driverHost=$("#driverStandings");
    setText("#driverCount",drivers.length+" PILOTOS");
    if(driverHost) driverHost.replaceChildren(...drivers.map((driver,index)=>{
      const tr=document.createElement("tr");
      const pos=document.createElement("td");pos.textContent=String(index+1).padStart(2,"0");
      const pilot=document.createElement("td");const name=document.createElement("strong");name.textContent=driver.name;pilot.append(name);
      const team=document.createElement("td");team.className="teamCell";const logo=makeLogo(driver.team,"driverTeamLogo");if(logo)team.append(logo);const teamName=document.createElement("span");teamName.textContent=driver.team||"—";team.append(teamName);
      const wins=document.createElement("td");wins.textContent=String(driver.wins);
      const points=document.createElement("td");points.innerHTML="<strong>"+String(driver.points)+"</strong>";
      tr.append(pos,pilot,team,wins,points);return tr;
    }));
    const byTeam=new Map();
    drivers.forEach(driver=>{
      const key=driver.team||"Sin escudería",row=byTeam.get(key)||{name:key,points:0,drivers:[]};
      row.points+=driver.points;row.drivers.push(driver.name);byTeam.set(key,row);
    });
    const teams=Array.from(byTeam.values()).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
    setText("#teamCount",teams.length+" ESCUDERÍAS");
    const teamHost=$("#teamStandings");
    if(teamHost)teamHost.replaceChildren(...teams.map((entry,index)=>{
      const tr=document.createElement("tr");const pos=document.createElement("td");pos.textContent=String(index+1).padStart(2,"0");
      const team=document.createElement("td");team.className="teamCell";const logo=makeLogo(entry.name,"driverTeamLogo");if(logo)team.append(logo);const name=document.createElement("strong");name.textContent=entry.name;team.append(name);
      const pilots=document.createElement("td");pilots.textContent=entry.drivers.join(", ");const points=document.createElement("td");points.innerHTML="<strong>"+entry.points+"</strong>";
      tr.append(pos,team,pilots,points);return tr;
    }));
  }
  function renderCalendar(schedule){
    const host=$("#calendarStages");if(!host)return;
    const next=normalize(currentSite.nextRace?.country||currentSite.nextRace?.name);
    const stages=[1,2,3,4];
    host.replaceChildren(...stages.map(stage=>{
      const events=schedule.filter(event=>Number(event.stage)===stage);
      const section=document.createElement("section");section.className="calendarStage";
      const head=document.createElement("header");head.className="calendarStageHead";
      const stageName=document.createElement("span");stageName.textContent="ETAPA "+stage;
      const rounds=document.createElement("strong");rounds.textContent="RONDAS "+events[0]?.round+"–"+events[events.length-1]?.round;head.append(stageName,rounds);
      const rows=events.map(event=>{
        const card=document.createElement("article");card.className="calendarEvent";
        const isNext=normalize(event.name).includes(next)||next.includes(normalize(event.name))||normalize(event.country||"").includes(next);
        if(isNext)card.classList.add("isNext");
        const round=document.createElement("span");round.className="eventRound";round.textContent=String(event.round).padStart(2,"0");
        const flag=document.createElement("span");flag.className="eventFlag";flag.textContent=event.flag||"🏁";
        const info=document.createElement("div");info.className="eventInfo";const name=document.createElement("strong");name.textContent=event.name;const circuit=document.createElement("small");circuit.textContent=event.circuit;info.append(name,circuit);
        const map=document.createElement("img");map.className="eventTrack";map.src=event.trackAsset;map.alt="Trazado de "+event.name;map.loading="lazy";
        const date=document.createElement("span");date.className="eventDate";date.textContent=isNext && !currentSite.nextRace?.date ? "A CONFIRMAR" : event.date;
        card.append(round,flag,info,map,date);return card;
      });
      section.append(head,...rows);return section;
    }));
  }
  function setStandingsTab(type){
    $$("[data-standing]").forEach(button=>button.classList.toggle("isActive",button.dataset.standing===type));
    $("#driverStandingView").hidden=type!=="drivers";$("#teamStandingView").hidden=type!=="teams";
  }
  function setupMagazine(config,race){
    const pages=Array.isArray(config?.fallbackPages)?config.fallbackPages.slice():[];
    if(!pages.length && config?.directory && config?.prefix) pages.push(config.directory+"/"+config.prefix+"1.webp");
    magazinePages=pages;magazineIndex=Math.max(0,pages.length-1);
    const reader=$("#magazinePage"),cover=$("#homeMagazinePage"),modalImage=$("#modalMagazinePage");
    const updatePage=()=>{
      if(!magazinePages.length)return;
      const source=magazinePages[magazineIndex];
      if(reader){reader.src=source;reader.alt="Página "+(magazineIndex+1)+" de "+magazinePages.length+" de la revista";}
      if(cover){cover.src=source;cover.alt="Última página de la revista, página "+(magazineIndex+1);}
      if(modalImage){modalImage.src=source;modalImage.alt="Última página de la revista";}
      setText("#magazinePageLabel","PÁGINA "+(magazineIndex+1)+" DE "+magazinePages.length);
      $("#magPrev").disabled=magazineIndex<=0;$("#magNext").disabled=magazineIndex>=magazinePages.length-1;
    };
    const resetZoom=()=>{magazineZoom=1;if(reader)reader.style.transform="scale(1)";setText("#magZoomValue","100%");$("#magZoomOut").disabled=true;$("#magZoomIn").disabled=false;};
    $("#magPrev").addEventListener("click",()=>{if(magazineIndex>0){magazineIndex--;resetZoom();updatePage();}});
    $("#magNext").addEventListener("click",()=>{if(magazineIndex<magazinePages.length-1){magazineIndex++;resetZoom();updatePage();}});
    const updateZoom=()=>{if(reader)reader.style.transform="scale("+magazineZoom+")";setText("#magZoomValue",Math.round(magazineZoom*100)+"%");$("#magZoomOut").disabled=magazineZoom<=1;$("#magZoomIn").disabled=magazineZoom>=3;};
    $("#magZoomOut").addEventListener("click",()=>{magazineZoom=Math.max(1,magazineZoom-.25);updateZoom();});
    $("#magZoomIn").addEventListener("click",()=>{magazineZoom=Math.min(3,magazineZoom+.25);updateZoom();});
    $("#magZoomReset").addEventListener("click",resetZoom);
    reader?.addEventListener("dblclick",()=>{magazineZoom=magazineZoom===1?1.75:1;updateZoom();});
    updatePage();resetZoom();
    const track=getTrack(race?.trackName),raceName=track.name||race?.trackName||"ÚLTIMA CARRERA";
    setText("#magazineEdition",(currentSite.stageLabel||"CAMPEONATO")+" · "+raceName.toUpperCase());
    setText("#modalRaceName",raceName.toUpperCase());
    const modal=$("#magazineModal");
    const openPopup=()=>{
      if(!modal || !magazinePages.length)return;
      updatePage();
      if(!modal.open)modal.showModal();
    };
    $$("[data-close-magazine]").forEach(button=>button.addEventListener("click",()=>modal?.close()));
    modal?.addEventListener("click",event=>{if(event.target===modal)modal.close();});
    $("#reopenMagazine").addEventListener("click",openPopup);
    const raceKey=[race?.round||"",race?.date||"",race?.trackName||""].join("|");
    const storageKey="assettof1-magazine-seen:"+raceKey;
    let seen=true;
    try{seen=localStorage.getItem(storageKey)==="1";}catch(_){}
    if(!seen && race && magazinePages.length){
      try{localStorage.setItem(storageKey,"1");}catch(_){}
      window.setTimeout(openPopup,400);
    }
  }
  function setupRegistration(){
    const registration=currentSite.registration||{},promotion=registration.promotion||{};
    const total=Number(registration.totalSlots||20),available=Math.max(0,Number(registration.availableSlots??total));
    const free=promotion.active===true && registration.open!==false && available>0;
    const open=registration.open!==false && available>0;
    setText("#availableSlots",String(available));setText("#totalSlots","DE "+total);
    setText("#slotSummary",available+" DE "+total+" LUGARES");
    setText("#homeRegistrationLabel",free?"GRATIS":(registration.price||"CONSULTAR"));
    $("#freeOffer").hidden=!(free && open);$("#paymentCard").hidden=free||!open;$("#closedOffer").hidden=open;
    setText("#offerTitle",promotion.title||"INSCRIPCIÓN GRATIS");
    setText("#offerSubtitle","La inscripción incluye las "+(registration.races||6)+" carreras de la etapa en curso.");
    setText("#closedMessage",available<=0?"CUPOS COMPLETOS":"INSCRIPCIONES CERRADAS");
    setText("#registrationPrice",registration.price||"$15.000 ARS");setText("#paymentAlias",registration.paymentAlias||"JOTRACKS");
    if(registration.paymentUrl)$("#payButton").href=registration.paymentUrl;
    if(registration.paymentQrAsset)$("#paymentQr").src=registration.paymentQrAsset;
    $("#receiptRequirement").hidden=free;
    setText("#confirmationNumber",free?"01 / INSCRIPCIÓN":"02 / CONFIRMACIÓN");
    setText("#confirmationTitle",free?"ANOTATE PARA LA GRILLA":"ENVIÁ EL COMPROBANTE");
    setText("#confirmationCopy",free?"Mandá tu nombre y apellido y Steam ID. La organización confirma tu lugar por WhatsApp.":"Después de pagar, mandá el comprobante junto con tu nombre y apellido y Steam ID.");
    const message=free ? (promotion.whatsappMessage||"Hola Jota, quiero inscribirme a Assetto F1.\n\nNombre y apellido:\nSteam ID:") : (registration.whatsappMessage||"Hola Jota, me inscribí para Assetto F1.\n\nNombre y apellido:\nSteam ID:\n\nAdjunto el comprobante.");
    const number=String(registration.whatsappNumber||"").replace(/[^0-9]/g,"");
    if(number)$("#whatsappButton").href="https://wa.me/"+number+"?text="+encodeURIComponent(message);
    $$("[data-go='inscripcion']").forEach(button=>{if(button.classList.contains("signupTop"))button.textContent=free?"INSCRIPCIÓN GRATIS":"INSCRIBITE";});
    const copy=$("#copyAlias");
    copy?.addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(registration.paymentAlias||"JOTRACKS");copy.textContent="COPIADO";setTimeout(()=>copy.textContent="COPIAR",1600);}
      catch(_){copy.textContent=registration.paymentAlias||"JOTRACKS";}
    });
  }
  function setupTools(){
    const buttons=$$("[data-tool]"),panels={telemetria:$("#tool-telemetria"),live:$("#tool-live")};
    const activate=tool=>{
      buttons.forEach(b=>b.classList.toggle("isActive",b.dataset.tool===tool));
      Object.entries(panels).forEach(([key,panel])=>{panel.hidden=key!==tool;panel.classList.toggle("isActive",key===tool);});
      loadToolFrame(tool);
    };
    buttons.forEach(button=>button.addEventListener("click",()=>activate(button.dataset.tool)));
    $("#loadTelemetry").addEventListener("click",()=>{
      const frame=$("#telemetryFrame");frame.hidden=false;if(!frame.src)frame.src=frame.dataset.src;$("#loadTelemetry").textContent="ANALIZADOR ABIERTO";
    });
    $("#liveFrame").addEventListener("load",()=>{
      try{
        const doc=$("#liveFrame").contentDocument;
        doc?.querySelectorAll(".hero,.siteNav,.pageFooter").forEach(node=>node.remove());
        if(doc?.body){doc.body.style.background="#08090b";doc.body.style.padding="0";}
        const wrap=doc?.querySelector(".wrap");if(wrap){wrap.style.width="100%";wrap.style.maxWidth="none";wrap.style.margin="0";wrap.style.padding="0";}
      }catch(_){}
    });
  }
  function loadToolFrame(tool){
    if(tool==="telemetria" && $("#telemetryFrame") && !$("#telemetryFrame").hidden && !$("#telemetryFrame").src)$("#telemetryFrame").src=$("#telemetryFrame").dataset.src;
    if(tool==="live"){const frame=$("#liveFrame");frame.hidden=false;if(!frame.src)frame.src=frame.dataset.src;}
  }
  function setupRuleNavigation(){
    $$("[data-rule-jump]").forEach(button=>button.addEventListener("click",()=>{
      const details=$("#"+button.dataset.ruleJump);if(details){details.open=true;details.scrollIntoView({behavior:"smooth",block:"start"});}
    }));
    $$("[data-standing]").forEach(button=>button.addEventListener("click",()=>setStandingsTab(button.dataset.standing)));
  }
  function setupModalNavigation(){
    const modal=$("#magazineModal");
    modal?.addEventListener("close",()=>{if($("#statusLive"))$("#statusLive").textContent="Aviso de la revista cerrado";});
  }
  async function main(){
    const snapshot=window.ASSETTO_F1_SNAPSHOT||{};
    const loaded=await Promise.all([
      safeJson("data/site.json",snapshot.site),
      safeJson("data/championship.json",snapshot.championship),
      safeJson("data/calendar.json",fallbackCalendar)
    ]);
    currentSite=loaded[0]||{};currentChampionship=loaded[1]||{};
    const schedule=Array.isArray(loaded[2])?loaded[2]:(loaded[2].events||[]);
    const races=(currentChampionship.races||[]).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    currentRace=races[0]||null;
    const track=getTrack(currentRace?.trackName),winner=raceWinner(currentRace),next=currentSite.nextRace||{};
    setText("#seasonLabel",currentSite.seasonLabel||"TEMPORADA 2026");
    setText("#stageLabel",currentSite.stageLabel||"CAMPEONATO");
    setText("#heroStage",currentSite.stageLabel||"CAMPEONATO");
    setText("#heroTrack",(track.name||currentRace?.trackName||"ÚLTIMA CARRERA").toUpperCase());
    setText("#heroCircuit",(track.circuit||track.name||currentRace?.trackName||"").toUpperCase());
    setText("#heroWinner",winner?.driverName||"—");setText("#heroWinnerTime",formatTime(winner?.finalTimeMs));
    setText("#heroRound",currentRace?.round?"FECHA "+currentRace.round:"ÚLTIMA FECHA");
    setText("#heroRaceDate",formatDate(currentRace?.date));
    setText("#raceLaps",currentRace?.laps||"—");
    setText("#fastestLapTime",currentRace?.fastestLap?.time||"—");
    setText("#fastestLapPilot",currentRace?.fastestLap?.driverName||"—");
    if(currentSite.media?.carousel?.lastRace?.src)$("#heroBackdrop").src=currentSite.media.carousel.lastRace.src;
    setText("#nextName",next.name||"PRÓXIMA FECHA");setText("#nextCircuit",(next.circuit||"Circuito a confirmar").toUpperCase());
    setText("#nextDate",next.date?formatDate(next.date,true):"FECHA A CONFIRMAR");
    if(next.trackAsset)$("#nextTrack").src=next.trackAsset;
    if(currentSite.media?.carousel?.nextRace?.src)$("#nextBackdrop").src=currentSite.media.carousel.nextRace.src;
    setText("#resultSummary",(track.circuit||track.name||currentRace?.trackName||"")+" · "+(currentRace?.laps||"—")+" VUELTAS");
    renderTopRows(currentRace);renderResults(currentRace,races);renderStandings();renderCalendar(schedule);
    setupRegistration();setupMagazine(currentSite.magazine||{},currentRace);
    setupNavigation();setupTools();setupRuleNavigation();setupModalNavigation();
  }
  main().catch(error=>console.error("Assetto F1 SPA:",error));
})();
const DB_NAME="pointage-db", DB_VERSION=1, STORE="days";
let db, currentDay, timerHandle=null;

const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const nowTime=()=>{const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}`};
const fmtDate=s=>new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date(s+"T12:00:00"));
const mins=t=>{if(!t)return null;const [h,m]=t.split(":").map(Number);return h*60+m};
const dur=(a,b)=>a&&b?Math.max(0,mins(b)-mins(a)):0;
const hm=m=>{m=Math.max(0,Math.round(m));return `${Math.floor(m/60)} h ${pad(m%60)}`};
const hms=sec=>{sec=Math.max(0,Math.floor(sec));return `${pad(Math.floor(sec/3600))}:${pad(Math.floor(sec/60)%60)}:${pad(sec%60)}`};
const dayMinutes=d=>dur(d.arrivee,d.debutPause)+dur(d.finPause,d.depart);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function openDB(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"date"});
    r.onsuccess=()=>{db=r.result;resolve()};
    r.onerror=()=>reject(r.error);
  });
}
function getDay(date){return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get(date);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
function putDay(d){return new Promise((res,rej)=>{const r=db.transaction(STORE,"readwrite").objectStore(STORE).put(d);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function allDays(){return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>a.date.localeCompare(b.date)));r.onerror=()=>rej(r.error)})}
function deleteDay(date){return new Promise((res,rej)=>{const r=db.transaction(STORE,"readwrite").objectStore(STORE).delete(date);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}

function seed(){
 const data=[
 ["2026-07-14","09:46","13:49","14:45","18:04"],["2026-07-15","11:20","14:02","14:58","19:37"],
 ["2026-07-16","11:24","13:19","14:01","19:41"],["2026-07-17","09:57","12:17","12:59","18:12"],
 ["2026-07-18","09:56","13:49","14:20","18:23"],["2026-07-20","11:25","14:09","15:07","19:31"],
 ["2026-07-21","08:42","12:07","13:02","17:15"],["2026-07-22","08:55","12:48","13:06","18:15"],
 ["2026-07-23","11:26","14:19","15:20","19:31"],["2026-07-24","11:23","14:09","15:02","19:35"],
 ["2026-07-28","08:55","12:17","13:16","17:12"],["2026-07-29","10:30","13:27","14:27","18:42"],
 ["2026-07-30","11:26","14:29","14:57","19:37"],["2026-07-31","10:33","13:40","14:20","17:42"],
 ["2026-08-01","08:04","09:30","12:30","19:31"],["2026-08-04","11:26","14:30","15:12","19:36"],
 ["2026-08-05","10:28","13:39","14:23","18:42"],["2026-08-06","10:25","14:20","15:12","19:12"],
 ["2026-08-07","11:00","14:05","14:30","19:32"],["2026-08-08","08:55","12:17","12:40","16:22"],
 ["2026-08-11","11:29","14:06","14:37","19:31"],["2026-08-12","10:22","14:48","15:32","18:52"],
 ["2026-08-13","10:30","13:09","14:02","18:42"],["2026-08-14","11:29","13:36","14:15","19:31"]
 ];
 return Promise.all(data.map(x=>putDay({date:x[0],arrivee:x[1],debutPause:x[2],finPause:x[3],depart:x[4],notes:"",closed:true})));
}
async function initialize(){await openDB();if(localStorage.getItem("pointageSeedV1")!=="1"){await seed();localStorage.setItem("pointageSeedV1","1")}await refresh()}
function refresh(){
 return getDay(todayKey()).then(d=>{currentDay=d;renderMain()});
}
function renderMain(){
 const date=todayKey();$("todayLabel").textContent=fmtDate(date);$("modal").hidden=true;$("drawer").classList.remove("open");$("overlay").hidden=true;
 const d=currentDay;
 $("editCurrent").hidden=!d;
 if(!d){
   $("statusText").textContent="Pas encore pointé";$("statusDot").className="dot";$("liveTimer").textContent="00:00:00";
   $("todaySummary").textContent="Commence ta journée en pointant ton arrivée.";
   $("arriveBtn").hidden=false;$("pauseBtn").hidden=true;$("resumeBtn").hidden=true;$("departBtn").hidden=true;$("doneCard").hidden=true;
   return;
 }
 $("arriveBtn").hidden=true;
 $("eArrivee").value=d.arrivee||"";$("ePauseStart").value=d.debutPause||"";$("ePauseEnd").value=d.finPause||"";$("eDepart").value=d.depart||"";
 if(d.depart){
   $("statusText").textContent="Journée terminée";$("statusDot").className="dot done";$("doneCard").hidden=false;
   $("doneSummary").innerHTML=`<div class="kpi">${hm(dayMinutes(d))}</div><div class="summary">${lineSummary(d)}</div>`;
   $("todaySummary").textContent=lineSummary(d);
   $("pauseBtn").hidden=true;$("resumeBtn").hidden=true;$("departBtn").hidden=true;
 }else if(d.debutPause&&!d.finPause){
   $("statusText").textContent="En pause";$("statusDot").className="dot pause";$("pauseBtn").hidden=true;$("resumeBtn").hidden=false;$("departBtn").hidden=true;
   $("todaySummary").textContent=`Arrivée ${d.arrivee} · Pause depuis ${d.debutPause}`;
 }else if(d.arrivee){
   $("statusText").textContent="Au travail";$("statusDot").className="dot active";$("pauseBtn").hidden=false;$("resumeBtn").hidden=true;$("departBtn").hidden=false;
   $("todaySummary").textContent=lineSummary(d);
 }
 startTimer();
}
function lineSummary(d){
 const p=d.debutPause&&d.finPause?`Pause ${d.debutPause} → ${d.finPause}`:d.debutPause?`Pause depuis ${d.debutPause}`:"Pas encore de pause";
 return `Arrivée ${d.arrivee||"—"} · ${p}${d.depart?` · Départ ${d.depart}`:""}`;
}
function startTimer(){
 if(timerHandle)clearInterval(timerHandle);
 const tick=()=>{
   const d=currentDay;
   if(!d||!d.arrivee||d.depart){$("liveTimer").textContent=hms(dayMinutes(d||{})*60);return}
   let end=nowTime(), total=dur(d.arrivee,end);
   if(d.debutPause){total-=d.finPause?dur(d.debutPause,d.finPause):dur(d.debutPause,end)}
   $("liveTimer").textContent=hms(total*60);
 };
 tick();timerHandle=setInterval(tick,1000);
}
async function arrive(){currentDay={date:todayKey(),arrivee:nowTime(),debutPause:"",finPause:"",depart:"",notes:"",closed:false};await putDay(currentDay);await refresh()}
async function pause(){currentDay.debutPause=nowTime();await putDay(currentDay);await refresh()}
async function resume(){currentDay.finPause=nowTime();await putDay(currentDay);await refresh()}
async function depart(){currentDay.depart=nowTime();currentDay.closed=true;await putDay(currentDay);await refresh()}
async function saveCurrent(){
 currentDay.arrivee=$("eArrivee").value;currentDay.debutPause=$("ePauseStart").value;currentDay.finPause=$("ePauseEnd").value;currentDay.depart=$("eDepart").value;
 currentDay.closed=!!currentDay.depart;await putDay(currentDay);await refresh();
}

function openModal(title,html){$("modalTitle").textContent=title;$("modalContent").innerHTML=html;$("modal").hidden=false}
function closeModal(){$("modal").hidden=true}
async function historyView(){
 const days=await allDays();
 const months={};
 days.forEach(d=>(months[d.date.slice(0,7)]??=[]).push(d));
 let html=`<div class="toolbar"><button class="small-btn" id="addDayBtn">+ Ajouter une journée</button><button class="small-btn" id="exportCsvBtn">Exporter CSV</button><button class="small-btn" id="exportJsonBtn">Sauvegarder JSON</button></div>`;
 const keys=Object.keys(months).sort().reverse();
 if(!keys.length)html+=`<div class="empty">Aucune journée enregistrée.</div>`;
 for(const k of keys){
   const total=months[k].reduce((s,d)=>s+dayMinutes(d),0);
   const label=new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric"}).format(new Date(k+"-01T12:00:00"));
   html+=`<h3 class="month">${label}</h3><div class="month-total">${hm(total)} travaillées · ${months[k].length} journée(s)</div>`;
   for(const d of months[k].slice().sort((a,b)=>b.date.localeCompare(a.date))){
     html+=`<div class="day-row"><div class="day-main"><span class="day-date">${new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"2-digit",month:"2-digit"}).format(new Date(d.date+"T12:00:00"))}</span><span class="day-hours">${hm(dayMinutes(d))}</span></div><div class="day-detail">${d.arrivee||"—"} · ${d.debutPause||"—"} → ${d.finPause||"—"} · ${d.depart||"—"}</div><div class="row-buttons"><button class="small-btn edit-day" data-date="${d.date}">Modifier</button><button class="small-btn danger delete-day" data-date="${d.date}">Supprimer</button></div></div>`;
   }
 }
 openModal("Historique",html);
 $("addDayBtn").onclick=()=>editDay(null);
 $("exportCsvBtn").onclick=exportCSV;$("exportJsonBtn").onclick=exportJSON;
 document.querySelectorAll(".edit-day").forEach(b=>b.onclick=()=>editDay(b.dataset.date));
 document.querySelectorAll(".delete-day").forEach(b=>b.onclick=async()=>{if(confirm("Supprimer cette journée ?")){await deleteDay(b.dataset.date);historyView();if(b.dataset.date===todayKey())refresh()}});
}
async function editDay(date){
 const d=date?await getDay(date):{date:todayKey(),arrivee:"",debutPause:"",finPause:"",depart:"",notes:"",closed:false};
 const html=`<div class="grid"><label>Date<input type="date" id="mdDate" value="${d.date}"></label><label>Arrivée<input type="time" id="mdArrivee" value="${d.arrivee||""}"></label><label>Début pause<input type="time" id="mdPauseStart" value="${d.debutPause||""}"></label><label>Fin pause<input type="time" id="mdPauseEnd" value="${d.finPause||""}"></label><label>Départ<input type="time" id="mdDepart" value="${d.depart||""}"></label></div><button class="action primary" id="mdSave">Enregistrer</button>`;
 openModal(date?"Modifier la journée":"Ajouter une journée",html);
 $("mdSave").onclick=async()=>{
   const nd={date:$("mdDate").value,arrivee:$("mdArrivee").value,debutPause:$("mdPauseStart").value,finPause:$("mdPauseEnd").value,depart:$("mdDepart").value,notes:d.notes||"",closed:!!$("mdDepart").value};
   if(!nd.date)return alert("Choisis une date.");
   if(date&&date!==nd.date)await deleteDay(date);
   await putDay(nd);await historyView();if(nd.date===todayKey()||date===todayKey())await refresh();
 };
}
function download(name,content,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function exportJSON(){download(`pointage-sauvegarde-${todayKey()}.json`,JSON.stringify({version:1,exportedAt:new Date().toISOString(),days:await allDays()},null,2),"application/json")}
async function exportCSV(){
 const days=await allDays(), rows=[["Date","Arrivée","Début pause","Fin pause","Départ","Temps travaillé"]];
 days.forEach(d=>rows.push([d.date,d.arrivee||"",d.debutPause||"",d.finPause||"",d.depart||"",hm(dayMinutes(d))]));
 download(`pointage-${todayKey()}.csv`,rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(",")).join("\n"),"text/csv;charset=utf-8")
}
function backupView(){openModal("Sauvegarde / restauration",`<div class="notice">Les données sont enregistrées localement sur cet appareil. Fais régulièrement une sauvegarde JSON pour pouvoir les restaurer ailleurs ou après une suppression des données du navigateur.</div><div class="toolbar"><button class="action primary" id="backupNow">Exporter une sauvegarde JSON</button><button class="action" id="restoreBtn">Importer une sauvegarde JSON</button></div>`);$("backupNow").onclick=exportJSON;$("restoreBtn").onclick=()=>$("importInput").click()}
async function importJSON(file){try{const obj=JSON.parse(await file.text());if(!Array.isArray(obj.days))throw Error();if(!confirm(`Importer ${obj.days.length} journées ? Les dates présentes dans la sauvegarde remplaceront les données locales.`))return;for(const d of obj.days)await putDay(d);await refresh();alert("Sauvegarde importée.");}catch(e){alert("Fichier de sauvegarde invalide.")}}
function aboutView(){openModal("À propos",`<p>Pointage est une petite PWA locale : aucune donnée n'est envoyée à un serveur.</p><p>Les horaires sont stockés dans IndexedDB du navigateur. L'export JSON sert de sauvegarde complète et le CSV de feuille d'heures.</p>`)}
function drawer(open){$("drawer").classList.toggle("open",open);$("overlay").hidden=!open;$("drawer").setAttribute("aria-hidden",String(!open))}
$("arriveBtn").onclick=arrive;$("pauseBtn").onclick=pause;$("resumeBtn").onclick=resume;$("departBtn").onclick=depart;$("saveCurrentBtn").onclick=saveCurrent;
$("menuBtn").onclick=()=>drawer(true);$("closeMenuBtn").onclick=()=>drawer(false);$("overlay").onclick=()=>drawer(false);$("modalClose").onclick=closeModal;
document.querySelectorAll(".menu-item").forEach(b=>b.onclick=()=>{drawer(false);if(b.dataset.view==="history")historyView();if(b.dataset.view==="backup")backupView();if(b.dataset.view==="about")aboutView()});
$("importInput").onchange=()=>{if($("importInput").files[0])importJSON($("importInput").files[0]);$("importInput").value=""};
initialize();

if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}

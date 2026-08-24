
const trip = window.TRIP_DATA;
const hotels = window.HOTELS || [];
const remaining = window.REMAINING || [];
const wallet = window.TICKET_WALLET || [];
const cityGuide = window.CITY_GUIDE || {};
const P = "italy2026-v4-";


const TICKET_DB_NAME = "italy2026-ticket-wallet";
const TICKET_DB_VERSION = 1;
const TICKET_STORE = "tickets";

function openTicketDB(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(TICKET_DB_NAME,TICKET_DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(TICKET_STORE)){
        const store=db.createObjectStore(TICKET_STORE,{keyPath:"id",autoIncrement:true});
        store.createIndex("category","category",{unique:false});
        store.createIndex("createdAt","createdAt",{unique:false});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function ticketDBAction(mode,callback){
  return openTicketDB().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(TICKET_STORE,mode);
    const store=tx.objectStore(TICKET_STORE);
    let result;
    try{result=callback(store)}catch(error){reject(error);return}
    tx.oncomplete=()=>resolve(result&&result.result!==undefined?result.result:result);
    tx.onerror=()=>reject(tx.error);
  }));
}
function getImportedTickets(){
  return openTicketDB().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(TICKET_STORE,"readonly");
    const request=tx.objectStore(TICKET_STORE).getAll();
    request.onsuccess=()=>resolve((request.result||[]).sort((a,b)=>b.createdAt-a.createdAt));
    request.onerror=()=>reject(request.error);
  }));
}
function saveImportedTicket(ticket){return ticketDBAction("readwrite",store=>store.add(ticket));}
function deleteImportedTicket(id){return ticketDBAction("readwrite",store=>store.delete(Number(id)));}
function getImportedTicket(id){
  return openTicketDB().then(db=>new Promise((resolve,reject)=>{
    const request=db.transaction(TICKET_STORE,"readonly").objectStore(TICKET_STORE).get(Number(id));
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  }));
}

const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const todayISO = (date = new Date()) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
const fmtDate = s => new Date(s+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const shortDate = s => new Date(s+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});

function eventId(day,event,index){
  return `${day.date}-${index}-${event.title}`.replace(/[^a-z0-9]+/gi,"-").toLowerCase();
}
function isDone(key){try{return localStorage.getItem(P+"done-"+key)==="1"}catch{return false}}
function setDone(key,value){try{localStorage.setItem(P+"done-"+key,value?"1":"0")}catch{}}
function clockMinutes(time){
  const value=String(time||"").trim();
  const range=value.match(/^~?(\d{1,2})(?::(\d{2}))?\s*[–-].*?\b(AM|PM)\b/i);
  const clock=range||value.match(/~?(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if(clock){
    let hour=Number(clock[1]);
    const minute=Number(clock[2]||0);
    const period=clock[3].toUpperCase();
    if(period==="PM"&&hour!==12)hour+=12;
    if(period==="AM"&&hour===12)hour=0;
    return hour*60+minute;
  }
  const label=value.toLowerCase().replace(/\s+/g," ");
  const approximate={
    "early morning":7*60,
    "morning":9*60,
    "late morning":11*60,
    "midday":12*60,
    "lunch":12*60+30,
    "early afternoon":13*60+30,
    "afternoon":15*60,
    "late afternoon":17*60,
    "late afternoon / early evening":17*60+30,
    "sunset":18*60+30,
    "evening":19*60+30
  };
  return approximate[label]??null;
}
function parseDateTime(date,time){
  const minutes=clockMinutes(time);
  if(minutes===null)return null;
  const hour=Math.floor(minutes/60);
  const minute=minutes%60;
  return new Date(`${date}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`);
}
function eventTimeline(day){
  if(!day)return [];
  const hour=3600000;
  const points=day.events.map(event=>parseDateTime(day.date,event.time)?.getTime()??null);
  for(let index=0;index<points.length;){
    if(points[index]!==null){index++;continue}
    const start=index;
    while(index<points.length&&points[index]===null)index++;
    const count=index-start;
    const previous=start>0?points[start-1]:null;
    const next=index<points.length?points[index]:null;
    if(previous!==null&&next!==null&&next>previous){
      const step=(next-previous)/(count+1);
      for(let offset=0;offset<count;offset++)points[start+offset]=previous+step*(offset+1);
    }else if(previous!==null){
      for(let offset=0;offset<count;offset++)points[start+offset]=previous+hour*(offset+1);
    }else if(next!==null){
      for(let offset=0;offset<count;offset++)points[start+offset]=next-hour*(count-offset);
    }else{
      const base=new Date(`${day.date}T09:00:00`).getTime();
      for(let offset=0;offset<count;offset++)points[start+offset]=base+hour*1.5*offset;
    }
  }
  const minimumGap=15*60000;
  for(let index=1;index<points.length;index++){
    if(points[index]<=points[index-1])points[index]=points[index-1]+minimumGap;
  }
  return day.events.map((event,index)=>({event,index,dt:new Date(points[index])}));
}
function tripStats(){
  let total=0,done=0;
  trip.forEach(d=>d.events.forEach((e,i)=>{total++;if(isDone(eventId(d,e,i)))done++}));
  return {total,done,pct:total?Math.round(done/total*100):0};
}
function todayEventSelection(day,now=new Date()){
  if(!day)return {current:null,next:null,mode:"complete"};
  const items=eventTimeline(day).filter(item=>!isDone(eventId(day,item.event,item.index)));
  if(!items.length)return {current:null,next:null,mode:"complete"};
  if(day.date!==todayISO(now))return {current:items[0],next:items[1]||null,mode:"preview"};
  const started=items.filter(item=>item.dt<=now);
  if(!started.length)return {current:items[0],next:items[1]||null,mode:"upcoming"};
  const current=started[started.length-1];
  const position=items.indexOf(current);
  return {current,next:items[position+1]||null,mode:"current"};
}
function nextEventForDay(day){
  return todayEventSelection(day).current;
}
function upcomingBooked(){
  const now=new Date();
  let best=null;
  trip.forEach(day=>day.events.forEach((event,index)=>{
    const dt=parseDateTime(day.date,event.time);
    if(event.status==="Booked"&&dt&&dt>=now&&(!best||dt<best.dt))best={day,event,index,dt};
  }));
  return best;
}
function badgeClass(status){
  if(status==="To book")return "warn";
  if(status==="Priority")return "priority";
  return "";
}
function dayCard(day,open=false){
  return `<article class="day-card ${open?"open":""}" data-city="${day.city}">
    <button class="day-toggle">
      <div>
        <div class="day-date">${shortDate(day.date)} · ${day.title}</div>
        <div class="city-label">${day.city}</div>
      </div>
      <div class="chevron">⌄</div>
    </button>
    <div class="day-content">
      <div class="route-launch"><button class="primary" data-route-date="${day.date}">Start Route Mode</button></div>
      <div class="timeline">
        ${day.events.map((event,index)=>{
          const key=eventId(day,event,index),done=isDone(key);
          return `<div class="event ${done?"done":""}" data-event="${key}">
            <input class="check" type="checkbox" ${done?"checked":""} aria-label="Mark ${event.title} complete">
            <div class="event-time">${event.time}</div>
            <div>
              <div class="event-title">${event.title}</div>
              <div class="event-note">${event.note}</div>
              ${event.status?`<span class="badge ${badgeClass(event.status)}">${event.status}</span>`:""}
              ${event.map?`<br><a class="map-button" href="${event.map}" target="_blank" rel="noopener">Open Maps</a>`:""}
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>
  </article>`;
}
function bindDayCards(){
  qsa(".day-toggle").forEach(btn=>btn.addEventListener("click",()=>btn.closest(".day-card").classList.toggle("open")));
  qsa(".check").forEach(box=>box.addEventListener("change",()=>{
    const row=box.closest(".event");
    setDone(row.dataset.event,box.checked);
    row.classList.toggle("done",box.checked);
    renderHome();
  }));
  qsa("[data-route-date]").forEach(btn=>btn.addEventListener("click",()=>openRouteMode(btn.dataset.routeDate)));
}


let activeRouteDate = todayISO();

function routeCurrentIndex(day){
  const firstUndone=day.events.findIndex((event,index)=>!isDone(eventId(day,event,index)));
  return firstUndone===-1?day.events.length:firstUndone;
}
function openRouteMode(date){
  activeRouteDate=date||todayISO();
  renderRouteMode();
  showView("route",false);
}
function renderRouteMode(){
  let day=trip.find(d=>d.date===activeRouteDate)||trip[0];
  activeRouteDate=day.date;
  const currentIndex=routeCurrentIndex(day);
  const current=currentIndex<day.events.length?day.events[currentIndex]:null;
  const complete=day.events.filter((e,i)=>isDone(eventId(day,e,i))).length;
  const pct=Math.round(complete/day.events.length*100);

  qs("#route").innerHTML=`
    <div class="route-screen-head">
      <div><div class="eyebrow">ROUTE MODE</div><h2 style="margin:4px 0 0">${day.city}</h2></div>
      <button class="route-back" id="closeRoute">Done</button>
    </div>
    <div class="route-select-wrap">
      <label for="routeDaySelect">Choose a day</label>
      <select id="routeDaySelect" class="route-select">
        ${trip.map(d=>`<option value="${d.date}" ${d.date===day.date?"selected":""}>${shortDate(d.date)} — ${d.city}: ${d.title}</option>`).join("")}
      </select>
    </div>
    ${current?`
      <section class="route-current">
        <div class="focus-label">CURRENT STOP · ${currentIndex+1} OF ${day.events.length}</div>
        <div class="route-current-title">${current.title}</div>
        <div class="route-current-time">${current.time}</div>
        <div class="route-current-note">${current.note}</div>
        ${current.status?`<span class="badge ${badgeClass(current.status)}">${current.status}</span>`:""}
        <div class="route-actions">
          ${current.map?`<a class="primary" href="${current.map}" target="_blank" rel="noopener">Open Maps</a>`:`<button class="secondary" disabled>No map for this stop</button>`}
          <button class="secondary" id="completeCurrent">Mark complete</button>
        </div>
      </section>`:
      `<div class="route-complete-banner"><strong>Day complete ✓</strong><div class="small">Every stop for this day is marked complete.</div></div>`}
    <div class="info-card">
      <strong>Day progress</strong>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="small">${complete} of ${day.events.length} stops completed</div>
    </div>
    <h3>Today’s route</h3>
    <div class="route-step-list">
      ${day.events.map((event,index)=>{
        const done=isDone(eventId(day,event,index));
        const active=index===currentIndex;
        return `<div class="route-step ${done?"complete":""} ${active?"active":""}">
          <div class="route-step-marker">${done?"✓":index+1}</div>
          <div class="route-step-card">
            <div class="route-step-title">${event.title}</div>
            <div class="route-step-meta">${event.time}${event.status?` · ${event.status}`:""}</div>
            ${active?`<div class="small" style="margin-top:5px">Up next</div>`:""}
          </div>
        </div>`;
      }).join("")}
    </div>`;

  qs("#closeRoute").addEventListener("click",()=>showView("trip"));
  qs("#routeDaySelect").addEventListener("change",e=>{activeRouteDate=e.target.value;renderRouteMode()});
  if(current){
    qs("#completeCurrent").addEventListener("click",()=>{
      setDone(eventId(day,current,currentIndex),true);
      renderRouteMode();
      renderTrip();
      renderHome();
    });
  }
}

function todayHotelForDate(date){
  if(date>="2026-09-15"&&date<="2026-09-16")return hotels.find(h=>h[0]==="Venice");
  if(date>="2026-09-17"&&date<="2026-09-19")return hotels.find(h=>h[0]==="Florence");
  if(date>="2026-09-20"&&date<="2026-09-23")return hotels.find(h=>h[0]==="Rome");
  if(date>="2026-09-24"&&date<="2026-09-26")return hotels.find(h=>h[0]==="Naples");
  return null;
}
function getTodayScreenDate(){
  const actual=todayISO();
  if(trip.some(d=>d.date===actual))return actual;
  try{
    const saved=localStorage.getItem(P+"today-preview-date");
    if(saved&&trip.some(d=>d.date===saved))return saved;
  }catch{}
  return trip[0].date;
}
function setTodayScreenDate(date){
  try{localStorage.setItem(P+"today-preview-date",date)}catch{}
}

function todayDateLabel(date=new Date()){
  return new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(date);
}
function tripCountdown(){
  const start=new Date(2026,8,14);
  const end=new Date(2026,8,27);
  const now=new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const dayMs=86400000;
  if(today<start){
    const days=Math.ceil((start-today)/dayMs);
    return {value:days,label:days===1?"day until departure":"days until departure",message:"Departure · September 14, 2026"};
  }
  if(today<=end){
    const tripDay=Math.floor((today-start)/dayMs)+1;
    const remaining=Math.max(0,Math.floor((end-today)/dayMs));
    return {value:`Day ${tripDay}`,label:"of your Italy trip",message:remaining===0?"Final day · September 27":"Trip in progress"};
  }
  const daysSince=Math.floor((today-end)/dayMs);
  return {value:"Complete",label:"Italy 2026",message:daysSince===1?"Trip ended yesterday":`Trip ended ${daysSince} days ago`};
}


const WEATHER_LOCATIONS={
  Venice:{name:"Venice",latitude:45.4408,longitude:12.3155},
  Florence:{name:"Florence",latitude:43.7696,longitude:11.2558},
  Rome:{name:"Rome",latitude:41.9028,longitude:12.4964},
  Naples:{name:"Naples",latitude:40.8518,longitude:14.2681},
  Capri:{name:"Capri",latitude:40.5509,longitude:14.2429},
  "Fort Lauderdale":{name:"Fort Lauderdale",latitude:26.1224,longitude:-80.1373}
};
function weatherLocationForDay(day){
  if(day.date==="2026-09-14")return WEATHER_LOCATIONS["Fort Lauderdale"];
  if(day.city==="Flights"&&day.date==="2026-09-27")return WEATHER_LOCATIONS.Naples;
  return WEATHER_LOCATIONS[day.city]||null;
}
function weatherCodeLabel(code){
  const labels={
    0:"Clear sky",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",
    45:"Foggy",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
    56:"Freezing drizzle",57:"Heavy freezing drizzle",61:"Light rain",63:"Rain",
    65:"Heavy rain",66:"Freezing rain",67:"Heavy freezing rain",71:"Light snow",
    73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Light showers",
    81:"Showers",82:"Heavy showers",85:"Snow showers",86:"Heavy snow showers",
    95:"Thunderstorms",96:"Thunderstorms with hail",99:"Severe thunderstorms with hail"
  };
  return labels[code]||"Weather";
}
function weatherIcon(code){
  if(code===0)return "☀️";
  if([1,2].includes(code))return "🌤️";
  if(code===3)return "☁️";
  if([45,48].includes(code))return "🌫️";
  if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return "🌧️";
  if([71,73,75,77,85,86].includes(code))return "🌨️";
  if([95,96,99].includes(code))return "⛈️";
  return "🌤️";
}
function weatherDateDistance(date){
  const target=new Date(`${date}T12:00:00`);
  const now=new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
  return Math.round((target-today)/86400000);
}
function weatherCacheKey(location,date){return `${P}weather-${location.name.toLowerCase().replace(/\s+/g,"-")}-${date}`}
function savedWeather(location,date){
  try{return JSON.parse(localStorage.getItem(weatherCacheKey(location,date))||"null")}catch{return null}
}
function saveWeather(location,date,data){
  try{localStorage.setItem(weatherCacheKey(location,date),JSON.stringify(data))}catch{}
}
function weatherUpdatedLabel(timestamp){
  const date=new Date(timestamp);
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date);
}
function weatherCardHTML(state){
  if(state.mode==="unavailable"){
    return `<section class="today-weather-card">
      <div class="today-weather-head"><div><span class="focus-label">${state.location.toUpperCase()} WEATHER</span><h2>Forecast available closer to this date</h2></div><span class="today-weather-icon">🌤️</span></div>
      <p>Daily forecasts become available within about 16 days of ${state.dateLabel}.</p>
    </section>`;
  }
  if(state.mode==="loading"){
    return `<section class="today-weather-card"><div class="today-weather-head"><div><span class="focus-label">${state.location.toUpperCase()} WEATHER</span><h2>Loading forecast…</h2></div><span class="today-weather-icon">⋯</span></div></section>`;
  }
  if(state.mode==="error"){
    return `<section class="today-weather-card">
      <div class="today-weather-head"><div><span class="focus-label">${state.location.toUpperCase()} WEATHER</span><h2>Forecast unavailable</h2></div><span class="today-weather-icon">⚠️</span></div>
      <p>${state.cached?"Showing no saved forecast for this date.":"Connect to the internet and try again."}</p>
      <button class="secondary today-weather-refresh" data-weather-refresh>Try again</button>
    </section>`;
  }
  return `<section class="today-weather-card">
    <div class="today-weather-head">
      <div><span class="focus-label">${state.location.toUpperCase()} WEATHER</span><h2>${state.icon} ${Math.round(state.temperature)}°F · ${state.condition}</h2></div>
      <button class="today-weather-refresh" data-weather-refresh aria-label="Refresh weather">↻</button>
    </div>
    <div class="today-weather-grid">
      <div><span>Feels like</span><strong>${Math.round(state.feelsLike)}°</strong></div>
      <div><span>High / Low</span><strong>${Math.round(state.high)}° / ${Math.round(state.low)}°</strong></div>
      <div><span>Rain</span><strong>${Math.round(state.rain)}%</strong></div>
    </div>
    <div class="today-weather-foot">${state.offline?"Saved forecast":"Updated"} · ${weatherUpdatedLabel(state.updatedAt)}</div>
  </section>`;
}
let todayWeatherRequest=0;
let todayWeatherController=null;
async function renderTodayWeather(day,force=false){
  const requestId=++todayWeatherRequest;
  if(todayWeatherController)todayWeatherController.abort();
  todayWeatherController=null;
  const host=qs("#todayWeather");
  if(!host)return;
  const isCurrent=()=>requestId===todayWeatherRequest
    &&qs("#todayWeather")===host
    &&qs("#todayDaySelect")?.value===day.date;
  const location=weatherLocationForDay(day);
  if(!location){host.innerHTML="";return}
  const distance=weatherDateDistance(day.date);
  const dateLabel=new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric"}).format(new Date(`${day.date}T12:00:00`));
  if(distance<0||distance>16){
    host.innerHTML=weatherCardHTML({mode:"unavailable",location:location.name,dateLabel});
    return;
  }
  const cached=savedWeather(location,day.date);
  if(cached&&!force){
    host.innerHTML=weatherCardHTML({...cached,mode:"ready",offline:!navigator.onLine});
    const refresh=host.querySelector("[data-weather-refresh]");
    if(refresh)refresh.addEventListener("click",()=>renderTodayWeather(day,true));
    if(!navigator.onLine)return;
  }else{
    host.innerHTML=weatherCardHTML({mode:"loading",location:location.name});
  }
  const controller=new AbortController();
  todayWeatherController=controller;
  try{
    const params=new URLSearchParams({
      latitude:location.latitude,
      longitude:location.longitude,
      daily:"weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max",
      current:"temperature_2m,apparent_temperature,weather_code",
      temperature_unit:"fahrenheit",
      timezone:"auto",
      start_date:day.date,
      end_date:day.date
    });
    const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`,{signal:controller.signal});
    if(!response.ok)throw new Error(`Weather request failed: ${response.status}`);
    const json=await response.json();
    const isToday=day.date===todayISO();
    const result={
      location:location.name,
      temperature:isToday&&json.current?json.current.temperature_2m:json.daily.temperature_2m_max[0],
      feelsLike:isToday&&json.current?json.current.apparent_temperature:json.daily.apparent_temperature_max[0],
      high:json.daily.temperature_2m_max[0],
      low:json.daily.temperature_2m_min[0],
      rain:json.daily.precipitation_probability_max[0]??0,
      condition:weatherCodeLabel(isToday&&json.current?json.current.weather_code:json.daily.weather_code[0]),
      icon:weatherIcon(isToday&&json.current?json.current.weather_code:json.daily.weather_code[0]),
      updatedAt:Date.now()
    };
    saveWeather(location,day.date,result);
    if(!isCurrent())return;
    host.innerHTML=weatherCardHTML({...result,mode:"ready"});
    const refresh=host.querySelector("[data-weather-refresh]");
    if(refresh)refresh.addEventListener("click",()=>renderTodayWeather(day,true));
  }catch(error){
    if(error?.name==="AbortError"||!isCurrent())return;
    console.error(error);
    if(cached){
      host.innerHTML=weatherCardHTML({...cached,mode:"ready",offline:true});
    }else{
      host.innerHTML=weatherCardHTML({mode:"error",location:location.name});
    }
    const refresh=host.querySelector("[data-weather-refresh]");
    if(refresh)refresh.addEventListener("click",()=>renderTodayWeather(day,true));
  }finally{
    if(todayWeatherController===controller)todayWeatherController=null;
  }
}

let pendingWalletTarget="";
function walletComparableText(value){
  return (value||"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/’/g,"'")
    .replace(/\bamerican airlines\b/g,"aa")
    .replace(/\bst[.]? peter'?s\b/g,"st peter")
    .replace(/\bsaint peter'?s\b/g,"st peter")
    .replace(/\bgalleria dell'?accademia\b/g,"accademia")
    .replace(/\bbrunelleschi'?s dome climb\b/g,"brunelleschi dome")
    .replace(/\bsistine chapel\b/g,"")
    .replace(/\bsmall[- ]group\b/g,"")
    .replace(/[^a-z0-9]+/g," ")
    .trim();
}
function walletEventAlias(title){
  const text=walletComparableText(title);
  if(/wine tour check in|wine tasting/.test(text))return "tuscany wine tasting experience";
  if(/boat tour check in|boat tour/.test(text))return "capri boat tour";
  if(/snav|ferry to capri|return ferry|return to naples/.test(text))return "snav naples capri round trip";
  if(/pompeii|vesuvius/.test(text))return "pompeii mount vesuvius";
  if(/vatican museum/.test(text))return "vatican museums";
  if(/st peter/.test(text))return "st peter basilica dome lift";
  if(/st mark|doge/.test(text))return "st marks basilica doges palace";
  if(/colosseum|roman forum|palatine/.test(text))return "colosseum forum palatine";
  if(/pisa/.test(text)&&/train/.test(text))return "florence pisa";
  return text;
}
function walletDateLabel(isoDate){
  const d=new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric"}).format(d);
}
function findWalletMatchForEvent(day,event){
  const alias=walletEventAlias(event.title);
  const eventTokens=new Set(alias.split(" ").filter(word=>word.length>1));
  const targetDate=walletDateLabel(day.date).toLowerCase();
  let best=null;
  wallet.forEach(group=>group.items.forEach(item=>{
    const itemText=walletComparableText(item.title);
    const itemTokens=new Set(itemText.split(" ").filter(word=>word.length>1));
    let overlap=0;
    eventTokens.forEach(token=>{if(itemTokens.has(token))overlap++});
    const exactAlias=itemText===walletComparableText(alias);
    const dateMatch=(item.date||"").toLowerCase()===targetDate;
    const timeMatch=event.time&&item.time&&walletComparableText(item.time).includes(walletComparableText(event.time));
    let score=overlap*4+(dateMatch?12:0)+(timeMatch?4:0)+(exactAlias?20:0);
    if(alias.includes(itemText)||itemText.includes(alias))score+=10;
    if(!best||score>best.score)best={score,key:walletItemKey(group.group,item),item};
  }));
  return best&&best.score>=14?best:null;
}
function focusWalletCard(key){
  if(!key)return false;
  const card=document.querySelector(`[data-wallet-key="${CSS.escape(key)}"]`);
  if(!card)return false;
  const search=qs("#walletSearch");
  if(search&&search.value){search.value="";search.dispatchEvent(new Event("input"))}
  qsa("[data-wallet-filter]").forEach(button=>button.classList.toggle("active",button.dataset.walletFilter==="All"));
  qsa("#walletContent .wallet-group,[data-wallet-item]").forEach(el=>el.classList.remove("hidden"));
  card.scrollIntoView({behavior:"smooth",block:"center"});
  card.classList.remove("wallet-target-highlight");
  void card.offsetWidth;
  card.classList.add("wallet-target-highlight");
  setTimeout(()=>card.classList.remove("wallet-target-highlight"),2400);
  return true;
}
async function openWalletForEvent(day,event){
  const match=findWalletMatchForEvent(day,event);
  pendingWalletTarget=match?match.key:"";
  showView("wallet");
  await new Promise(resolve=>setTimeout(resolve,80));
  if(pendingWalletTarget&&!focusWalletCard(pendingWalletTarget)){
    await renderWallet();
    await new Promise(resolve=>requestAnimationFrame(resolve));
    focusWalletCard(pendingWalletTarget);
  }
  pendingWalletTarget="";
}

function renderHome(selectedDate){
  const actual=todayISO();
  const date=selectedDate||getTodayScreenDate();
  const day=trip.find(d=>d.date===date)||trip[0];
  setTodayScreenDate(day.date);
  const dayIndex=trip.findIndex(d=>d.date===day.date);
  const next=nextEventForDay(day);
  const completed=day.events.filter((e,i)=>isDone(eventId(day,e,i))).length;
  const pct=Math.round(completed/day.events.length*100);
  const hotel=todayHotelForDate(day.date);
  const duringTrip=trip.some(d=>d.date===actual);
  const isActual=day.date===actual;
  const label=duringTrip&&isActual?"TODAY":duringTrip?"TRIP DAY PREVIEW":"PREVIEW YOUR TRIP DAY";
  const nextIndex=next?next.index:-1;
  const countdown=tripCountdown();
  const nextWalletMatch=next?findWalletMatchForEvent(day,next.event):null;

  qs("#home").innerHTML=`
    <section class="today-date-strip">
      <div class="today-current-date"><span>CURRENT DATE</span><strong>${todayDateLabel()}</strong></div>
      <div class="today-countdown"><strong>${countdown.value}</strong><span>${countdown.label}</span><small>${countdown.message}</small></div>
    </section>

    <section class="today-hero">
      <div class="today-hero-top">
        <div>
          <div class="kicker">${label}</div>
          <div class="headline">${day.city}</div>
          <div class="route">${fmtDate(day.date)} · ${day.title}</div>
        </div>
        <div class="today-day-number"><strong>${dayIndex+1}</strong><span>of ${trip.length}</span></div>
      </div>
      <div class="today-day-picker">
        <button class="today-arrow" id="todayPrev" ${dayIndex===0?"disabled":""} aria-label="Previous day">‹</button>
        <select id="todayDaySelect" aria-label="Choose trip day">
          ${trip.map(d=>`<option value="${d.date}" ${d.date===day.date?"selected":""}>${shortDate(d.date)} — ${d.city}</option>`).join("")}
        </select>
        <button class="today-arrow" id="todayNext" ${dayIndex===trip.length-1?"disabled":""} aria-label="Next day">›</button>
      </div>
    </section>

    <div id="todayWeather" class="today-weather-host"></div>

    ${next?`<section class="today-next-card">
      <div class="today-next-top"><div class="focus-label">${isActual?"UP NEXT":"FIRST UNFINISHED STOP"}</div><span>${nextIndex+1} of ${day.events.length}</span></div>
      <div class="today-next-time">${next.event.time}</div>
      <div class="today-next-title">${next.event.title}</div>
      <div class="today-next-note">${next.event.note}</div>
      ${next.event.status?`<span class="badge ${badgeClass(next.event.status)}">${next.event.status}</span>`:""}
      <div class="today-primary-actions">
        ${next.event.map?`<a class="primary" href="${next.event.map}" target="_blank" rel="noopener">Open Maps</a>`:""}
        <button class="secondary" data-home-route="${day.date}">Route Mode</button>
        <button class="secondary" data-home-wallet="${nextIndex}">${nextWalletMatch?"Open ticket":"Open Wallet"}</button>
      </div>
    </section>`:`<div class="route-complete-banner"><strong>Day complete ✓</strong><div class="small">Every stop for this day is marked complete.</div></div>`}

    ${todayFoodHTML(day)}

    <section class="today-glance">
      <div class="today-glance-card"><span>Progress</span><strong>${completed}/${day.events.length}</strong><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>
      <div class="today-glance-card"><span>Tonight</span><strong>${hotel?hotel[1]:day.city==="Flights"?"Travel day":"—"}</strong><small>${hotel?hotel[0]:day.title}</small></div>
    </section>

    <div class="today-tools">
      <button class="today-tool" data-jump="wallet"><span>▣</span><div><strong>Ticket Wallet</strong><small>Open private tickets</small></div></button>
      <button class="today-tool" data-open="currency"><span>€</span><div><strong>Currency</strong><small>EUR ↔ USD</small></div></button>
      ${hotel?`<a class="today-tool" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel[1]+" "+hotel[0])}" target="_blank" rel="noopener"><span>⌖</span><div><strong>Hotel Maps</strong><small>${hotel[1]}</small></div></a>`:""}
    </div>

    <div class="section-title today-schedule-title"><h2>Today’s schedule</h2><span class="small">${completed} completed</span></div>
    <div class="today-timeline">
      ${day.events.map((event,index)=>{
        const key=eventId(day,event,index),done=isDone(key),active=index===nextIndex;
        return `<article class="today-event ${done?"done":""} ${active?"active":""}" data-event="${key}">
          <button class="today-check" data-today-check="${key}" aria-label="${done?"Mark incomplete":"Mark complete"}">${done?"✓":""}</button>
          <div class="today-event-line"><span></span></div>
          <div class="today-event-body">
            <div class="today-event-meta"><strong>${event.time}</strong>${active?`<span>Up next</span>`:""}</div>
            <div class="today-event-title">${event.title}</div>
            <div class="today-event-note">${event.note}</div>
            <div class="today-event-actions">
              ${event.map?`<a href="${event.map}" target="_blank" rel="noopener">Maps</a>`:""}
              ${event.status?`<span class="badge ${badgeClass(event.status)}">${event.status}</span>`:""}
            </div>
          </div>
        </article>`;
      }).join("")}
    </div>`;

  renderTodayWeather(day);
  bindInternalNavigation();
  qs("#todayDaySelect").addEventListener("change",e=>renderHome(e.target.value));
  qs("#todayPrev").addEventListener("click",()=>{if(dayIndex>0)renderHome(trip[dayIndex-1].date)});
  qs("#todayNext").addEventListener("click",()=>{if(dayIndex<trip.length-1)renderHome(trip[dayIndex+1].date)});
  qsa("[data-food-guide-city]").forEach(btn=>btn.addEventListener("click",()=>{showView("guide");setTimeout(()=>{const chip=[...document.querySelectorAll('[data-guide-city]')].find(x=>x.dataset.guideCity===btn.dataset.foodGuideCity);if(chip)chip.click()},60)}));
  qsa("[data-home-route]").forEach(btn=>btn.addEventListener("click",()=>openRouteMode(btn.dataset.homeRoute)));
  qsa("[data-home-wallet]").forEach(btn=>btn.addEventListener("click",()=>{
    const index=Number(btn.dataset.homeWallet);
    const event=day.events[index];
    if(event)openWalletForEvent(day,event);else showView("wallet");
  }));
  qsa("[data-today-check]").forEach(btn=>btn.addEventListener("click",()=>{
    const key=btn.dataset.todayCheck;
    setDone(key,!isDone(key));
    renderHome(day.date);
    renderTrip();
  }));
}

function renderTrip(){
  const cities=["All","Flights","Venice","Florence","Rome","Naples","Capri"];
  qs("#trip").innerHTML=`
    <div class="section-title"><h2>Full itinerary</h2><span class="small">Sep 14–27</span></div>
    <div class="filters">${cities.map((c,i)=>`<button class="chip ${i===0?"active":""}" data-city-filter="${c}">${c}</button>`).join("")}</div>
    <div id="tripCards">${trip.map((d,i)=>dayCard(d,i===0)).join("")}</div>`;
  qsa("[data-city-filter]").forEach(btn=>btn.addEventListener("click",()=>{
    qsa("[data-city-filter]").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    qsa("#tripCards .day-card").forEach(card=>card.classList.toggle("hidden",btn.dataset.cityFilter!=="All"&&card.dataset.city!==btn.dataset.cityFilter));
  }));
  bindDayCards();
}
function walletItemKey(groupName,item){
  return `${groupName}|${item.title}|${item.date}|${item.time}`.toLowerCase().replace(/[^a-z0-9|]+/g,"-");
}


function walletProviderUrl(groupName,item){
  const title=(item.title||"").toLowerCase();
  if(title.includes("aa ")||title.includes("american airlines")) return "https://www.aa.com/";
  if(title.includes("ba ")||title.includes("british airways")) return "https://www.britishairways.com/";
  if(title.includes("frecciarossa")||title.includes("trenitalia")) return "https://www.trenitalia.com/";
  if(title.includes("italo")) return "https://www.italotreno.com/";
  if(title.includes("snav")) return "https://www.snav.it/";
  return "";
}
function walletShareText(groupName,item){
  return [item.title,`${item.date} · ${item.time}`,item.details||item.note||""].filter(Boolean).join("\n");
}
function walletQuickActions(groupName,item){
  const provider=walletProviderUrl(groupName,item);
  const payload=encodeURIComponent(walletShareText(groupName,item));
  return `<div class="wallet-quick-actions" aria-label="Quick actions">
    ${item.map?`<a class="wallet-quick-action" href="${item.map}" target="_blank" rel="noopener"><span>📍</span><small>${item.mapLabel||"Maps"}</small></a>`:""}
    ${provider?`<a class="wallet-quick-action" href="${provider}" target="_blank" rel="noopener"><span>↗</span><small>Provider</small></a>`:""}
    <button class="wallet-quick-action" data-copy-reservation="${payload}"><span>⧉</span><small>Copy</small></button>
    <button class="wallet-quick-action" data-share-reservation="${payload}" data-share-title="${escapeHTML(item.title)}"><span>⇧</span><small>Share</small></button>
  </div>`;
}

async function renderWallet(){
  const allItems=wallet.flatMap(group=>group.items.map(item=>({...item,group:group.group,icon:group.icon})));
  const ready=allItems.filter(item=>item.status==="Ready").length;
  const pending=allItems.filter(item=>item.status!=="Ready").length;
  const statusClass=status=>status==="Ready"?"ready":status==="To book"?"warn":"needed";
  let imported=[];
  try{imported=await getImportedTickets()}catch(error){console.error("Ticket database unavailable",error)}
  const unassigned=imported.filter(item=>!item.linkedWalletKey);
  const linkedByKey={};
  imported.filter(item=>item.linkedWalletKey).forEach(item=>(linkedByKey[item.linkedWalletKey]||=[]).push(item));
  const categories=["All","Flight","Train","Hotel","Attraction","Ferry","Tour","Other"];
  const icons={Flight:"✈️",Train:"🚆",Hotel:"🏨",Attraction:"🎟️",Ferry:"🚤",Tour:"🍷",Other:"📄"};
  const groupCategory={Flights:"Flight",Trains:"Train",Hotels:"Hotel",Attractions:"Attraction",Ferries:"Ferry",Tours:"Tour"};

  qs("#wallet").innerHTML=`
    <div class="wallet-hero">
      <div>
        <div class="focus-label">PRIVATE TRAVEL WALLET</div>
        <h2>Wallet</h2>
        <p>Your locally saved tickets, vouchers and confirmations.</p>
      </div>
      <div class="wallet-ready-ring"><strong>${imported.length}</strong><span>saved</span></div>
    </div>

    <div class="wallet-actions-top">
      <button class="wallet-add-button" id="openTicketImporter"><span>＋</span><div><strong>Add unassigned ticket</strong><small>Or upload beneath a specific reservation</small></div></button>
    </div>

    <div class="wallet-summary polished">
      <div><strong>${ready}</strong><span>Booked</span></div>
      <div><strong>${imported.length}</strong><span>On this iPhone</span></div>
      <div><strong>${pending}</strong><span>Still needed</span></div>
    </div>

    <div class="wallet-privacy-note"><span>🔒</span><div><strong>Private attachments stay on this iPhone</strong><small>Files uploaded beneath a reservation remain tied to that card on this device.</small></div></div>

    <div class="wallet-tools">
      <label class="wallet-search"><span>⌕</span><input id="walletSearch" type="search" placeholder="Search tickets"></label>
      <div class="wallet-filter-row">${categories.map((c,i)=>`<button class="wallet-filter ${i===0?"active":""}" data-wallet-filter="${c}">${c}</button>`).join("")}</div>
    </div>

    <div id="walletContent">
      ${unassigned.length?`<section class="wallet-group imported-wallet-group" data-wallet-category="Imported">
        <div class="wallet-group-heading"><div><span class="wallet-group-icon">📱</span><div><h3>Unassigned files</h3><small>${unassigned.length} saved offline</small></div></div></div>
        ${unassigned.map(item=>`
          <article class="wallet-item wallet-document-card imported-ticket-card" data-wallet-item data-category="${escapeHTML(item.category)}" data-search="${escapeHTML((item.name+' '+item.category+' '+(item.notes||'')).toLowerCase())}">
            <div class="wallet-card-main">
              <div class="wallet-card-icon">${icons[item.category]||"📄"}</div>
              <div class="wallet-card-copy"><div class="wallet-title">${escapeHTML(item.name)}</div><div class="wallet-meta">${escapeHTML(item.date||"No date")}${item.time?` · ${escapeHTML(item.time)}`:""}</div></div>
              <span class="wallet-status ready">Offline</span>
            </div>
            ${item.notes?`<div class="wallet-note">${escapeHTML(item.notes)}</div>`:""}
            <div class="wallet-file-meta">${escapeHTML(item.fileName)} · ${formatFileSize(item.size)}</div>
            <div class="wallet-actions"><button class="primary wallet-file-button" data-open-imported="${item.id}">Open ticket</button><button class="secondary wallet-file-button danger-text" data-delete-imported="${item.id}">Delete</button></div>
          </article>`).join("")}
      </section>`:""}

      ${wallet.map(group=>`<section class="wallet-group" data-wallet-category="${groupCategory[group.group]||group.group}">
        <div class="wallet-group-heading"><div><span class="wallet-group-icon">${group.icon}</span><div><h3>${group.group}</h3><small>${group.items.filter(x=>x.status==="Ready").length} of ${group.items.length} ready</small></div></div></div>
        ${group.items.map(item=>`<article class="wallet-item wallet-document-card" data-wallet-item data-wallet-key="${walletItemKey(group.group,item)}" data-category="${groupCategory[group.group]||group.group}" data-search="${escapeHTML((item.title+' '+item.date+' '+item.time+' '+(item.details||'')+' '+(item.note||'')).toLowerCase())}">
          <div class="wallet-card-main">
            <div class="wallet-card-icon">${group.icon}</div>
            <div class="wallet-card-copy"><div class="wallet-title">${item.title}</div><div class="wallet-meta">${item.date} · ${item.time}</div></div>
            <span class="wallet-status ${statusClass(item.status)}">${item.status==="Ready"?"Ready":item.status}</span>
          </div>
          ${item.details?`<div class="wallet-details">${item.details}</div>`:""}
          ${item.note?`<div class="wallet-note">${item.note}</div>`:""}
          ${walletQuickActions(group.group,item)}
          <div class="wallet-private-attachment">
            <div class="wallet-private-head">
              <div><strong>Private file on this iPhone</strong><small>${(linkedByKey[walletItemKey(group.group,item)]||[]).length?`${(linkedByKey[walletItemKey(group.group,item)]||[]).length} attached`:"No private file attached"}</small></div>
              <button class="wallet-attach-button" data-attach-wallet="${walletItemKey(group.group,item)}" data-attach-title="${escapeHTML(item.title)}" data-attach-category="${groupCategory[group.group]||group.group}">${(linkedByKey[walletItemKey(group.group,item)]||[]).length?"Add another":"Upload file"}</button>
            </div>
            ${(linkedByKey[walletItemKey(group.group,item)]||[]).map(file=>`<div class="wallet-local-file"><div class="wallet-local-file-copy"><strong>${escapeHTML(file.fileName)}</strong><small>${formatFileSize(file.size)} · Saved offline</small></div><div class="wallet-local-file-actions"><button class="secondary" data-open-imported="${file.id}">Open</button><button class="secondary danger-text" data-delete-imported="${file.id}">Delete</button></div></div>`).join("")}
          </div>
        </article>`).join("")}
      </section>`).join("")}
      <div class="wallet-empty hidden" id="walletEmpty">No tickets match this search.</div>
    </div>

    <input id="directTicketFile" class="hidden" type="file" accept="application/pdf,image/*">

    <div class="ticket-import-overlay hidden" id="ticketImportOverlay">
      <div class="ticket-import-sheet" role="dialog" aria-modal="true" aria-labelledby="ticketImportTitle">
        <div class="ticket-import-head"><div><div class="focus-label">PRIVATE OFFLINE WALLET</div><h2 id="ticketImportTitle">Add ticket</h2></div><button class="ticket-close" id="closeTicketImporter" aria-label="Close">×</button></div>
        <label class="ticket-field"><span>PDF or image</span><input id="ticketFile" type="file" accept="application/pdf,image/*"></label>
        <label class="ticket-field"><span>Category</span><select id="ticketCategory">${categories.slice(1).map(c=>`<option value="${c}">${c}</option>`).join("")}</select></label>
        <label class="ticket-field"><span>Ticket name</span><input id="ticketName" placeholder="Vatican Museums"></label>
        <div class="ticket-field-grid"><label class="ticket-field"><span>Date</span><input id="ticketDate" type="date"></label><label class="ticket-field"><span>Time</span><input id="ticketTime" type="time"></label></div>
        <label class="ticket-field"><span>Notes (optional)</span><textarea id="ticketNotes" placeholder="Confirmation number, entrance, seat, meeting point..."></textarea></label>
        <div class="ticket-import-message" id="ticketImportMessage" aria-live="polite"></div>
        <button class="primary ticket-save" id="saveImportedTicket">Save ticket offline</button>
      </div>
    </div>`;

  let activeFilter="All";
  const applyWalletFilters=()=>{
    const query=(qs("#walletSearch").value||"").trim().toLowerCase();
    let visible=0;
    qsa("[data-wallet-item]").forEach(card=>{
      const category=card.dataset.category;
      const matchFilter=activeFilter==="All"||category===activeFilter;
      const matchSearch=!query||card.dataset.search.includes(query);
      card.classList.toggle("hidden",!(matchFilter&&matchSearch));
      if(matchFilter&&matchSearch)visible++;
    });
    qsa("#walletContent .wallet-group").forEach(group=>{
      const cards=[...group.querySelectorAll("[data-wallet-item]")];
      group.classList.toggle("hidden",cards.length>0&&!cards.some(card=>!card.classList.contains("hidden")));
    });
    qs("#walletEmpty").classList.toggle("hidden",visible!==0);
  };
  qs("#walletSearch").addEventListener("input",applyWalletFilters);
  qsa("[data-wallet-filter]").forEach(button=>button.addEventListener("click",()=>{
    qsa("[data-wallet-filter]").forEach(x=>x.classList.remove("active"));
    button.classList.add("active");activeFilter=button.dataset.walletFilter;applyWalletFilters();
  }));

  qsa("[data-copy-reservation]").forEach(button=>button.addEventListener("click",async()=>{
    const text=decodeURIComponent(button.dataset.copyReservation);
    try{
      await navigator.clipboard.writeText(text);
      const label=button.querySelector("small"),original=label.textContent;
      label.textContent="Copied";
      setTimeout(()=>label.textContent=original,1400);
    }catch(error){
      const area=document.createElement("textarea");area.value=text;document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
    }
  }));
  qsa("[data-share-reservation]").forEach(button=>button.addEventListener("click",async()=>{
    const text=decodeURIComponent(button.dataset.shareReservation);
    const title=button.dataset.shareTitle||"Trip reservation";
    if(navigator.share){
      try{await navigator.share({title,text});}catch(error){if(error.name!=="AbortError")console.error(error)}
    }else{
      try{await navigator.clipboard.writeText(text);alert("Reservation details copied.")}catch(error){alert(text)}
    }
  }));

  const directInput=qs("#directTicketFile");
  let pendingAttachment=null;
  qsa("[data-attach-wallet]").forEach(button=>button.addEventListener("click",()=>{
    pendingAttachment={key:button.dataset.attachWallet,title:button.dataset.attachTitle,category:button.dataset.attachCategory};
    directInput.value="";
    directInput.click();
  }));
  directInput.addEventListener("change",async event=>{
    const file=event.target.files[0];
    if(!file||!pendingAttachment)return;
    if(file.size>40*1024*1024){alert("This file is larger than 40 MB. Choose a smaller copy.");return}
    try{
      await saveImportedTicket({name:pendingAttachment.title,category:pendingAttachment.category,date:"",time:"",notes:"",linkedWalletKey:pendingAttachment.key,fileName:file.name,type:file.type||"application/octet-stream",size:file.size,blob:file,createdAt:Date.now()});
      await renderWallet();
    }catch(error){console.error(error);alert("The file could not be saved. Check available storage and try again.")}
  });

  const overlay=qs("#ticketImportOverlay");
  qs("#openTicketImporter").addEventListener("click",()=>overlay.classList.remove("hidden"));
  qs("#closeTicketImporter").addEventListener("click",()=>overlay.classList.add("hidden"));
  overlay.addEventListener("click",event=>{if(event.target===overlay)overlay.classList.add("hidden")});
  qs("#ticketFile").addEventListener("change",event=>{
    const file=event.target.files[0];
    if(file&&!qs("#ticketName").value)qs("#ticketName").value=file.name.replace(/\.[^.]+$/," ").replace(/[-_]+/g," ").trim();
  });
  qs("#saveImportedTicket").addEventListener("click",async()=>{
    const file=qs("#ticketFile").files[0],name=qs("#ticketName").value.trim(),message=qs("#ticketImportMessage"),button=qs("#saveImportedTicket");
    if(!file){message.textContent="Choose a PDF or image first.";return}
    if(!name){message.textContent="Enter a name for the ticket.";return}
    if(file.size>40*1024*1024){message.textContent="This file is larger than 40 MB. Choose a smaller copy.";return}
    button.disabled=true;button.textContent="Saving…";message.textContent="";
    try{
      await saveImportedTicket({name,category:qs("#ticketCategory").value,date:qs("#ticketDate").value,time:qs("#ticketTime").value,notes:qs("#ticketNotes").value.trim(),fileName:file.name,type:file.type||"application/octet-stream",size:file.size,blob:file,createdAt:Date.now()});
      await renderWallet();
    }catch(error){console.error(error);button.disabled=false;button.textContent="Save ticket offline";message.textContent="The ticket could not be saved. Check available storage and try again."}
  });
  qsa("[data-open-imported]").forEach(button=>button.addEventListener("click",async()=>{
    const popup=window.open("","_blank");
    try{
      const ticket=await getImportedTicket(button.dataset.openImported);
      if(!ticket||!ticket.blob)throw new Error("Ticket not found");
      const url=URL.createObjectURL(ticket.blob);
      if(popup)popup.location=url;else window.location.href=url;
      setTimeout(()=>URL.revokeObjectURL(url),120000);
    }catch(error){if(popup)popup.close();alert("This ticket could not be opened.")}
  }));
  qsa("[data-delete-imported]").forEach(button=>button.addEventListener("click",async()=>{
    if(!confirm("Delete this ticket from this device?"))return;
    await deleteImportedTicket(button.dataset.deleteImported);
    await renderWallet();
  }));
  if(pendingWalletTarget)requestAnimationFrame(()=>focusWalletCard(pendingWalletTarget));
}
function escapeHTML(value){return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));}
function formatFileSize(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`;}

function guideLoad(key,fallback=[]){
  try{return JSON.parse(localStorage.getItem(P+key)||JSON.stringify(fallback))}catch{return fallback}
}
function guideSave(key,value){try{localStorage.setItem(P+key,JSON.stringify(value))}catch{}}
function guideUid(){return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function guideMapsUrl(place){
  if(place.maps)return place.maps;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([place.name,place.city].filter(Boolean).join(', '))}`;
}
function normalizeWebUrl(value){
  const v=(value||'').trim();
  if(!v)return '';
  return /^https?:\/\//i.test(v)?v:`https://${v}`;
}


const GUIDE_PLACE_COORDS={"Venice|Ai Artisti":{"lat":45.4311,"lng":12.3246},"Venice|Al Mercà":{"lat":45.438,"lng":12.3359},"Venice|Alla Madonna":{"lat":45.438,"lng":12.3347},"Venice|Antiche Carampane":{"lat":45.438,"lng":12.3308},"Venice|Bancogiro":{"lat":45.4385,"lng":12.3359},"Venice|Cantina Do Spade":{"lat":45.4382,"lng":12.334},"Venice|CoVino":{"lat":45.4347,"lng":12.35},"Venice|Dal Moro’s Fresh Pasta To Go":{"lat":45.436,"lng":12.3404},"Venice|Gelatoteca Gallonetto":{"lat":45.4358,"lng":12.343},"Venice|I Tre Mercanti":{"lat":45.4361,"lng":12.3405},"Venice|La Zucca":{"lat":45.4406,"lng":12.3261},"Venice|Marchini Time":{"lat":45.4361,"lng":12.3352},"Venice|Osteria al Portego":{"lat":45.4376,"lng":12.3423},"Venice|Osteria alle Testiere":{"lat":45.4353,"lng":12.3437},"Venice|Rosa Salva":{"lat":45.4356,"lng":12.3376},"Venice|Suso Gelatoteca":{"lat":45.4376,"lng":12.3368},"Venice|Vini da Gigio":{"lat":45.443,"lng":12.3318},"Florence|All’Antico Vinaio":{"lat":43.7688,"lng":11.2585},"Florence|Babae":{"lat":43.7682,"lng":11.2463},"Florence|Buca Lapi":{"lat":43.7727,"lng":11.2506},"Florence|Caffè Gilli":{"lat":43.7719,"lng":11.2544},"Florence|Caffè Libertà":{"lat":43.7841,"lng":11.2654},"Florence|Cantina de’ Pucci":{"lat":43.7737,"lng":11.2559},"Florence|Ditta Artigianale":{"lat":43.7687,"lng":11.2588},"Florence|Enoteca Pitti Gola e Cantina":{"lat":43.7654,"lng":11.2502},"Florence|Gelateria dei Neri":{"lat":43.7688,"lng":11.2595},"Florence|Gustarium":{"lat":43.7707,"lng":11.2587},"Florence|I Fratellini":{"lat":43.7714,"lng":11.2564},"Florence|Il Latini":{"lat":43.7724,"lng":11.2487},"Florence|Il Santo Bevitore":{"lat":43.768,"lng":11.2465},"Florence|La Buchetta":{"lat":43.7676,"lng":11.2617},"Florence|La Giostra":{"lat":43.7714,"lng":11.2633},"Florence|Melaleuca":{"lat":43.7696,"lng":11.265},"Florence|Mercato Centrale":{"lat":43.7767,"lng":11.2535},"Florence|Osteria Belle Donne":{"lat":43.773,"lng":11.2499},"Florence|Osteria Pastella":{"lat":43.775,"lng":11.2491},"Florence|Osteria del Cinghiale Bianco":{"lat":43.7682,"lng":11.2495},"Florence|Osteria dell’Enoteca":{"lat":43.767,"lng":11.246},"Florence|Perché No!":{"lat":43.7717,"lng":11.2554},"Florence|Pino’s Sandwiches":{"lat":43.7705,"lng":11.2632},"Florence|Scudieri":{"lat":43.7732,"lng":11.2558},"Florence|Sergio Gozzi":{"lat":43.7757,"lng":11.2533},"Florence|Trattoria Mario":{"lat":43.7767,"lng":11.2531},"Florence|Trattoria ZaZa":{"lat":43.7768,"lng":11.2539},"Florence|Vivoli":{"lat":43.7701,"lng":11.2618},"Rome|Ai Tre Scalini":{"lat":41.8943,"lng":12.4924},"Rome|Armando al Pantheon":{"lat":41.899,"lng":12.4762},"Rome|Aroma":{"lat":41.8898,"lng":12.4965},"Rome|Barnum Café":{"lat":41.8958,"lng":12.4737},"Rome|Come il Latte":{"lat":41.9067,"lng":12.4941},"Rome|Da Enzo al 29":{"lat":41.8884,"lng":12.4755},"Rome|Emma Pizzeria":{"lat":41.8942,"lng":12.475},"Rome|Enoteca Costantini":{"lat":41.9101,"lng":12.4601},"Rome|Fatamorgana":{"lat":41.8958,"lng":12.4916},"Rome|Forno Campo de’ Fiori":{"lat":41.8955,"lng":12.4723},"Rome|Frigidarium":{"lat":41.8984,"lng":12.4711},"Rome|Gelateria del Teatro":{"lat":41.899,"lng":12.4701},"Rome|Giolitti":{"lat":41.9006,"lng":12.4768},"Rome|Grezzo Raw Chocolate":{"lat":41.8957,"lng":12.4927},"Rome|Hostaria Romana":{"lat":41.9033,"lng":12.489},"Rome|Il Goccetto":{"lat":41.8951,"lng":12.4693},"Rome|Il Segreto":{"lat":41.9077,"lng":12.4605},"Rome|La Taverna dei Fori Imperiali":{"lat":41.8932,"lng":12.4901},"Rome|La Zanzara":{"lat":41.9068,"lng":12.4645},"Rome|Maccarone":{"lat":41.8995,"lng":12.4792},"Rome|Old Bridge Gelateria":{"lat":41.9067,"lng":12.4536},"Rome|Otello":{"lat":41.8892,"lng":12.4695},"Rome|Panino Divino":{"lat":41.9069,"lng":12.4578},"Rome|Pastasciutta Vaticano":{"lat":41.9064,"lng":12.4538},"Rome|Pergamino Caffè":{"lat":41.9078,"lng":12.4571},"Rome|Pierluigi":{"lat":41.8955,"lng":12.4707},"Rome|Pipero Roma":{"lat":41.8951,"lng":12.4727},"Rome|Roscioli":{"lat":41.8957,"lng":12.4721},"Rome|Roscioli Forno":{"lat":41.8957,"lng":12.4725},"Rome|Roscioli Salumeria con Cucina":{"lat":41.8943,"lng":12.474},"Rome|Salotto 42":{"lat":41.9008,"lng":12.4796},"Rome|Sant’Eustachio":{"lat":41.8975,"lng":12.4746},"Rome|Sant’Eustachio Il Caffè":{"lat":41.8985,"lng":12.4755},"Rome|Sciascia Caffè 1919":{"lat":41.9088,"lng":12.4625},"Rome|Supplizio":{"lat":41.8956,"lng":12.469},"Rome|Tazza d’Oro":{"lat":41.899,"lng":12.4773},"Rome|Tonnarello":{"lat":41.8891,"lng":12.4704},"Rome|Trapizzino":{"lat":41.8818,"lng":12.4714},"Rome|Trieste Pizza":{"lat":41.8937,"lng":12.493},"Rome|Urbana 47":{"lat":41.8959,"lng":12.4915},"Naples|50 Kalò":{"lat":40.8275,"lng":14.2194},"Naples|Antica Pizza Fritta da Zia Esterina":{"lat":40.8362,"lng":14.2484},"Naples|Casa Infante":{"lat":40.84,"lng":14.2488},"Naples|Concettina ai Tre Santi":{"lat":40.8591,"lng":14.2515},"Naples|Cuoppo Friggitori Napoletani":{"lat":40.8507,"lng":14.2587},"Naples|Gay-Odin":{"lat":40.8418,"lng":14.2482},"Naples|Gino e Toto Sorbillo":{"lat":40.8515,"lng":14.256},"Naples|Gran Caffè Gambrinus":{"lat":40.8358,"lng":14.2487},"Naples|La Locanda Gesù Vecchio":{"lat":40.8472,"lng":14.2525},"Naples|L’Antica Pizzeria da Michele":{"lat":40.8501,"lng":14.2633},"Naples|Mexico Caffè":{"lat":40.8525,"lng":14.2713},"Naples|Mimì alla Ferrovia":{"lat":40.8549,"lng":14.2709},"Naples|Pintauro":{"lat":40.8387,"lng":14.2485},"Naples|Sfogliatella Mary":{"lat":40.8378,"lng":14.249},"Naples|Starita a Materdei":{"lat":40.8553,"lng":14.2477},"Naples|Tandem Ragù":{"lat":40.8486,"lng":14.2555},"Naples|Trattoria da Nennella":{"lat":40.842,"lng":14.2482},"Capri|Bar Grotta Azzurra":{"lat":40.5564,"lng":14.242},"Capri|Da Paolino":{"lat":40.5575,"lng":14.2385},"Capri|Lemon Granita":{"lat":40.5502,"lng":14.242},"Capri|Pulalli":{"lat":40.55,"lng":14.2425},"Capri|Ristorante Verginiello":{"lat":40.5507,"lng":14.242},"Venice|Osteria alla Staffa":{"lat":45.4372,"lng":12.3448},"Venice|Rosticceria Gislon":{"lat":45.4376,"lng":12.3408},"Venice|Magna Bevi Tasi":{"lat":45.4348,"lng":12.3411},"Venice|Pasticceria Bonifacio":{"lat":45.4352,"lng":12.3421},"Venice|Caffè del Doge":{"lat":45.438,"lng":12.3345},"Venice|Pasticceria Rizzardini":{"lat":45.4367,"lng":12.3318},"Venice|Bar All’Arco":{"lat":45.4382,"lng":12.334},"Venice|Vino Vero":{"lat":45.4459,"lng":12.3317},"Venice|Al Timon":{"lat":45.4455,"lng":12.3301},"Venice|Osteria al Cicheto":{"lat":45.4428,"lng":12.3244},"Venice|Osteria Ai Promessi Sposi":{"lat":45.4437,"lng":12.3303},"Venice|Pasticceria Tonolo":{"lat":45.436,"lng":12.3225},"Venice|Cantine del Vino già Schiavi":{"lat":45.4318,"lng":12.3267},"Venice|Bacareto da Lele":{"lat":45.4378,"lng":12.3216},"Florence|Trattoria da Rocco":{"lat":43.7704,"lng":11.266},"Florence|I’ Girone De’ Ghiotti":{"lat":43.7695,"lng":11.2564},"Florence|Procacci":{"lat":43.7713,"lng":11.2518},"Florence|Vini e Vecchi Sapori":{"lat":43.7693,"lng":11.2576},"Florence|Trattoria del Fagioli":{"lat":43.7681,"lng":11.2634},"Florence|Trattoria dell’Agnolino":{"lat":43.768,"lng":11.2631},"Florence|Pasticceria Nencioni":{"lat":43.7697,"lng":11.2655},"Florence|SandwiChic":{"lat":43.7763,"lng":11.2578},"Florence|Sergio Pollini Lampredotto":{"lat":43.7701,"lng":11.267},"Florence|Gelateria della Passera":{"lat":43.767,"lng":11.2485},"Florence|Gelateria La Carraia":{"lat":43.7686,"lng":11.2434},"Florence|Le Volpi e l’Uva":{"lat":43.7667,"lng":11.2521},"Florence|Osteria Santo Spirito":{"lat":43.7665,"lng":11.2484},"Florence|La Casalinga":{"lat":43.766,"lng":11.2474},"Florence|Il Santino":{"lat":43.768,"lng":11.2464},"Florence|Forno Ghibellina":{"lat":43.7697,"lng":11.265},"Florence|Da Nerbone":{"lat":43.7764,"lng":11.2534},"Florence|Schiacciateria De’ Neri":{"lat":43.7685,"lng":11.26},"Florence|Trattoria Sabatino":{"lat":43.7706,"lng":11.239},"Florence|Pasticceria Buonamici":{"lat":43.7664,"lng":11.2477},"Florence|Pandemonio di Casa Brogi":{"lat":43.769,"lng":11.2387},"Florence|Antica Bottega Wine Tasting":{"lat":43.771,"lng":11.254},"Rome|Cesare al Pellegrino":{"lat":41.8972,"lng":12.4685},"Rome|Hosteria Grappolo d’Oro":{"lat":41.8957,"lng":12.4725},"Rome|Antico Forno Roscioli":{"lat":41.895,"lng":12.4744},"Rome|La Casa del Caffè Tazza d’Oro":{"lat":41.8993,"lng":12.4766},"Rome|Two Sizes":{"lat":41.8988,"lng":12.471},"Rome|Regoli Pasticceria":{"lat":41.8966,"lng":12.5015},"Rome|SantoPalato":{"lat":41.8777,"lng":12.5058},"Rome|La Barrique":{"lat":41.8948,"lng":12.4917},"Rome|Drink Kong":{"lat":41.8959,"lng":12.4992},"Rome|Romanè":{"lat":41.9071,"lng":12.4464},"Rome|Pizzarium Bonci":{"lat":41.9072,"lng":12.4454},"Rome|Gelateria dei Gracchi":{"lat":41.908,"lng":12.4645},"Rome|L’Elementare":{"lat":41.8907,"lng":12.47},"Rome|Otaleg":{"lat":41.8875,"lng":12.469},"Rome|Boccione":{"lat":41.8923,"lng":12.4778},"Rome|Casa Manco":{"lat":41.8776,"lng":12.4756},"Rome|Mordi & Vai":{"lat":41.8774,"lng":12.4752},"Rome|Felice a Testaccio":{"lat":41.8778,"lng":12.4765},"Rome|Flavio al Velavevodetto":{"lat":41.8759,"lng":12.4742},"Rome|Osteria del Sostegno":{"lat":41.9001,"lng":12.4771},"Naples|Pizzeria Di Matteo":{"lat":40.8513,"lng":14.2571},"Capri|Salumeria Da Aldo — Cuccurullo Aldo":{"lat":40.5568,"lng":14.242},"Capri|Verginiello":{"lat":40.5503,"lng":14.2426},"Capri|Buonocore Gelateria":{"lat":40.5506,"lng":14.2428},"Naples|Starita":{"lat":40.8557,"lng":14.2481},"Naples|Caffè Mexico":{"lat":40.8528,"lng":14.2686},"Naples|Sfogliatelle Attanasio":{"lat":40.8538,"lng":14.2678},"Naples|La Masardona":{"lat":40.8509,"lng":14.273},"Naples|Pasticceria Poppella":{"lat":40.8608,"lng":14.2523}};
const GUIDE_LOCATION_ANCHORS={
  hotels:{
    Venice:{lat:45.4349,lng:12.3404,label:'Rio Hotel'},
    Florence:{lat:43.7732,lng:11.2556,label:'B&B A Florence View'},
    Rome:{lat:41.8956,lng:12.4770,label:'Temple View GuestHouse'},
    Naples:{lat:40.8422,lng:14.2532,label:'Napolinn B&B'},
    Capri:{lat:40.5565,lng:14.2422,label:'Marina Grande'}
  },
  plan:{
    Venice:{lat:45.4342,lng:12.3388,label:'St. Mark’s and central Venice'},
    Florence:{lat:43.7731,lng:11.2560,label:'Duomo and central Florence'},
    Rome:{lat:41.8986,lng:12.4769,label:'Pantheon and historic center'},
    Naples:{lat:40.8493,lng:14.2573,label:'Spaccanapoli and historic center'},
    Capri:{lat:40.5503,lng:14.2422,label:'Capri Town and the Piazzetta'}
  }
};

const GUIDE_DAY_ANCHORS={
  '2026-09-15':{city:'Venice',lat:45.4342,lng:12.3388,label:'September 15 · St. Mark’s arrival route'},
  '2026-09-16':{city:'Venice',lat:45.4378,lng:12.3365,label:'September 16 · Rialto and central Venice'},
  '2026-09-17':{city:'Florence',lat:43.7731,lng:11.2560,label:'September 17 · Duomo arrival route'},
  '2026-09-18':{city:'Florence',lat:43.7714,lng:11.2590,label:'September 18 · museum-day center'},
  '2026-09-19':{city:'Florence',lat:43.7728,lng:11.2540,label:'September 19 · pre-tour Florence center'},
  '2026-09-20':{city:'Rome',lat:41.8986,lng:12.4769,label:'September 20 · Pantheon and Piazza Navona'},
  '2026-09-21':{city:'Rome',lat:41.8902,lng:12.4922,label:'September 21 · Colosseum and Monti'},
  '2026-09-22':{city:'Rome',lat:41.9065,lng:12.4536,label:'September 22 · Vatican Museums'},
  '2026-09-23':{city:'Rome',lat:41.9059,lng:12.4823,label:'September 23 · Spanish Steps route'},
  '2026-09-24':{city:'Naples',lat:40.8493,lng:14.2573,label:'September 24 · historic Naples'},
  '2026-09-25':{city:'Capri',lat:40.5503,lng:14.2422,label:'September 25 · Capri Town'},
  '2026-09-26':{city:'Naples',lat:40.8422,lng:14.2532,label:'September 26 · return to Naples'}
};
function guidePlanOrigin(city){
  const exact=GUIDE_DAY_ANCHORS[todayISO()];
  return exact&&exact.city===city?{...exact}:{...GUIDE_LOCATION_ANCHORS.plan[city]};
}
function guideAreaEstimate(place){
  const city=place?.city||'',text=`${place?.mealWindow||''} ${place?.notes||''}`.toLowerCase();
  const areas={
    Florence:[
      [/smn|santa maria novella/,{lat:43.7763,lng:11.2480}],
      [/sant.?ambrogio/,{lat:43.7714,lng:11.2680}],
      [/santo spirito|oltrarno/,{lat:43.7678,lng:11.2480}]
    ],
    Rome:[
      [/cipro|vatican|prati|piazza cavour/,{lat:41.9075,lng:12.4580}],
      [/trastevere|porta portese|portuense/,{lat:41.8838,lng:12.4692}],
      [/testaccio|ostiense/,{lat:41.8757,lng:12.4781}],
      [/termini|esquilino/,{lat:41.8975,lng:12.5010}],
      [/piazza del popolo/,{lat:41.9107,lng:12.4764}],
      [/campo de.? fiori|pantheon|navona|ghetto/,{lat:41.8969,lng:12.4752}],
      [/monteverde|casaletto/,{lat:41.8727,lng:12.4391}],
      [/centocelle/,{lat:41.8785,lng:12.5660}]
    ],
    Naples:[
      [/centrale|garibaldi/,{lat:40.8528,lng:14.2690}],
      [/sanit[aà]/,{lat:40.8600,lng:14.2530}],
      [/vomero/,{lat:40.8424,lng:14.2320}],
      [/mergellina|chiaia/,{lat:40.8285,lng:14.2220}],
      [/pignasecca|toledo/,{lat:40.8446,lng:14.2470}],
      [/municipio|quartieri spagnoli/,{lat:40.8395,lng:14.2495}],
      [/centro storico|tribunali|spaccanapoli|san gregorio/,{lat:40.8508,lng:14.2570}]
    ],
    Capri:[
      [/marina grande/,{lat:40.5564,lng:14.2422}],
      [/anacapri/,{lat:40.5550,lng:14.2191}],
      [/capri town|piazzetta/,{lat:40.5508,lng:14.2426}]
    ]
  };
  const explicit={
    'rome-0920-dinner-cesare-pellegrino':{lat:41.8727,lng:12.4391},
    'rome-0921-pizza-180g':{lat:41.8785,lng:12.5660},
    'rome-0922-pizza-seu':{lat:41.8740,lng:12.4700},
    'florence-any-sostanza':{lat:43.7728,lng:11.2477}
  };
  const match=explicit[place?.id]||(areas[city]||[]).find(([pattern])=>pattern.test(text))?.[1]||GUIDE_LOCATION_ANCHORS.hotels[city]||null;
  return match?{...match,approximate:true}:null;
}
function guideCoordinates(place){
  const lat=Number(place?.lat),lng=Number(place?.lng);
  if(Number.isFinite(lat)&&Number.isFinite(lng))return {lat,lng,approximate:false};
  const url=String(place?.maps||'');
  const patterns=[/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,/query=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/i,/q=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/i];
  for(const pattern of patterns){const match=url.match(pattern);if(match)return {lat:Number(match[1]),lng:Number(match[2]),approximate:false}}
  const saved=GUIDE_PLACE_COORDS[`${place?.city||''}|${place?.name||''}`];
  return saved?{...saved,approximate:false}:guideAreaEstimate(place);
}
function guideDistanceKm(a,b){
  const toRad=value=>value*Math.PI/180,R=6371;
  const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng),lat1=toRad(a.lat),lat2=toRad(b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function guideDistanceLabel(km){
  const walkingKm=km*1.22,minutes=Math.max(1,Math.round(walkingKm/.078));
  if(km<.08)return `About ${Math.max(25,Math.round(km*1000/25)*25)} m away · ~${minutes} min walk`;
  if(km<2.5)return `${Math.round(km*1000)} m away · ~${minutes} min walk`;
  return `${km.toFixed(1)} km away`;
}
function guideDirectionsUrl(place,origin){
  const destination=[place.name,place.city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${encodeURIComponent(destination)}&travelmode=walking`;
}
function nearestGuideCity(origin){
  return Object.entries(GUIDE_LOCATION_ANCHORS.hotels).map(([city,point])=>({city,distance:guideDistanceKm(origin,point)})).sort((a,b)=>a.distance-b.distance)[0]?.city||'Venice';
}

function parseGoogleMapsShare(value){
  const raw=(value||'').trim();
  if(!raw)return null;
  let candidate=raw;
  const urlMatch=raw.match(/https?:\/\/[^\s]+/i);
  if(urlMatch)candidate=urlMatch[0].replace(/[),.;]+$/,'');
  let url;
  try{url=new URL(candidate)}catch(error){return {maps:candidate,name:'',city:'',needsDetails:true}}
  const host=url.hostname.toLowerCase();
  const isGoogle=host.includes('google.')||host==='maps.app.goo.gl'||host==='goo.gl';
  if(!isGoogle)return {maps:candidate,name:'',city:'',needsDetails:true};

  let name='';
  const params=['query','q','destination','daddr'];
  for(const key of params){
    const found=url.searchParams.get(key);
    if(found&&!/^[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?$/.test(found)){name=found;break}
  }
  if(!name){
    const match=decodeURIComponent(url.pathname).match(/\/place\/([^/]+)/i);
    if(match)name=match[1];
  }
  name=(name||'').replace(/\+/g,' ').replace(/%20/gi,' ').replace(/\s+/g,' ').trim();
  if(name.includes(','))name=name.split(',')[0].trim();

  const haystack=decodeURIComponent(`${url.pathname} ${url.search}`).toLowerCase();
  const cityMap=[['Venice',['venice','venezia']],['Florence',['florence','firenze']],['Rome',['rome','roma']],['Naples',['naples','napoli']],['Capri',['capri']]];
  const city=(cityMap.find(([,aliases])=>aliases.some(alias=>haystack.includes(alias)))||[])[0]||'';
  const shortLink=host==='maps.app.goo.gl'||host==='goo.gl';
  return {maps:candidate,name,city,needsDetails:shortLink||!name};
}


const VENICE_FOOD_GUIDE=[{"id":"venice-0915-dinner-testiere","name":"Osteria alle Testiere","city":"Venice","category":"Dinner","plannedDay":"2026-09-15","rank":1,"topPick":true,"favorite":true,"official":true,"rating":5,"price":"€€€€","mealWindow":"Special Dinner · Castello near Rio Hotel","notes":"Tiny, highly regarded seafood restaurant · Special dinner pick","reservation":"Strongly recommended","dishes":["Fresh fish of the day","Seafood appetizers","Venetian seafood pasta","Seasonal specials","House desserts"],"maps":"https://www.google.com/maps/search/?api=1&query=Osteria+alle+Testiere+Venice"},{"id":"venice-0915-lunch-staffa","name":"Osteria alla Staffa","city":"Venice","category":"Lunch","plannedDay":"2026-09-15","rank":1,"topPick":true,"price":"€€","mealWindow":"Arrival Lunch / Relaxed Dinner · Castello","notes":"Strong moderately priced alternative near the hotel","dishes":["Fresh pasta","Venetian dishes","Seafood","Daily specials"],"maps":"https://www.google.com/maps/search/?api=1&query=Osteria+alla+Staffa+Venice"},{"id":"venice-0915-bite-gislon","name":"Rosticceria Gislon","city":"Venice","category":"Small Bite","plannedDay":"2026-09-15","rank":1,"topPick":true,"favorite":true,"price":"€","mealWindow":"Quick / Casual · San Marco–Rialto corridor","notes":"Venetian snack pick · Don’t miss the mozzarella in carrozza","dishes":["Mozzarella in Carrozza","Anchovy version","Ham version"],"maps":"https://www.google.com/maps/search/?api=1&query=Rosticceria+Gislon+Venice"},{"id":"venice-0915-bite-dal-moros","name":"Dal Moro’s Fresh Pasta To Go","city":"Venice","category":"Small Bite","plannedDay":"2026-09-15","rank":2,"price":"€","mealWindow":"Quick Arrival Backup · Near Rio Hotel","notes":"Convenient fast backup rather than an Official Pick","dishes":["Cacio e Pepe","Pesto"],"maps":"https://www.google.com/maps/search/?api=1&query=Dal+Moro%27s+Fresh+Pasta+To+Go+Venice"},{"id":"venice-0915-dessert-mercanti","name":"I Tre Mercanti","city":"Venice","category":"Dessert","plannedDay":"2026-09-15","rank":1,"topPick":true,"favorite":true,"official":true,"rating":5,"price":"€","mealWindow":"Dessert · Near Rio Hotel","notes":"Classic tiramisu stop · Best if the line is reasonable","dishes":["Classic Tiramisu"],"maps":"https://www.google.com/maps/search/?api=1&query=I+Tre+Mercanti+Venice"},{"id":"venice-0915-gelato-suso","name":"Suso Gelatoteca","city":"Venice","category":"Gelato","plannedDay":"2026-09-15","rank":1,"topPick":true,"favorite":true,"official":true,"rating":5,"price":"€","mealWindow":"Gelato · San Marco / Rialto","notes":"Gelato Official Pick · Skip a very long queue","dishes":["Crema del Doge","Pistachio"],"maps":"https://www.google.com/maps/search/?api=1&query=Suso+Gelatoteca+Venice"},{"id":"venice-0915-bar-magna","name":"Magna Bevi Tasi","city":"Venice","category":"Bar","plannedDay":"2026-09-15","rank":1,"topPick":true,"price":"€","mealWindow":"Aperitivo · Next to Rio Hotel","notes":"Near-hotel pick for a pre-dinner spritz or final drink","dishes":["Spritz","Wine","Cicchetti","Coffee","Small snacks"],"maps":"https://www.google.com/maps/search/?api=1&query=Magna+Bevi+Tasi+Venice"},{"id":"venice-0915-breakfast-bonifacio","name":"Pasticceria Bonifacio","city":"Venice","category":"Breakfast","plannedDay":"2026-09-15","rank":1,"topPick":true,"price":"€","mealWindow":"Breakfast / Coffee · Castello near Rio Hotel","notes":"Convenient hotel-area pastry stop · Also useful on departure morning","dishes":["Cappuccino","Espresso","Cornetto","Fresh pastries"],"maps":"https://www.google.com/maps/search/?api=1&query=Pasticceria+Bonifacio+Venice"},{"id":"venice-0916-coffee-doge","name":"Caffè del Doge","city":"Venice","category":"Coffee","plannedDay":"2026-09-16","rank":1,"topPick":true,"price":"€","mealWindow":"Morning Coffee · Rialto","notes":"Coffee-focused stop rather than a pastry destination","dishes":["Espresso","Cappuccino","Specialty coffee"],"maps":"https://www.google.com/maps/search/?api=1&query=Caffe+del+Doge+Venice"},{"id":"venice-0916-breakfast-rizzardini","name":"Pasticceria Rizzardini","city":"Venice","category":"Breakfast","plannedDay":"2026-09-16","rank":1,"topPick":true,"price":"€","mealWindow":"Pastry + Coffee · San Polo","notes":"Historic Venetian pastry shop","dishes":["Cappuccino","Espresso","Traditional pastries","Venetian sweets"],"maps":"https://www.google.com/maps/search/?api=1&query=Pasticceria+Rizzardini+Venice"},{"id":"venice-0916-bite-all-arco","name":"Bar All’Arco","city":"Venice","category":"Small Bite","plannedDay":"2026-09-16","rank":1,"topPick":true,"favorite":true,"official":true,"rating":5,"price":"€","mealWindow":"Rialto Lunch Experience · MUST TRY","notes":"Cicchetti Official Pick · Primarily daytime · Start of the suggested Rialto food crawl","dishes":["Baccalà mantecato","Seafood cicchetti","Seasonal crostini","Wine","Prosecco"],"maps":"https://www.google.com/maps/search/?api=1&query=Bar+All%27Arco+Venice"},{"id":"venice-0916-bite-al-merca","name":"Al Mercà","city":"Venice","category":"Small Bite","plannedDay":"2026-09-16","rank":2,"favorite":true,"price":"€","mealWindow":"Rialto Food Crawl · Quick Bite","notes":"Follow All’Arco with a small sandwich or cicchetto; do not eat heavily at either stop","dishes":["Small filled sandwiches","Cured meats","Cheese","Polpette","Baccalà","Spritz","Wine"],"maps":"https://www.google.com/maps/search/?api=1&query=Al+Merca+Venice"},{"id":"venice-0916-lunch-carampane","name":"Antiche Carampane","city":"Venice","category":"Lunch","plannedDay":"2026-09-16","rank":1,"topPick":true,"price":"€€€","mealWindow":"Sit-Down Lunch Alternative · San Polo","notes":"Traditional Venetian pick if you prefer a proper restaurant instead of the cicchetti crawl","reservation":"Recommended","dishes":["Fresh fish","Octopus","Fried seafood","Seasonal dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=Antiche+Carampane+Venice"},{"id":"venice-0916-lunch-zucca","name":"La Zucca","city":"Venice","category":"Lunch","plannedDay":"2026-09-16","rank":2,"price":"€€","mealWindow":"Sit-Down Lunch Alternative · Santa Croce","notes":"Different / non-seafood-heavy pick","dishes":["Pumpkin flan","Seasonal vegetable dishes","Fresh pasta","Meat dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=La+Zucca+Venice"},{"id":"venice-0916-lunch-do-spade","name":"Cantina Do Spade","city":"Venice","category":"Lunch","plannedDay":"2026-09-16","rank":3,"price":"€€","mealWindow":"Rialto Sit-Down / Bacaro Backup","notes":"Intentional holdover · Useful if you want a proper meal instead of the crawl","dishes":["Mixed cicchetti","Seafood pasta","House wine"],"maps":"https://www.google.com/maps/search/?api=1&query=Cantina+Do+Spade+Venice"},{"id":"venice-0916-bar-vino-vero","name":"Vino Vero","city":"Venice","category":"Bar","plannedDay":"2026-09-16","rank":1,"topPick":true,"favorite":true,"official":true,"price":"€€","mealWindow":"Cannaregio Evening · First Stop","notes":"Natural-wine-focused bacaro · Start with wine and one cicchetto","dishes":["Natural wines","Wine by the glass","Cicchetti"],"maps":"https://www.google.com/maps/search/?api=1&query=Vino+Vero+Venice"},{"id":"venice-0916-bar-al-timon","name":"Al Timon","city":"Venice","category":"Bar","plannedDay":"2026-09-16","rank":2,"price":"€€","mealWindow":"Cannaregio Evening · Aperitivo","notes":"Lively canalside bacaro · Better as aperitivo than as the main dinner","dishes":["Spritz","Wine","Cicchetti"],"maps":"https://www.google.com/maps/search/?api=1&query=Al+Timon+Venice"},{"id":"venice-0916-dinner-al-cicheto","name":"Osteria al Cicheto","city":"Venice","category":"Dinner","plannedDay":"2026-09-16","rank":1,"topPick":true,"favorite":true,"official":true,"rating":5,"price":"€€","mealWindow":"Cannaregio Dinner · Main Stop","notes":"Family-run neighborhood osteria with strong wine and more variety than seafood-only menus","dishes":["Fresh pasta","Venetian specialties","Meat","Seafood","Wine pairings","Homemade desserts"],"maps":"https://www.google.com/maps/search/?api=1&query=Osteria+al+Cicheto+Venice"},{"id":"venice-0916-dinner-promessi","name":"Osteria Ai Promessi Sposi","city":"Venice","category":"Dinner","plannedDay":"2026-09-16","rank":2,"price":"€€","mealWindow":"Cannaregio Dinner Alternative","notes":"Relaxed, value-oriented alternative","dishes":["Bigoli","Risotto","Sarde in saor","Seafood pasta","Meat dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=Osteria+Ai+Promessi+Sposi+Venice"},{"id":"venice-0916-breakfast-tonolo","name":"Pasticceria Tonolo","city":"Venice","category":"Breakfast","plannedDay":"2026-09-16","rank":3,"price":"€","mealWindow":"Optional Dorsoduro Detour","notes":"Only if you naturally explore Dorsoduro · Do not cross Venice solely for it","dishes":["Traditional Venetian pastries","Cream pastries","Coffee","Seasonal sweets"],"maps":"https://www.google.com/maps/search/?api=1&query=Pasticceria+Tonolo+Venice"},{"id":"venice-0916-bar-schiavi","name":"Cantine del Vino già Schiavi","city":"Venice","category":"Bar","plannedDay":"2026-09-16","rank":3,"price":"€","mealWindow":"Optional Dorsoduro Bacaro","notes":"Only if you naturally explore Dorsoduro · Classic inexpensive cicchetti stop","dishes":["Cicchetti","Baccalà","Crostini","Wine by the glass"],"maps":"https://www.google.com/maps/search/?api=1&query=Cantine+del+Vino+gia+Schiavi+Venice"},{"id":"venice-0917-breakfast-bonifacio","name":"Pasticceria Bonifacio","city":"Venice","category":"Breakfast","plannedDay":"2026-09-17","rank":1,"topPick":true,"favorite":true,"price":"€","mealWindow":"Departure Breakfast · Near Rio Hotel","notes":"Recommended quick breakfast before the 9:26 AM Frecciarossa","dishes":["Cappuccino","Espresso","Cornetto","Fresh pastry"],"maps":"https://www.google.com/maps/search/?api=1&query=Pasticceria+Bonifacio+Venice"},{"id":"venice-0917-bite-da-lele","name":"Bacareto da Lele","city":"Venice","category":"Small Bite","plannedDay":"2026-09-17","rank":2,"price":"€","mealWindow":"Departure-Morning Backup · Santa Croce","notes":"Location-based backup toward the station area · Skip if timing does not naturally work","dishes":["Small sandwiches"],"maps":"https://www.google.com/maps/search/?api=1&query=Bacareto+da+Lele+Venice"}];
const FLORENCE_FOOD_GUIDE=[{"id":"florence-0917-lunch-mario","name":"Trattoria Mario","city":"Florence","category":"Lunch","plannedDay":"2026-09-17","rank":1,"topPick":true,"favorite":true,"official":true,"price":"€€","mealWindow":"Arrival Lunch · San Lorenzo / Mercato Centrale","notes":"Old-school Florentine trattoria · Excellent first proper meal after arriving from Venice · Primarily a lunch restaurant","dishes":["Bistecca alla Fiorentina","Ribollita","Tuscan pasta","Roast meats","Daily specials"],"maps":"https://www.google.com/maps/search/?api=1&query=Trattoria+Mario+Florence"},{"id":"florence-0917-lunch-rocco","name":"Trattoria da Rocco","city":"Florence","category":"Lunch","plannedDay":"2026-09-17","rank":2,"price":"€","mealWindow":"Market Lunch Alternative · Sant’Ambrogio","notes":"Very casual, inexpensive local-feeling market trattoria","dishes":["Ribollita","Pasta of the day","Tuscan home cooking","Daily specials"],"maps":"https://www.google.com/maps/search/?api=1&query=Trattoria+da+Rocco+Florence"},{"id":"florence-0917-bite-girone","name":"I’ Girone De’ Ghiotti","city":"Florence","category":"Small Bite","plannedDay":"2026-09-17","rank":1,"topPick":true,"favorite":true,"official":true,"rating":5,"price":"€","mealWindow":"Quick Lunch · Near Piazza della Signoria","notes":"Official Schiacciata Pick · One of Florence’s highest-priority quick-food stops","dishes":["Prosciutto","Finocchiona","Pecorino","Truffle spreads","Tuscan salumi"],"maps":"https://www.google.com/maps/search/?api=1&query=I+Girone+De+Ghiotti+Florence"},{"id":"florence-0917-bite-antico","name":"All’Antico Vinaio","city":"Florence","category":"Small Bite","plannedDay":"2026-09-17","rank":2,"price":"€","mealWindow":"Famous Schiacciata Experience · Via dei Neri","notes":"Tourist-famous ≠ tourist trap · Go for the sandwich, not because social media says you have to","dishes":["La Favolosa","Mortadella combinations","Pistachio creams","Pecorino","Tuscan salumi"],"maps":"https://www.google.com/maps/search/?api=1&query=All%27Antico+Vinaio+Florence"},{"id":"florence-0917-bar-procacci","name":"Procacci","city":"Florence","category":"Bar","plannedDay":"2026-09-17","rank":1,"topPick":true,"price":"€€","mealWindow":"Small Bite / Aperitivo · Via de’ Tornabuoni","notes":"Historic truffle-panino experience · Deliberately small 10–20 minute stop","dishes":["Truffle Panino","Glass of wine"],"maps":"https://www.google.com/maps/search/?api=1&query=Procacci+Florence"},{"id":"florence-0917-dinner-vini","name":"Vini e Vecchi Sapori","city":"Florence","category":"Dinner","plannedDay":"2026-09-17","rank":1,"topPick":true,"favorite":true,"official":true,"rating":5,"price":"€€","mealWindow":"First-Night Dinner · Near Piazza della Signoria","notes":"Traditional Tuscan Official Pick · One of the strongest restaurant recommendations in the guide","reservation":"Strongly recommended","dishes":["Pappardelle with duck ragù","Seasonal pasta","Ravioli","Trippa","Tuscan meat dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=Vini+e+Vecchi+Sapori+Florence"},{"id":"florence-0917-dinner-fagioli","name":"Trattoria del Fagioli","city":"Florence","category":"Dinner","plannedDay":"2026-09-17","rank":2,"price":"€€","mealWindow":"Traditional Alternative · Santa Croce","notes":"Classic Tuscan comfort food","dishes":["Ribollita","Pappa al pomodoro","Tuscan beans","Pasta","Meat dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=Trattoria+del+Fagioli+Florence"},{"id":"florence-0917-dinner-agnolino","name":"Trattoria dell’Agnolino","city":"Florence","category":"Dinner","plannedDay":"2026-09-17","rank":3,"price":"€€","mealWindow":"Tuscan Comfort-Food Alternative · Santa Croce","notes":"Particularly useful if you want to try coccoli","dishes":["Coccoli with prosciutto and stracchino","Ribollita","Pappa al pomodoro","Tuscan crostini","Pasta","Meat"],"maps":"https://www.google.com/maps/search/?api=1&query=Trattoria+dell%27Agnolino+Florence"},{"id":"florence-0917-dessert-vivoli","name":"Vivoli","city":"Florence","category":"Dessert","plannedDay":"2026-09-17","rank":1,"topPick":true,"price":"€","mealWindow":"Affogato · Santa Croce","notes":"Historic gelateria · Best used specifically for the affogato","dishes":["Affogato"],"maps":"https://www.google.com/maps/search/?api=1&query=Vivoli+Florence"},{"id":"florence-0917-gelato-perche","name":"Perché No!","city":"Florence","category":"Gelato","plannedDay":"2026-09-17","rank":1,"price":"€","mealWindow":"Central Gelato Alternative · Historic Center","notes":"Convenient around Signoria/Duomo and a good alternative to artificial-looking tourist gelato displays","maps":"https://www.google.com/maps/search/?api=1&query=Perche+No+Florence"},{"id":"florence-0918-breakfast-nencioni","name":"Pasticceria Nencioni","city":"Florence","category":"Breakfast","plannedDay":"2026-09-18","rank":1,"topPick":true,"price":"€","mealWindow":"Traditional Breakfast","notes":"Simple Italian breakfast rather than a large American-style meal","dishes":["Cappuccino","Espresso","Cornetto","Traditional Italian pastries"],"maps":"https://www.google.com/maps/search/?api=1&query=Pasticceria+Nencioni+Florence"},{"id":"florence-0918-coffee-ditta","name":"Ditta Artigianale","city":"Florence","category":"Coffee","plannedDay":"2026-09-18","rank":1,"topPick":true,"favorite":true,"official":true,"price":"€€","mealWindow":"Coffee Official Pick","notes":"Use when the coffee itself matters more than pastries","dishes":["Espresso","Cappuccino","Specialty coffee"],"maps":"https://www.google.com/maps/search/?api=1&query=Ditta+Artigianale+Florence"},{"id":"florence-0918-bite-sandwichic","name":"SandwiChic","city":"Florence","category":"Small Bite","plannedDay":"2026-09-18","rank":1,"topPick":true,"price":"€","mealWindow":"Accademia / San Marco Quick Food","notes":"Loaded Tuscan sandwiches without needing to return toward Via dei Neri","dishes":["Tuscan cured meats","Pecorino","Vegetables","House spreads"],"maps":"https://www.google.com/maps/search/?api=1&query=SandwiChic+Florence"},{"id":"florence-0918-bite-pollini","name":"Sergio Pollini Lampredotto","city":"Florence","category":"Small Bite","plannedDay":"2026-09-18","rank":2,"topPick":true,"favorite":true,"official":true,"price":"€","mealWindow":"Florentine Street Food · Sant’Ambrogio","notes":"Lampredotto Official Pick · Optional adventure, not something you have to eat just because it is famous","dishes":["Panino con Lampredotto","Salsa verde","Spicy sauce"],"maps":"https://www.google.com/maps/search/?api=1&query=Sergio+Pollini+Lampredotto+Florence"},{"id":"florence-0918-bite-fratellini","name":"I Fratellini","city":"Florence","category":"Small Bite","plannedDay":"2026-09-18","rank":3,"price":"€","mealWindow":"Small Panino · Historic Center","notes":"Old-school sandwich stop when you want something smaller than a giant schiacciata","maps":"https://www.google.com/maps/search/?api=1&query=I+Fratellini+Florence"},{"id":"florence-0918-gelato-passera","name":"Gelateria della Passera","city":"Florence","category":"Gelato","plannedDay":"2026-09-18","rank":1,"topPick":true,"favorite":true,"official":true,"rating":5,"price":"€","mealWindow":"Afternoon / Oltrarno","notes":"Highest-priority gelato recommendation in Florence","dishes":["Seasonal flavors","Pistachio / nut flavors","Fruit sorbets","Rotating specialties"],"maps":"https://www.google.com/maps/search/?api=1&query=Gelateria+della+Passera+Florence"},{"id":"florence-0918-gelato-carraia","name":"Gelateria La Carraia","city":"Florence","category":"Gelato","plannedDay":"2026-09-18","rank":2,"price":"€","mealWindow":"Value Gelato · Near Ponte alla Carraia","notes":"Strong alternative if crossing the Arno farther west","maps":"https://www.google.com/maps/search/?api=1&query=Gelateria+La+Carraia+Florence"},{"id":"florence-0918-gelato-neri","name":"Gelateria dei Neri","city":"Florence","category":"Gelato","plannedDay":"2026-09-18","rank":3,"price":"€","mealWindow":"Central / Uffizi-Area Backup","notes":"Intentional holdover from the previous guide · Useful central backup, not a priority destination","dishes":["Pistachio","Dark Chocolate"],"maps":"https://www.google.com/maps/search/?api=1&query=Gelateria+dei+Neri+Florence"},{"id":"florence-0918-bar-volpi","name":"Le Volpi e l’Uva","city":"Florence","category":"Bar","plannedDay":"2026-09-18","rank":1,"topPick":true,"favorite":true,"official":true,"price":"€€","mealWindow":"Oltrarno Wine Experience · Near Ponte Vecchio","notes":"Serious Italian wine bar specializing in smaller producers · Excellent first stop after crossing Ponte Vecchio","dishes":["Tuscan wines","Lesser-known Italian grapes","Wine by the glass","Cheese","Salumi","Crostoni"],"maps":"https://www.google.com/maps/search/?api=1&query=Le+Volpi+e+l%27Uva+Florence"},{"id":"florence-0918-bar-pitti","name":"Enoteca Pitti Gola e Cantina","city":"Florence","category":"Bar","plannedDay":"2026-09-18","rank":2,"topPick":true,"price":"€€","mealWindow":"Wine Tasting · Opposite Palazzo Pitti","notes":"Use when you want to taste and compare wines rather than simply have a glass","dishes":["Wine flights","Tuscan / Italian wine education","Small pairings"],"maps":"https://www.google.com/maps/search/?api=1&query=Enoteca+Pitti+Gola+e+Cantina+Florence"},{"id":"florence-0918-bar-babae","name":"Babae","city":"Florence","category":"Bar","plannedDay":"2026-09-18","rank":3,"topPick":true,"official":true,"price":"€€","mealWindow":"Wine Window Experience · Via Santo Spirito","notes":"Historic buchetta del vino · Treat as a Florence experience rather than a destination meal","dishes":["Wine through the historic window"],"maps":"https://www.google.com/maps/search/?api=1&query=Babae+Florence"},{"id":"florence-0918-dinner-santo","name":"Osteria Santo Spirito","city":"Florence","category":"Dinner","plannedDay":"2026-09-18","rank":1,"topPick":true,"favorite":true,"official":true,"rating":5,"price":"€€","mealWindow":"Oltrarno Dinner · Piazza Santo Spirito","notes":"Comfort-Food Official Pick · Excellent casual dinner after an Oltrarno evening","dishes":["Baked Truffle Gnocchi","Tuscan pasta","Seasonal dishes","Traditional mains"],"maps":"https://www.google.com/maps/search/?api=1&query=Osteria+Santo+Spirito+Florence"},{"id":"florence-0918-dinner-casalinga","name":"La Casalinga","city":"Florence","category":"Dinner","plannedDay":"2026-09-18","rank":2,"price":"€€","mealWindow":"Home-Style Alternative · Santo Spirito","notes":"Traditional Florentine comfort cooking","dishes":["Ribollita","Pasta","Roast meats","Tuscan vegetable dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=La+Casalinga+Florence"},{"id":"florence-0918-dinner-bevitore","name":"Il Santo Bevitore","city":"Florence","category":"Dinner","plannedDay":"2026-09-18","rank":3,"price":"€€–€€€","mealWindow":"Polished Dinner Alternative · Santo Spirito","notes":"More contemporary and refined without moving into formal fine dining","maps":"https://www.google.com/maps/search/?api=1&query=Il+Santo+Bevitore+Florence"},{"id":"florence-0918-bar-santino","name":"Il Santino","city":"Florence","category":"Bar","plannedDay":"2026-09-18","rank":4,"topPick":true,"price":"€€","mealWindow":"Before / After Dinner · Santo Spirito","notes":"Tiny wine bar serving wine with small bites","dishes":["Tuscan wine","Crostini","Salumi","Cheese"],"maps":"https://www.google.com/maps/search/?api=1&query=Il+Santino+Florence"},{"id":"florence-0919-breakfast-ghibellina","name":"Forno Ghibellina","city":"Florence","category":"Breakfast","plannedDay":"2026-09-19","rank":1,"topPick":true,"official":true,"price":"€","mealWindow":"Breakfast / Bakery · Santa Croce","notes":"Good if exploring toward Santa Croce before the wine tour","dishes":["Fresh pastries","Bread","Savory baked goods","Coffee"],"maps":"https://www.google.com/maps/search/?api=1&query=Forno+Ghibellina+Florence"},{"id":"florence-0919-bite-nerbone","name":"Da Nerbone","city":"Florence","category":"Small Bite","plannedDay":"2026-09-19","rank":1,"topPick":true,"favorite":true,"price":"€","mealWindow":"Mercato Centrale · Ground Floor","notes":"Historic Market Food Pick · Pollini remains the dedicated lampredotto pick","dishes":["Panino con Bollito","Lampredotto"],"maps":"https://www.google.com/maps/search/?api=1&query=Da+Nerbone+Florence"},{"id":"florence-0919-bite-de-neri","name":"Schiacciateria De’ Neri","city":"Florence","category":"Small Bite","plannedDay":"2026-09-19","rank":2,"price":"€","mealWindow":"Schiacciata Alternative · Santa Croce / Uffizi side","notes":"Useful if I’ Girone is busy, Antico Vinaio has a ridiculous line, or you are already nearby","maps":"https://www.google.com/maps/search/?api=1&query=Schiacciateria+De+Neri+Florence"},{"id":"florence-0919-bar-pucci","name":"Cantina de’ Pucci","city":"Florence","category":"Bar","plannedDay":"2026-09-19","rank":1,"topPick":true,"official":true,"price":"€€","mealWindow":"Central Wine Window · Near Duomo","notes":"Convenient quick glass with almost no itinerary detour","dishes":["Wine through the historic window"],"maps":"https://www.google.com/maps/search/?api=1&query=Cantina+de+Pucci+Florence"},{"id":"florence-0919-lunch-sabatino","name":"Trattoria Sabatino","city":"Florence","category":"Lunch","plannedDay":"2026-09-19","rank":1,"topPick":true,"favorite":true,"official":true,"price":"€","mealWindow":"Optional Early Lunch · San Frediano","notes":"Value / Local Official Pick · Worth the walk for simple Florentine food without central-tourist pricing · Do not force it if timing gets tight","dishes":["Pappa al pomodoro","Peposo","Pasta","Trippa","Roast meats","Daily specials"],"maps":"https://www.google.com/maps/search/?api=1&query=Trattoria+Sabatino+Florence"},{"id":"florence-0920-breakfast-buonamici","name":"Pasticceria Buonamici","city":"Florence","category":"Breakfast","plannedDay":"2026-09-20","rank":1,"price":"€","mealWindow":"Departure Breakfast · Oltrarno","notes":"Only use if already in that direction; otherwise choose a quality café near the hotel","maps":"https://www.google.com/maps/search/?api=1&query=Pasticceria+Buonamici+Florence"},{"id":"florence-0920-bite-antico-smn","name":"All’Antico Vinaio — Firenze SMN","city":"Florence","category":"Small Bite","plannedDay":"2026-09-20","rank":1,"price":"€","mealWindow":"Station Option · Train Food","notes":"Useful only if you never tried the original; do not make a special trip if you already had Antico Vinaio","maps":"https://www.google.com/maps/search/?api=1&query=All%27Antico+Vinaio+Firenze+SMN"},{"id":"florence-flex-dinner-sostanza","name":"Trattoria Sostanza","city":"Florence","category":"Dinner","rank":1,"topPick":true,"favorite":true,"official":true,"price":"€€–€€€","mealWindow":"Flexible / Destination Restaurant · Santa Maria Novella","notes":"Unique Florence Meal · Use for lunch or dinner on whichever day you can secure a reservation","reservation":"Strongly recommended","dishes":["Pollo al Burro — Butter Chicken","Artichoke tortino when available","Bistecca","Traditional sides"],"maps":"https://www.google.com/maps/search/?api=1&query=Trattoria+Sostanza+Florence"},{"id":"florence-flex-dinner-pandemonio","name":"Pandemonio di Casa Brogi","city":"Florence","category":"Dinner","rank":2,"topPick":true,"price":"€€","mealWindow":"Flexible / Neighborhood Tuscan Dinner · San Frediano","notes":"Worth walking into San Frediano for","dishes":["Pasta","Tuscan meat","Bistecca","Traditional comfort food"],"maps":"https://www.google.com/maps/search/?api=1&query=Pandemonio+di+Casa+Brogi+Florence"},{"id":"florence-flex-dinner-buca-lapi","name":"Buca Lapi","city":"Florence","category":"Dinner","rank":3,"price":"€€€","mealWindow":"Flexible / Historic Bistecca Pick · Central Florence","notes":"Use if you want the dedicated premium steak dinner · Only schedule one dedicated bistecca meal","dishes":["Bistecca alla Fiorentina — shared, ordered by weight, thick-cut, traditionally very rare"],"maps":"https://www.google.com/maps/search/?api=1&query=Buca+Lapi+Florence"},{"id":"florence-flex-bar-antica-bottega","name":"Antica Bottega Wine Tasting","city":"Florence","category":"Bar","rank":5,"price":"€€","mealWindow":"Flexible / Additional Wine Window · Central Florence","notes":"Keep as an alternative rather than trying to visit every wine window","maps":"https://www.google.com/maps/search/?api=1&query=Antica+Bottega+Wine+Tasting+Florence"},{"id":"florence-flex-coffee-gilli","name":"Caffè Gilli","city":"Florence","category":"Coffee","rank":5,"price":"€€–€€€","mealWindow":"Flexible / Historic Café · Piazza della Repubblica","notes":"Not a value coffee recommendation; you are paying partly for historic surroundings, piazza location, service and atmosphere","maps":"https://www.google.com/maps/search/?api=1&query=Caffe+Gilli+Florence"}];
const ROME_FOOD_GUIDE=[{"id":"rome-0920-dinner-cesare-pellegrino","name":"Cesare al Pellegrino","city":"Rome","category":"Dinner","plannedDay":"2026-09-20","rank":1,"topPick":true,"price":"€€","mealWindow":"Centro Storico · Campo de’ Fiori / Navona","notes":"Central Roman Official Pick · Excellent arrival-day lunch or dinner","dishes":["Carbonara","Amatriciana","Gricia","Seasonal Roman dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=Cesare%20al%20Pellegrino%20Rome","favorite":true},{"id":"rome-0920-dinner-grappolo","name":"Hosteria Grappolo d’Oro","city":"Rome","category":"Dinner","plannedDay":"2026-09-20","rank":2,"topPick":false,"price":"€€","mealWindow":"Campo de’ Fiori","notes":"Reliable traditional Roman cooking in an extremely tourist-heavy area","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Hosteria%20Grappolo%20d%E2%80%99Oro%20Rome"},{"id":"rome-0920-dinner-roscioli","name":"Roscioli Salumeria con Cucina","city":"Rome","category":"Dinner","plannedDay":"2026-09-20","rank":3,"topPick":false,"price":"€€€","mealWindow":"Regola / Campo de’ Fiori","notes":"Tourist-famous but legitimate · Famous, crowded and relatively expensive","dishes":["Carbonara","Amatriciana","Salumi","Cheese","Wine"],"maps":"https://www.google.com/maps/search/?api=1&query=Roscioli%20Salumeria%20con%20Cucina%20Rome"},{"id":"rome-0920-bite-forno-roscioli","name":"Antico Forno Roscioli","city":"Rome","category":"Small Bite","plannedDay":"2026-09-20","rank":1,"topPick":true,"price":"€","mealWindow":"Campo de’ Fiori area","notes":"Pizza al Taglio Official Pick · Excellent quick arrival lunch","dishes":["Pizza bianca","Pizza rossa","Seasonal pizza al taglio","Fresh bread"],"maps":"https://www.google.com/maps/search/?api=1&query=Antico%20Forno%20Roscioli%20Rome","favorite":true},{"id":"rome-0920-bite-suppli-coronari","name":"I Supplì dei Coronari","city":"Rome","category":"Small Bite","plannedDay":"2026-09-20","rank":2,"topPick":false,"price":"€","mealWindow":"Piazza Navona / Via dei Coronari","notes":"Convenient supplì stop while exploring Piazza Navona","dishes":["Classic supplì","Rotating fritti"],"maps":"https://www.google.com/maps/search/?api=1&query=I%20Suppl%C3%AC%20dei%20Coronari%20Rome"},{"id":"rome-0920-coffee-santeustachio","name":"Sant’Eustachio Il Caffè","city":"Rome","category":"Coffee","plannedDay":"2026-09-20","rank":1,"topPick":true,"price":"€","mealWindow":"Pantheon","notes":"Historic Espresso Pick · Go primarily for the coffee rather than table service","dishes":["Espresso"],"maps":"https://www.google.com/maps/search/?api=1&query=Sant%E2%80%99Eustachio%20Il%20Caff%C3%A8%20Rome","favorite":true},{"id":"rome-0920-coffee-tazza","name":"La Casa del Caffè Tazza d’Oro","city":"Rome","category":"Coffee","plannedDay":"2026-09-20","rank":2,"topPick":false,"price":"€","mealWindow":"Pantheon","notes":"Classic Roman Coffee Pick · No need to visit both major Pantheon coffee bars unless comparing","dishes":["Espresso","Granita di caffè"],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Casa%20del%20Caff%C3%A8%20Tazza%20d%E2%80%99Oro%20Rome"},{"id":"rome-0920-breakfast-roscioli","name":"Roscioli Caffè","city":"Rome","category":"Breakfast","plannedDay":"2026-09-20","rank":1,"topPick":true,"price":"€","mealWindow":"Historic Center","notes":"Pastry + coffee option","dishes":["Espresso","Pastries","Maritozzo"],"maps":"https://www.google.com/maps/search/?api=1&query=Roscioli%20Caff%C3%A8%20Rome","favorite":true},{"id":"rome-0920-breakfast-barnum","name":"Barnum Roma","city":"Rome","category":"Breakfast","plannedDay":"2026-09-20","rank":2,"topPick":false,"price":"€€","mealWindow":"Campo de’ Fiori / Navona","notes":"Modern sit-down breakfast / coffee alternative","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Barnum%20Roma%20Rome"},{"id":"rome-0920-dessert-two-sizes","name":"Two Sizes","city":"Rome","category":"Dessert","plannedDay":"2026-09-20","rank":1,"topPick":true,"price":"€","mealWindow":"Piazza Navona","notes":"Tiramisu Official Pick · Small, inexpensive and easy to work into sightseeing","dishes":["Classic tiramisu","Pistachio tiramisu"],"maps":"https://www.google.com/maps/search/?api=1&query=Two%20Sizes%20Rome","favorite":true},{"id":"rome-0920-gelato-giolitti","name":"Giolitti","city":"Rome","category":"Gelato","plannedDay":"2026-09-20","rank":1,"topPick":true,"price":"€","mealWindow":"Pantheon area","notes":"Historic gelato experience · Tourist-heavy but historically significant","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Giolitti%20Rome","favorite":true},{"id":"rome-0920-gelato-frigidarium","name":"Frigidarium","city":"Rome","category":"Gelato","plannedDay":"2026-09-20","rank":2,"topPick":false,"price":"€","mealWindow":"Centro Storico / Navona","notes":"Intentional legacy holdover · Convenient central gelato backup, not the artisanal priority","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Frigidarium%20Rome"},{"id":"rome-0920-bar-culdesac","name":"Cul de Sac","city":"Rome","category":"Bar","plannedDay":"2026-09-20","rank":1,"topPick":true,"price":"€€","mealWindow":"Piazza Navona","notes":"Wine + food pick with a huge wine selection and small plates","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Cul%20de%20Sac%20Rome","favorite":true},{"id":"rome-0920-bar-angolo","name":"L’Angolo Divino","city":"Rome","category":"Bar","plannedDay":"2026-09-20","rank":2,"topPick":false,"price":"€€","mealWindow":"Campo de’ Fiori","notes":"Serious Wine Pick · Best when you want help choosing Italian / Lazio wine","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=L%E2%80%99Angolo%20Divino%20Rome"},{"id":"rome-0920-bar-rimessa","name":"Rimessa Roscioli","city":"Rome","category":"Bar","plannedDay":"2026-09-20","rank":3,"topPick":false,"price":"€€€","mealWindow":"Regola","notes":"Structured wine tasting / pairing experience · Optional after Tuscany wine day","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Rimessa%20Roscioli%20Rome"},{"id":"rome-0921-breakfast-regoli","name":"Regoli Pasticceria","city":"Rome","category":"Breakfast","plannedDay":"2026-09-21","rank":1,"topPick":true,"price":"€","mealWindow":"Esquilino","notes":"Maritozzo Official Pick","dishes":["Maritozzo con panna"],"maps":"https://www.google.com/maps/search/?api=1&query=Regoli%20Pasticceria%20Rome","favorite":true},{"id":"rome-0921-breakfast-panella","name":"Panella","city":"Rome","category":"Breakfast","plannedDay":"2026-09-21","rank":2,"topPick":false,"price":"€","mealWindow":"Esquilino","notes":"Bakery alternative useful on the way toward Ancient Rome","dishes":["Pastries","Bread","Coffee","Savory baked goods"],"maps":"https://www.google.com/maps/search/?api=1&query=Panella%20Rome"},{"id":"rome-0921-bite-supplizio","name":"Supplizio","city":"Rome","category":"Small Bite","plannedDay":"2026-09-21","rank":1,"topPick":true,"price":"€","mealWindow":"Centro Storico · Destination quick bite","notes":"Supplì Official Pick · Closed Sunday, so Monday is the first opportunity","dishes":["Classic supplì"],"maps":"https://www.google.com/maps/search/?api=1&query=Supplizio%20Rome","favorite":true},{"id":"rome-0921-bite-er-buchetto","name":"Er Buchetto","city":"Rome","category":"Small Bite","plannedDay":"2026-09-21","rank":2,"topPick":false,"price":"€","mealWindow":"Termini / Opera","notes":"Tiny old-school porchetta specialist","dishes":["Porchetta sandwich"],"maps":"https://www.google.com/maps/search/?api=1&query=Er%20Buchetto%20Rome"},{"id":"rome-0921-dinner-armando","name":"Armando al Pantheon","city":"Rome","category":"Dinner","plannedDay":"2026-09-21","rank":1,"topPick":true,"price":"€€–€€€","mealWindow":"Return-to-center dinner · Pantheon","notes":"Classic Roman Institution · Reservation strongly recommended · Closed Sunday","dishes":["Carbonara","Amatriciana","Saltimbocca","Roman specials"],"maps":"https://www.google.com/maps/search/?api=1&query=Armando%20al%20Pantheon%20Rome","favorite":true},{"id":"rome-0921-dinner-santopalato","name":"SantoPalato","city":"Rome","category":"Dinner","plannedDay":"2026-09-21","rank":2,"topPick":false,"price":"€€–€€€","mealWindow":"DESTINATION · San Giovanni","notes":"Modern Roman Official Pick · Worth deliberately leaving the tourist center for","dishes":["Carbonara","Quinto quarto","Seasonal Roman cooking"],"maps":"https://www.google.com/maps/search/?api=1&query=SantoPalato%20Rome"},{"id":"rome-0921-dinner-cesare-casaletto","name":"Cesare al Casaletto","city":"Rome","category":"Dinner","plannedDay":"2026-09-21","rank":3,"topPick":false,"price":"€€","mealWindow":"DESTINATION · Monteverde","notes":"Destination trattoria · Food itself justifies leaving central Rome","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Cesare%20al%20Casaletto%20Rome"},{"id":"rome-0921-pizza-180g","name":"180g Pizzeria Romana","city":"Rome","category":"Small Bite","plannedDay":"2026-09-21","rank":3,"topPick":false,"price":"€€","mealWindow":"DESTINATION · Centocelle","notes":"Very thin, crisp Roman pizza · Deliberate detour rather than convenience recommendation","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=180g%20Pizzeria%20Romana%20Rome"},{"id":"rome-0921-gelato-come-latte","name":"Come il Latte","city":"Rome","category":"Gelato","plannedDay":"2026-09-21","rank":1,"topPick":true,"price":"€","mealWindow":"Sallustiano","notes":"Rich Gelato Pick","dishes":["Pistachio","Fior di latte","Chocolate","Stracciatella"],"maps":"https://www.google.com/maps/search/?api=1&query=Come%20il%20Latte%20Rome","favorite":true},{"id":"rome-0921-gelato-fassi","name":"Gelateria Fassi","city":"Rome","category":"Gelato","plannedDay":"2026-09-21","rank":2,"topPick":false,"price":"€","mealWindow":"Esquilino","notes":"Historic Palazzo del Freddo experience","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Gelateria%20Fassi%20Rome"},{"id":"rome-0921-bar-barrique","name":"La Barrique","city":"Rome","category":"Bar","plannedDay":"2026-09-21","rank":1,"topPick":true,"price":"€€","mealWindow":"Monti","notes":"Wine-first Monti pick with small plates","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Barrique%20Rome","favorite":true},{"id":"rome-0921-bar-drink-kong","name":"Drink Kong","city":"Rome","category":"Bar","plannedDay":"2026-09-21","rank":2,"topPick":false,"price":"€€–€€€","mealWindow":"Monti · Post-dinner","notes":"Cocktail Official Pick · Useful after dinner and before/after the booked night tour depending on timing","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Drink%20Kong%20Rome"},{"id":"rome-0922-lunch-romane","name":"Romanè","city":"Rome","category":"Lunch","plannedDay":"2026-09-22","rank":1,"topPick":true,"price":"€€","mealWindow":"Vatican / Cipro · TIMING-DEPENDENT","notes":"Vatican-Day Restaurant Official Pick · Work around the 9:00 AM Museums and 1:30 PM St. Peter’s tickets","dishes":["Carbonara","Amatriciana","Trippa","Roman meat dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=Roman%C3%A8%20Rome","favorite":true},{"id":"rome-0922-bite-pizzarium","name":"Pizzarium Bonci","city":"Rome","category":"Small Bite","plannedDay":"2026-09-22","rank":1,"topPick":true,"price":"€–€€","mealWindow":"Cipro · TIMING-DEPENDENT","notes":"Famous pizza al taglio pick · Try several small pieces rather than one large portion","dishes":["Potato pizza","Seasonal vegetables","Cheese","Meat specials"],"maps":"https://www.google.com/maps/search/?api=1&query=Pizzarium%20Bonci%20Rome","favorite":true},{"id":"rome-0922-bite-panificio-bonci","name":"Panificio Bonci","city":"Rome","category":"Small Bite","plannedDay":"2026-09-22","rank":2,"topPick":false,"price":"€","mealWindow":"Prati · TIMING-DEPENDENT","notes":"Bakery alternative for bread, pizza and quick baked snacks","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Panificio%20Bonci%20Rome"},{"id":"rome-0922-gelato-gracchi","name":"Gelateria dei Gracchi","city":"Rome","category":"Gelato","plannedDay":"2026-09-22","rank":1,"topPick":true,"price":"€","mealWindow":"Prati","notes":"Prati Gelato Official Pick","dishes":["Pistachio"],"maps":"https://www.google.com/maps/search/?api=1&query=Gelateria%20dei%20Gracchi%20Rome","favorite":true},{"id":"rome-0922-gelato-neve","name":"Neve di Latte","city":"Rome","category":"Gelato","plannedDay":"2026-09-22","rank":2,"topPick":false,"price":"€","mealWindow":"Piazza Cavour / Prati","notes":"Artisanal gelato alternative · Particularly useful after Castel Sant’Angelo","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Neve%20di%20Latte%20Rome"},{"id":"rome-0922-dinner-da-enzo","name":"Da Enzo al 29","city":"Rome","category":"Dinner","plannedDay":"2026-09-22","rank":1,"topPick":true,"price":"€€","mealWindow":"Trastevere","notes":"Famous Trastevere pick · Do not waste an hour-plus waiting if the queue is ridiculous","dishes":["Carbonara","Amatriciana","Coda alla vaccinara"],"maps":"https://www.google.com/maps/search/?api=1&query=Da%20Enzo%20al%2029%20Rome","favorite":true},{"id":"rome-0922-dinner-der-belli","name":"Osteria Der Belli","city":"Rome","category":"Dinner","plannedDay":"2026-09-22","rank":2,"topPick":false,"price":"€€","mealWindow":"Trastevere","notes":"Seafood alternative that breaks up the heavy Roman-pasta focus","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Osteria%20Der%20Belli%20Rome"},{"id":"rome-0922-dinner-tavernaccia","name":"La Tavernaccia da Bruno","city":"Rome","category":"Dinner","plannedDay":"2026-09-22","rank":3,"topPick":false,"price":"€€","mealWindow":"DESTINATION · Portuense / edge of Trastevere","notes":"Traditional Roman / Lazio family trattoria · Deliberate move away from tourist-heavy Trastevere","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Tavernaccia%20da%20Bruno%20Rome"},{"id":"rome-0922-pizza-elementare","name":"L’Elementare","city":"Rome","category":"Small Bite","plannedDay":"2026-09-22","rank":1,"topPick":true,"price":"€€","mealWindow":"Trastevere","notes":"Roman Tonda Official Pick · Very thin crisp pizza plus strong fritti","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=L%E2%80%99Elementare%20Rome","favorite":true},{"id":"rome-0922-pizza-ai-marmi","name":"Ai Marmi","city":"Rome","category":"Small Bite","plannedDay":"2026-09-22","rank":2,"topPick":false,"price":"€€","mealWindow":"Trastevere","notes":"Old-school busy Roman pizzeria experience","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Ai%20Marmi%20Rome"},{"id":"rome-0922-pizza-renella","name":"La Renella","city":"Rome","category":"Small Bite","plannedDay":"2026-09-22","rank":3,"topPick":false,"price":"€","mealWindow":"Trastevere","notes":"Bakery / pizza al taglio · Better spontaneous snack than destination dinner","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Renella%20Rome"},{"id":"rome-0922-pizza-seu","name":"Seu Pizza Illuminati","city":"Rome","category":"Small Bite","plannedDay":"2026-09-22","rank":4,"topPick":false,"price":"€€","mealWindow":"DESTINATION · Porta Portese","notes":"Contemporary chef-driven pizza alternative","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Seu%20Pizza%20Illuminati%20Rome"},{"id":"rome-0922-bite-suppli-roma","name":"Supplì Roma","city":"Rome","category":"Small Bite","plannedDay":"2026-09-22","rank":5,"topPick":false,"price":"€","mealWindow":"Trastevere","notes":"Inexpensive neighborhood supplì stop","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Suppl%C3%AC%20Roma%20Rome"},{"id":"rome-0922-bite-trapizzino","name":"Trapizzino","city":"Rome","category":"Small Bite","plannedDay":"2026-09-22","rank":1,"topPick":true,"price":"€","mealWindow":"Trastevere / Testaccio","notes":"Unique Roman Street-Food Official Pick · One of the highest-priority quick bites","dishes":["Chicken cacciatore","Meatballs in tomato sauce"],"maps":"https://www.google.com/maps/search/?api=1&query=Trapizzino%20Rome","favorite":true},{"id":"rome-0922-bite-iacozzilli","name":"La Norcineria di Iacozzilli","city":"Rome","category":"Small Bite","plannedDay":"2026-09-22","rank":2,"topPick":false,"price":"€","mealWindow":"Trastevere","notes":"Porchetta Official Pick · Small deli/butcher rather than tourist sandwich chain","dishes":["Porchetta sandwich"],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Norcineria%20di%20Iacozzilli%20Rome"},{"id":"rome-0922-dessert-maritozzaro","name":"Il Maritozzaro","city":"Rome","category":"Dessert","plannedDay":"2026-09-22","rank":1,"topPick":true,"price":"€","mealWindow":"Portuense · Late night","notes":"Neighborhood maritozzo specialist · Fun late-night alternative to Regoli","dishes":["Maritozzo"],"maps":"https://www.google.com/maps/search/?api=1&query=Il%20Maritozzaro%20Rome","favorite":true},{"id":"rome-0922-gelato-otaleg","name":"Otaleg","city":"Rome","category":"Gelato","plannedDay":"2026-09-22","rank":1,"topPick":true,"price":"€","mealWindow":"Trastevere","notes":"Rome Gelato Official Pick · Serious artisanal-gelato leader","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Otaleg%20Rome","favorite":true},{"id":"rome-0922-bar-latteria","name":"Latteria Trastevere","city":"Rome","category":"Bar","plannedDay":"2026-09-22","rank":1,"topPick":true,"price":"€€","mealWindow":"Trastevere","notes":"Natural wine + small plates · Alternative to standard spritz-bar experience","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Latteria%20Trastevere%20Rome","favorite":true},{"id":"rome-0923-bite-mozzico","name":"La Vita è un Mozzico","city":"Rome","category":"Small Bite","plannedDay":"2026-09-23","rank":1,"topPick":true,"price":"€","mealWindow":"Piazza del Popolo","notes":"Roman Sandwich Official Pick","dishes":["Porchetta","Salumi","Cheese","Pizza bianca"],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Vita%20%C3%A8%20un%20Mozzico%20Rome","favorite":true},{"id":"rome-0923-coffee-faro","name":"Faro - Caffè Specialty","city":"Rome","category":"Coffee","plannedDay":"2026-09-23","rank":1,"topPick":true,"price":"€€","mealWindow":"Villa Borghese / Porta Pia side","notes":"Specialty Coffee Official Pick · Coffee-focused preparation","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Faro%20-%20Caff%C3%A8%20Specialty%20Rome","favorite":true},{"id":"rome-0923-dessert-boccione","name":"Boccione","city":"Rome","category":"Dessert","plannedDay":"2026-09-23","rank":1,"topPick":true,"price":"€","mealWindow":"Jewish Ghetto","notes":"Jewish-Roman Sweet Pick","dishes":["Ricotta & sour-cherry crostata","Pizza ebraica"],"maps":"https://www.google.com/maps/search/?api=1&query=Boccione%20Rome","favorite":true},{"id":"rome-0923-dessert-sora-mirella","name":"Sora Mirella","city":"Rome","category":"Dessert","plannedDay":"2026-09-23","rank":2,"topPick":false,"price":"€","mealWindow":"Tiber Island / Lungotevere","notes":"Grattachecca Pick · Warm-weather Roman shaved-ice specialty","dishes":["Grattachecca"],"maps":"https://www.google.com/maps/search/?api=1&query=Sora%20Mirella%20Rome"},{"id":"rome-0923-bite-casa-manco","name":"Casa Manco","city":"Rome","category":"Small Bite","plannedDay":"2026-09-23","rank":1,"topPick":true,"price":"€","mealWindow":"OPTIONAL TESTACCIO · DAYTIME MARKET HOURS","notes":"Market Pizza Official Pick · Only surface as a deliberate Testaccio food detour during market hours","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Casa%20Manco%20Rome","favorite":true},{"id":"rome-0923-bite-mordi-vai","name":"Mordi & Vai","city":"Rome","category":"Small Bite","plannedDay":"2026-09-23","rank":2,"topPick":false,"price":"€","mealWindow":"OPTIONAL TESTACCIO · DAYTIME MARKET HOURS","notes":"Roman Meat Sandwich Official Pick · Only if choosing Testaccio as a food destination","dishes":["Allesso","Picchiapò","Rotating Roman meat fillings"],"maps":"https://www.google.com/maps/search/?api=1&query=Mordi%20%26%20Vai%20Rome"},{"id":"rome-0923-breakfast-linari","name":"Pasticceria Linari","city":"Rome","category":"Breakfast","plannedDay":"2026-09-23","rank":1,"topPick":true,"price":"€","mealWindow":"Testaccio","notes":"Neighborhood bakery alternative","dishes":["Espresso","Maritozzo","Pastries"],"maps":"https://www.google.com/maps/search/?api=1&query=Pasticceria%20Linari%20Rome","favorite":true},{"id":"rome-0923-dinner-felice","name":"Felice a Testaccio","city":"Rome","category":"Dinner","plannedDay":"2026-09-23","rank":1,"topPick":true,"price":"€€–€€€","mealWindow":"OPTIONAL TESTACCIO","notes":"Cacio e Pepe Official Pick · Famous but useful for the signature tableside experience","dishes":["Cacio e pepe"],"maps":"https://www.google.com/maps/search/?api=1&query=Felice%20a%20Testaccio%20Rome","favorite":true},{"id":"rome-0923-dinner-flavio","name":"Flavio al Velavevodetto","city":"Rome","category":"Dinner","plannedDay":"2026-09-23","rank":2,"topPick":false,"price":"€€","mealWindow":"OPTIONAL TESTACCIO · Monte Testaccio","notes":"Food-focused Roman pasta alternative to Felice","dishes":["Carbonara","Gricia","Amatriciana"],"maps":"https://www.google.com/maps/search/?api=1&query=Flavio%20al%20Velavevodetto%20Rome"},{"id":"rome-0923-dinner-scopettaro","name":"Lo Scopettaro","city":"Rome","category":"Dinner","plannedDay":"2026-09-23","rank":3,"topPick":false,"price":"€€","mealWindow":"OPTIONAL TESTACCIO","notes":"Old-school straightforward Roman trattoria · Less hype","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Lo%20Scopettaro%20Rome"},{"id":"rome-0923-dinner-pennestri","name":"Trattoria Pennestri","city":"Rome","category":"Dinner","plannedDay":"2026-09-23","rank":4,"topPick":false,"price":"€€","mealWindow":"OPTIONAL · Ostiense","notes":"More contemporary / seasonal trattoria alternative","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Trattoria%20Pennestri%20Rome"},{"id":"rome-0923-bite-forno-campo","name":"Forno Campo de’ Fiori","city":"Rome","category":"Small Bite","plannedDay":"2026-09-23","rank":3,"topPick":false,"price":"€","mealWindow":"Campo de’ Fiori","notes":"Pizza Bianca Pick · Simple and useful in a tourist-heavy area","dishes":["Pizza bianca"],"maps":"https://www.google.com/maps/search/?api=1&query=Forno%20Campo%20de%E2%80%99%20Fiori%20Rome"},{"id":"rome-0923-bite-filettaro","name":"Dar Filettaro a Santa Barbara","city":"Rome","category":"Small Bite","plannedDay":"2026-09-23","rank":4,"topPick":false,"price":"€","mealWindow":"Near Campo de’ Fiori · Evening","notes":"Fried Baccalà Pick · This does not need to be a full meal","dishes":["Filetto di baccalà"],"maps":"https://www.google.com/maps/search/?api=1&query=Dar%20Filettaro%20a%20Santa%20Barbara%20Rome"},{"id":"rome-0923-bar-goccetto","name":"Il Goccetto","city":"Rome","category":"Bar","plannedDay":"2026-09-23","rank":1,"topPick":true,"price":"€€","mealWindow":"Historic Center · Via dei Banchi Vecchi","notes":"Wine Bar Official Pick · Deep Italian wine selection and classic enoteca atmosphere","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Il%20Goccetto%20Rome","favorite":true},{"id":"rome-0923-bar-vinaietto","name":"Il Vinaietto","city":"Rome","category":"Bar","plannedDay":"2026-09-23","rank":2,"topPick":false,"price":"€","mealWindow":"Near Largo Argentina","notes":"Old-school casual wine pick · Less polished and less expensive","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Il%20Vinaietto%20Rome"},{"id":"rome-0923-dinner-sostegno","name":"Osteria del Sostegno","city":"Rome","category":"Dinner","plannedDay":"2026-09-23","rank":1,"topPick":true,"price":"€€","mealWindow":"Pantheon","notes":"Hidden-Central Official Pick · Tiny side-street osteria · Closed Sunday + Monday","dishes":["Carbonara","Cacio e pepe","Amatriciana","Seasonal pasta"],"maps":"https://www.google.com/maps/search/?api=1&query=Osteria%20del%20Sostegno%20Rome","favorite":true},{"id":"rome-0924-breakfast-roscioli","name":"Roscioli Caffè","city":"Rome","category":"Breakfast","plannedDay":"2026-09-24","rank":1,"topPick":true,"price":"€","mealWindow":"Departure Morning · Keep convenient","notes":"Early central breakfast repeat · Do not cross Rome for a destination breakfast","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Roscioli%20Caff%C3%A8%20Rome","favorite":true},{"id":"rome-0924-coffee-santeustachio","name":"Sant’Eustachio Il Caffè","city":"Rome","category":"Coffee","plannedDay":"2026-09-24","rank":1,"topPick":true,"price":"€","mealWindow":"Departure Morning · Only if location/timing works","notes":"Espresso repeat option before the 9:41 AM train","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Sant%E2%80%99Eustachio%20Il%20Caff%C3%A8%20Rome","favorite":true},{"id":"rome-0924-coffee-tazza","name":"La Casa del Caffè Tazza d’Oro","city":"Rome","category":"Coffee","plannedDay":"2026-09-24","rank":2,"topPick":false,"price":"€","mealWindow":"Departure Morning · Only if location/timing works","notes":"Classic coffee repeat option before Termini","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Casa%20del%20Caff%C3%A8%20Tazza%20d%E2%80%99Oro%20Rome"}];
const NAPLES_CAPRI_FOOD_GUIDE=[{"id":"naples-0924-lunch-da-michele","name":"L’Antica Pizzeria da Michele","city":"Naples","category":"Lunch","plannedDay":"2026-09-24","rank":1,"topPick":true,"price":"€","mealWindow":"Arrival Lunch · Forcella / near Napoli Centrale","notes":"OFFICIAL PICK · Naples institution · If the queue gets excessive, switch to another strong option","dishes":["Margherita","Marinara"],"maps":"https://www.google.com/maps/search/?api=1&query=L%E2%80%99Antica%20Pizzeria%20da%20Michele%20Naples","favorite":true},{"id":"naples-0924-lunch-di-matteo","name":"Pizzeria Di Matteo","city":"Naples","category":"Lunch","plannedDay":"2026-09-24","rank":2,"topPick":false,"price":"€","mealWindow":"Historic Center · Via dei Tribunali","notes":"Old-school pizzeria that also lets you sample classic fried snacks","dishes":["Margherita","Pizza Fritta","Frittatina"],"maps":"https://www.google.com/maps/search/?api=1&query=Pizzeria%20Di%20Matteo%20Naples"},{"id":"naples-0924-lunch-sorbillo","name":"Gino e Toto Sorbillo","city":"Naples","category":"Lunch","plannedDay":"2026-09-24","rank":3,"topPick":false,"price":"€","mealWindow":"Historic Center · Via dei Tribunali","notes":"Tourist-famous but legitimate · Do not sacrifice major sightseeing time to a huge queue","dishes":["Margherita","Traditional Neapolitan Pizza"],"maps":"https://www.google.com/maps/search/?api=1&query=Gino%20e%20Toto%20Sorbillo%20Naples"},{"id":"naples-0924-bite-decumano","name":"Decumano 31","city":"Naples","category":"Small Bite","plannedDay":"2026-09-24","rank":1,"topPick":true,"price":"€","mealWindow":"Spaccanapoli · Historic Center","notes":"STREET FOOD PICK · Ideal for sampling fried-food culture while walking","dishes":["Cuoppo di Mare","Crocchè","Fried Mozzarella"],"maps":"https://www.google.com/maps/search/?api=1&query=Decumano%2031%20Naples","favorite":true},{"id":"naples-0924-bite-zia-esterina","name":"Antica Pizza Fritta da Zia Esterina Sorbillo","city":"Naples","category":"Small Bite","plannedDay":"2026-09-24","rank":2,"topPick":false,"price":"€","mealWindow":"Historic Center","notes":"Quick introduction to one of Naples’ signature street foods · Better as a snack","dishes":["Pizza Fritta"],"maps":"https://www.google.com/maps/search/?api=1&query=Antica%20Pizza%20Fritta%20da%20Zia%20Esterina%20Sorbillo%20Naples"},{"id":"naples-0924-bite-passione","name":"Passione di Sofì","city":"Naples","category":"Small Bite","plannedDay":"2026-09-24","rank":3,"topPick":false,"price":"€","mealWindow":"Via Toledo","notes":"Convenient fried-street-food option later in the sightseeing route","dishes":["Cuoppo","Frittatina","Crocchè"],"maps":"https://www.google.com/maps/search/?api=1&query=Passione%20di%20Sof%C3%AC%20Naples"},{"id":"naples-0924-breakfast-sfogliate","name":"Sfogliate e Sfogliatelle","city":"Naples","category":"Dessert","plannedDay":"2026-09-24","rank":1,"topPick":true,"price":"€","mealWindow":"San Gregorio Armeno","notes":"Dedicated sfogliatella stop directly along the historic-center route","dishes":["Sfogliatella Riccia","Sfogliatella Frolla"],"maps":"https://www.google.com/maps/search/?api=1&query=Sfogliate%20e%20Sfogliatelle%20Naples","favorite":true},{"id":"naples-0924-coffee-gambrinus","name":"Gran Caffè Gambrinus","city":"Naples","category":"Coffee","plannedDay":"2026-09-24","rank":1,"topPick":true,"price":"€€","mealWindow":"Piazza del Plebiscito","notes":"HISTORIC CAFÉ PICK · Pricier and more tourist-oriented, but worthwhile for the setting and history","dishes":["Espresso","Babà","Sfogliatella"],"maps":"https://www.google.com/maps/search/?api=1&query=Gran%20Caff%C3%A8%20Gambrinus%20Naples","favorite":true},{"id":"naples-0924-bar-spuzzule","name":"Spuzzulè Winery","city":"Naples","category":"Bar","plannedDay":"2026-09-24","rank":1,"topPick":true,"price":"€€","mealWindow":"Quartieri Spagnoli","notes":"WINE PICK · Focus on Campania wines rather than generic cocktails","dishes":["Falanghina","Fiano","Greco di Tufo","Aglianico"],"maps":"https://www.google.com/maps/search/?api=1&query=Spuzzul%C3%A8%20Winery%20Naples","favorite":true},{"id":"naples-0924-dinner-locanda","name":"La Locanda Gesù Vecchio","city":"Naples","category":"Dinner","plannedDay":"2026-09-24","rank":1,"topPick":true,"price":"€€","mealWindow":"Historic Center","notes":"OFFICIAL DINNER PICK · One of the strongest traditional Naples recommendations","dishes":["Rigatoni al Ragù with Ricotta","Pasta alla Genovese"],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Locanda%20Ges%C3%B9%20Vecchio%20Naples","favorite":true},{"id":"naples-0924-dinner-mattonella","name":"Osteria della Mattonella","city":"Naples","category":"Dinner","plannedDay":"2026-09-24","rank":2,"topPick":false,"price":"€€","mealWindow":"Quartieri Spagnoli","notes":"Small traditional neighborhood trattoria","dishes":["Pasta e Patate","Pasta alla Genovese"],"maps":"https://www.google.com/maps/search/?api=1&query=Osteria%20della%20Mattonella%20Naples"},{"id":"naples-0924-dinner-antica-capri","name":"Antica Capri","city":"Naples","category":"Dinner","plannedDay":"2026-09-24","rank":3,"topPick":false,"price":"€€","mealWindow":"Quartieri Spagnoli · Naples","notes":"Traditional comfort food · Despite the name, this restaurant is in Naples","dishes":["Pasta e Fagioli with Seafood","Traditional Neapolitan Pasta"],"maps":"https://www.google.com/maps/search/?api=1&query=Antica%20Capri%20Naples"},{"id":"naples-0924-dinner-nennella","name":"Trattoria da Nennella","city":"Naples","category":"Dinner","plannedDay":"2026-09-24","rank":4,"topPick":false,"price":"€","mealWindow":"Quartieri Spagnoli","notes":"Choose this for loud, chaotic Naples atmosphere and fun rather than a quiet dinner","dishes":["Traditional Daily Pastas","Neapolitan Home Cooking"],"maps":"https://www.google.com/maps/search/?api=1&query=Trattoria%20da%20Nennella%20Naples"},{"id":"capri-0925-bite-da-aldo","name":"Salumeria Da Aldo — Cuccurullo Aldo","city":"Capri","category":"Small Bite","plannedDay":"2026-09-25","rank":1,"topPick":true,"price":"€","mealWindow":"Marina Grande · PRACTICAL CAPRI PRIORITY","notes":"Best-value quick bite for this itinerary · Grab before exploring or carry with you","dishes":["Caprese Panino","Made-to-Order Sandwiches"],"maps":"https://www.google.com/maps/search/?api=1&query=Salumeria%20Da%20Aldo%20%E2%80%94%20Cuccurullo%20Aldo%20Capri","favorite":true},{"id":"capri-0925-bite-al-buco","name":"Al Buco Gastronomia","city":"Capri","category":"Small Bite","plannedDay":"2026-09-25","rank":2,"topPick":false,"price":"€","mealWindow":"Anacapri · TIMING-FRIENDLY","notes":"Excellent when sightseeing time matters more than a formal lunch","dishes":["Panini","Fried Snacks","Prepared Local Dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=Al%20Buco%20Gastronomia%20Capri"},{"id":"capri-0925-lunch-aumm","name":"Aumm Aumm","city":"Capri","category":"Lunch","plannedDay":"2026-09-25","rank":2,"topPick":false,"price":"€€","mealWindow":"Anacapri · TIMING-DEPENDENT","notes":"Casual, comparatively affordable by Capri standards · Use only if the 2:00 PM boat schedule leaves room","dishes":["Pizza","Pasta","Caprese Salad"],"maps":"https://www.google.com/maps/search/?api=1&query=Aumm%20Aumm%20Capri"},{"id":"capri-0925-coffee-columbus","name":"Columbus","city":"Capri","category":"Coffee","plannedDay":"2026-09-25","rank":1,"topPick":true,"price":"€€","mealWindow":"Anacapri · Monte Solaro Chairlift","notes":"Convenience pick around the chairlift rather than a destination restaurant","dishes":["Espresso","Pastry","Panino"],"maps":"https://www.google.com/maps/search/?api=1&query=Columbus%20Capri","favorite":true},{"id":"capri-0925-lunch-gelsomina","name":"Da Gelsomina","city":"Capri","category":"Lunch","plannedDay":"2026-09-25","rank":3,"topPick":false,"price":"€€–€€€","mealWindow":"SPECIAL DESTINATION · Anacapri / Migliera","notes":"Substantial time commitment · Family-run destination with own wine and shuttle · Do not treat as the default on a 2:00 PM boat-tour day","dishes":["Ravioli Capresi","Coniglio alla Cacciatora","Pollo al Mattone","Local Wine"],"maps":"https://www.google.com/maps/search/?api=1&query=Da%20Gelsomina%20Capri"},{"id":"capri-0925-lunch-verginiello","name":"Verginiello","city":"Capri","category":"Lunch","plannedDay":"2026-09-25","rank":1,"topPick":true,"price":"€€","mealWindow":"Capri Town · BEST PROPER SIT-DOWN","notes":"Traditional island cooking at comparatively reasonable Capri prices · Timing-dependent before the 2:00 PM boat","dishes":["Ravioli Capresi","Traditional Capri Dishes"],"maps":"https://www.google.com/maps/search/?api=1&query=Verginiello%20Capri","favorite":true},{"id":"capri-0925-gelato-buonocore","name":"Buonocore Gelateria","city":"Capri","category":"Gelato","plannedDay":"2026-09-25","rank":1,"topPick":true,"price":"€","mealWindow":"Capri Town","notes":"SWEET PICK · Easy stop that barely affects sightseeing time","dishes":["Gelato","Fresh Waffle Cone"],"maps":"https://www.google.com/maps/search/?api=1&query=Buonocore%20Gelateria%20Capri","favorite":true},{"id":"naples-0925-dinner-starita","name":"Starita","city":"Naples","category":"Dinner","plannedDay":"2026-09-25","rank":1,"topPick":true,"price":"€€","mealWindow":"Back in Naples · Materdei","notes":"OFFICIAL PIZZA PICK · Great contrast with Da Michele because the menu/styles differ","dishes":["Montanara Starita","Margherita","Classic Neapolitan Pizza"],"maps":"https://www.google.com/maps/search/?api=1&query=Starita%20Naples","favorite":true},{"id":"naples-0925-dinner-50-kalo","name":"50 Kalò","city":"Naples","category":"Dinner","plannedDay":"2026-09-25","rank":2,"topPick":false,"price":"€€","mealWindow":"Mergellina","notes":"Modern Neapolitan pizza · Excellent if pairing dinner with the waterfront","dishes":["Margherita","Contemporary Neapolitan Pizza"],"maps":"https://www.google.com/maps/search/?api=1&query=50%20Kal%C3%B2%20Naples"},{"id":"naples-0925-dinner-concettina","name":"Concettina ai Tre Santi","city":"Naples","category":"Dinner","plannedDay":"2026-09-25","rank":3,"topPick":false,"price":"€€","mealWindow":"Sanità","notes":"Creative modern evolution of Naples pizza culture","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Concettina%20ai%20Tre%20Santi%20Naples"},{"id":"naples-0925-bar-attimi","name":"Attimi DiVini","city":"Naples","category":"Bar","plannedDay":"2026-09-25","rank":1,"topPick":true,"price":"€€","mealWindow":"Santa Lucia / Lungomare","notes":"Relaxed, polished post-dinner wine option","dishes":["Italian Wine","Campania Wine"],"maps":"https://www.google.com/maps/search/?api=1&query=Attimi%20DiVini%20Naples","favorite":true},{"id":"naples-0926-coffee-mexico","name":"Caffè Mexico","city":"Naples","category":"Coffee","plannedDay":"2026-09-26","rank":1,"topPick":true,"price":"€","mealWindow":"Near Napoli Centrale · Before Tour","notes":"ESPRESSO PICK · Classic no-frills Naples coffee experience","dishes":["Neapolitan Espresso"],"maps":"https://www.google.com/maps/search/?api=1&query=Caff%C3%A8%20Mexico%20Naples","favorite":true},{"id":"naples-0926-breakfast-attanasio","name":"Sfogliatelle Attanasio","city":"Naples","category":"Breakfast","plannedDay":"2026-09-26","rank":1,"topPick":true,"price":"€","mealWindow":"Near Napoli Centrale · Before Tour","notes":"PASTRY PICK · Excellent with morning espresso","dishes":["Sfogliatella Riccia","Sfogliatella Frolla"],"maps":"https://www.google.com/maps/search/?api=1&query=Sfogliatelle%20Attanasio%20Naples","favorite":true},{"id":"naples-0926-lunch-tour","name":"Lunch included with your Pompeii + Vesuvius tour","city":"Naples","category":"Lunch","plannedDay":"2026-09-26","rank":1,"topPick":true,"price":"","mealWindow":"Booked excursion","notes":"This is the actual lunch plan today · Do not surface competing Naples lunch destinations","dishes":[],"maps":"https://www.google.com/maps/search/?api=1&query=Lunch%20included%20with%20your%20Pompeii%20%2B%20Vesuvius%20tour%20Naples","favorite":true},{"id":"naples-0926-dinner-mimi","name":"Mimì alla Ferrovia","city":"Naples","category":"Dinner","plannedDay":"2026-09-26","rank":1,"topPick":true,"price":"€€–€€€","mealWindow":"Final Naples Evening · Near Napoli Centrale","notes":"FAREWELL DINNER PICK · Strong final sit-down dinner in Italy","dishes":["Traditional Neapolitan Cuisine","Pasta","Seafood"],"maps":"https://www.google.com/maps/search/?api=1&query=Mim%C3%AC%20alla%20Ferrovia%20Naples","favorite":true},{"id":"naples-0926-dinner-tandem","name":"Tandem Ragù","city":"Naples","category":"Dinner","plannedDay":"2026-09-26","rank":2,"topPick":false,"price":"€€","mealWindow":"Historic Center","notes":"Prioritize if you have not yet had a proper slow-cooked Neapolitan ragù","dishes":["Ragù Napoletano","Pasta alla Genovese"],"maps":"https://www.google.com/maps/search/?api=1&query=Tandem%20Rag%C3%B9%20Naples"},{"id":"naples-0926-dinner-lazzara","name":"La Lazzara Trattoria e Pizzeria","city":"Naples","category":"Dinner","plannedDay":"2026-09-26","rank":3,"topPick":false,"price":"€€","mealWindow":"Municipio","notes":"Flexible broad-menu traditional option","dishes":["Traditional Pasta","Seafood","Pizza"],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Lazzara%20Trattoria%20e%20Pizzeria%20Naples"},{"id":"naples-0926-dinner-pescheria","name":"Pescheria Azzurra","city":"Naples","category":"Dinner","plannedDay":"2026-09-26","rank":4,"topPick":false,"price":"€–€€","mealWindow":"Pignasecca","notes":"Casual seafood-focused change of pace after pizza and heavy pasta","dishes":["Fried Seafood","Fresh Fish","Seafood Pasta"],"maps":"https://www.google.com/maps/search/?api=1&query=Pescheria%20Azzurra%20Naples"},{"id":"naples-0926-pizza-pellone","name":"Pizzeria Pellone","city":"Naples","category":"Small Bite","plannedDay":"2026-09-26","rank":5,"topPick":false,"price":"€","mealWindow":"Near Napoli Centrale","notes":"Old-school ruota-di-carro pizza alternative if you still want pizza","dishes":["Margherita","Ruota di Carro Pizza"],"maps":"https://www.google.com/maps/search/?api=1&query=Pizzeria%20Pellone%20Naples"},{"id":"naples-0926-bite-masardona","name":"La Masardona","city":"Naples","category":"Small Bite","plannedDay":"2026-09-26","rank":1,"topPick":true,"price":"€","mealWindow":"Near Napoli Centrale","notes":"PIZZA FRITTA PICK · Don’t miss if you have not tried proper pizza fritta elsewhere","dishes":["Pizza Fritta","Montanara"],"maps":"https://www.google.com/maps/search/?api=1&query=La%20Masardona%20Naples","favorite":true},{"id":"naples-0926-bite-figliole","name":"Antica Pizzeria De’ Figliole","city":"Naples","category":"Small Bite","plannedDay":"2026-09-26","rank":2,"topPick":false,"price":"€","mealWindow":"Forcella","notes":"Old-school fried-pizza specialist · Strong alternative to La Masardona","dishes":["Pizza Fritta"],"maps":"https://www.google.com/maps/search/?api=1&query=Antica%20Pizzeria%20De%E2%80%99%20Figliole%20Naples"},{"id":"naples-0926-bite-vomero","name":"Friggitoria Vomero","city":"Naples","category":"Small Bite","plannedDay":"2026-09-26","rank":3,"topPick":false,"price":"€","mealWindow":"ONLY IF ALREADY IN VOMERO","notes":"Neighborhood fried-food institution · Do not make a special trip solely for it","dishes":["Crocchè","Frittatine","Arancini"],"maps":"https://www.google.com/maps/search/?api=1&query=Friggitoria%20Vomero%20Naples"},{"id":"naples-0926-dessert-poppella","name":"Pasticceria Poppella","city":"Naples","category":"Dessert","plannedDay":"2026-09-26","rank":1,"topPick":true,"price":"€","mealWindow":"Sanità","notes":"Modern Naples pastry pick that adds variety beyond sfogliatella","dishes":["Fiocco di Neve"],"maps":"https://www.google.com/maps/search/?api=1&query=Pasticceria%20Poppella%20Naples","favorite":true},{"id":"naples-0926-dessert-gay-odin","name":"Gay-Odin","city":"Naples","category":"Dessert","plannedDay":"2026-09-26","rank":2,"topPick":false,"price":"€€","mealWindow":"Multiple Naples Locations","notes":"Historic chocolatier · Great when you have had enough traditional pastries","dishes":["Chocolate","Chocolate Gelato","Neapolitan Chocolate Specialties"],"maps":"https://www.google.com/maps/search/?api=1&query=Gay-Odin%20Naples"},{"id":"naples-0926-dessert-mary","name":"Sfogliatella Mary","city":"Naples","category":"Dessert","plannedDay":"2026-09-26","rank":3,"topPick":false,"price":"€","mealWindow":"Via Toledo / Galleria Umberto · CONVENIENCE BACKUP","notes":"Intentional legacy holdover · Use when nearby; Attanasio remains the pastry priority","dishes":["Sfogliatella Riccia"],"maps":"https://www.google.com/maps/search/?api=1&query=Sfogliatella%20Mary%20Naples"}];
const CITY_FOOD_EXTRAS={"Venice":{"signatures":["🥪 Bar All’Arco + Al Mercà Rialto food crawl","🦞 Seafood dinner at Osteria alle Testiere","🍮 Classic tiramisu at I Tre Mercanti","🍨 Suso — Crema del Doge","🌙 Cannaregio food night: Vino Vero → Al Timon → Osteria al Cicheto"],"skip":["Do not cross Venice solely for optional Dorsoduro food stops.","Skip very long queues at Suso or I Tre Mercanti; use them when the line is reasonable.","Restaurants in St. Mark’s Square with multilingual tourist menus or aggressive hosts.","Do not treat every recommendation as mandatory; prioritize what fits your current route and appetite."],"five":["🥪 Bar All’Arco + Al Mercà crawl","🦞 Osteria alle Testiere — special seafood dinner","🍮 I Tre Mercanti — classic tiramisu","🍨 Suso — Crema del Doge","🌙 Cannaregio food night"]},"Florence":{"signatures":["🥪 Schiacciata at I’ Girone De’ Ghiotti","🌭 Lampredotto at Sergio Pollini","🍗 Pollo al Burro at Trattoria Sostanza","🍨 Gelateria della Passera","🍷 Oltrarno wine experience at Le Volpi e l’Uva","🪟 Wine through a historic buchetta del vino","🥩 One dedicated Bistecca alla Fiorentina meal"],"skip":["Do not treat all 35 recommendations as itinerary stops.","Avoid obvious tourist-trap restaurants immediately surrounding major landmarks unless they independently earned a place in the guide.","Do not prioritize proximity over quality just because the hotel is beside the Duomo.","Do not visit every wine window; Babae and Cantina de’ Pucci are the priorities.","Do not overload September 19 before or after the booked 2:30 PM Tuscany Wine Experience."],"five":["🥪 I’ Girone De’ Ghiotti — schiacciata","🍗 Trattoria Sostanza — Pollo al Burro","🍝 Vini e Vecchi Sapori — traditional Tuscan dinner","🍨 Gelateria della Passera","🪟 Babae or Cantina de’ Pucci — wine window experience"]},"Rome":{"signatures":["🍝 Armando al Pantheon — classic Roman institution","🟠 Supplizio — classic supplì","🥪 Trapizzino — unique Roman street food","🍕 Pizzarium — pizza al taglio","🍨 Otaleg — artisanal gelato","🥐 Regoli — maritozzo","🍷 Il Goccetto / 🍸 Drink Kong — drinks"],"skip":["Rome strategy: use neighborhood picks first; use destination picks only when you deliberately want to make food the activity.","Do not wait an hour-plus for Da Enzo if the queue is ridiculous.","Do not force Testaccio into Sep 23; market stops are optional and daytime-sensitive.","Do not squeeze a major meal between the 9:00 AM Vatican Museums and 1:30 PM St. Peter’s tickets unless timing genuinely works.","Avoid generic tourist-menu restaurants immediately surrounding major landmarks."],"five":["🍝 Armando al Pantheon","🟠 Supplizio","🥪 Trapizzino","🍕 Pizzarium","🍨 Otaleg","🥐 Regoli","🍷 Il Goccetto / 🍸 Drink Kong"]},"Naples":{"signatures":["🍕 Starita — Montanara + pizza","🍕 Da Michele — classic Margherita","🍝 La Locanda Gesù Vecchio — ragù / Genovese","🥪 La Masardona — pizza fritta","🥐 Sfogliatelle Attanasio — sfogliatella","☕ Caffè Mexico — Neapolitan espresso","🏝️ Salumeria Da Aldo — Caprese panino","🍝 Verginiello — Ravioli Capresi"],"skip":["Naples strategy: sample different parts of Neapolitan food culture rather than using every meal opportunity for pizza.","Do not wait excessively at Da Michele or Sorbillo when excellent alternatives are nearby.","Capri: protect the 2:00 PM boat tour; favor Da Aldo or Al Buco when timing is tight.","Da Gelsomina is a special destination meal, not a default Capri lunch on this itinerary.","Friggitoria Vomero is only for when you are already in Vomero.","Sep 26 lunch is included with the Pompeii + Vesuvius excursion; do not plan another lunch."],"five":["🍕 Starita — Montanara + pizza","🍝 La Locanda Gesù Vecchio — traditional Naples dinner","🥪 La Masardona — pizza fritta","🥐 Sfogliatelle Attanasio + ☕ Caffè Mexico","🏝️ Salumeria Da Aldo / 🍝 Verginiello in Capri"]}};
const FLORENCE_FOOD_BUCKET=CITY_FOOD_EXTRAS.Florence.five;
const VENICE_FOOD_BUCKET=CITY_FOOD_EXTRAS.Venice.five;
const FOOD_GUIDE_VERSION=8;
function guideNameKey(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function guidePlaceKey(place){return `${place?.city||''}|${guideNameKey(place?.name)}`}
function normalizedGuidePlace(place){
  const notes=String(place?.notes||'');
  const official=!!place?.official||(/\bofficial pick\b/i.test(notes)&&!/rather than (?:an? )?official pick/i.test(notes));
  return {...place,official};
}
function ensureFoodGuides(){
  const curated=[...VENICE_FOOD_GUIDE,...FLORENCE_FOOD_GUIDE,...ROME_FOOD_GUIDE,...NAPLES_CAPRI_FOOD_GUIDE].map(normalizedGuidePlace);
  const storedVersion=Number(localStorage.getItem(P+'food-guide-version')||0);
  if(storedVersion<FOOD_GUIDE_VERSION){
    const next=curated.map(place=>({...place}));
    guideSave('guide-places',next);
    localStorage.setItem(P+'food-guide-version',String(FOOD_GUIDE_VERSION));
    return next;
  }
  const stored=guideLoad('guide-places',[]),normalized=stored.map(normalizedGuidePlace);
  if(normalized.some((place,index)=>place.official!==stored[index]?.official))guideSave('guide-places',normalized);
  return normalized;
}
function ensureVeniceFoodGuide(){return ensureFoodGuides()}
function foodRankLabel(place){const rank=place._displayRank||place.rank;return rank===1?'🥇 Top Pick':rank===2?'🥈 Alternative':'🥉 Another Option'}
function foodCategoryIcon(category){return ({Breakfast:'☕',Coffee:'☕',Lunch:'🍝','Small Bite':'🥪',Dinner:'🍽️',Gelato:'🍨',Dessert:'🍮',Pizza:'🍕',Bar:'🍷'})[category]||'🍴'}
function foodCategoryOrder(category){return ({Coffee:1,Breakfast:2,Lunch:3,'Small Bite':4,Pizza:5,Gelato:6,Dessert:7,Bar:8,Dinner:9})[category]||20}
function foodBucketState(city='Venice'){return guideLoad(`${city.toLowerCase()}-food-bucket`,{})}
function setFoodBucketState(value,city='Venice'){guideSave(`${city.toLowerCase()}-food-bucket`,value)}
const TODAY_FOOD_CITIES={
  '2026-09-17':['Venice','Florence'],
  '2026-09-20':['Florence','Rome'],
  '2026-09-24':['Rome','Naples'],
  '2026-09-25':['Capri','Naples']
};
function todayFoodHTML(day){
  const cities=TODAY_FOOD_CITIES[day.date]||[day.city];
  const places=ensureFoodGuides().filter(p=>p.plannedDay===day.date&&cities.includes(p.city));
  if(!places.length)return '';
  const grouped={};
  places.forEach(p=>{const key=`${p.city}|${p.category}`;(grouped[key]||=[]).push(p)});
  const groups=Object.entries(grouped).sort((a,b)=>cities.indexOf(a[1][0].city)-cities.indexOf(b[1][0].city)||foodCategoryOrder(a[1][0].category)-foodCategoryOrder(b[1][0].category));
  return `<section class="today-food-section">
    <div class="today-food-heading"><div><span>🍴</span><div><div class="focus-label">CURATED FOR ${cities.map(city=>city.toUpperCase()).join(' + ')}</div><h2>Today’s food suggestions</h2></div></div><button class="text-button" data-food-guide-city="${day.city}">View all</button></div>
    <div class="today-food-groups">${groups.map(([,group])=>{
      const items=group.sort((a,b)=>(a.rank||9)-(b.rank||9)||a.name.localeCompare(b.name)).map((p,index)=>({...p,_displayRank:index+1}));
      const top=items[0],alts=items.slice(1),category=top.category;
      return `<article class="today-food-group">
        <div class="today-food-category"><span>${foodCategoryIcon(category)}</span><div><strong>${cities.length>1?`${escapeHTML(top.city)} · `:''}${escapeHTML(category)}</strong><small>${escapeHTML(top.mealWindow||'')}</small></div></div>
        <div class="today-food-top"><div><span class="food-rank top">${foodRankLabel(top)}</span><h3>${escapeHTML(top.name)}</h3>${top.notes?`<p>${escapeHTML(top.notes)}</p>`:''}</div><a href="${escapeHTML(guideMapsUrl(top))}" target="_blank" rel="noopener">Maps</a></div>
        ${alts.length?`<div class="today-food-alts"><span>Alternatives</span>${alts.map(p=>`<a href="${escapeHTML(guideMapsUrl(p))}" target="_blank" rel="noopener"><strong>${escapeHTML(p.name)}</strong><small>${foodRankLabel(p)}</small></a>`).join('')}</div>`:''}
      </article>`;
    }).join('')}</div>
  </section>`;
}

function renderGuide(){
  ensureFoodGuides();
  const cities=['Venice','Florence','Rome','Naples','Capri'];
  const categories=['Breakfast','Coffee','Lunch','Small Bite','Dinner','Pizza','Gelato','Dessert','Bar','Shopping','Sightseeing','Other'];
  const expenseCategories=['Food','Transportation','Activities','Shopping','Hotel','Other'];
  const tripDays=trip.map(day=>({date:day.date,label:`${shortDate(day.date)} · ${day.city}`}));
  const todayTripDay=trip.find(day=>day.date===todayISO());
  let activeSection='places',activeCity='All',placeSearch='',editingPlaceId=null;
  let activeNearbyCity=['Venice','Florence','Rome','Naples','Capri'].includes(todayTripDay?.city)?todayTripDay.city:'Venice';
  let nearbyFilter='All',nearbySource='hotel',nearbyOrigin={...GUIDE_LOCATION_ANCHORS.hotels[activeNearbyCity]};

  qs('#guide').innerHTML=`
    <div class="section-title"><div><h2>Places & spending</h2><span class="small">Your personal city guide and trip expenses</span></div></div>
    <div class="guide-section-tabs">
      <button class="guide-section-tab active" data-guide-section="places">Places</button>
      <button class="guide-section-tab" data-guide-section="nearby">Nearby</button>
      <button class="guide-section-tab" data-guide-section="spending">Spending</button>
    </div>

    <section id="guidePlacesSection">
      <div class="guide-toolbar">
        <label class="guide-search"><span>⌕</span><input id="placeSearch" type="search" placeholder="Search saved places"></label>
        <button class="primary guide-add-place" id="openPlaceEditor">＋ Add place</button>
      </div>
      <div class="guide-tabs guide-city-tabs">
        ${['All',...cities].map((c,i)=>`<button class="chip ${i===0?'active':''}" data-guide-city="${c}">${c}</button>`).join('')}
      </div>
      <div id="guidePlacesSummary"></div>
      <div id="guideCards"></div>
    </section>


    <section id="guideNearbySection" class="hidden">
      <section class="nearby-hero">
        <div class="focus-label">NEARBY GUIDE</div>
        <h2>Best saved places around you</h2>
        <p>See only your curated recommendations, sorted by approximate distance. Your live location is used temporarily and is never saved.</p>
      </section>
      <div class="nearby-source-grid">
        <button class="primary" id="nearbyUseLocation">⌖ Use my location</button>
        <button class="secondary" data-nearby-source="hotel">🏨 Near hotel</button>
        <button class="secondary" data-nearby-source="plan">📅 Near today’s plan</button>
      </div>
      <div class="guide-tabs nearby-city-tabs">
        ${cities.map(city=>`<button class="chip ${city===activeNearbyCity?'active':''}" data-nearby-city="${city}">${city}</button>`).join('')}
      </div>
      <div class="filters nearby-filter-tabs">
        ${['All','Meals','Quick','Drinks','Official'].map((filter,i)=>`<button class="chip ${i===0?'active':''}" data-nearby-filter="${filter}">${filter}</button>`).join('')}
      </div>
      <div id="nearbyStatus" class="nearby-status" aria-live="polite"></div>
      <div id="nearbyResults"></div>
    </section>

    <section id="guideSpendingSection" class="hidden">
      <div class="expense-summary-grid" id="expenseSummary"></div>
      <div class="expense-card expense-upgraded">
        <div class="expense-form upgraded">
          <label><span>Name</span><input id="expenseName" placeholder="Dinner in Rome"></label>
          <label><span>Amount (€)</span><input id="expenseAmount" inputmode="decimal" type="number" min="0" step="0.01" placeholder="0.00"></label>
          <label><span>Category</span><select id="expenseCategory">${expenseCategories.map(x=>`<option>${x}</option>`).join('')}</select></label>
          <label><span>City</span><select id="expenseCity"><option>General</option>${cities.map(x=>`<option>${x}</option>`).join('')}</select></label>
          <label><span>Date</span><span class="date-input-shell"><input id="expenseDate" type="date"></span></label>
          <label><span>Payment</span><select id="expensePayment"><option>Credit card</option><option>Cash</option><option>Debit card</option><option>Other</option></select></label>
        </div>
        <button class="primary expense-save" id="addExpense">Add expense</button>
      </div>
      <div class="expense-filter-row">
        <select id="expenseFilter"><option value="All">All categories</option>${expenseCategories.map(x=>`<option>${x}</option>`).join('')}</select>
        <button class="secondary" id="clearExpenses">Clear all</button>
      </div>
      <div id="expenseBreakdown"></div>
      <div id="expenseList"></div>
    </section>

    <div class="place-editor-overlay hidden" id="placeEditorOverlay">
      <div class="place-editor-sheet" role="dialog" aria-modal="true" aria-labelledby="placeEditorTitle">
        <div class="ticket-import-head"><div><div class="focus-label">PERSONAL CITY GUIDE</div><h2 id="placeEditorTitle">Add place</h2></div><button class="ticket-close" id="closePlaceEditor" aria-label="Close">×</button></div>
        <div class="place-editor-grid">
          <div class="maps-paste-box full">
            <label class="ticket-field"><span>Paste Google Maps link</span><input id="placeMapsPaste" inputmode="url" placeholder="Paste a shared Google Maps link"></label>
            <button class="secondary" id="fillPlaceFromMaps" type="button">Fill place</button>
            <small>The Maps link is saved automatically. Full Google Maps links can also fill the name and city; shortened links may still need those details entered manually.</small>
          </div>
          <label class="ticket-field full"><span>Place name</span><input id="placeName" placeholder="Restaurant, café or attraction"></label>
          <label class="ticket-field"><span>City</span><select id="placeCity">${cities.map(x=>`<option>${x}</option>`).join('')}</select></label>
          <label class="ticket-field"><span>Category</span><select id="placeCategory">${categories.map(x=>`<option>${x}</option>`).join('')}</select></label>
          <label class="ticket-field full"><span>Notes</span><textarea id="placeNotes" placeholder="What to order, reservation time, neighborhood, dress code..."></textarea></label>
          <label class="ticket-field full"><span>Google Maps link (optional)</span><input id="placeMaps" inputmode="url" placeholder="Leave blank to search by name"></label>
          <label class="ticket-field"><span>Phone (optional)</span><input id="placePhone" inputmode="tel" placeholder="+39 ..."></label>
          <label class="ticket-field"><span>Website (optional)</span><input id="placeWebsite" inputmode="url" placeholder="restaurant.com"></label>
          <label class="ticket-field full"><span>Planned day (optional)</span><select id="placeDay"><option value="">Not scheduled</option>${tripDays.map(x=>`<option value="${x.date}">${x.label}</option>`).join('')}</select></label>
          <label class="form-check full"><input class="form-check-input" id="placeFavorite" type="checkbox"><span class="form-check-label">Mark as favorite</span></label>
        </div>
        <div class="ticket-import-message" id="placeEditorMessage" aria-live="polite"></div>
        <button class="primary ticket-save" id="savePlace">Save place</button>
      </div>
    </div>`;

  const placesSection=qs('#guidePlacesSection'), nearbySection=qs('#guideNearbySection'), spendingSection=qs('#guideSpendingSection');
  const selectGuideSection=section=>{
    activeSection=section;
    qsa('[data-guide-section]').forEach(x=>x.classList.toggle('active',x.dataset.guideSection===section));
    placesSection.classList.toggle('hidden',section!=='places');
    nearbySection.classList.toggle('hidden',section!=='nearby');
    spendingSection.classList.toggle('hidden',section!=='spending');
    if(section==='nearby')renderNearby();
  };
  qsa('[data-guide-section]').forEach(button=>button.addEventListener('click',()=>selectGuideSection(button.dataset.guideSection)));


  const nearbyMatchesFilter=place=>{
    if(nearbyFilter==='Official')return !!place.official;
    if(nearbyFilter==='Meals')return ['Breakfast','Lunch','Dinner','Pizza'].includes(place.category);
    if(nearbyFilter==='Quick')return ['Coffee','Gelato','Dessert','Small Bite'].includes(place.category);
    if(nearbyFilter==='Drinks')return place.category==='Bar';
    return true;
  };
  const nearbyDedupedPlaces=()=>{
    const selected=guideLoad('guide-places',[]).filter(place=>place.city===activeNearbyCity&&nearbyMatchesFilter(place));
    const unique=new Map();
    selected.forEach(place=>{
      const key=guidePlaceKey(place);
      const existing=unique.get(key);
      if(!existing){unique.set(key,{...place,_categories:new Set([place.category]),_days:new Set(place.plannedDay?[place.plannedDay]:[])});return}
      existing._categories.add(place.category);if(place.plannedDay)existing._days.add(place.plannedDay);
      const currentScore=Number(existing.official)*100+Number(existing.favorite)*20+(10-(existing.rank||9));
      const nextScore=Number(place.official)*100+Number(place.favorite)*20+(10-(place.rank||9));
      if(nextScore>currentScore)Object.assign(existing,{...place,_categories:existing._categories,_days:existing._days});
    });
    return [...unique.values()];
  };
  const renderNearby=()=>{
    const status=qs('#nearbyStatus'),results=qs('#nearbyResults');
    if(!nearbyOrigin){status.innerHTML='<strong>Choose a starting point</strong><span>Use your location, hotel, or today’s plan.</span>';results.innerHTML='';return}
    const sourceLabel=nearbyOrigin.label||(nearbySource==='current'?'Your current location':'Selected starting point');
    const candidates=nearbyDedupedPlaces().map(place=>{const point=guideCoordinates(place);return point?{place,point,distance:guideDistanceKm(nearbyOrigin,point)}:null}).filter(Boolean).sort((a,b)=>Number(a.point.approximate)-Number(b.point.approximate)||a.distance-b.distance);
    const exactCount=candidates.filter(item=>!item.point.approximate).length,estimateCount=candidates.length-exactCount;
    status.innerHTML=`<div><strong>Near ${escapeHTML(sourceLabel)}</strong><span>${escapeHTML(activeNearbyCity)} · approximate distance; Maps provides the exact route</span></div><span>${candidates.length} places · ${exactCount} exact${estimateCount?` · ${estimateCount} area estimate${estimateCount===1?'':'s'}`:''}</span>`;
    results.innerHTML=candidates.length?`<div class="nearby-list">${candidates.map((item,index)=>{
      const p=item.place,categories=[...p._categories],days=[...p._days].sort();
      return `<article class="nearby-card">
        <div class="nearby-card-top"><div class="nearby-distance"><strong>${index+1}</strong><span>${item.point.approximate?'Area estimate · ':''}${escapeHTML(guideDistanceLabel(item.distance))}</span></div><div>${item.point.approximate?'<span class="nearby-estimate">Area estimate</span>':''}${p.official?'<span class="nearby-official">Official Pick</span>':''}</div></div>
        <div class="guide-place-kicker">${escapeHTML(p.city)} · ${categories.map(category=>`${foodCategoryIcon(category)} ${escapeHTML(category)}`).join(' · ')}</div>
        <h3>${escapeHTML(p.name)}</h3>
        <div class="food-place-meta">${p.price?`<span>💰 ${escapeHTML(p.price)}</span>`:''}${p.favorite?'<span>★ Favorite</span>':''}${p.worthDetour?`<span>⭐ Worth a Detour: ${escapeHTML(p.worthDetour)}</span>`:''}</div>
        ${p.notes?`<p>${escapeHTML(p.notes)}</p>`:''}
        ${p.dishes?.length?`<div class="nearby-dishes">${p.dishes.slice(0,3).map(dish=>`<span>${escapeHTML(dish)}</span>`).join('')}</div>`:''}
        ${days.length?`<div class="nearby-days">Planned ${days.map(shortDate).join(' · ')}</div>`:''}
        <div class="guide-place-actions nearby-actions"><a class="primary" href="${escapeHTML(guideDirectionsUrl(p,nearbyOrigin))}" target="_blank" rel="noopener">Walking directions</a><button class="secondary" data-nearby-view="${escapeHTML(p.id)}">View in Guide</button></div>
      </article>`;
    }).join('')}</div>`:`<div class="guide-empty"><strong>No nearby matches</strong><span>Try another filter or city.</span></div>`;
    qsa('[data-nearby-view]').forEach(button=>button.addEventListener('click',()=>{
      const place=guideLoad('guide-places',[]).find(item=>item.id===button.dataset.nearbyView);if(!place)return;
      selectGuideSection('places');activeCity=place.city;qsa('[data-guide-city]').forEach(x=>x.classList.toggle('active',x.dataset.guideCity===activeCity));
      placeSearch=place.name.toLowerCase();qs('#placeSearch').value=place.name;renderPlaces();
    }));
  };

  const guideContextLabel=place=>({
    'rome-0922-bite-pizzarium':'Vatican / Prati quick food','rome-0922-bite-panificio-bonci':'Vatican / Prati quick food',
    'rome-0922-pizza-elementare':'Trastevere pizza','rome-0922-pizza-ai-marmi':'Trastevere pizza','rome-0922-pizza-renella':'Trastevere pizza','rome-0922-pizza-seu':'Trastevere pizza',
    'rome-0922-bite-suppli-roma':'Trastevere street food','rome-0922-bite-trapizzino':'Trastevere street food','rome-0922-bite-iacozzilli':'Trastevere street food',
    'rome-0922-gelato-gracchi':'Prati gelato','rome-0922-gelato-neve':'Prati gelato','rome-0922-gelato-otaleg':'Trastevere gelato',
    'rome-0923-bite-mozzico':'Central Rome quick bites','rome-0923-bite-forno-campo':'Central Rome quick bites','rome-0923-bite-filettaro':'Central Rome quick bites',
    'rome-0923-bite-casa-manco':'Testaccio market bites','rome-0923-bite-mordi-vai':'Testaccio market bites',
    'rome-0923-dinner-felice':'Testaccio / Ostiense dinner','rome-0923-dinner-flavio':'Testaccio / Ostiense dinner','rome-0923-dinner-scopettaro':'Testaccio / Ostiense dinner','rome-0923-dinner-pennestri':'Testaccio / Ostiense dinner',
    'rome-0923-dinner-sostegno':'Pantheon dinner'
  })[place.id]||'';
  const collapseGuidePlaces=items=>{
    const unique=new Map();
    items.forEach(place=>{
      const key=guidePlaceKey(place),existing=unique.get(key);
      if(!existing){unique.set(key,{...place,_ids:[place.id],_plannedDays:place.plannedDay?[place.plannedDay]:[]});return}
      existing._ids.push(place.id);
      if(place.plannedDay&&!existing._plannedDays.includes(place.plannedDay))existing._plannedDays.push(place.plannedDay);
      existing.favorite=existing.favorite||place.favorite;existing.official=existing.official||place.official;existing.topPick=existing.topPick||place.topPick;
    });
    return [...unique.values()].map(place=>({...place,_plannedDays:place._plannedDays.sort()}));
  };
  const renderPlaces=()=>{
    const places=guideLoad('guide-places',[]);
    const filtered=places.filter(p=>(activeCity==='All'||p.city===activeCity||(activeCity==='Naples'&&p.city==='Capri'))&&(!placeSearch||`${p.name} ${p.city} ${p.category} ${p.notes||''}`.toLowerCase().includes(placeSearch)));
    const uniquePlaces=collapseGuidePlaces(places),favorites=uniquePlaces.filter(p=>p.favorite).length;
    qs('#guidePlacesSummary').innerHTML=`<div class="guide-mini-summary"><span><strong>${uniquePlaces.length}</strong> saved</span><span><strong>${favorites}</strong> favorite${favorites===1?'':'s'}</span></div>`;
    const sorted=[...filtered].sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.city.localeCompare(b.city)||foodCategoryOrder(a.category)-foodCategoryOrder(b.category)||(a.rank||9)-(b.rank||9)||a.name.localeCompare(b.name));
    const placeCard=p=>{
      const plannedDays=p._plannedDays||(p.plannedDay?[p.plannedDay]:[]),ids=p._ids||[p.id],displayRank=p._displayRank||p.rank;
      return `<article class="guide-place-card ${p.topPick?'curated-top-pick':''}">
        <div class="guide-place-head">
          <div><div class="guide-place-kicker">${escapeHTML(p.city)} · ${foodCategoryIcon(p.category)} ${escapeHTML(p.category)}</div><h3>${escapeHTML(p.name)}</h3></div>
          <button class="favorite-button ${p.favorite?'active':''}" data-favorite-place="${p.id}" data-place-ids="${escapeHTML(ids.join(','))}" aria-label="${p.favorite?'Remove favorite':'Add favorite'}">★</button>
        </div>
        ${displayRank?`<div class="food-rank ${displayRank===1?'top':''}">${foodRankLabel({...p,_displayRank:displayRank})}${p.rating?` · ${'⭐'.repeat(p.rating)}`:''}${p.official?' · Official Pick':''}</div>`:''}
        <div class="food-place-meta">${p.mealWindow?`<span>🕐 ${escapeHTML(p.mealWindow)}</span>`:''}${p.price?`<span>💰 ${escapeHTML(p.price)}</span>`:''}${p.worthDetour?`<span>⭐ Worth a Detour: ${escapeHTML(p.worthDetour)}</span>`:''}${p.reservation?`<span>⚠️ Reservation ${escapeHTML(p.reservation.toLowerCase())}</span>`:''}${p.official?`<span>✅ Official Pick</span>`:''}</div>
        ${p.why?`<div class="food-why"><strong>Why I picked it</strong><p>${escapeHTML(p.why)}</p></div>`:''}
        ${p.notes?`<p>${escapeHTML(p.notes)}</p>`:''}
        ${p.dishes?.length?`<div class="food-dishes"><strong>Recommended</strong><div>${p.dishes.map(x=>`<span>${escapeHTML(x)}</span>`).join('')}</div></div>`:''}
        ${plannedDays.length?`<div class="guide-planned-day">Planned ${plannedDays.map(shortDate).join(' · ')} · ${escapeHTML(p.city)}</div>`:''}
        <div class="guide-place-actions">
          <a class="primary" href="${escapeHTML(guideMapsUrl(p))}" target="_blank" rel="noopener">Maps</a>
          ${p.phone?`<a class="secondary" href="tel:${escapeHTML(p.phone.replace(/[^+\d]/g,''))}">Call</a>`:''}
          ${p.website?`<a class="secondary" href="${escapeHTML(normalizeWebUrl(p.website))}" target="_blank" rel="noopener">Website</a>`:''}
          <button class="secondary" data-edit-place="${p.id}">Edit</button>
          <button class="secondary danger-text" data-delete-place="${p.id}" data-place-ids="${escapeHTML(ids.join(','))}">Delete</button>
        </div>
      </article>`;
    };
    if(sorted.length&&['Venice','Florence','Rome','Naples'].includes(activeCity)&&!placeSearch){
      const dateRange=activeCity==='Venice'?'September 15–17':activeCity==='Florence'?'September 17–20':activeCity==='Rome'?'September 20–24':'September 24–26';
      const companionName=activeCity==='Naples'?'Naples & Capri':activeCity;
      const extras=CITY_FOOD_EXTRAS[activeCity];
      const dated=sorted.filter(p=>p.plannedDay).sort((a,b)=>a.plannedDay.localeCompare(b.plannedDay)||foodCategoryOrder(a.category)-foodCategoryOrder(b.category)||(a.rank||9)-(b.rank||9));
      const unscheduled=sorted.filter(p=>!p.plannedDay).sort((a,b)=>foodCategoryOrder(a.category)-foodCategoryOrder(b.category)||a.name.localeCompare(b.name));
      const days=[...new Set(dated.map(p=>p.plannedDay))];
      const dayTitle=date=>({
        '2026-09-15':'Arrival Day','2026-09-16':'Full Venice Day','2026-09-17':activeCity==='Venice'?'Departure to Florence':'Arrival in Florence','2026-09-18':'Major Florence Sightseeing Day','2026-09-19':'Tuscany Wine Experience Day','2026-09-20':activeCity==='Florence'?'Departure for Rome':'Arrival + Historic Rome','2026-09-21':'Ancient Rome + Monti','2026-09-22':'Vatican + Trastevere','2026-09-23':'North-Central + Ghetto + Aventine','2026-09-24':activeCity==='Rome'?'Departure to Naples':'Arrival + Historic Naples','2026-09-25':'Capri Day + Back in Naples','2026-09-26':'Pompeii + Vesuvius + Final Naples Evening'
      })[date]||'';
      const bucket=foodBucketState(activeCity);
      qs('#guideCards').innerHTML=`<section class="venice-food-intro"><div><span>🇮🇹</span><div><div class="focus-label">${companionName.toUpperCase()} FOOD COMPANION</div><h2>${companionName}</h2><p>Your day-by-day food plan for ${dateRange}.</p></div></div></section>
        <div class="food-day-list">${days.map(date=>{
          const dayPlaces=dated.filter(p=>p.plannedDay===date),grouped={};
          dayPlaces.forEach(p=>{const context=guideContextLabel(p),key=`${p.category}|${context}`;(grouped[key]||=[]).push(p)});
          const ordered=Object.keys(grouped).sort((a,b)=>foodCategoryOrder(grouped[a][0].category)-foodCategoryOrder(grouped[b][0].category));
          return `<section class="food-day-section"><div class="food-day-heading"><div><span>📅</span><div><small>${shortDate(date)}</small><h3>${dayTitle(date)}</h3></div></div></div>${ordered.map(key=>{const group=grouped[key].sort((a,b)=>(a.rank||9)-(b.rank||9)||a.name.localeCompare(b.name)).map((p,index)=>({...p,_displayRank:index+1})),category=group[0].category,label=guideContextLabel(group[0])||group[0].mealWindow?.split(' · ')[0]||category;return `<details class="food-category-section" open><summary><span>${foodCategoryIcon(category)}</span><strong>${escapeHTML(label)}</strong><small>${group.length} choice${group.length===1?'':'s'}</small><b>⌄</b></summary><div class="food-category-cards">${group.map(placeCard).join('')}</div></details>`}).join('')}</section>`;
        }).join('')}</div>
        ${unscheduled.length?`<section class="food-day-section food-unscheduled-section"><div class="food-day-heading"><div><span>📌</span><div><small>Saved for ${escapeHTML(companionName)}</small><h3>Unscheduled places</h3></div></div><span class="food-unscheduled-count">${unscheduled.length}</span></div><p class="food-unscheduled-note">These places are saved but do not have a planned day yet. Edit a place to add it to a specific date.</p><div class="food-category-cards">${unscheduled.map(placeCard).join('')}</div></section>`:''}
        <section class="food-companion-box"><h3>🏆 ${companionName} Signature Experiences</h3>${extras.signatures.map(x=>`<div>${escapeHTML(x)}</div>`).join('')}</section>
        <section class="food-companion-box skip"><h3>🚫 ${companionName} Skip List</h3>${extras.skip.map(x=>`<div>❌ ${escapeHTML(x)}</div>`).join('')}</section>
        <section class="food-passport"><div class="food-passport-head"><span>⭐</span><div><h3>If You Only Do Five Food Things</h3><small>Your essential ${companionName} food list</small></div></div>${extras.five.map((item,i)=>`<label class="food-passport-item"><input type="checkbox" data-food-bucket="${escapeHTML(item)}" ${bucket[item]?'checked':''}><span><b>${i+1}.</b> ${escapeHTML(item)}</span></label>`).join('')}</section>`;
      qsa('[data-food-bucket]').forEach(box=>box.addEventListener('change',()=>{const state=foodBucketState(activeCity);state[box.dataset.foodBucket]=box.checked;setFoodBucketState(state,activeCity)}));
    }else{
      const displayPlaces=collapseGuidePlaces(sorted);
      qs('#guideCards').innerHTML=displayPlaces.length?displayPlaces.map(placeCard).join(''):`<div class="guide-empty"><strong>${places.length?'No matching places':'No saved places yet'}</strong><span>${places.length?'Try another city or search.':'Add restaurants, cafés, gelato shops and sights you want handy during the trip.'}</span></div>`;
    }

    qsa('[data-favorite-place]').forEach(btn=>btn.addEventListener('click',()=>{
      const items=guideLoad('guide-places',[]),ids=(btn.dataset.placeIds||btn.dataset.favoritePlace).split(','),matches=items.filter(x=>ids.includes(x.id));if(!matches.length)return;
      const next=!matches.some(item=>item.favorite);matches.forEach(item=>item.favorite=next);guideSave('guide-places',items);renderPlaces();
    }));
    qsa('[data-delete-place]').forEach(btn=>btn.addEventListener('click',()=>{
      const items=guideLoad('guide-places',[]),ids=(btn.dataset.placeIds||btn.dataset.deletePlace).split(','),item=items.find(x=>ids.includes(x.id));if(!item)return;
      if(!confirm(`Delete ${item.name}${ids.length>1?' from all planned days':''}?`))return;
      guideSave('guide-places',items.filter(x=>!ids.includes(x.id)));renderPlaces();
    }));
    qsa('[data-edit-place]').forEach(btn=>btn.addEventListener('click',()=>openPlaceEditor(btn.dataset.editPlace)));
  };


  qsa('[data-nearby-city]').forEach(button=>button.addEventListener('click',()=>{
    activeNearbyCity=button.dataset.nearbyCity;qsa('[data-nearby-city]').forEach(x=>x.classList.toggle('active',x===button));
    if(nearbySource!=='current')nearbyOrigin=nearbySource==='plan'?guidePlanOrigin(activeNearbyCity):{...GUIDE_LOCATION_ANCHORS.hotels[activeNearbyCity]};
    renderNearby();
  }));
  qsa('[data-nearby-filter]').forEach(button=>button.addEventListener('click',()=>{
    nearbyFilter=button.dataset.nearbyFilter;qsa('[data-nearby-filter]').forEach(x=>x.classList.toggle('active',x===button));renderNearby();
  }));
  qsa('[data-nearby-source]').forEach(button=>button.addEventListener('click',()=>{
    nearbySource=button.dataset.nearbySource;nearbyOrigin=nearbySource==='plan'?guidePlanOrigin(activeNearbyCity):{...GUIDE_LOCATION_ANCHORS.hotels[activeNearbyCity]};renderNearby();
  }));
  qs('#nearbyUseLocation').addEventListener('click',()=>{
    const status=qs('#nearbyStatus');
    if(!navigator.geolocation){status.innerHTML='<strong>Location is not available</strong><span>Use Near hotel or Near today’s plan instead.</span>';return}
    status.innerHTML='<strong>Finding your location…</strong><span>Your position is used only for this nearby list.</span>';
    navigator.geolocation.getCurrentPosition(position=>{
      nearbySource='current';nearbyOrigin={lat:position.coords.latitude,lng:position.coords.longitude,label:'your current location'};
      activeNearbyCity=nearestGuideCity(nearbyOrigin);qsa('[data-nearby-city]').forEach(x=>x.classList.toggle('active',x.dataset.nearbyCity===activeNearbyCity));renderNearby();
    },error=>{
      const message=error.code===1?'Location permission was denied.':'Your location could not be determined.';
      status.innerHTML=`<strong>${message}</strong><span>Use Near hotel or Near today’s plan instead.</span>`;
    },{enableHighAccuracy:true,timeout:12000,maximumAge:300000});
  });

  qsa('[data-guide-city]').forEach(btn=>btn.addEventListener('click',()=>{
    activeCity=btn.dataset.guideCity;qsa('[data-guide-city]').forEach(x=>x.classList.toggle('active',x===btn));renderPlaces();
  }));
  qs('#placeSearch').addEventListener('input',e=>{placeSearch=e.target.value.trim().toLowerCase();renderPlaces()});

  const overlay=qs('#placeEditorOverlay');
  const openPlaceEditor=id=>{
    editingPlaceId=id||null;
    const item=id?guideLoad('guide-places',[]).find(x=>x.id===id):null;
    qs('#placeEditorTitle').textContent=item?'Edit place':'Add place';
    qs('#placeMapsPaste').value='';
    qs('#placeName').value=item?.name||'';qs('#placeCity').value=item?.city||(activeCity==='All'?'Venice':activeCity);
    qs('#placeCategory').value=item?.category||'Dinner';qs('#placeNotes').value=item?.notes||'';qs('#placeMaps').value=item?.maps||'';
    qs('#placePhone').value=item?.phone||'';qs('#placeWebsite').value=item?.website||'';qs('#placeDay').value=item?.plannedDay||'';qs('#placeFavorite').checked=!!item?.favorite;
    qs('#placeEditorMessage').textContent='';overlay.classList.remove('hidden');setTimeout(()=>qs('#placeName').focus(),50);
  };
  qs('#fillPlaceFromMaps').addEventListener('click',()=>{
    const parsed=parseGoogleMapsShare(qs('#placeMapsPaste').value);
    const message=qs('#placeEditorMessage');
    if(!parsed){message.textContent='Paste a Google Maps link first.';return}
    qs('#placeMaps').value=parsed.maps;
    if(parsed.name&&!qs('#placeName').value.trim())qs('#placeName').value=parsed.name;
    if(parsed.city)qs('#placeCity').value=parsed.city;
    message.textContent=parsed.needsDetails
      ? 'Maps link added. Shortened links do not expose all place details, so confirm the name and city.'
      : 'Maps link added and available details filled in. Review before saving.';
  });
  qs('#placeMapsPaste').addEventListener('paste',()=>setTimeout(()=>qs('#fillPlaceFromMaps').click(),0));

  qs('#openPlaceEditor').addEventListener('click',()=>openPlaceEditor());
  qs('#closePlaceEditor').addEventListener('click',()=>overlay.classList.add('hidden'));
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.add('hidden')});
  qs('#savePlace').addEventListener('click',()=>{
    const name=qs('#placeName').value.trim();if(!name){qs('#placeEditorMessage').textContent='Enter a place name.';return}
    const items=guideLoad('guide-places',[]),city=qs('#placeCity').value,maps=qs('#placeMaps').value.trim();
    const existing=editingPlaceId?items.find(x=>x.id===editingPlaceId):null;
    if(!editingPlaceId){
      const duplicate=items.find(item=>item.city===city&&(guideNameKey(item.name)===guideNameKey(name)||(maps&&item.maps&&item.maps===maps)));
      if(duplicate){qs('#placeEditorMessage').textContent=`${duplicate.name} is already saved in ${city}. Edit the existing place instead.`;return}
    }
    const value={...(existing||{}),id:editingPlaceId||guideUid(),name,city,category:qs('#placeCategory').value,notes:qs('#placeNotes').value.trim(),maps,phone:qs('#placePhone').value.trim(),website:qs('#placeWebsite').value.trim(),plannedDay:qs('#placeDay').value,favorite:qs('#placeFavorite').checked};
    const index=items.findIndex(x=>x.id===editingPlaceId);if(index>=0)items[index]=value;else items.push(value);
    guideSave('guide-places',items);overlay.classList.add('hidden');activeCity=value.city;qsa('[data-guide-city]').forEach(x=>x.classList.toggle('active',x.dataset.guideCity===activeCity));renderPlaces();
  });
  renderPlaces();

  qs('#expenseDate').value=todayISO();
  let expenseFilter='All';
  const getRate=()=>Number(localStorage.getItem(P+'currency-rate'))||1.15;
  const loadExpenses=()=>{
    let items=guideLoad('expenses',[]).map((x,i)=>({id:x.id||`legacy-${i}`,name:x.name||'Expense',amount:Number(x.amount)||0,category:x.category||'Other',city:x.city||'General',date:x.date||'',payment:x.payment||'Other',createdAt:x.createdAt||i}));
    guideSave('expenses',items);
    const visible=expenseFilter==='All'?items:items.filter(x=>x.category===expenseFilter);
    const total=items.reduce((n,x)=>n+x.amount,0),rate=getRate(),usd=total*rate;
    qs('#expenseSummary').innerHTML=`
      <div class="expense-stat"><span>Trip total</span><strong>€${total.toFixed(2)}</strong></div>
      <div class="expense-stat"><span>Estimated USD</span><strong>$${usd.toFixed(2)}</strong><small>Rate ${rate.toFixed(4)}</small></div>
      <div class="expense-stat"><span>Entries</span><strong>${items.length}</strong></div>`;
    const categoryTotals=expenseCategories.map(cat=>({cat,total:items.filter(x=>x.category===cat).reduce((n,x)=>n+x.amount,0)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
    qs('#expenseBreakdown').innerHTML=categoryTotals.length?`<div class="expense-breakdown"><h3>By category</h3>${categoryTotals.map(x=>`<div><span>${x.cat}</span><strong>€${x.total.toFixed(2)}</strong></div>`).join('')}</div>`:'';
    const sorted=[...visible].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||Number(b.createdAt)-Number(a.createdAt));
    qs('#expenseList').innerHTML=sorted.length?sorted.map(x=>`<article class="expense-item">
      <div><strong>${escapeHTML(x.name)}</strong><span>${escapeHTML(x.category)} · ${escapeHTML(x.city)}${x.date?` · ${shortDate(x.date)}`:''}</span><small>${escapeHTML(x.payment)}</small></div>
      <div class="expense-item-amount"><strong>€${x.amount.toFixed(2)}</strong><span>$${(x.amount*rate).toFixed(2)}</span><button class="danger-text" data-delete-expense="${x.id}">Delete</button></div>
    </article>`).join(''):`<div class="guide-empty"><strong>No expenses ${expenseFilter==='All'?'logged':'in this category'}</strong><span>Add an expense above to start tracking your trip spending.</span></div>`;
    qsa('[data-delete-expense]').forEach(btn=>btn.addEventListener('click',()=>{
      const current=guideLoad('expenses',[]), item=current.find(x=>String(x.id)===btn.dataset.deleteExpense);if(!item)return;
      if(!confirm(`Delete ${item.name}?`))return;guideSave('expenses',current.filter(x=>String(x.id)!==btn.dataset.deleteExpense));loadExpenses();
    }));
  };
  qs('#addExpense').addEventListener('click',()=>{
    const name=qs('#expenseName').value.trim(),amount=Number(qs('#expenseAmount').value);
    if(!name||!Number.isFinite(amount)||amount<=0){alert('Enter an expense name and an amount greater than zero.');return}
    const items=guideLoad('expenses',[]);items.push({id:guideUid(),name,amount,category:qs('#expenseCategory').value,city:qs('#expenseCity').value,date:qs('#expenseDate').value,payment:qs('#expensePayment').value,createdAt:Date.now()});guideSave('expenses',items);
    qs('#expenseName').value='';qs('#expenseAmount').value='';loadExpenses();
  });
  qs('#expenseFilter').addEventListener('change',e=>{expenseFilter=e.target.value;loadExpenses()});
  qs('#clearExpenses').addEventListener('click',()=>{const items=guideLoad('expenses',[]);if(!items.length)return;if(confirm('Delete every logged expense?')){guideSave('expenses',[]);loadExpenses()}});
  loadExpenses();
}
async function renderBookings(){
  let imported=[];
  try{imported=await getImportedTickets()}catch(error){console.error("Ticket database unavailable",error)}
  const linked={};
  imported.filter(item=>item.linkedWalletKey).forEach(item=>(linked[item.linkedWalletKey]||=[]).push(item));

  const hotelMaps={
    Venice:"https://www.google.com/maps/search/?api=1&query=Rio+Hotel+Venice",
    Florence:"https://www.google.com/maps/search/?api=1&query=B%26B+A+Florence+View",
    Rome:"https://www.google.com/maps/search/?api=1&query=Temple+View+GuestHouse+Rome",
    Naples:"https://www.google.com/maps/search/?api=1&query=Napolinn+B%26B+Naples"
  };

  const groupCategory={Flights:"Transportation",Trains:"Transportation",Ferries:"Transportation",Attractions:"Attractions & tours",Tours:"Attractions & tours"};
  const allReservations=wallet.flatMap(group=>group.items.map(item=>{
    const files=linked[walletItemKey(group.group,item)]||[];
    const isToBook=item.status==="To book";
    const isPending=item.status==="Ticket needed";
    return {
      ...item,
      group:group.group,
      icon:group.icon,
      category:groupCategory[group.group]||group.group,
      files,
      state:isToBook?"to-book":isPending?"pending":files.length?"ready":"booked"
    };
  }));

  const hotelsReady=hotels.length;
  const ready=allReservations.filter(x=>x.state==="ready").length;
  const booked=allReservations.filter(x=>x.state==="booked").length;
  const pending=allReservations.filter(x=>x.state==="pending").length;
  const toBook=allReservations.filter(x=>x.state==="to-book").length;
  const total=hotelsReady+allReservations.length;
  const complete=hotelsReady+ready+booked+pending;
  const progress=Math.round((complete/Math.max(total,1))*100);

  const attention=[
    ...allReservations.filter(x=>x.state==="to-book"),
    ...remaining.filter(r=>!allReservations.some(x=>x.title.toLowerCase().includes(r[0].split(" / ")[0].toLowerCase()))).map(r=>({
      title:r[0],date:"",time:"",note:r[1],state:"to-book",icon:"○",group:"Other",files:[]
    }))
  ];

  const statusInfo=item=>{
    if(item.state==="ready")return {label:"Ready",className:"ready",sub:"Booked and private ticket attached"};
    if(item.state==="booked")return {label:"Booked",className:"booked",sub:"Confirmed; no private file attached"};
    if(item.state==="pending")return {label:"Pending",className:"pending",sub:item.group==="Flights"?"Boarding pass becomes available closer to departure":"Booked; document still expected"};
    return {label:"To book",className:"warn",sub:item.note||"Reservation still needed"};
  };

  const reservationCard=item=>{
    const status=statusInfo(item);
    return `<article class="readiness-item">
      <div class="readiness-item-top">
        <div class="readiness-icon">${item.icon||"•"}</div>
        <div class="readiness-copy">
          <strong>${escapeHTML(item.title)}</strong>
          <span>${[item.date,item.time].filter(Boolean).map(escapeHTML).join("")}</span>
        </div>
        <span class="readiness-status ${status.className}">${status.label}</span>
      </div>
      <div class="readiness-explanation">${escapeHTML(status.sub)}</div>
      ${item.details?`<div class="readiness-detail">${escapeHTML(item.details)}</div>`:""}
      <div class="readiness-actions">
        ${item.files?.length?`<button class="primary" data-open-imported="${item.files[0].id}">Open ticket</button>`:`<button class="secondary" data-open="wallet">${item.state==="to-book"?"Open Wallet":"Attach ticket"}</button>`}
        ${item.map?`<a class="secondary" href="${item.map}" target="_blank" rel="noopener">${item.mapLabel||"Maps"}</a>`:""}
      </div>
    </article>`;
  };

  const transport=allReservations.filter(x=>x.category==="Transportation");
  const attractions=allReservations.filter(x=>x.category==="Attractions & tours");
  const flexible=[
    ["Venice walks and vaporetto","Flexible sightseeing","Venice"],
    ["Historic Florence walking route","No timed reservation required","Florence"],
    ["Rome piazzas and fountains","Flexible sightseeing","Rome"],
    ["Historic Naples walking route","No timed reservation required","Naples"],
    ["Capri Town and Anacapri exploration","Flexible around booked transport and boat tour","Capri"]
  ];

  qs("#bookings").innerHTML=`
    <div class="section-title"><div><button class="back-link" data-back="more">‹ More</button><h2>Trip readiness</h2></div><span class="small">${progress}% prepared</span></div>

    <section class="readiness-hero">
      <div>
        <div class="focus-label">BOOKING OVERVIEW</div>
        <h2>${attention.length?`${attention.length} item${attention.length===1?"":"s"} need attention`:"Everything important is booked"}</h2>
        <p>A complete view of accommodations, transportation, timed reservations and flexible plans.</p>
      </div>
      <div class="readiness-ring"><strong>${progress}%</strong><span>ready</span></div>
    </section>

    <div class="readiness-progress"><span style="width:${progress}%"></span></div>

    <section class="readiness-stats">
      <div><strong>${hotelsReady+ready}</strong><span>Ready</span></div>
      <div><strong>${booked}</strong><span>Booked</span></div>
      <div><strong>${pending}</strong><span>Pending</span></div>
      <div><strong>${toBook}</strong><span>To book</span></div>
    </section>

    ${attention.length?`<section class="readiness-section attention-section">
      <div class="readiness-heading"><div><span>!</span><div><h3>Needs attention</h3><small>Finish these before departure</small></div></div></div>
      <div class="readiness-list">${attention.map(reservationCard).join("")}</div>
    </section>`:""}

    <section class="readiness-section">
      <div class="readiness-heading"><div><span>🏨</span><div><h3>Hotels</h3><small>${hotels.length} of ${hotels.length} booked</small></div></div></div>
      <div class="readiness-list">${hotels.map(h=>`<article class="readiness-item">
        <div class="readiness-item-top">
          <div class="readiness-icon">🏨</div>
          <div class="readiness-copy"><strong>${escapeHTML(h[1])}</strong><span>${escapeHTML(h[0])} · ${escapeHTML(h[3])}</span></div>
          <span class="readiness-status ready">Booked</span>
        </div>
        ${h[2]?`<div class="readiness-detail">${escapeHTML(h[2])}</div>`:""}
        <div class="readiness-actions"><a class="secondary" href="${hotelMaps[h[0]]}" target="_blank" rel="noopener">Maps</a></div>
      </article>`).join("")}</div>
    </section>

    <section class="readiness-section">
      <div class="readiness-heading"><div><span>🚆</span><div><h3>Transportation</h3><small>Flights, trains and ferries</small></div></div><button class="text-button" data-open="transport">Timeline</button></div>
      <div class="readiness-list">${transport.map(reservationCard).join("")}</div>
    </section>

    <section class="readiness-section">
      <div class="readiness-heading"><div><span>🎟️</span><div><h3>Attractions & tours</h3><small>Timed entries and guided experiences</small></div></div></div>
      <div class="readiness-list">${attractions.map(reservationCard).join("")}</div>
    </section>

    <section class="readiness-section flexible-section">
      <div class="readiness-heading"><div><span>✓</span><div><h3>No reservation needed</h3><small>Flexible plans that are not incomplete</small></div></div></div>
      <div class="flexible-list">${flexible.map(x=>`<div><span>✓</span><div><strong>${x[0]}</strong><small>${x[1]} · ${x[2]}</small></div></div>`).join("")}</div>
    </section>`;

  qsa("#bookings [data-open-imported]").forEach(button=>button.addEventListener("click",async()=>{
    const popup=window.open("","_blank");
    try{
      const ticket=await getImportedTicket(button.dataset.openImported);
      if(!ticket||!ticket.blob)throw new Error("Ticket not found");
      const url=URL.createObjectURL(ticket.blob);
      if(popup)popup.location=url;else window.location.href=url;
      setTimeout(()=>URL.revokeObjectURL(url),120000);
    }catch(error){
      if(popup)popup.close();
      alert("This ticket could not be opened.");
    }
  }));
  bindInternalNavigation();
}
function renderPacking(){
  const items=["Passport","Wallet and credit cards","Phone charger","Portable battery","EU plug adapter","Medications","Comfortable walking shoes","Light rain jacket","Sunglasses","Swimsuit for Capri","Printed backup reservations","AirTag or luggage tracker"];
  qs("#packing").innerHTML=`
    <div class="section-title"><h2>Packing checklist</h2><button data-back="more">Done</button></div>
    <div class="info-card">${items.map((item,i)=>`<label class="pack-row"><input type="checkbox" data-pack="${i}" ${localStorage.getItem(P+"pack-"+i)==="1"?"checked":""}><span>${item}</span></label>`).join("")}</div>`;
  qsa("[data-pack]").forEach(box=>box.addEventListener("change",()=>localStorage.setItem(P+"pack-"+box.dataset.pack,box.checked?"1":"0")));
  bindInternalNavigation();
}
function renderNotes(){
  qs("#notes").innerHTML=`
    <div class="section-title"><h2>Trip notes</h2><button data-back="more">Done</button></div>
    <div class="callout">Notes stay on this device and browser.</div>
    <textarea id="noteBox" placeholder="Confirmation numbers, restaurant ideas, reminders..."></textarea>
    <div class="button-row"><button class="primary" id="saveNotes">Save notes</button></div>
    <div class="small" id="savedMessage"></div>`;
  qs("#noteBox").value=localStorage.getItem(P+"notes")||"";
  qs("#saveNotes").addEventListener("click",()=>{
    localStorage.setItem(P+"notes",qs("#noteBox").value);
    qs("#savedMessage").textContent="Saved on this device.";
  });
  bindInternalNavigation();
}
function renderCurrency(){
  const RATE_KEY=P+"currency-rate";
  const DATE_KEY=P+"currency-rate-date";
  const FEE_KEY=P+"currency-fee";
  const DIR_KEY=P+"currency-direction";
  const savedRate=Number(localStorage.getItem(RATE_KEY))||1.15;
  const savedDate=localStorage.getItem(DATE_KEY)||"Saved fallback rate";
  const savedFee=Number(localStorage.getItem(FEE_KEY))||0;
  const savedDirection=localStorage.getItem(DIR_KEY)||"EURUSD";

  qs("#currency").innerHTML=`
    <div class="section-title"><h2>Currency converter</h2><button data-back="more">Done</button></div>
    <div class="currency-hero">
      <div class="focus-label">EURO ↔ US DOLLAR</div>
      <div class="currency-rate-line"><strong id="currencyRateText">1 EUR = $${savedRate.toFixed(4)}</strong><span id="currencyRateStatus">${escapeHTML(savedDate)}</span></div>
    </div>

    <section class="currency-card">
      <div class="currency-direction-row">
        <div><span id="fromFlag">🇪🇺</span><strong id="fromCode">EUR</strong></div>
        <button id="swapCurrency" class="currency-swap" aria-label="Swap currencies">⇄</button>
        <div><span id="toFlag">🇺🇸</span><strong id="toCode">USD</strong></div>
      </div>

      <label class="currency-input-wrap">
        <span id="fromSymbol">€</span>
        <input id="currencyAmount" inputmode="decimal" type="number" min="0" step="0.01" value="100" aria-label="Amount to convert">
      </label>

      <div class="currency-result">
        <small>Estimated amount</small>
        <strong id="currencyResult">$${(100*savedRate).toFixed(2)}</strong>
        <span id="currencyFeeNote"></span>
      </div>

      <div class="currency-quick-row">
        ${[10,20,50,100,200].map(n=>`<button data-currency-quick="${n}">${n}</button>`).join("")}
      </div>

      <label class="currency-fee-row">
        <div><strong>Card foreign-transaction fee</strong><small>Add your card's fee to the estimate</small></div>
        <select id="currencyFee">
          ${[0,1,2,3].map(n=>`<option value="${n}" ${n===savedFee?"selected":""}>${n}%</option>`).join("")}
        </select>
      </label>

      <button class="primary currency-refresh" id="refreshCurrency">Refresh live rate</button>
      <div class="currency-message" id="currencyMessage" aria-live="polite"></div>
    </section>

    <div class="info-card currency-info">
      <strong>Travel estimate</strong>
      <div class="small">The converter uses a reference exchange rate. Your bank or card network may use a slightly different rate. It keeps the last successful rate so it can still work offline.</div>
    </div>`;

  let rate=savedRate;
  let direction=savedDirection;
  const amountInput=qs("#currencyAmount");
  const feeSelect=qs("#currencyFee");
  const update=()=>{
    const amount=Math.max(0,Number(amountInput.value)||0);
    const fee=Number(feeSelect.value)||0;
    const isEUR=direction==="EURUSD";
    let result=isEUR?amount*rate:amount/rate;
    if(fee>0)result*=1+fee/100;
    qs("#currencyResult").textContent=`${isEUR?"$":"€"}${result.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    qs("#currencyFeeNote").textContent=fee?`Includes ${fee}% card fee`:"No card fee added";
    qs("#fromCode").textContent=isEUR?"EUR":"USD";
    qs("#toCode").textContent=isEUR?"USD":"EUR";
    qs("#fromFlag").textContent=isEUR?"🇪🇺":"🇺🇸";
    qs("#toFlag").textContent=isEUR?"🇺🇸":"🇪🇺";
    qs("#fromSymbol").textContent=isEUR?"€":"$";
    localStorage.setItem(FEE_KEY,String(fee));
    localStorage.setItem(DIR_KEY,direction);
  };
  const refresh=async(silent=false)=>{
    const button=qs("#refreshCurrency"),message=qs("#currencyMessage");
    if(!silent){button.disabled=true;button.textContent="Refreshing…";message.textContent=""}
    try{
      const response=await fetch("https://api.frankfurter.dev/v2/rate/EUR/USD",{cache:"no-store"});
      if(!response.ok)throw new Error("Rate unavailable");
      const data=await response.json();
      const liveRate=Number(data.rate);
      if(!Number.isFinite(liveRate)||liveRate<=0)throw new Error("Invalid rate");
      rate=liveRate;
      const date=data.date||new Date().toISOString().slice(0,10);
      localStorage.setItem(RATE_KEY,String(rate));
      localStorage.setItem(DATE_KEY,`Updated ${date}`);
      qs("#currencyRateText").textContent=`1 EUR = $${rate.toFixed(4)}`;
      qs("#currencyRateStatus").textContent=`Updated ${date}`;
      if(!silent)message.textContent="Live rate updated.";
      update();
    }catch(error){
      if(!silent)message.textContent="Could not refresh. Using the last saved rate.";
    }finally{
      if(!silent){button.disabled=false;button.textContent="Refresh live rate"}
    }
  };

  amountInput.addEventListener("input",update);
  feeSelect.addEventListener("change",update);
  qs("#swapCurrency").addEventListener("click",()=>{direction=direction==="EURUSD"?"USDEUR":"EURUSD";update()});
  qsa("[data-currency-quick]").forEach(button=>button.addEventListener("click",()=>{amountInput.value=button.dataset.currencyQuick;update()}));
  qs("#refreshCurrency").addEventListener("click",()=>refresh(false));
  bindInternalNavigation();
  update();
  refresh(true);
}


const TRANSPORT_LEGS=[
  {date:"Sep 14",sort:"2026-09-14T15:25",type:"Flight",icon:"✈️",title:"AA 1602 — FLL to Philadelphia",from:"Fort Lauderdale (FLL)",depart:"3:25 PM",to:"Philadelphia (PHL)",arrive:"6:18 PM",group:"Flights",walletTitle:"AA 1602 — FLL to Philadelphia",walletTime:"3:25 PM",provider:"https://www.aa.com/",map:"https://www.google.com/maps/search/?api=1&query=Fort+Lauderdale-Hollywood+International+Airport"},
  {date:"Sep 14",sort:"2026-09-14T19:45",type:"Flight",icon:"✈️",title:"AA 714 — Philadelphia to Venice",from:"Philadelphia (PHL)",depart:"7:45 PM",to:"Venice Marco Polo (VCE)",arrive:"9:55 AM next day",group:"Flights",walletTitle:"AA 714 — Philadelphia to Venice",walletTime:"7:45 PM",provider:"https://www.aa.com/",map:"https://www.google.com/maps/search/?api=1&query=Philadelphia+International+Airport"},
  {date:"Sep 17",sort:"2026-09-17T09:26",type:"Train",icon:"🚆",title:"Frecciarossa 9411 — Venice to Florence",from:"Venezia S. Lucia",depart:"9:26 AM",to:"Firenze S. M. Novella",arrive:"11:39 AM",details:"Coach 7 · Seats 3D & 4D",group:"Trains",walletTitle:"Frecciarossa 9411 — Venice to Florence",walletTime:"9:26 AM",provider:"https://www.trenitalia.com/",map:"https://www.google.com/maps/search/?api=1&query=Venezia+Santa+Lucia+Station"},
  {date:"Sep 19",sort:"2026-09-19T07:00",type:"Train",icon:"🚆",title:"Florence ↔ Pisa",from:"Firenze S. M. Novella",depart:"Early morning",to:"Pisa Centrale",arrive:"To be booked",details:"Outbound and return trains still need to be selected.",group:"Trains",walletTitle:"Florence ↔ Pisa",walletTime:"Early morning",provider:"https://www.trenitalia.com/",map:"https://www.google.com/maps/search/?api=1&query=Firenze+Santa+Maria+Novella"},
  {date:"Sep 20",sort:"2026-09-20T10:03",type:"Train",icon:"🚆",title:"Italo 8953 — Florence to Rome",from:"Firenze S. M. Novella",depart:"10:03 AM",to:"Roma Termini",arrive:"11:40 AM",details:"Coach 6 · Seats 1 & 2",group:"Trains",walletTitle:"Italo 8953 — Florence to Rome",walletTime:"10:03 AM",provider:"https://www.italotreno.com/",map:"https://www.google.com/maps/search/?api=1&query=Firenze+Santa+Maria+Novella"},
  {date:"Sep 24",sort:"2026-09-24T09:41",type:"Train",icon:"🚆",title:"Italo 9967 — Rome to Naples",from:"Roma Termini",depart:"9:41 AM",to:"Napoli Centrale",arrive:"10:53 AM",details:"Coach 7 · Seats 1 & 2",group:"Trains",walletTitle:"Italo 9967 — Rome to Naples",walletTime:"9:41 AM",provider:"https://www.italotreno.com/",map:"https://www.google.com/maps/search/?api=1&query=Roma+Termini"},
  {date:"Sep 25",sort:"2026-09-25T08:05",type:"Ferry",icon:"🚤",title:"SNAV Naples to Capri",from:"Naples ferry terminal",depart:"8:05 AM",to:"Marina Grande, Capri",arrive:"Morning",details:"Check in by 7:35 AM",group:"Ferries",walletTitle:"SNAV Naples ⇄ Capri Round Trip",walletTime:"8:05 AM outbound · 6:10 PM return",provider:"https://www.snav.it/",map:"https://www.google.com/maps/search/?api=1&query=Molo+Beverello+Naples"},
  {date:"Sep 25",sort:"2026-09-25T18:10",type:"Ferry",icon:"🚤",title:"SNAV Capri to Naples",from:"Marina Grande, Capri",depart:"6:10 PM",to:"Naples ferry terminal",arrive:"Evening",details:"Check in by 5:40 PM · Same round-trip booking",group:"Ferries",walletTitle:"SNAV Naples ⇄ Capri Round Trip",walletTime:"8:05 AM outbound · 6:10 PM return",provider:"https://www.snav.it/",map:"https://www.google.com/maps/search/?api=1&query=Marina+Grande+Capri"},
  {date:"Sep 27",sort:"2026-09-27T07:40",type:"Flight",icon:"✈️",title:"BA 6647 — Naples to London",from:"Naples (NAP)",depart:"7:40 AM",to:"London Heathrow (LHR)",arrive:"9:45 AM",group:"Flights",walletTitle:"BA 6647 — Naples to London",walletTime:"7:40 AM",provider:"https://www.britishairways.com/",map:"https://www.google.com/maps/search/?api=1&query=Naples+International+Airport"},
  {date:"Sep 27",sort:"2026-09-27T12:15",type:"Flight",icon:"✈️",title:"AA 39 — London to Miami",from:"London Heathrow (LHR)",depart:"12:15 PM",to:"Miami (MIA)",arrive:"5:00 PM",group:"Flights",walletTitle:"AA 39 — London to Miami",walletTime:"12:15 PM",provider:"https://www.aa.com/",map:"https://www.google.com/maps/search/?api=1&query=London+Heathrow+Airport"}
];

async function renderTransport(){
  let imported=[];
  try{imported=await getImportedTickets()}catch(error){console.error("Ticket database unavailable",error)}
  const linked={};
  imported.filter(x=>x.linkedWalletKey).forEach(x=>(linked[x.linkedWalletKey]||=[]).push(x));
  const filters=["All","Flight","Train","Ferry"];
  const cards=TRANSPORT_LEGS.sort((a,b)=>a.sort.localeCompare(b)).map((leg,index)=>{
    const walletItem={title:leg.walletTitle,date:leg.date,time:leg.walletTime};
    const files=linked[walletItemKey(leg.group,walletItem)]||[];
    return `<article class="transport-card" data-transport-card data-type="${leg.type}">
      <div class="transport-topline"><span class="transport-kind">${leg.icon} ${leg.type}</span><span>${leg.date}</span></div>
      <h3>${leg.title}</h3>
      <div class="transport-route">
        <div><small>DEPART</small><strong>${leg.depart}</strong><span>${leg.from}</span></div>
        <div class="transport-line"><span>→</span></div>
        <div><small>ARRIVE</small><strong>${leg.arrive}</strong><span>${leg.to}</span></div>
      </div>
      ${leg.details?`<div class="transport-details">${leg.details}</div>`:""}
      <div class="transport-actions">
        ${files.length?`<button class="primary" data-open-imported="${files[0].id}">Open ticket</button>`:`<button class="secondary" data-open="wallet">Wallet</button>`}
        <a class="secondary" href="${leg.map}" target="_blank" rel="noopener">Departure map</a>
        <a class="secondary" href="${leg.provider}" target="_blank" rel="noopener">Provider</a>
      </div>
      ${files.length>1?`<div class="transport-extra-files">${files.slice(1).map(file=>`<button class="secondary" data-open-imported="${file.id}">${escapeHTML(file.fileName)}</button>`).join("")}</div>`:""}
    </article>`;
  }).join("");

  qs("#transport").innerHTML=`
    <div class="section-title"><div><button class="back-link" data-back="more">‹ More</button><h2>Transportation</h2></div><span class="small">All travel legs</span></div>
    <div class="transport-hero"><div><div class="focus-label">TRIP MOVEMENT</div><h2>Flights, trains and ferries</h2><p>Every major transfer in chronological order, with tickets and departure points close at hand.</p></div><div class="transport-count"><strong>${TRANSPORT_LEGS.length}</strong><span>legs</span></div></div>
    <div class="transport-filter-row">${filters.map((x,i)=>`<button class="wallet-filter ${i===0?"active":""}" data-transport-filter="${x}">${x}</button>`).join("")}</div>
    <div class="transport-list">${cards}</div>`;

  qsa("[data-transport-filter]").forEach(button=>button.addEventListener("click",()=>{
    qsa("[data-transport-filter]").forEach(x=>x.classList.remove("active"));button.classList.add("active");
    qsa("[data-transport-card]").forEach(card=>card.classList.toggle("hidden",button.dataset.transportFilter!=="All"&&card.dataset.type!==button.dataset.transportFilter));
  }));
  qsa("#transport [data-open-imported]").forEach(button=>button.addEventListener("click",async()=>{
    const popup=window.open("","_blank");
    try{const ticket=await getImportedTicket(button.dataset.openImported);if(!ticket||!ticket.blob)throw new Error("Ticket not found");const url=URL.createObjectURL(ticket.blob);if(popup)popup.location=url;else window.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),120000)}
    catch(error){if(popup)popup.close();alert("This ticket could not be opened.")}
  }));
  bindInternalNavigation();
}

function renderMore(){
  qs("#more").innerHTML=`
    <div class="section-title"><h2>More</h2><span class="small">Trip tools</span></div>
    <button class="menu-card" data-open="bookings"><div><strong>Trip readiness</strong><span>Bookings, tickets and items needing attention</span></div><div>›</div></button>
    <button class="menu-card" data-open="packing"><div><strong>Packing checklist</strong><span>Track what is ready</span></div><div>›</div></button>
    <button class="menu-card" data-open="notes"><div><strong>Trip notes</strong><span>Confirmation numbers and reminders</span></div><div>›</div></button>
    <button class="menu-card" data-open="currency"><div><strong>Currency converter</strong><span>Convert euros and dollars</span></div><div>›</div></button>
    <button class="menu-card" data-open="transport"><div><strong>Transportation timeline</strong><span>Flights, trains and ferries in order</span></div><div>›</div></button>
    <div class="info-card" style="margin-top:16px">
      <strong>Offline-ready</strong>
      <div class="small">Once refreshed after an update, the app keeps working without a connection.</div>
    </div>`;
  bindInternalNavigation();
}

function showView(target,updateTab=true){
  qsa(".view").forEach(v=>v.classList.add("hidden"));
  qs("#"+target).classList.remove("hidden");
  if(updateTab){
    qsa(".tab").forEach(t=>t.classList.toggle("active",t.dataset.target===target));
  }
  window.scrollTo({top:0,behavior:"smooth"});
}
function bindInternalNavigation(){
  qsa("[data-jump]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.jump)));
  qsa("[data-open]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.open,false)));
  qsa("[data-back]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.back)));
}
qsa(".tab").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.target)));

renderHome();
renderRouteMode();
renderTrip();
renderWallet();
renderGuide();
renderMore();
renderBookings();
renderPacking();
renderNotes();
renderCurrency();
renderTransport();

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}


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
const todayISO = () => new Date().toISOString().slice(0,10);
const fmtDate = s => new Date(s+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const shortDate = s => new Date(s+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});

function eventId(day,event,index){
  return `${day.date}-${index}-${event.title}`.replace(/[^a-z0-9]+/gi,"-").toLowerCase();
}
function isDone(key){try{return localStorage.getItem(P+"done-"+key)==="1"}catch{return false}}
function setDone(key,value){try{localStorage.setItem(P+"done-"+key,value?"1":"0")}catch{}}
function parseDateTime(date,time){
  const m=time.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
  if(!m)return null;
  let h=Number(m[1]); const min=Number(m[2]); const ap=m[3].toUpperCase();
  if(ap==="PM"&&h!==12)h+=12;if(ap==="AM"&&h===12)h=0;
  return new Date(`${date}T${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}:00`);
}
function tripStats(){
  let total=0,done=0;
  trip.forEach(d=>d.events.forEach((e,i)=>{total++;if(isDone(eventId(d,e,i)))done++}));
  return {total,done,pct:total?Math.round(done/total*100):0};
}
function nextEventForDay(day){
  if(!day)return null;
  const now=new Date();
  const items=day.events.map((event,index)=>({event,index,dt:parseDateTime(day.date,event.time)}));
  return items.find(x=>x.dt&&x.dt>=now&&!isDone(eventId(day,x.event,x.index)))
    || items.find(x=>!isDone(eventId(day,x.event,x.index)))
    || null;
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

function renderHome(){
  const day=trip.find(d=>d.date===todayISO());
  const next=nextEventForDay(day);
  const stats=tripStats();
  const booked=wallet.flatMap(g=>g.items).filter(x=>x.status==="Booked").length;
  const pending=wallet.flatMap(g=>g.items).filter(x=>x.status==="To book").length;
  const upcoming=upcomingBooked();
  const start=new Date("2026-09-14T00:00:00"),end=new Date("2026-09-27T23:59:59"),now=new Date();
  const diff=Math.ceil((start-now)/86400000);
  const status=now<start?`${diff} days until departure`:now<=end?"Your Italy trip is underway":"Trip completed";

  qs("#home").innerHTML=`
    <section class="hero">
      <div class="kicker">SEPTEMBER 14–27, 2026</div>
      <div class="headline">${day?`Today in ${day.city}`:"Venice → Florence → Rome → Naples"}</div>
      <div class="route">${day?day.title:"A personalized two-week Italy journey"}</div>
      <div class="countdown">${status}</div>
    </section>

    <div class="dashboard-grid">
      <div class="metric"><div class="metric-label">Booked items</div><div class="metric-value">${booked}</div><div class="metric-sub">Flights, trains, tours</div></div>
      <div class="metric"><div class="metric-label">Still to book</div><div class="metric-value">${pending}</div><div class="metric-sub">Reservations remaining</div></div>
      <div class="metric"><div class="metric-label">Trip progress</div><div class="metric-value">${stats.pct}%</div><div class="metric-sub">${stats.done} activities complete</div></div>
      <div class="metric"><div class="metric-label">Destinations</div><div class="metric-value">5</div><div class="metric-sub">4 cities + Capri</div></div>
    </div>

    ${day&&next?`
      <div class="focus-card">
        <div class="focus-label">Next activity</div>
        <div class="focus-title">${next.event.title}</div>
        <div class="focus-time">${next.event.time}</div>
        <div class="small">${next.event.note}</div>
        <div class="button-row">
          ${next.event.map?`<a class="primary" href="${next.event.map}" target="_blank">Open Maps</a>`:""}
          <button class="secondary" data-home-route="${day.date}">Start Route Mode</button>
          <button class="secondary" data-jump="trip">View full day</button>
        </div>
      </div>
      <div class="info-card">
        <strong>Today’s progress</strong>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.round(day.events.filter((e,i)=>isDone(eventId(day,e,i))).length/day.events.length*100)}%"></div></div>
        <div class="small">${day.events.filter((e,i)=>isDone(eventId(day,e,i))).length} of ${day.events.length} completed</div>
      </div>`:
      `<div class="callout">Before departure, this screen focuses on preparation. During the trip, it automatically becomes your live daily dashboard.</div>`
    }

    ${upcoming?`
      <div class="section-title"><h2>Next reservation</h2></div>
      <div class="focus-card">
        <div class="focus-label">BOOKED</div>
        <div class="focus-title">${upcoming.event.title}</div>
        <div class="focus-time">${fmtDate(upcoming.day.date)} · ${upcoming.event.time}</div>
        <div class="small">${upcoming.event.note}</div>
      </div>`:""
    }

    <div class="section-title"><h2>Quick access</h2></div>
    <div class="info-grid">
      <button class="menu-card" data-jump="wallet"><div><strong>Ticket wallet</strong><span>Flights, trains, tours and ferries</span></div><div>›</div></button>
      <button class="menu-card" data-open="packing"><div><strong>Packing list</strong><span>Saved directly on this phone</span></div><div>›</div></button>
      <button class="menu-card" data-open="bookings"><div><strong>Remaining bookings</strong><span>Colosseum, Pisa and Pantheon</span></div><div>›</div></button>
      <button class="menu-card" data-jump="guide"><div><strong>City guide</strong><span>Food ideas and expense tracking</span></div><div>›</div></button>
    </div>`;
  bindInternalNavigation();
  qsa("[data-home-route]").forEach(btn=>btn.addEventListener("click",()=>openRouteMode(btn.dataset.homeRoute)));
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
async function renderWallet(){
  const allItems=wallet.flatMap(group=>group.items);
  const ready=allItems.filter(item=>item.status==="Ready").length;
  const statusClass=status=>status==="Ready"?"ready":status==="To book"?"warn":"needed";
  let imported=[];
  try{imported=await getImportedTickets()}catch(error){console.error("Ticket database unavailable",error)}
  const categories=["Flight","Train","Hotel","Attraction","Ferry","Tour","Other"];
  const icons={Flight:"✈️",Train:"🚆",Hotel:"🏨",Attraction:"🎟️",Ferry:"🚤",Tour:"🍷",Other:"📄"};
  const importedGroups=categories.map(category=>({category,items:imported.filter(item=>item.category===category)})).filter(group=>group.items.length);

  qs("#wallet").innerHTML=`
    <div class="section-title"><h2>Ticket wallet</h2><span class="small">${ready+imported.length} ready</span></div>
    <button class="wallet-add-button" id="openTicketImporter"><span>＋</span><div><strong>Add a ticket</strong><small>Choose a PDF or image from Files</small></div></button>
    <div class="wallet-summary">
      <div><strong>${ready}</strong><span>Built-in documents</span></div>
      <div><strong>${imported.length}</strong><span>Added on this iPhone</span></div>
      <div><strong>${allItems.filter(x=>x.status==="To book").length}</strong><span>Still to book</span></div>
    </div>
    <div class="callout">Tickets you add here are stored offline only on this device. They are not uploaded to GitHub or sent anywhere. Clearing Safari website data can remove them.</div>

    ${importedGroups.length?`<section class="wallet-group imported-wallet-group">
      <h3>📱 Added on this device</h3>
      ${importedGroups.map(group=>`<div class="imported-category"><div class="imported-category-title">${icons[group.category]} ${group.category}s</div>${group.items.map(item=>`
        <article class="wallet-item wallet-document-card imported-ticket-card">
          <div class="wallet-top"><div><div class="wallet-title">${escapeHTML(item.name)}</div><div class="small">${escapeHTML(item.date||"No date")} ${item.time?`· ${escapeHTML(item.time)}`:""}</div></div><span class="wallet-status ready">Saved offline</span></div>
          ${item.notes?`<div class="wallet-note">${escapeHTML(item.notes)}</div>`:""}
          <div class="small imported-file-name">${escapeHTML(item.fileName)} · ${formatFileSize(item.size)}</div>
          <div class="wallet-actions"><button class="primary wallet-file-button" data-open-imported="${item.id}">📄 Open ticket</button><button class="secondary wallet-file-button danger-text" data-delete-imported="${item.id}">Delete</button></div>
        </article>`).join("")}</div>`).join("")}
    </section>`:""}

    ${wallet.map(group=>`<section class="wallet-group">
      <h3>${group.icon} ${group.group}</h3>
      ${group.items.map(item=>`<article class="wallet-item wallet-document-card">
        <div class="wallet-top"><div><div class="wallet-title">${item.title}</div><div class="small">${item.date} · ${item.time}</div></div><span class="wallet-status ${statusClass(item.status)}">${item.status}</span></div>
        ${item.details?`<div class="wallet-details">${item.details}</div>`:""}
        ${item.note?`<div class="wallet-note">${item.note}</div>`:""}
        <div class="wallet-actions">
          ${(item.documents||[]).map(doc=>`<a class="${doc.primary?"primary":"secondary"} wallet-file-button" href="${doc.file}" target="_blank" rel="noopener">📄 ${doc.label}</a>`).join("")}
          ${item.map?`<a class="secondary wallet-file-button" href="${item.map}" target="_blank" rel="noopener">📍 Open Maps</a>`:""}
          ${!(item.documents||[]).length?`<button class="secondary wallet-file-button" disabled>No document added yet</button>`:""}
        </div>
      </article>`).join("")}
    </section>`).join("")}

    <div class="ticket-import-overlay hidden" id="ticketImportOverlay">
      <div class="ticket-import-sheet" role="dialog" aria-modal="true" aria-labelledby="ticketImportTitle">
        <div class="ticket-import-head"><div><div class="focus-label">OFFLINE WALLET</div><h2 id="ticketImportTitle">Add ticket</h2></div><button class="ticket-close" id="closeTicketImporter" aria-label="Close">×</button></div>
        <label class="ticket-field"><span>PDF or image</span><input id="ticketFile" type="file" accept="application/pdf,image/*"></label>
        <label class="ticket-field"><span>Category</span><select id="ticketCategory">${categories.map(c=>`<option value="${c}">${c}</option>`).join("")}</select></label>
        <label class="ticket-field"><span>Ticket name</span><input id="ticketName" placeholder="Vatican Museums"></label>
        <div class="ticket-field-grid"><label class="ticket-field"><span>Date</span><input id="ticketDate" type="date"></label><label class="ticket-field"><span>Time</span><input id="ticketTime" type="time"></label></div>
        <label class="ticket-field"><span>Notes (optional)</span><textarea id="ticketNotes" placeholder="Confirmation number, entrance, seat, meeting point..."></textarea></label>
        <div class="ticket-import-message" id="ticketImportMessage" aria-live="polite"></div>
        <button class="primary ticket-save" id="saveImportedTicket">Save ticket offline</button>
      </div>
    </div>`;

  const overlay=qs("#ticketImportOverlay");
  qs("#openTicketImporter").addEventListener("click",()=>overlay.classList.remove("hidden"));
  qs("#closeTicketImporter").addEventListener("click",()=>overlay.classList.add("hidden"));
  overlay.addEventListener("click",event=>{if(event.target===overlay)overlay.classList.add("hidden")});
  qs("#ticketFile").addEventListener("change",event=>{
    const file=event.target.files[0];
    if(file&&!qs("#ticketName").value)qs("#ticketName").value=file.name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," ");
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
}
function escapeHTML(value){return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));}
function formatFileSize(bytes){if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`;}

function renderGuide(){
  const cities=Object.keys(cityGuide);
  qs("#guide").innerHTML=`
    <div class="section-title"><h2>City guide</h2><span class="small">Personal recommendations</span></div>
    <div class="guide-tabs">${cities.map((c,i)=>`<button class="chip ${i===0?"active":""}" data-guide-city="${c}">${c}</button>`).join("")}</div>
    <div id="guideCards"></div>

    <h2>Expense tracker</h2>
    <div class="expense-card">
      <div class="expense-form">
        <input id="expenseName" placeholder="Expense name">
        <input id="expenseAmount" type="number" step="0.01" placeholder="€ Amount">
      </div>
      <div class="button-row"><button class="primary" id="addExpense">Add expense</button></div>
      <div id="expenseSummary"></div>
      <div id="expenseList"></div>
    </div>`;

  const showCity=city=>{
    qs("#guideCards").innerHTML=cityGuide[city].map(x=>`<div class="guide-card"><strong>${x.type}: ${x.name}</strong><div class="small">${x.note}</div></div>`).join("");
  };
  if(cities.length)showCity(cities[0]);
  qsa("[data-guide-city]").forEach(btn=>btn.addEventListener("click",()=>{
    qsa("[data-guide-city]").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    showCity(btn.dataset.guideCity);
  }));

  const loadExpenses=()=>{
    let items=[];try{items=JSON.parse(localStorage.getItem(P+"expenses")||"[]")}catch{}
    const total=items.reduce((n,x)=>n+Number(x.amount||0),0);
    qs("#expenseSummary").innerHTML=`<div class="expense-total">€${total.toFixed(2)}</div><div class="small">Total logged spending</div>`;
    qs("#expenseList").innerHTML=items.length?items.map((x,i)=>`<div class="expense-row"><span>${x.name}</span><span>€${Number(x.amount).toFixed(2)} <button class="danger-button" data-delete-expense="${i}">Delete</button></span></div>`).join(""):`<div class="small" style="margin-top:12px">No expenses logged yet.</div>`;
    qsa("[data-delete-expense]").forEach(btn=>btn.addEventListener("click",()=>{
      items.splice(Number(btn.dataset.deleteExpense),1);
      localStorage.setItem(P+"expenses",JSON.stringify(items));
      loadExpenses();
    }));
  };
  loadExpenses();
  qs("#addExpense").addEventListener("click",()=>{
    const name=qs("#expenseName").value.trim(),amount=Number(qs("#expenseAmount").value);
    if(!name||!amount)return;
    let items=[];try{items=JSON.parse(localStorage.getItem(P+"expenses")||"[]")}catch{}
    items.push({name,amount});
    localStorage.setItem(P+"expenses",JSON.stringify(items));
    qs("#expenseName").value="";qs("#expenseAmount").value="";
    loadExpenses();
  });
}
function renderBookings(){
  qs("#bookings").innerHTML=`
    <div class="section-title"><h2>Bookings</h2><button data-back="more">Done</button></div>
    <h3>Hotels</h3>
    <div class="info-grid">${hotels.map(h=>`<div class="info-card"><strong>${h[0]} · ${h[1]}</strong><div class="small">${h[3]}${h[2]?`<br>${h[2]}`:""}</div></div>`).join("")}</div>
    <h3>Remaining reservations</h3>
    <div class="info-card">${remaining.map(r=>`<div class="status-row"><div><strong>${r[0]}</strong><div class="small">${r[1]}</div></div><span class="badge warn">To book</span></div>`).join("")}</div>`;
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
function renderMore(){
  qs("#more").innerHTML=`
    <div class="section-title"><h2>More</h2><span class="small">Trip tools</span></div>
    <button class="menu-card" data-open="bookings"><div><strong>Bookings overview</strong><span>Hotels and remaining reservations</span></div><div>›</div></button>
    <button class="menu-card" data-open="packing"><div><strong>Packing checklist</strong><span>Track what is ready</span></div><div>›</div></button>
    <button class="menu-card" data-open="notes"><div><strong>Trip notes</strong><span>Confirmation numbers and reminders</span></div><div>›</div></button>
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

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

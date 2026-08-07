(() => {
  const originalRenderHome = window.renderHome;
  if (typeof originalRenderHome !== "function") return;
  let refreshTimer = 0;
  const localISO = (date = new Date()) => [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
  function parseTime(date,time){
    const m=String(time||"").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i); if(!m)return null;
    let h=Number(m[1]); const min=Number(m[2]),ap=m[3].toUpperCase();
    if(ap==="PM"&&h!==12)h+=12;if(ap==="AM"&&h===12)h=0;
    return new Date(`${date}T${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}:00`);
  }
  function relativeTiming(target){
    if(!target)return ""; const minutes=Math.round((target-new Date())/60000);
    if(minutes < -15)return "Earlier today";
    if(minutes <= 10)return "Now";
    if(minutes <= 30)return `Starts soon · ${minutes} min`;
    if(minutes < 60)return `In ${minutes} min`;
    const hours=Math.floor(minutes/60), remainder=minutes%60;
    return remainder?`In ${hours} hr ${remainder} min`:`In ${hours} hr`;
  }
  function selectedDate(){return document.querySelector("#todayDaySelect")?.value||"";}
  function decorateToday(){
    const home=document.querySelector("#home"); if(!home||home.classList.contains("hidden"))return;
    home.querySelectorAll(".today-live-status").forEach(n=>n.remove());
    const date=selectedDate(); if(date!==localISO())return;
    const nextCard=home.querySelector(".today-next-card"), active=home.querySelector(".today-event.active");
    if(!nextCard||!active)return;
    const timeText=active.querySelector(".today-event-meta strong")?.textContent?.trim();
    const text=relativeTiming(parseTime(date,timeText)); if(!text)return;
    const status=document.createElement("div"); status.className="today-live-status"; status.textContent=text;
    const time=nextCard.querySelector(".today-next-time"); if(time)time.insertAdjacentElement("afterend",status);
    const badge=active.querySelector(".today-event-meta span"); if(badge)badge.textContent=text;
  }
  window.renderHome=function(selected){const result=originalRenderHome(selected);requestAnimationFrame(decorateToday);return result;};
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&selectedDate()===localISO())window.renderHome(selectedDate());});
  refreshTimer=setInterval(()=>{const home=document.querySelector("#home");if(!home||home.classList.contains("hidden")||selectedDate()!==localISO())return;const y=window.scrollY;window.renderHome(selectedDate());requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:"auto"}));},300000);
  requestAnimationFrame(decorateToday);
})();

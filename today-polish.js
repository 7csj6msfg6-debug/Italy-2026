(() => {
  const originalRenderHome = window.renderHome;
  if (typeof originalRenderHome !== "function") return;

  const localISO = (date = new Date()) => [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");

  function ensureStyles(){
    if(document.getElementById("today-live-polish-styles"))return;
    const style=document.createElement("style");
    style.id="today-live-polish-styles";
    style.textContent=`
      .today-current-done{display:inline-flex;align-items:center;justify-content:center}
      .today-up-next-card{margin-top:12px;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
      .today-up-next-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .today-up-next-head span{font-size:11px;color:var(--muted);font-weight:800}
      .today-up-next-time{margin-top:8px;font-size:12px;color:var(--muted);font-weight:800}
      .today-up-next-title{margin-top:3px;font-size:16px;font-weight:900}
      .today-up-next-timing{margin-top:4px;font-size:12px;font-weight:850;color:var(--muted)}
      .today-up-next-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .today-up-next-actions a{font-size:12px;font-weight:850}
    `;
    document.head.appendChild(style);
  }

  function parseTime(date,time){
    const m=String(time||"").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if(!m)return null;
    let h=Number(m[1]);
    const min=Number(m[2]),ap=m[3].toUpperCase();
    if(ap==="PM"&&h!==12)h+=12;
    if(ap==="AM"&&h===12)h=0;
    return new Date(`${date}T${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}:00`);
  }

  function relativeTiming(target){
    if(!target)return "";
    const minutes=Math.round((target-new Date())/60000);
    if(minutes < -15)return "Started earlier";
    if(minutes <= 10&&minutes>=-15)return "Now";
    if(minutes <= 30)return `Starts soon · ${Math.max(0,minutes)} min`;
    if(minutes < 60)return `In ${minutes} min`;
    const hours=Math.floor(minutes/60), remainder=minutes%60;
    return remainder?`In ${hours} hr ${remainder} min`:`In ${hours} hr`;
  }

  function selectedDate(){return document.querySelector("#todayDaySelect")?.value||"";}
  function timelineRows(){return [...document.querySelectorAll("#home .today-event")];}
  function rowTime(row,date){return parseTime(date,row.querySelector(".today-event-meta strong")?.textContent?.trim());}
  function unfinishedRows(){return timelineRows().filter(row=>!row.classList.contains("done"));}

  function liveSelection(date){
    const rows=unfinishedRows();
    if(!rows.length)return {current:null,next:null,mode:"complete"};
    if(date!==localISO())return {current:rows[0],next:rows[1]||null,mode:"preview"};

    const now=new Date();
    const started=rows.filter(row=>{const dt=rowTime(row,date);return dt&&dt<=now});
    if(started.length){
      const current=started[started.length-1];
      const currentIndex=rows.indexOf(current);
      const next=rows.slice(currentIndex+1).find(row=>{const dt=rowTime(row,date);return !dt||dt>now})||rows[currentIndex+1]||null;
      return {current,next,mode:"current"};
    }
    return {current:rows[0],next:rows[1]||null,mode:"upcoming"};
  }

  function eventIndexForRow(row){
    const rows=timelineRows();
    return rows.indexOf(row);
  }

  function updateMainCard(row,date,mode){
    const card=document.querySelector("#home .today-next-card");
    if(!card||!row)return;
    const index=eventIndexForRow(row);
    const time=row.querySelector(".today-event-meta strong")?.textContent?.trim()||"";
    const title=row.querySelector(".today-event-title")?.textContent?.trim()||"";
    const note=row.querySelector(".today-event-note")?.textContent?.trim()||"";
    const eventBadge=row.querySelector(".badge");
    const mapHref=row.querySelector(".today-event-actions a")?.getAttribute("href")||"";
    const label=mode==="current"?"CURRENT STOP":mode==="preview"?"FIRST UNFINISHED STOP":"UP NEXT";

    const labelNode=card.querySelector(".focus-label");
    if(labelNode)labelNode.textContent=label;
    const counter=card.querySelector(".today-next-top > span");
    if(counter)counter.textContent=`${index+1} of ${timelineRows().length}`;
    const timeNode=card.querySelector(".today-next-time");
    if(timeNode)timeNode.textContent=time;
    const titleNode=card.querySelector(".today-next-title");
    if(titleNode)titleNode.textContent=title;
    const noteNode=card.querySelector(".today-next-note");
    if(noteNode)noteNode.textContent=note;

    card.querySelectorAll(".today-live-status").forEach(node=>node.remove());
    if(date===localISO()){
      const timing=relativeTiming(rowTime(row,date));
      if(timing&&timeNode){
        const status=document.createElement("div");
        status.className="today-live-status";
        status.textContent=timing;
        timeNode.insertAdjacentElement("afterend",status);
      }
    }

    const actions=card.querySelector(".today-primary-actions");
    if(actions){
      let mapButton=actions.querySelector("a.primary");
      if(mapHref){
        if(!mapButton){
          mapButton=document.createElement("a");
          mapButton.className="primary";
          mapButton.target="_blank";
          mapButton.rel="noopener";
          mapButton.textContent="Open Maps";
          actions.prepend(mapButton);
        }
        mapButton.href=mapHref;
      }else{
        mapButton?.remove();
      }
    }

    const walletButton=actions?.querySelector("[data-home-wallet]");
    if(walletButton)walletButton.dataset.homeWallet=String(index);

    let doneButton=actions?.querySelector("[data-current-done]");
    if(!doneButton&&actions){
      doneButton=document.createElement("button");
      doneButton.type="button";
      doneButton.className="secondary today-current-done";
      doneButton.dataset.currentDone="";
      doneButton.textContent="✓ Done";
      actions.appendChild(doneButton);
    }
    if(doneButton){
      doneButton.dataset.currentDone=String(index);
      doneButton.onclick=()=>{
        const target=timelineRows()[Number(doneButton.dataset.currentDone)];
        target?.querySelector("[data-today-check]")?.click();
      };
    }

    let existingBadge=card.querySelector(".badge");
    if(eventBadge){
      if(!existingBadge){
        existingBadge=document.createElement("span");
        const noteNode=card.querySelector(".today-next-note");
        if(noteNode)noteNode.insertAdjacentElement("afterend",existingBadge);
      }
      if(existingBadge){
        existingBadge.className=eventBadge.className;
        existingBadge.textContent=eventBadge.textContent;
      }
    }else{
      existingBadge?.remove();
    }
  }

  function renderUpNext(row,date){
    document.querySelector("#home .today-up-next-card")?.remove();
    if(!row)return;
    const main=document.querySelector("#home .today-next-card");
    if(!main)return;
    const time=row.querySelector(".today-event-meta strong")?.textContent?.trim()||"";
    const title=row.querySelector(".today-event-title")?.textContent?.trim()||"";
    const map=row.querySelector(".today-event-actions a")?.getAttribute("href")||"";
    const timing=date===localISO()?relativeTiming(rowTime(row,date)):"Later that day";
    const section=document.createElement("section");
    section.className="today-up-next-card";
    section.innerHTML=`
      <div class="today-up-next-head"><strong>UP NEXT</strong><span>${time}</span></div>
      <div class="today-up-next-title"></div>
      ${timing?`<div class="today-up-next-timing"></div>`:""}
      ${map?`<div class="today-up-next-actions"><a href="${map}" target="_blank" rel="noopener">Maps</a></div>`:""}
    `;
    section.querySelector(".today-up-next-title").textContent=title;
    const timingNode=section.querySelector(".today-up-next-timing");
    if(timingNode)timingNode.textContent=timing;
    main.insertAdjacentElement("afterend",section);
  }

  function decorateToday(){
    ensureStyles();
    const home=document.querySelector("#home");
    if(!home||home.classList.contains("hidden"))return;
    const date=selectedDate();
    if(!date)return;
    const selection=liveSelection(date);
    if(!selection.current)return;
    updateMainCard(selection.current,date,selection.mode);
    renderUpNext(selection.next,date);

    timelineRows().forEach(row=>row.classList.remove("active"));
    selection.current.classList.add("active");
    const activeMeta=selection.current.querySelector(".today-event-meta span");
    if(activeMeta&&date===localISO())activeMeta.textContent=selection.mode==="current"?"Current":"Up next";
  }

  window.renderHome=function(selected){
    const result=originalRenderHome(selected);
    requestAnimationFrame(decorateToday);
    return result;
  };

  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible")requestAnimationFrame(decorateToday);
  });
  window.addEventListener("focus",()=>requestAnimationFrame(decorateToday));
  setInterval(()=>requestAnimationFrame(decorateToday),60000);
  requestAnimationFrame(decorateToday);
})();

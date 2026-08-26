const CACHE = 'italy-2026-app-v38';
const APP_SHELL = [
  './','./index.html','./style.css','./app.js','./navigation-state.js','./history-aware-back.js','./today-polish.js','./wallet-polish.js','./wallet-reliability.js','./wallet-backup.js','./ticket-open.js','./today-ticket-actions.js','./calendar-icon-polish.js','./guide-collapse-default.js','./nearby-guide-focus.js','./trip-ticket-actions.js','./app-status.js','./trip-data.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'
];
const PDFJS_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

const TICKET_DB_NAME = 'italy2026-ticket-wallet';
const TICKET_DB_VERSION = 1;
const TICKET_STORE = 'tickets';

function ticketIdFromUrl(url){
  const marker='/ticket-file/';
  const index=url.pathname.lastIndexOf(marker);
  if(index<0)return null;
  const raw=url.pathname.slice(index+marker.length).split('/')[0];
  if(!/^\d+$/.test(raw))return null;
  return Number(raw);
}

function readStoredTicket(id){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(TICKET_DB_NAME,TICKET_DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(TICKET_STORE)){
        db.createObjectStore(TICKET_STORE,{keyPath:'id',autoIncrement:true});
      }
    };
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      const tx=db.transaction(TICKET_STORE,'readonly');
      const get=tx.objectStore(TICKET_STORE).get(id);
      get.onsuccess=()=>resolve(get.result||null);
      get.onerror=()=>reject(get.error);
    };
  });
}

function ticketHeaders(type,size,extra={}){
  const headers=new Headers({
    'Content-Type':type||'application/octet-stream',
    'Content-Disposition':'inline',
    'Cache-Control':'no-store',
    'Accept-Ranges':'bytes',
    'Content-Length':String(size)
  });
  Object.entries(extra).forEach(([key,value])=>headers.set(key,String(value)));
  return headers;
}

async function serveTicket(request,id){
  try{
    const ticket=await readStoredTicket(id);
    if(!ticket?.blob)return new Response('Ticket not found',{status:404,headers:{'Cache-Control':'no-store'}});
    const type=ticket.type||ticket.blob.type||'application/octet-stream';
    const blob=ticket.blob instanceof Blob?ticket.blob:new Blob([ticket.blob],{type});
    const range=request.headers.get('range');

    if(range){
      const match=/^bytes=(\d*)-(\d*)$/i.exec(range.trim());
      if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${blob.size}`}});
      let start=match[1]?Number(match[1]):0;
      let end=match[2]?Number(match[2]):blob.size-1;
      if(!match[1]&&match[2]){
        const suffix=Number(match[2]);
        start=Math.max(0,blob.size-suffix);
        end=blob.size-1;
      }
      if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<start||start>=blob.size){
        return new Response(null,{status:416,headers:{'Content-Range':`bytes */${blob.size}`}});
      }
      end=Math.min(end,blob.size-1);
      const part=blob.slice(start,end+1,type);
      return new Response(part,{status:206,headers:ticketHeaders(type,part.size,{
        'Content-Range':`bytes ${start}-${end}/${blob.size}`
      })});
    }

    return new Response(blob,{status:200,headers:ticketHeaders(type,blob.size)});
  }catch(error){
    return new Response('Ticket unavailable',{status:500,headers:{'Cache-Control':'no-store'}});
  }
}

async function cachePdfAssets(cache){
  await Promise.all(PDFJS_ASSETS.map(async asset=>{
    try{
      const response=await fetch(asset,{mode:'cors',cache:'no-store'});
      if(response&&response.ok)await cache.put(asset,response);
    }catch{}
  }));
}

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    await cachePdfAssets(cache);
  })());
});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  if(PDFJS_ASSETS.includes(url.href)){
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      if(cached)return cached;
      try{
        const response=await fetch(request);
        if(response&&response.ok){
          const cache=await caches.open(CACHE);
          await cache.put(request,response.clone());
        }
        return response;
      }catch{
        return Response.error();
      }
    })());
    return;
  }

  if(url.origin!==self.location.origin)return;

  const ticketId=ticketIdFromUrl(url);
  if(ticketId!==null){
    event.respondWith(serveTicket(request,ticketId));
    return;
  }

  if(request.mode==='navigate'){
    event.respondWith((async()=>{try{const response=await fetch(request);if(response&&response.ok){const cache=await caches.open(CACHE);cache.put('./index.html',response.clone())}return response}catch{return(await caches.match(request))||(await caches.match('./index.html'))||(await caches.match('./'))}})());
    return;
  }
  event.respondWith((async()=>{const cached=await caches.match(request);const network=fetch(request).then(async response=>{if(response&&response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}return response}).catch(()=>null);if(cached){event.waitUntil(network);return cached}const response=await network;return response||Response.error()})())
});

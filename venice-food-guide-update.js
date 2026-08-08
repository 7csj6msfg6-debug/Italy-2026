(() => {
  const PFX = 'italy2026-v4-';
  const VENICE_VERSION = 1;

  const places = [
    {id:'venice-0915-dinner-testiere',name:'Osteria alle Testiere',city:'Venice',category:'Dinner',plannedDay:'2026-09-15',rank:1,topPick:true,favorite:true,official:true,rating:5,price:'€€€€',mealWindow:'Special Dinner · Castello near Rio Hotel',notes:'Tiny, highly regarded seafood restaurant · Special dinner pick',reservation:'Strongly recommended',dishes:['Fresh fish of the day','Seafood appetizers','Venetian seafood pasta','Seasonal specials','House desserts'],maps:'https://www.google.com/maps/search/?api=1&query=Osteria+alle+Testiere+Venice'},
    {id:'venice-0915-lunch-staffa',name:'Osteria alla Staffa',city:'Venice',category:'Lunch',plannedDay:'2026-09-15',rank:1,topPick:true,price:'€€',mealWindow:'Arrival Lunch / Relaxed Dinner · Castello',notes:'Strong moderately priced alternative near the hotel',dishes:['Fresh pasta','Venetian dishes','Seafood','Daily specials'],maps:'https://www.google.com/maps/search/?api=1&query=Osteria+alla+Staffa+Venice'},
    {id:'venice-0915-bite-gislon',name:'Rosticceria Gislon',city:'Venice',category:'Small Bite',plannedDay:'2026-09-15',rank:1,topPick:true,favorite:true,price:'€',mealWindow:'Quick / Casual · San Marco–Rialto corridor',notes:'Venetian snack pick · Don’t miss the mozzarella in carrozza',dishes:['Mozzarella in Carrozza','Anchovy version','Ham version'],maps:'https://www.google.com/maps/search/?api=1&query=Rosticceria+Gislon+Venice'},
    {id:'venice-0915-bite-dal-moros',name:'Dal Moro’s Fresh Pasta To Go',city:'Venice',category:'Small Bite',plannedDay:'2026-09-15',rank:2,price:'€',mealWindow:'Quick Arrival Backup · Near Rio Hotel',notes:'Convenient fast backup rather than an Official Pick',dishes:['Cacio e Pepe','Pesto'],maps:'https://www.google.com/maps/search/?api=1&query=Dal+Moro%27s+Fresh+Pasta+To+Go+Venice'},
    {id:'venice-0915-dessert-mercanti',name:'I Tre Mercanti',city:'Venice',category:'Dessert',plannedDay:'2026-09-15',rank:1,topPick:true,favorite:true,official:true,rating:5,price:'€',mealWindow:'Dessert · Near Rio Hotel',notes:'Classic tiramisu stop · Best if the line is reasonable',dishes:['Classic Tiramisu'],maps:'https://www.google.com/maps/search/?api=1&query=I+Tre+Mercanti+Venice'},
    {id:'venice-0915-gelato-suso',name:'Suso Gelatoteca',city:'Venice',category:'Gelato',plannedDay:'2026-09-15',rank:1,topPick:true,favorite:true,official:true,rating:5,price:'€',mealWindow:'Gelato · San Marco / Rialto',notes:'Gelato Official Pick · Skip a very long queue',dishes:['Crema del Doge','Pistachio'],maps:'https://www.google.com/maps/search/?api=1&query=Suso+Gelatoteca+Venice'},
    {id:'venice-0915-bar-magna',name:'Magna Bevi Tasi',city:'Venice',category:'Bar',plannedDay:'2026-09-15',rank:1,topPick:true,price:'€',mealWindow:'Aperitivo · Next to Rio Hotel',notes:'Near-hotel pick for a pre-dinner spritz or final drink',dishes:['Spritz','Wine','Cicchetti','Coffee','Small snacks'],maps:'https://www.google.com/maps/search/?api=1&query=Magna+Bevi+Tasi+Venice'},
    {id:'venice-0915-breakfast-bonifacio',name:'Pasticceria Bonifacio',city:'Venice',category:'Breakfast',plannedDay:'2026-09-15',rank:1,topPick:true,price:'€',mealWindow:'Breakfast / Coffee · Castello near Rio Hotel',notes:'Convenient hotel-area pastry stop · Also useful on departure morning',dishes:['Cappuccino','Espresso','Cornetto','Fresh pastries'],maps:'https://www.google.com/maps/search/?api=1&query=Pasticceria+Bonifacio+Venice'},

    {id:'venice-0916-coffee-doge',name:'Caffè del Doge',city:'Venice',category:'Coffee',plannedDay:'2026-09-16',rank:1,topPick:true,price:'€',mealWindow:'Morning Coffee · Rialto',notes:'Coffee-focused stop rather than a pastry destination',dishes:['Espresso','Cappuccino','Specialty coffee'],maps:'https://www.google.com/maps/search/?api=1&query=Caffe+del+Doge+Venice'},
    {id:'venice-0916-breakfast-rizzardini',name:'Pasticceria Rizzardini',city:'Venice',category:'Breakfast',plannedDay:'2026-09-16',rank:1,topPick:true,price:'€',mealWindow:'Pastry + Coffee · San Polo',notes:'Historic Venetian pastry shop',dishes:['Cappuccino','Espresso','Traditional pastries','Venetian sweets'],maps:'https://www.google.com/maps/search/?api=1&query=Pasticceria+Rizzardini+Venice'},
    {id:'venice-0916-bite-all-arco',name:'Bar All’Arco',city:'Venice',category:'Small Bite',plannedDay:'2026-09-16',rank:1,topPick:true,favorite:true,official:true,rating:5,price:'€',mealWindow:'Rialto Lunch Experience · MUST TRY',notes:'Cicchetti Official Pick · Primarily daytime · Start of the suggested Rialto food crawl',dishes:['Baccalà mantecato','Seafood cicchetti','Seasonal crostini','Wine','Prosecco'],maps:'https://www.google.com/maps/search/?api=1&query=Bar+All%27Arco+Venice'},
    {id:'venice-0916-bite-al-merca',name:'Al Mercà',city:'Venice',category:'Small Bite',plannedDay:'2026-09-16',rank:2,favorite:true,price:'€',mealWindow:'Rialto Food Crawl · Quick Bite',notes:'Follow All’Arco with a small sandwich or cicchetto; do not eat heavily at either stop',dishes:['Small filled sandwiches','Cured meats','Cheese','Polpette','Baccalà','Spritz','Wine'],maps:'https://www.google.com/maps/search/?api=1&query=Al+Merca+Venice'},
    {id:'venice-0916-lunch-carampane',name:'Antiche Carampane',city:'Venice',category:'Lunch',plannedDay:'2026-09-16',rank:1,topPick:true,price:'€€€',mealWindow:'Sit-Down Lunch Alternative · San Polo',notes:'Traditional Venetian pick if you prefer a proper restaurant instead of the cicchetti crawl',reservation:'Recommended',dishes:['Fresh fish','Octopus','Fried seafood','Seasonal dishes'],maps:'https://www.google.com/maps/search/?api=1&query=Antiche+Carampane+Venice'},
    {id:'venice-0916-lunch-zucca',name:'La Zucca',city:'Venice',category:'Lunch',plannedDay:'2026-09-16',rank:2,price:'€€',mealWindow:'Sit-Down Lunch Alternative · Santa Croce',notes:'Different / non-seafood-heavy pick',dishes:['Pumpkin flan','Seasonal vegetable dishes','Fresh pasta','Meat dishes'],maps:'https://www.google.com/maps/search/?api=1&query=La+Zucca+Venice'},
    {id:'venice-0916-lunch-do-spade',name:'Cantina Do Spade',city:'Venice',category:'Lunch',plannedDay:'2026-09-16',rank:3,price:'€€',mealWindow:'Rialto Sit-Down / Bacaro Backup',notes:'Intentional holdover · Useful if you want a proper meal instead of the crawl',dishes:['Mixed cicchetti','Seafood pasta','House wine'],maps:'https://www.google.com/maps/search/?api=1&query=Cantina+Do+Spade+Venice'},
    {id:'venice-0916-bar-vino-vero',name:'Vino Vero',city:'Venice',category:'Bar',plannedDay:'2026-09-16',rank:1,topPick:true,favorite:true,official:true,price:'€€',mealWindow:'Cannaregio Evening · First Stop',notes:'Natural-wine-focused bacaro · Start with wine and one cicchetto',dishes:['Natural wines','Wine by the glass','Cicchetti'],maps:'https://www.google.com/maps/search/?api=1&query=Vino+Vero+Venice'},
    {id:'venice-0916-bar-al-timon',name:'Al Timon',city:'Venice',category:'Bar',plannedDay:'2026-09-16',rank:2,price:'€€',mealWindow:'Cannaregio Evening · Aperitivo',notes:'Lively canalside bacaro · Better as aperitivo than as the main dinner',dishes:['Spritz','Wine','Cicchetti'],maps:'https://www.google.com/maps/search/?api=1&query=Al+Timon+Venice'},
    {id:'venice-0916-dinner-al-cicheto',name:'Osteria al Cicheto',city:'Venice',category:'Dinner',plannedDay:'2026-09-16',rank:1,topPick:true,favorite:true,official:true,rating:5,price:'€€',mealWindow:'Cannaregio Dinner · Main Stop',notes:'Family-run neighborhood osteria with strong wine and more variety than seafood-only menus',dishes:['Fresh pasta','Venetian specialties','Meat','Seafood','Wine pairings','Homemade desserts'],maps:'https://www.google.com/maps/search/?api=1&query=Osteria+al+Cicheto+Venice'},
    {id:'venice-0916-dinner-promessi',name:'Osteria Ai Promessi Sposi',city:'Venice',category:'Dinner',plannedDay:'2026-09-16',rank:2,price:'€€',mealWindow:'Cannaregio Dinner Alternative',notes:'Relaxed, value-oriented alternative',dishes:['Bigoli','Risotto','Sarde in saor','Seafood pasta','Meat dishes'],maps:'https://www.google.com/maps/search/?api=1&query=Osteria+Ai+Promessi+Sposi+Venice'},
    {id:'venice-0916-breakfast-tonolo',name:'Pasticceria Tonolo',city:'Venice',category:'Breakfast',plannedDay:'2026-09-16',rank:3,price:'€',mealWindow:'Optional Dorsoduro Detour',notes:'Only if you naturally explore Dorsoduro · Do not cross Venice solely for it',dishes:['Traditional Venetian pastries','Cream pastries','Coffee','Seasonal sweets'],maps:'https://www.google.com/maps/search/?api=1&query=Pasticceria+Tonolo+Venice'},
    {id:'venice-0916-bar-schiavi',name:'Cantine del Vino già Schiavi',city:'Venice',category:'Bar',plannedDay:'2026-09-16',rank:3,price:'€',mealWindow:'Optional Dorsoduro Bacaro',notes:'Only if you naturally explore Dorsoduro · Classic inexpensive cicchetti stop',dishes:['Cicchetti','Baccalà','Crostini','Wine by the glass'],maps:'https://www.google.com/maps/search/?api=1&query=Cantine+del+Vino+gia+Schiavi+Venice'},

    {id:'venice-0917-breakfast-bonifacio',name:'Pasticceria Bonifacio',city:'Venice',category:'Breakfast',plannedDay:'2026-09-17',rank:1,topPick:true,favorite:true,price:'€',mealWindow:'Departure Breakfast · Near Rio Hotel',notes:'Recommended quick breakfast before the 9:26 AM Frecciarossa',dishes:['Cappuccino','Espresso','Cornetto','Fresh pastry'],maps:'https://www.google.com/maps/search/?api=1&query=Pasticceria+Bonifacio+Venice'},
    {id:'venice-0917-bite-da-lele',name:'Bacareto da Lele',city:'Venice',category:'Small Bite',plannedDay:'2026-09-17',rank:2,price:'€',mealWindow:'Departure-Morning Backup · Santa Croce',notes:'Location-based backup toward the station area · Skip if timing does not naturally work',dishes:['Small sandwiches'],maps:'https://www.google.com/maps/search/?api=1&query=Bacareto+da+Lele+Venice'}
  ];

  const extras = {
    signatures:['🥪 Bar All’Arco + Al Mercà Rialto food crawl','🦞 Seafood dinner at Osteria alle Testiere','🍮 Classic tiramisu at I Tre Mercanti','🍨 Suso — Crema del Doge','🌙 Cannaregio food night: Vino Vero → Al Timon → Osteria al Cicheto'],
    skip:['Do not cross Venice solely for optional Dorsoduro food stops.','Skip very long queues at Suso or I Tre Mercanti; use them when the line is reasonable.','Restaurants in St. Mark’s Square with multilingual tourist menus or aggressive hosts.','Do not treat every recommendation as mandatory; prioritize what fits your current route and appetite.'],
    five:['🥪 Bar All’Arco + Al Mercà crawl','🦞 Osteria alle Testiere — special seafood dinner','🍮 I Tre Mercanti — classic tiramisu','🍨 Suso — Crema del Doge','🌙 Cannaregio food night']
  };

  const coords = {
    'Venice|Osteria alla Staffa':{lat:45.4372,lng:12.3448},'Venice|Rosticceria Gislon':{lat:45.4376,lng:12.3408},'Venice|Magna Bevi Tasi':{lat:45.4348,lng:12.3411},'Venice|Pasticceria Bonifacio':{lat:45.4352,lng:12.3421},'Venice|Caffè del Doge':{lat:45.4380,lng:12.3345},'Venice|Pasticceria Rizzardini':{lat:45.4367,lng:12.3318},'Venice|Bar All’Arco':{lat:45.4382,lng:12.3340},'Venice|Vino Vero':{lat:45.4459,lng:12.3317},'Venice|Al Timon':{lat:45.4455,lng:12.3301},'Venice|Osteria al Cicheto':{lat:45.4428,lng:12.3244},'Venice|Osteria Ai Promessi Sposi':{lat:45.4437,lng:12.3303},'Venice|Pasticceria Tonolo':{lat:45.4360,lng:12.3225},'Venice|Cantine del Vino già Schiavi':{lat:45.4318,lng:12.3267},'Venice|Bacareto da Lele':{lat:45.4378,lng:12.3216}
  };

  // Update the in-memory curated data used by the existing Guide code.
  if (typeof VENICE_FOOD_GUIDE !== 'undefined') VENICE_FOOD_GUIDE.splice(0, VENICE_FOOD_GUIDE.length, ...places.map(p=>({...p})));
  if (typeof CITY_FOOD_EXTRAS !== 'undefined') CITY_FOOD_EXTRAS.Venice = extras;
  if (typeof GUIDE_PLACE_COORDS !== 'undefined') Object.assign(GUIDE_PLACE_COORDS, coords);

  // Replace only curated Venice IDs; manual user-created places use generated IDs and are preserved.
  try {
    const key=PFX+'guide-places';
    const current=JSON.parse(localStorage.getItem(key)||'[]');
    const custom=current.filter(place=>!String(place?.id||'').startsWith('venice-'));
    localStorage.setItem(key,JSON.stringify([...custom,...places.map(p=>({...p}))]));
    localStorage.setItem(PFX+'venice-food-guide-update',String(VENICE_VERSION));
  } catch (error) {
    console.error('Unable to migrate Venice food guide',error);
  }

  // Sept. 17 contains both Venice departure food and Florence arrival food.
  // Keep Today suggestions city-specific so those two sets never mix.
  if (typeof todayFoodHTML === 'function') {
    todayFoodHTML = function(day){
      const all=ensureFoodGuides();
      const placesForDay=all.filter(p=>p.plannedDay===day.date&&p.city===day.city);
      if(!placesForDay.length)return '';
      const grouped={};placesForDay.forEach(p=>(grouped[p.category]||=[]).push(p));
      const categories=Object.keys(grouped).sort((a,b)=>foodCategoryOrder(a)-foodCategoryOrder(b));
      return `<section class="today-food-section"><div class="today-food-heading"><div><span>🍴</span><div><div class="focus-label">CURATED FOR ${day.city.toUpperCase()}</div><h2>Today’s food suggestions</h2></div></div><button class="text-button" data-food-guide-city="${day.city}">View all</button></div><div class="today-food-groups">${categories.map(category=>{const items=grouped[category].sort((a,b)=>(a.rank||9)-(b.rank||9));const top=items[0],alts=items.slice(1);return `<article class="today-food-group"><div class="today-food-category"><span>${foodCategoryIcon(category)}</span><div><strong>${category}</strong><small>${escapeHTML(top.mealWindow||'')}</small></div></div><div class="today-food-top"><div><span class="food-rank top">${foodRankLabel(top)}</span><h3>${escapeHTML(top.name)}</h3>${top.notes?`<p>${escapeHTML(top.notes)}</p>`:''}</div><a href="${escapeHTML(guideMapsUrl(top))}" target="_blank" rel="noopener">Maps</a></div>${alts.length?`<div class="today-food-alts"><span>Alternatives</span>${alts.map(p=>`<a href="${escapeHTML(guideMapsUrl(p))}" target="_blank" rel="noopener"><strong>${escapeHTML(p.name)}</strong><small>${foodRankLabel(p)}</small></a>`).join('')}</div>`:''}</article>`;}).join('')}</div></section>`;
    };
  }

  const patchVeniceLabels=()=>{
    const guide=document.getElementById('guide');
    if(!guide)return;
    guide.querySelectorAll('.venice-food-intro p').forEach(p=>{if(p.textContent.includes('September 15–16'))p.textContent=p.textContent.replace('September 15–16','September 15–17')});
    guide.querySelectorAll('.food-day-section').forEach(section=>{
      const small=section.querySelector('.food-day-heading small');
      const title=section.querySelector('.food-day-heading h3');
      if(small?.textContent.trim()==='Sep 17'&&title)title.textContent='Departure to Florence';
      if(small?.textContent.trim()==='Sep 16'&&title)title.textContent='Full Venice Day';
    });
  };

  if (typeof renderGuide === 'function') {
    const baseRenderGuide=renderGuide;
    renderGuide=function(...args){const result=baseRenderGuide.apply(this,args);requestAnimationFrame(patchVeniceLabels);return result;};
    renderGuide();
  }
  if (typeof renderHome === 'function') renderHome();
  requestAnimationFrame(patchVeniceLabels);
})();

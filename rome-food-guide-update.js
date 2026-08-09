(() => {
const PFX='italy2026-v4-';
const p=(id,name,category,day,rank,price,window,notes,dishes=[])=>({id:`rome-${id}`,name,city:'Rome',category,plannedDay:`2026-09-${day}`,rank,topPick:rank===1,price,mealWindow:window,notes,dishes,maps:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' Rome')}`});
const places=[
// Sep 20 — Historic Center
p('0920-dinner-cesare-pellegrino','Cesare al Pellegrino','Dinner','20',1,'€€','Centro Storico · Campo de’ Fiori / Navona','Central Roman Official Pick · Excellent arrival-day lunch or dinner',['Carbonara','Amatriciana','Gricia','Seasonal Roman dishes']),
p('0920-dinner-grappolo','Hosteria Grappolo d’Oro','Dinner','20',2,'€€','Campo de’ Fiori','Reliable traditional Roman cooking in an extremely tourist-heavy area'),
p('0920-dinner-roscioli','Roscioli Salumeria con Cucina','Dinner','20',3,'€€€','Regola / Campo de’ Fiori','Tourist-famous but legitimate · Famous, crowded and relatively expensive',['Carbonara','Amatriciana','Salumi','Cheese','Wine']),
p('0920-bite-forno-roscioli','Antico Forno Roscioli','Small Bite','20',1,'€','Campo de’ Fiori area','Pizza al Taglio Official Pick · Excellent quick arrival lunch',['Pizza bianca','Pizza rossa','Seasonal pizza al taglio','Fresh bread']),
p('0920-bite-suppli-coronari','I Supplì dei Coronari','Small Bite','20',2,'€','Piazza Navona / Via dei Coronari','Convenient supplì stop while exploring Piazza Navona',['Classic supplì','Rotating fritti']),
p('0920-coffee-santeustachio','Sant’Eustachio Il Caffè','Coffee','20',1,'€','Pantheon','Historic Espresso Pick · Go primarily for the coffee rather than table service',['Espresso']),
p('0920-coffee-tazza','La Casa del Caffè Tazza d’Oro','Coffee','20',2,'€','Pantheon','Classic Roman Coffee Pick · No need to visit both major Pantheon coffee bars unless comparing',['Espresso','Granita di caffè']),
p('0920-breakfast-roscioli','Roscioli Caffè','Breakfast','20',1,'€','Historic Center','Pastry + coffee option',['Espresso','Pastries','Maritozzo']),
p('0920-breakfast-barnum','Barnum Roma','Breakfast','20',2,'€€','Campo de’ Fiori / Navona','Modern sit-down breakfast / coffee alternative'),
p('0920-dessert-two-sizes','Two Sizes','Dessert','20',1,'€','Piazza Navona','Tiramisu Official Pick · Small, inexpensive and easy to work into sightseeing',['Classic tiramisu','Pistachio tiramisu']),
p('0920-gelato-giolitti','Giolitti','Gelato','20',1,'€','Pantheon area','Historic gelato experience · Tourist-heavy but historically significant'),
p('0920-gelato-frigidarium','Frigidarium','Gelato','20',2,'€','Centro Storico / Navona','Intentional legacy holdover · Convenient central gelato backup, not the artisanal priority'),
p('0920-bar-culdesac','Cul de Sac','Bar','20',1,'€€','Piazza Navona','Wine + food pick with a huge wine selection and small plates'),
p('0920-bar-angolo','L’Angolo Divino','Bar','20',2,'€€','Campo de’ Fiori','Serious Wine Pick · Best when you want help choosing Italian / Lazio wine'),
p('0920-bar-rimessa','Rimessa Roscioli','Bar','20',3,'€€€','Regola','Structured wine tasting / pairing experience · Optional after Tuscany wine day'),
// Sep 21 — Ancient Rome / Monti
p('0921-breakfast-regoli','Regoli Pasticceria','Breakfast','21',1,'€','Esquilino','Maritozzo Official Pick',['Maritozzo con panna']),
p('0921-breakfast-panella','Panella','Breakfast','21',2,'€','Esquilino','Bakery alternative useful on the way toward Ancient Rome',['Pastries','Bread','Coffee','Savory baked goods']),
p('0921-bite-supplizio','Supplizio','Small Bite','21',1,'€','Centro Storico · Destination quick bite','Supplì Official Pick · Closed Sunday, so Monday is the first opportunity',['Classic supplì']),
p('0921-bite-er-buchetto','Er Buchetto','Small Bite','21',2,'€','Termini / Opera','Tiny old-school porchetta specialist',['Porchetta sandwich']),
p('0921-dinner-armando','Armando al Pantheon','Dinner','21',1,'€€–€€€','Return-to-center dinner · Pantheon','Classic Roman Institution · Reservation strongly recommended · Closed Sunday',['Carbonara','Amatriciana','Saltimbocca','Roman specials']),
p('0921-dinner-santopalato','SantoPalato','Dinner','21',2,'€€–€€€','DESTINATION · San Giovanni','Modern Roman Official Pick · Worth deliberately leaving the tourist center for',['Carbonara','Quinto quarto','Seasonal Roman cooking']),
p('0921-dinner-cesare-casaletto','Cesare al Casaletto','Dinner','21',3,'€€','DESTINATION · Monteverde','Destination trattoria · Food itself justifies leaving central Rome'),
p('0921-pizza-180g','180g Pizzeria Romana','Small Bite','21',3,'€€','DESTINATION · Centocelle','Very thin, crisp Roman pizza · Deliberate detour rather than convenience recommendation'),
p('0921-gelato-come-latte','Come il Latte','Gelato','21',1,'€','Sallustiano','Rich Gelato Pick',['Pistachio','Fior di latte','Chocolate','Stracciatella']),
p('0921-gelato-fassi','Gelateria Fassi','Gelato','21',2,'€','Esquilino','Historic Palazzo del Freddo experience'),
p('0921-bar-barrique','La Barrique','Bar','21',1,'€€','Monti','Wine-first Monti pick with small plates'),
p('0921-bar-drink-kong','Drink Kong','Bar','21',2,'€€–€€€','Monti · Post-dinner','Cocktail Official Pick · Useful after dinner and before/after the booked night tour depending on timing'),
// Sep 22 — Vatican / Trastevere
p('0922-lunch-romane','Romanè','Lunch','22',1,'€€','Vatican / Cipro · TIMING-DEPENDENT','Vatican-Day Restaurant Official Pick · Work around the 9:00 AM Museums and 1:30 PM St. Peter’s tickets',['Carbonara','Amatriciana','Trippa','Roman meat dishes']),
p('0922-bite-pizzarium','Pizzarium Bonci','Small Bite','22',1,'€–€€','Cipro · TIMING-DEPENDENT','Famous pizza al taglio pick · Try several small pieces rather than one large portion',['Potato pizza','Seasonal vegetables','Cheese','Meat specials']),
p('0922-bite-panificio-bonci','Panificio Bonci','Small Bite','22',2,'€','Prati · TIMING-DEPENDENT','Bakery alternative for bread, pizza and quick baked snacks'),
p('0922-gelato-gracchi','Gelateria dei Gracchi','Gelato','22',1,'€','Prati','Prati Gelato Official Pick',['Pistachio']),
p('0922-gelato-neve','Neve di Latte','Gelato','22',2,'€','Piazza Cavour / Prati','Artisanal gelato alternative · Particularly useful after Castel Sant’Angelo'),
p('0922-dinner-da-enzo','Da Enzo al 29','Dinner','22',1,'€€','Trastevere','Famous Trastevere pick · Do not waste an hour-plus waiting if the queue is ridiculous',['Carbonara','Amatriciana','Coda alla vaccinara']),
p('0922-dinner-der-belli','Osteria Der Belli','Dinner','22',2,'€€','Trastevere','Seafood alternative that breaks up the heavy Roman-pasta focus'),
p('0922-dinner-tavernaccia','La Tavernaccia da Bruno','Dinner','22',3,'€€','DESTINATION · Portuense / edge of Trastevere','Traditional Roman / Lazio family trattoria · Deliberate move away from tourist-heavy Trastevere'),
p('0922-pizza-elementare','L’Elementare','Small Bite','22',1,'€€','Trastevere','Roman Tonda Official Pick · Very thin crisp pizza plus strong fritti'),
p('0922-pizza-ai-marmi','Ai Marmi','Small Bite','22',2,'€€','Trastevere','Old-school busy Roman pizzeria experience'),
p('0922-pizza-renella','La Renella','Small Bite','22',3,'€','Trastevere','Bakery / pizza al taglio · Better spontaneous snack than destination dinner'),
p('0922-pizza-seu','Seu Pizza Illuminati','Small Bite','22',4,'€€','DESTINATION · Porta Portese','Contemporary chef-driven pizza alternative'),
p('0922-bite-suppli-roma','Supplì Roma','Small Bite','22',5,'€','Trastevere','Inexpensive neighborhood supplì stop'),
p('0922-bite-trapizzino','Trapizzino','Small Bite','22',1,'€','Trastevere / Testaccio','Unique Roman Street-Food Official Pick · One of the highest-priority quick bites',['Chicken cacciatore','Meatballs in tomato sauce']),
p('0922-bite-iacozzilli','La Norcineria di Iacozzilli','Small Bite','22',2,'€','Trastevere','Porchetta Official Pick · Small deli/butcher rather than tourist sandwich chain',['Porchetta sandwich']),
p('0922-dessert-maritozzaro','Il Maritozzaro','Dessert','22',1,'€','Portuense · Late night','Neighborhood maritozzo specialist · Fun late-night alternative to Regoli',['Maritozzo']),
p('0922-gelato-otaleg','Otaleg','Gelato','22',1,'€','Trastevere','Rome Gelato Official Pick · Serious artisanal-gelato leader'),
p('0922-bar-latteria','Latteria Trastevere','Bar','22',1,'€€','Trastevere','Natural wine + small plates · Alternative to standard spritz-bar experience'),
// Sep 23 — North / Ghetto / Aventine / optional Testaccio
p('0923-bite-mozzico','La Vita è un Mozzico','Small Bite','23',1,'€','Piazza del Popolo','Roman Sandwich Official Pick',['Porchetta','Salumi','Cheese','Pizza bianca']),
p('0923-coffee-faro','Faro - Caffè Specialty','Coffee','23',1,'€€','Villa Borghese / Porta Pia side','Specialty Coffee Official Pick · Coffee-focused preparation'),
p('0923-dessert-boccione','Boccione','Dessert','23',1,'€','Jewish Ghetto','Jewish-Roman Sweet Pick',['Ricotta & sour-cherry crostata','Pizza ebraica']),
p('0923-dessert-sora-mirella','Sora Mirella','Dessert','23',2,'€','Tiber Island / Lungotevere','Grattachecca Pick · Warm-weather Roman shaved-ice specialty',['Grattachecca']),
p('0923-bite-casa-manco','Casa Manco','Small Bite','23',1,'€','OPTIONAL TESTACCIO · DAYTIME MARKET HOURS','Market Pizza Official Pick · Only surface as a deliberate Testaccio food detour during market hours'),
p('0923-bite-mordi-vai','Mordi & Vai','Small Bite','23',2,'€','OPTIONAL TESTACCIO · DAYTIME MARKET HOURS','Roman Meat Sandwich Official Pick · Only if choosing Testaccio as a food destination',['Allesso','Picchiapò','Rotating Roman meat fillings']),
p('0923-breakfast-linari','Pasticceria Linari','Breakfast','23',1,'€','Testaccio','Neighborhood bakery alternative',['Espresso','Maritozzo','Pastries']),
p('0923-dinner-felice','Felice a Testaccio','Dinner','23',1,'€€–€€€','OPTIONAL TESTACCIO','Cacio e Pepe Official Pick · Famous but useful for the signature tableside experience',['Cacio e pepe']),
p('0923-dinner-flavio','Flavio al Velavevodetto','Dinner','23',2,'€€','OPTIONAL TESTACCIO · Monte Testaccio','Food-focused Roman pasta alternative to Felice',['Carbonara','Gricia','Amatriciana']),
p('0923-dinner-scopettaro','Lo Scopettaro','Dinner','23',3,'€€','OPTIONAL TESTACCIO','Old-school straightforward Roman trattoria · Less hype'),
p('0923-dinner-pennestri','Trattoria Pennestri','Dinner','23',4,'€€','OPTIONAL · Ostiense','More contemporary / seasonal trattoria alternative'),
p('0923-bite-forno-campo','Forno Campo de’ Fiori','Small Bite','23',3,'€','Campo de’ Fiori','Pizza Bianca Pick · Simple and useful in a tourist-heavy area',['Pizza bianca']),
p('0923-bite-filettaro','Dar Filettaro a Santa Barbara','Small Bite','23',4,'€','Near Campo de’ Fiori · Evening','Fried Baccalà Pick · This does not need to be a full meal',['Filetto di baccalà']),
p('0923-bar-goccetto','Il Goccetto','Bar','23',1,'€€','Historic Center · Via dei Banchi Vecchi','Wine Bar Official Pick · Deep Italian wine selection and classic enoteca atmosphere'),
p('0923-bar-vinaietto','Il Vinaietto','Bar','23',2,'€','Near Largo Argentina','Old-school casual wine pick · Less polished and less expensive'),
p('0923-dinner-sostegno','Osteria del Sostegno','Dinner','23',1,'€€','Pantheon','Hidden-Central Official Pick · Tiny side-street osteria · Closed Sunday + Monday',['Carbonara','Cacio e pepe','Amatriciana','Seasonal pasta']),
// Sep 24 — departure repeats
p('0924-breakfast-roscioli','Roscioli Caffè','Breakfast','24',1,'€','Departure Morning · Keep convenient','Early central breakfast repeat · Do not cross Rome for a destination breakfast'),
p('0924-coffee-santeustachio','Sant’Eustachio Il Caffè','Coffee','24',1,'€','Departure Morning · Only if location/timing works','Espresso repeat option before the 9:41 AM train'),
p('0924-coffee-tazza','La Casa del Caffè Tazza d’Oro','Coffee','24',2,'€','Departure Morning · Only if location/timing works','Classic coffee repeat option before Termini')
];
places.forEach(x=>{if(x.rank===1)x.favorite=true});
const extras={
signatures:['🍝 Armando al Pantheon — classic Roman institution','🟠 Supplizio — classic supplì','🥪 Trapizzino — unique Roman street food','🍕 Pizzarium — pizza al taglio','🍨 Otaleg — artisanal gelato','🥐 Regoli — maritozzo','🍷 Il Goccetto / 🍸 Drink Kong — drinks'],
skip:['Rome strategy: use neighborhood picks first; use destination picks only when you deliberately want to make food the activity.','Do not wait an hour-plus for Da Enzo if the queue is ridiculous.','Do not force Testaccio into Sep 23; market stops are optional and daytime-sensitive.','Do not squeeze a major meal between the 9:00 AM Vatican Museums and 1:30 PM St. Peter’s tickets unless timing genuinely works.','Avoid generic tourist-menu restaurants immediately surrounding major landmarks.'],
five:['🍝 Armando al Pantheon','🟠 Supplizio','🥪 Trapizzino','🍕 Pizzarium','🍨 Otaleg','🥐 Regoli','🍷 Il Goccetto / 🍸 Drink Kong']};
const coords={
'Rome|Cesare al Pellegrino':{lat:41.8972,lng:12.4685},'Rome|Hosteria Grappolo d’Oro':{lat:41.8957,lng:12.4725},'Rome|Roscioli Salumeria con Cucina':{lat:41.8943,lng:12.4740},'Rome|Antico Forno Roscioli':{lat:41.8950,lng:12.4744},'Rome|Sant’Eustachio Il Caffè':{lat:41.8985,lng:12.4755},'Rome|La Casa del Caffè Tazza d’Oro':{lat:41.8993,lng:12.4766},'Rome|Two Sizes':{lat:41.8988,lng:12.4710},'Rome|Armando al Pantheon':{lat:41.8990,lng:12.4762},'Rome|Regoli Pasticceria':{lat:41.8966,lng:12.5015},'Rome|SantoPalato':{lat:41.8777,lng:12.5058},'Rome|La Barrique':{lat:41.8948,lng:12.4917},'Rome|Drink Kong':{lat:41.8959,lng:12.4992},'Rome|Romanè':{lat:41.9071,lng:12.4464},'Rome|Pizzarium Bonci':{lat:41.9072,lng:12.4454},'Rome|Gelateria dei Gracchi':{lat:41.9080,lng:12.4645},'Rome|Da Enzo al 29':{lat:41.8884,lng:12.4755},'Rome|L’Elementare':{lat:41.8907,lng:12.4700},'Rome|Otaleg':{lat:41.8875,lng:12.4690},'Rome|Boccione':{lat:41.8923,lng:12.4778},'Rome|Casa Manco':{lat:41.8776,lng:12.4756},'Rome|Mordi & Vai':{lat:41.8774,lng:12.4752},'Rome|Felice a Testaccio':{lat:41.8778,lng:12.4765},'Rome|Flavio al Velavevodetto':{lat:41.8759,lng:12.4742},'Rome|Il Goccetto':{lat:41.8951,lng:12.4693},'Rome|Osteria del Sostegno':{lat:41.9001,lng:12.4771}};
if(typeof ROME_FOOD_GUIDE!=='undefined')ROME_FOOD_GUIDE.splice(0,ROME_FOOD_GUIDE.length,...places.map(x=>({...x})));
if(typeof CITY_FOOD_EXTRAS!=='undefined')CITY_FOOD_EXTRAS.Rome=extras;
if(typeof GUIDE_PLACE_COORDS!=='undefined')Object.assign(GUIDE_PLACE_COORDS,coords);
try{const key=PFX+'guide-places';const current=JSON.parse(localStorage.getItem(key)||'[]');const custom=current.filter(x=>!String(x?.id||'').startsWith('rome-'));localStorage.setItem(key,JSON.stringify([...custom,...places.map(x=>({...x}))]));localStorage.setItem(PFX+'rome-food-guide-update','1')}catch(e){console.error('Unable to migrate Rome food guide',e)}
const patchLabels=()=>{const guide=document.getElementById('guide');if(!guide)return;guide.querySelectorAll('.food-day-section').forEach(s=>{const d=s.querySelector('.food-day-heading small')?.textContent.trim(),h=s.querySelector('.food-day-heading h3');if(!h)return;if(d==='Sep 20')h.textContent='Arrival + Historic Rome';if(d==='Sep 21')h.textContent='Ancient Rome + Monti';if(d==='Sep 22')h.textContent='Vatican + Trastevere';if(d==='Sep 23')h.textContent='North-Central + Ghetto + Aventine';if(d==='Sep 24')h.textContent='Departure to Naples';});};
if(typeof renderGuide==='function'){const base=renderGuide;renderGuide=function(...a){const r=base.apply(this,a);requestAnimationFrame(patchLabels);return r};renderGuide()}if(typeof renderHome==='function')renderHome();requestAnimationFrame(patchLabels);
})();

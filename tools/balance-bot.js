
/* ---- balance bot: plays the real game loop ---- */
const STRATEGY = process.env.STRAT || 'radiance';
const REPS = parseInt(process.env.REPS || '3', 10);

function countIdle(venue){ return ROSTER.filter(d=>d.venue===venue && run.npcs[d.id].state==='idle').length; }
function countHusks(){ return ROSTER.filter(d=>run.npcs[d.id].state==='husk').length; }

function botShop(strategy){
  const wants = (strategy==='blight'||strategy==='blight_paced')
    ? ['insult','reson','patient','rumor','fester','reserves','sight']
    : ['praise','reson','patient','rally','tend','reserves','sight'];
  for (const id of wants){
    const it = SHOP.find(s=>s.id===id);
    if (!it) continue;
    const owned = it.kind==='action' ? run.owned[id] : it.kind==='art' ? run.arts[id] : run.upgrades[id];
    if (!owned && run.essence >= it.price + 100) buyItem(id); // keep a cushion
  }
}

function countHuskIn(venue){ return ROSTER.filter(d=>d.venue===venue && run.npcs[d.id].state==='husk').length; }
function botVenue(){
  // move to the unlocked venue with the most FOOD: idle souls, or husks to glean
  const score = v => countIdle(v)*3 + countHuskIn(v);
  const here = score(run.venue);
  if (countIdle(run.venue) >= 6) return;
  let best = run.venue, bn = here;
  for (const v of VENUES){
    if (!run.unlocked[v.id] || v.id===run.venue) continue;
    const n = score(v.id);
    if (n > bn + 2){ bn = n; best = v.id; }
  }
  if (best !== run.venue){ goVenue(best); closeModal(); }
}

function botAct(strategy){
  // the paced reaper: once today's quota is safely met, bank your souls
  if (strategy==='blight_paced' && run.dayEarned >= quotaFor(run.day)*1.2) return;
  const cands = ROSTER.filter(d=>d.venue===run.venue && run.npcs[d.id].state==='idle');
  if (!cands.length){
    // starving: glean a husk if one is here, else look for greener venues
    const husk = ROSTER.find(d=>d.venue===run.venue && run.npcs[d.id].state==='husk');
    if (husk && run.focus>=5){ selected = husk.id; glean(); return; }
    botVenue(); return;
  }
  // blight late-game: gleaning beats waiting when targets are scarce
  if ((strategy==='blight'||strategy==='blight_paced') && cands.length<3 && run.focus>=5){
    const husk = ROSTER.find(d=>d.venue===run.venue && run.npcs[d.id].state==='husk');
    if (husk){ selected = husk.id; glean(); return; }
  }
  const dir = (strategy==='blight'||strategy==='blight_paced') ? -1 : 1; // hybrid handled below
  let best=null, bs=-1;
  for (const d of cands){
    const n = run.npcs[d.id];
    let s = n.i + (n.peak>0?0.7:0);
    if (strategy!=='hybrid') s += (dir>0 ? n.v : -n.v)*0.25; // prefer aligned moods
    if (s>bs){ bs=s; best=d; }
  }
  selected = best.id;
  const n = run.npcs[best.id];
  const sign = strategy==='hybrid' ? (n.v>=0?1:-1) : dir;
  const aligned = (n.v>=0) === (sign>0);
  // harvest inside peaks, or just before venting
  if (aligned && Math.abs(n.v)>=0.25 && run.focus>=10 && (n.peak>0 || n.i>=0.92)){
    harvest(); return;
  }
  // build: push in our direction
  let actId;
  if (sign>0) actId = (run.owned.praise && actUsable('praise',n)) ? 'praise' : 'hype';
  else actId = (run.owned.insult && actUsable('insult',n)) ? 'insult' : 'snide';
  if (actUsable(actId,n)) doAction(actId);
}

function playDay(strategy){
  let guard = 0;
  while (run && mode==='play' && !modalOpen && guard++ < 4000){
    update(0.25);
    if (!run || mode!=='play' || modalOpen) break;
    botAct(strategy);
  }
}

function simulateRun(strategy){
  startGame(true);
  const days = [];
  let guard = 0;
  while (mode==='play' && guard++ < 80){
    botShop(strategy);
    closeModal();            // buyItem reopens the shop — shut it before play
    const dayNum = run.day;
    playDay(strategy);
    if (run && mode==='play' && modalOpen && run.dayT <= 0.3){
      days.push({ d:dayNum, earned:run.dayEarned, quota:quotaFor(dayNum),
        margin:+(run.dayEarned/quotaFor(dayNum)).toFixed(2),
        ess:run.essence, husks:countHusks(), stolen:Math.round(run.dayStolen) });
      nextDay(); foldLetter();
    } else if (mode==='over'){
      days.push({ d:dayNum, earned:0, quota:quotaFor(dayNum), margin:0, failed:true });
      break;
    } else if (mode==='ending'){
      days.push({ d:dayNum, quota:quotaFor(dayNum), margin:'WIN' });
      if (process.env.ENDLESS==='1'){ enterEndless(); foldLetter(); continue; }
      break;
    }
  }
  return { strategy, endMode:mode, days };
}

for (let rep=0; rep<REPS; rep++){
  const r = simulateRun(STRATEGY);
  const tail = r.days.map(x=>`d${x.d}:${x.margin}`).join(' ');
  console.log(JSON.stringify({ strategy:r.strategy, rep, result:r.endMode, detail:tail }));
}

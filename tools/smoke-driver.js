
const fail = (m)=>{ console.error('FAIL:', m); process.exit(1); };
titleScreen();
startGame(true);
if (!run) fail('run not created');
if (ROSTER.length !== 68) fail('roster size '+ROSTER.length);
if (run.contracts.length !== 3) fail('contracts not generated');

// simulate a chunk of day 1 with interactions
selected = 'p1';
renderPanel();
for (let i=0;i<200;i++){ update(0.1); }
doAction('hype');
doAction('hype');

// force a clean radiance harvest
let n = run.npcs.p1;
n.state='idle'; n.v = 0.8; n.i = 0.9; n.peak = 5; n.peakDur = 10; run.focus = 100;
harvest();
if (run.essence <= 0) fail('radiance harvest yielded nothing');
if (n.state !== 'recover') fail('npc did not enter recovery');

// force a blight drain -> husk
selected = 'p2'; n = run.npcs.p2;
n.state='idle'; n.v = -0.8; n.i = 0.9; n.peak = 5; n.peakDur = 10; run.focus = 100;
harvest();
if (n.state !== 'husk') fail('blight target not husked');
if (!run.dayHuskedNames.includes('Dot')) fail('husked name not recorded');

// rare emotions
selected = 'p5'; n = run.npcs.p5;
n.state='idle'; n.v = 0.9; n.i = 0.95; run.focus = 100; harvest();
if (run.essBy.awe <= 0) fail('awe not captured');
selected = 'p6'; n = run.npcs.p6;
n.state='idle'; n.v = -0.9; n.i = 0.95; run.focus = 100; harvest();
if (run.essBy.dread <= 0) fail('dread not captured');

// day rollover -> Broker letter modal
run.dayEarned = quotaFor(run.day) + 10;
run.dayT = 0.01; update(0.05);
if (!modalOpen) fail('end-of-day modal did not open');
nextDay();
if (run.day !== 2) fail('day did not advance');
if (!modalOpen) fail('morning letter did not appear');
foldLetter();
if (modalOpen) fail('letter did not fold');
if (run.contracts.length !== 3) fail('contracts not regenerated');

// letters compose for every day + condition branch without throwing
const fakePrev = { contractsDone:3, shoos:2, stolen:40, ess:{joy:200,hope:0,awe:0,sorrow:0,rage:0,dread:0}, rad:400, bli:0, husked:['Dot'] };
for (let d2=2; d2<=LAST_DAY; d2++) {
  run.day = d2;
  for (let k=0;k<6;k++) {
    const L = composeLetter(JSON.parse(JSON.stringify(fakePrev)));
    if (!L.body || !L.from) fail('empty letter at day '+d2);
  }
}

// bargains
run.day = 6; run.essence = 500;
pendingBargain = { id:'tribute' }; acceptBargain();
if (run.maraOffDay !== 6 || run.essence !== 380) fail('tribute bargain broken: '+run.essence);
foldLetter && closeModal();
pendingBargain = { id:'joint' }; acceptBargain();
if (run.maraDeal !== 'joint') fail('joint bargain not set');
closeModal();
run.npcs.p3.state='husk'; run.npcs.p7.state='husk';
const huskCount = ROSTER.filter(x=>run.npcs[x.id].state==='husk').length;
const essBefore = run.essence, bliBefore = run.bli;
pendingBargain = { id:'husks' }; acceptBargain();
if (run.npcs.p3.state!=='taken' || run.npcs.p7.state!=='taken') fail('husk trade did not take husks');
if (run.essence !== essBefore+90*huskCount || run.bli !== bliBefore+90*huskCount) fail('husk trade payout/stain wrong');
closeModal();

// taken NPCs are skipped by sim + draw + input without crashing
for (let i=0;i<40;i++){ update(0.05); draw(); }

// Mara escalation: joint deal pays the player
run.day = 7; run.maraOffDay = 0; run.maraDeal = 'joint'; run.mara = null;
ensureMara();
if (!run.mara) fail('Mara did not spawn (day 7)');
const m = run.mara;
run.npcs.p4.state='idle'; run.npcs.p4.i = 0.9; run.npcs.p4.v = 0.5;
m.target = 'p4'; m.x = run.npcs.p4.x; m.y = run.npcs.p4.y;
const eBefore = run.essence;
for (let i=0;i<40;i++) updateMara(0.1);
if (run.essence <= eBefore) fail('joint hunt paid nothing');
if (maraTier() !== 1) fail('tier wrong at day 7');

// deep drain at ravenous tier
run.day = 11; run.maraDeal = null; run.maraDeepUsed = false;
if (maraTier() !== 2) fail('tier wrong at day 11');
run.npcs.p9.state='idle'; run.npcs.p9.i = 0.9; run.npcs.p9.v = 0.6; run.npcs.p9.peak = 0;
m.target = 'p9'; m.deep = 0; m.stunT = 0; m.cd = 0;
m.x = run.npcs.p9.x+10; m.y = run.npcs.p9.y;
updateMara(0.05);
if (m.deep <= 0) fail('deep drain did not start');
for (let i=0;i<200;i++) updateMara(0.05);
if (run.npcs.p9.state !== 'husk') fail('deep drain did not husk');
if (!run.maraDeepUsed) fail('deep-use flag not set');

// shoo at tier 2 costs 25 and interrupts deep
run.maraDeepUsed = false; run.npcs.p10.state='idle'; run.npcs.p10.i=0.9; run.npcs.p10.v=0.5;
m.target='p10'; m.deep=5; m.stunT=0; run.focus = 100;
shooMara();
if (m.deep !== 0 || m.stunT <= 0) fail('shoo did not break deep drain');
if (Math.abs(run.focus-75) > 0.001) fail('tier-2 shoo cost wrong: '+run.focus);
if (!run.maraDeepUsed) fail('interrupted deep not consumed');

// venue travel + draw calls across all venues (with Mara active)
for (const v of VENUES) { run.unlocked[v.id] = true; }
for (const v of VENUES) {
  goVenue(v.id); closeModal();
  for (let i=0;i<30;i++) update(0.05);
  draw(); draw();
}

// modal screens render without throwing
openContracts(); closeModal();
openShop(); closeModal();
openCase(); closeModal();
openMap(); closeModal();
openRecords(); closeModal();
openSettings(); closeModal();
howTo(); closeModal();

// full run to ending
run.day = LAST_DAY; run.dayEarned = quotaFor(LAST_DAY)+1; run.dayT = 0.01;
update(0.05);
if (mode !== 'ending') fail('ending did not trigger, mode='+mode);

// game over path on a fresh run
startGame(true);
run.dayEarned = 0; run.dayT = 0.01; update(0.05);
if (mode !== 'over') fail('game over did not trigger');

// save/load migration from a v4-shaped run (no v5 fields)
const v4run = JSON.parse(JSON.stringify(newRun()));
delete v4run.maraOffDay; delete v4run.maraDeal; delete v4run.dayShoos; delete v4run.dayHuskedNames; delete v4run.jointF; delete v4run.maraDeepUsed;
store['auraFarmRun'] = JSON.stringify(v4run);
startGame(false);
if (run.maraOffDay===undefined || run.dayHuskedNames===undefined) fail('v5 migration incomplete');
for (let i=0;i<50;i++){ update(0.05); draw(); }

console.log('SMOKE OK (v5) — letters, bargains, escalation, deep drain, migration all pass');

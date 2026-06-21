/* app.js — config, computed values, render + tick logic.
   Renders the same model into the phone layout and the desktop grid (CSS decides). */

/* ---------- config ---------- */
const SPRINT_DAYS = 30;

const PILLARS = [
  { id: 'body', code: '01', name: 'BODY', star: 'Useful muscle · ready for anything',
    taps: [
      { key: 'workout',  label: 'WORKOUT',  type: 'toggle' },
      { key: 'strength', label: 'STRENGTH', type: 'toggle' },
      { key: 'protein',  label: 'PROTEIN',  type: 'toggle' },
      { key: 'fibre',    label: 'FIBRE',    type: 'toggle' },
      { key: 'sleepHrs', label: 'SLEEP',    type: 'stepper', unit: 'H', step: 0.5, max: 12 },
      { key: 'hair',     label: 'HAIR',     type: 'toggle' }
    ], symptom: true },
  { id: 'mind', code: '02', name: 'MIND', star: 'Monk focus · 5 steps ahead',
    taps: [
      { key: 'focusHrs', label: 'FOCUS HRS', type: 'stepper', unit: 'H', step: 0.5, max: 16 },
      { key: 'readMins', label: 'READ',      type: 'stepper', unit: 'M', step: 5,   max: 300 },
      { key: 'focusRep', label: 'FOCUS REP', type: 'toggle' }
    ] },
  { id: 'work', code: '03', name: 'WORK', star: 'Money while you sleep',
    taps: [
      { key: 'session', label: 'SESSION', type: 'toggle' },
      { key: 'quality', label: 'QUALITY', type: 'rating', max: 5 }
    ] },
  { id: 'skill', code: '04', name: 'SKILL', star: 'Unhireable stack',
    taps: [ { key: 'rep', label: 'REP', type: 'toggle' } ], skill: true }
];

const WHY = [
  'CLARITY, NOT CHEMISTRY.',
  'FROM A MAN RULED BY IMPULSES TO A MAN RULED BY SYSTEMS.',
  'THERE IS NO POSSIBLE OUTCOME CALLED FAILURE.',
  'A WIN NEVER BUYS A BREAK.',
  'PUSH THE LIMITS — AND KEEP THE SANITY.',
  'PURPOSE IS WHAT THE FLOOR IS FOR.',
  'BECOME SOMETHING MORE THAN MYSELF, FOR THE MISSION.',
  'A BODY READY FOR ANYTHING THE MIND WANTS.',
  'MAKE MONEY IN MY SLEEP. THEN CHOOSE THE WORK.',
  'ALWAYS 5 STEPS AHEAD. SHARP AND DECISIVE.'
];

const WEEKS = [
  { w: 'W1',  f: 'BODY',  g: 'Daily taps automatic · sleep set' },
  { w: 'W2',  f: 'BODY',  g: 'Training split locked · protein 5/7' },
  { w: 'W3',  f: 'BODY',  g: 'Checkup done · hair consistent' },
  { w: 'W4',  f: 'BODY',  g: 'Body floor holds → Sprint 1 review' },
  { w: 'W5',  f: 'MIND',  g: 'Focus-hours baseline · book #1 started' },
  { w: 'W6',  f: 'MIND',  g: 'Focus rep daily · sustain focus hrs' },
  { w: 'W7',  f: 'MIND',  g: 'Book #1 finished' },
  { w: 'W8',  f: 'WORK',  g: 'Design offer drafted + priced' },
  { w: 'W9',  f: 'WORK',  g: 'Offer live · outreach started' },
  { w: 'W10', f: 'WORK',  g: 'First lead in conversation' },
  { w: 'W11', f: 'WORK',  g: 'First paying client · skill block done' },
  { w: 'W12', f: 'MONEY', g: 'Recurring auto-invest → quarter review' }
];

/* ---------- date helpers ---------- */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parseYMD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const between = (a, b) => Math.round((parseYMD(b) - parseYMD(a)) / 86400000);

const START = () => STORE.all().startDate;
const TODAY = () => ymd(new Date());
const dayN  = () => between(START(), TODAY()) + 1;
const sprintWeek = () => Math.min(STORE.all().sprint.weeks, Math.max(1, Math.ceil(dayN() / 7)));

/* ---------- computed ---------- */
function isDone(tap, val) {
  if (tap.type === 'toggle') return val === true;
  return Number(val) > 0;                 // stepper / rating
}
function counting(p) { return p.taps.filter(t => t.type !== 'rating'); }

function pillarFill(day, p) {
  const taps = counting(p);
  let done = 0;
  taps.forEach(t => { if (day && isDone(t, day[p.id][t.key])) done++; });
  return { done, total: taps.length };
}

function dayScore(date) {            // 2 held · 1 partial · 0 miss/none
  const d = STORE.peekDay(date);
  if (!d) return 0;
  let done = 0, total = 0;
  PILLARS.forEach(p => { const f = pillarFill(d, p); done += f.done; total += f.total; });
  if (!total) return 0;
  const r = done / total;
  return r >= 0.6 ? 2 : r > 0 ? 1 : 0;
}

function currentRun() {
  let cursor = parseYMD(TODAY());
  if (dayScore(TODAY()) !== 2) cursor = addDays(cursor, -1);   // today still pending
  let run = 0;
  while (ymd(cursor) >= START()) {
    if (dayScore(ymd(cursor)) === 2) { run++; cursor = addDays(cursor, -1); }
    else break;
  }
  return run;
}
function bestRun() {
  let best = 0, run = 0, c = parseYMD(START());
  const end = TODAY();
  while (ymd(c) <= end) {
    if (dayScore(ymd(c)) === 2) { run++; best = Math.max(best, run); } else run = 0;
    c = addDays(c, 1);
  }
  return best;
}
function cleanRun() {
  let cursor = parseYMD(TODAY()), run = 0;
  while (ymd(cursor) >= START()) {
    const d = STORE.peekDay(ymd(cursor));
    if (d && d.clean === false) break;
    run++; cursor = addDays(cursor, -1);
  }
  return run;
}

/* per-pillar streaks — a pillar "holds" a day at >=60% of its taps */
function pillarRatio(date, p) {
  const d = STORE.peekDay(date);
  if (!d) return 0;
  const f = pillarFill(d, p);
  return f.total ? f.done / f.total : 0;
}
function pillarHeld(date, p) { return pillarRatio(date, p) >= 0.6; }
function pillarRun(p) {
  let c = parseYMD(TODAY());
  if (!pillarHeld(TODAY(), p)) c = addDays(c, -1);   // today still pending
  let run = 0;
  while (ymd(c) >= START()) {
    if (pillarHeld(ymd(c), p)) { run++; c = addDays(c, -1); } else break;
  }
  return run;
}
function pillarBest(p) {
  let best = 0, run = 0, c = parseYMD(START());
  while (ymd(c) <= TODAY()) {
    if (pillarHeld(ymd(c), p)) { run++; best = Math.max(best, run); } else run = 0;
    c = addDays(c, 1);
  }
  return best;
}

/* ---------- small html helpers ---------- */
const el = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function bars(on, total, h) {           // tickbar markup
  let s = '';
  for (let i = 0; i < total; i++) s += `<span class="tk${i < on ? ' on' : ''}"></span>`;
  return `<div class="tickbar" style="${h ? 'height:' + h + 'px' : ''}">${s}</div>`;
}

/* ---------- render: header + stats ---------- */
function renderHeader() {
  const n = Math.min(dayN(), 99);
  const why = WHY[(dayN() - 1 + WHY.length) % WHY.length];
  el('hd-day').textContent = 'DAY ' + pad(n);
  el('hd-sprint').textContent = 'SPRINT ' + pad(STORE.all().sprint.number) + ' · ' + WEEKS[Math.min(sprintWeek() - 1, 11)].f;
  el('hd-why').innerHTML = '<span class="ghost">&gt;</span> ' + esc(why) + '<span class="cur"></span>';
}
function renderStats() {
  const prog = Math.max(0, Math.min(100, Math.round(dayN() / SPRINT_DAYS * 100)));
  const checkup = STORE.goals().short.find(g => g.id === 'checkup');
  const overdue = !checkup.done && dayN() > 3;
  const focus = PILLARS.find(p => p.id === STORE.all().sprint.focus) || PILLARS[0];
  el('stats').innerHTML = [
    stat(focus.name + ' STREAK', pillarRun(focus) + '<small> / BEST ' + pillarBest(focus) + '</small>'),
    stat('PROGRESS', prog + '%'),
    stat('ENEMY CLEAN', cleanRun() + 'D'),
    stat('CHECKUP', checkup.done ? 'DONE' : (overdue ? '<span class="alert">OVERDUE</span>' : 'PENDING')),
    stat('SPRINT ENDS', '07·21')
  ].join('');
}
const stat = (l, v) => `<div class="stat"><div class="lbl">${l}</div><div class="val statv">${v}</div></div>`;

/* ---------- render: TODAY ---------- */
let activePillar = 'body';

function renderToday() {
  const date = TODAY();
  const day = STORE.peekDay(date) || STORE.blankDay();
  el('view-today').innerHTML = PILLARS.map(p => pillarCard(p, day, date)).join('') + cleanStrip(day);
  renderHeader(); renderStats();
}

function pillarCard(p, day, date) {
  const f = pillarFill(day, p);
  const active = p.id === activePillar;
  const cells = p.taps.map(t => cell(p, t, day)).join('');
  const skillTag = p.skill
    ? `<div class="skilltag" data-action="skill">THIS WK: ${esc(STORE.settings().skillLabel || 'SET SKILL')}</div>` : '';
  const symptom = p.symptom
    ? `<input class="symptom" data-action="symptom" placeholder="+ SYMPTOM (OPTIONAL)" value="${esc(day.body.symptom || '')}">` : '';
  return `
  <section class="pillar${active ? ' active' : ''}" data-p="${p.id}">
    <header class="phead" data-action="expand" data-p="${p.id}">
      <div><div class="lbl pname">${p.code} // ${p.name}</div><div class="star">${esc(p.star)}</div></div>
      <div class="phead-r">
        <span class="pstreak" title="streak / best ${pillarBest(p)}"><i class="ti ti-flame" aria-hidden="true"></i>${pillarRun(p)}</span>
        <span class="ratio"><span class="val">${f.done}</span><span class="den">/${f.total}</span></span>
        <i class="ti ti-chevron-down chev" aria-hidden="true"></i></div>
    </header>
    <div class="pbody">
      ${bars(f.done, f.total, 26)}
      <div class="cells">${cells}</div>
      ${skillTag}${symptom}
    </div>
  </section>`;
}

function cell(p, t, day) {
  const v = day[p.id][t.key];
  if (t.type === 'toggle') {
    const on = v === true;
    return `<button class="cell${on ? ' on' : ''}" data-action="toggle" data-p="${p.id}" data-k="${t.key}">
      <span class="lbl">${t.label}</span>
      <span class="cval"><span class="mk${on ? ' on' : ''}"></span>${on ? 'ARMED' : 'STANDBY'}</span></button>`;
  }
  if (t.type === 'stepper') {
    const on = Number(v) > 0;
    return `<div class="cell stepper${on ? ' on' : ''}">
      <span class="lbl">${t.label}</span>
      <span class="cval"><button class="step" data-action="step" data-p="${p.id}" data-k="${t.key}" data-d="-1">–</button>
      <span class="stepv">${on ? v + (t.unit || '') : '—'}</span>
      <button class="step" data-action="step" data-p="${p.id}" data-k="${t.key}" data-d="1">+</button></span></div>`;
  }
  if (t.type === 'rating') {
    let dots = '';
    for (let i = 1; i <= t.max; i++)
      dots += `<button class="dot${i <= v ? ' on' : ''}" data-action="rate" data-p="${p.id}" data-k="${t.key}" data-v="${i}" aria-label="quality ${i}"></button>`;
    return `<div class="cell rating"><span class="lbl">${t.label}</span><span class="dots">${dots}</span></div>`;
  }
  return '';
}

function cleanStrip(day) {
  const clean = day.clean !== false;
  return `<div class="cleanstrip">
    <span class="lbl"><i class="ti ti-shield" aria-hidden="true"></i> ENEMY CLEAN — ${cleanRun()}D</span>
    <button class="cleanbtn${clean ? '' : ' reset'}" data-action="clean">${clean ? 'HOLDING' : 'RESET TODAY'}</button>
  </div>`;
}

/* ---------- render: GOALS ---------- */
function renderGoals() {
  const wk = sprintWeek();
  const short = STORE.goals().short.map(g => `
    <button class="goalrow${g.done ? ' done' : ''}" data-action="goal" data-id="${g.id}">
      <span class="mk${g.done ? ' on' : ''}"></span>
      <span class="glabel">${esc(g.label)}</span>
      <span class="lbl gp">${g.pillar.toUpperCase()}</span>
    </button>`).join('');

  const long = PILLARS.map(p => `<div class="longrow"><span class="lbl pname">${p.code} // ${p.name}</span><span class="star">${esc(p.star)}</span></div>`).join('');

  const ladder = WEEKS.map((w, i) => `
    <div class="wkrow${i + 1 === wk ? ' now' : ''}${i + 1 < wk ? ' past' : ''}">
      <span class="lbl wk">${w.w}</span><span class="lbl wf">${w.f}</span><span class="wg">${esc(w.g)}</span>
    </div>`).join('');

  const quests = STORE.goals().sidequests.map(q => `
    <div class="questrow${q.status === 'done' ? ' done' : ''}">
      <button class="mk${q.status === 'done' ? ' on' : ''}" data-action="quest" data-id="${q.id}"></button>
      <span class="glabel">${esc(q.label)}</span>
      <button class="qx" data-action="quest-del" data-id="${q.id}" aria-label="delete"><i class="ti ti-x"></i></button>
    </div>`).join('') || '<div class="empty">NO ACTIVE QUESTS</div>';

  el('view-goals').innerHTML = `
    <div class="block"><div class="lbl bh">SHORT-TERM // SPRINT 01</div>${short}</div>
    <div class="block"><div class="lbl bh">THE WEEKLY ENGINE</div><div class="ladder">${ladder}</div></div>
    <div class="block"><div class="lbl bh">LONG-TERM // NORTH STARS</div>${long}</div>
    <div class="block"><div class="lbl bh">SIDE QUESTS // WATCH ME</div>${quests}
      <div class="questadd"><input id="qinput" placeholder="+ NEW WATCH-ME QUEST"><button data-action="quest-add">ADD</button></div>
    </div>`;
}

/* ---------- render: JOURNEY ---------- */
function renderJourney() {
  const rows = PILLARS.map(p => {
    let cellsHtml = '';
    for (let i = 0; i < SPRINT_DAYS; i++) {
      const date = ymd(addDays(parseYMD(START()), i));
      const future = date > TODAY();
      const d = STORE.peekDay(date);
      const f = d ? pillarFill(d, p) : { done: 0, total: 1 };
      const r = d ? f.done / f.total : 0;
      const cls = future ? 'fut' : r >= 1 ? 'full' : r > 0 ? 'part' : 'miss';
      cellsHtml += `<span class="hc ${cls}" title="${p.name} ${date}"></span>`;
    }
    return `<div class="hmrow"><span class="lbl hlabel">${p.name[0]}</span><div class="hcells">${cellsHtml}</div></div>`;
  }).join('');

  const reviews = ['w1', 'w2', 'w3', 'w4'].map((k, i) =>
    `<div class="rev"><div class="lbl">WEEK ${i + 1} REVIEW</div>
     <textarea data-action="review" data-k="${k}" placeholder="days held · what held · what broke">${esc(STORE.reviews()[k] || '')}</textarea></div>`).join('');

  el('view-journey').innerHTML = `
    <div class="block"><div class="lbl bh">WEEK HEATMAP // ${SPRINT_DAYS} DAYS</div>
      <div class="heatmap">${rows}</div>
      <div class="legend"><span class="lbl"><span class="hc full"></span>HELD</span><span class="lbl"><span class="hc part"></span>PARTIAL</span><span class="lbl"><span class="hc miss"></span>MISS</span><span class="lbl"><span class="hc fut"></span>AHEAD</span></div>
    </div>
    <div class="block"><div class="lbl bh">REVIEWS</div>${reviews}</div>`;
}

/* ---------- view switching ---------- */
let view = 'today';
function setView(v) {
  view = v;
  document.querySelectorAll('.view').forEach(n => n.classList.toggle('active', n.id === 'view-' + v));
  document.querySelectorAll('.tab').forEach(n => n.classList.toggle('active', n.dataset.view === v));
  if (v === 'goals') renderGoals();
  if (v === 'journey') renderJourney();
  if (v === 'today') renderToday();
}

/* ---------- events ---------- */
function onAction(e) {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action, date = TODAY(), p = t.dataset.p, k = t.dataset.k;

  switch (a) {
    case 'toggle': STORE.setTap(date, p, k, !(STORE.peekDay(date)?.[p]?.[k])); renderToday(); break;
    case 'step': {
      const cfg = PILLARS.find(x => x.id === p).taps.find(x => x.key === k);
      let val = Number(STORE.getDay(date)[p][k]) + cfg.step * Number(t.dataset.d);
      val = Math.max(0, Math.min(cfg.max, Math.round(val * 10) / 10));
      STORE.setTap(date, p, k, val); renderToday(); break;
    }
    case 'rate': {
      const cur = STORE.getDay(date)[p][k], v = Number(t.dataset.v);
      STORE.setTap(date, p, k, cur === v ? 0 : v); renderToday(); break;
    }
    case 'clean': { const d = STORE.peekDay(date); STORE.setClean(date, !(d?.clean !== false)); renderToday(); break; }
    case 'symptom': break; // handled on input
    case 'skill': { const v = prompt('This week’s skill:', STORE.settings().skillLabel || ''); if (v != null) { STORE.setSkillLabel(v.trim()); renderToday(); } break; }
    case 'expand': if (window.matchMedia('(max-width:819px)').matches) { activePillar = (activePillar === p ? null : p); renderToday(); } break;
    case 'goal': { const g = STORE.goals().short.find(x => x.id === t.dataset.id); STORE.setGoal(t.dataset.id, !g.done); renderGoals(); renderStats(); break; }
    case 'tab': setView(t.dataset.view); break;
    case 'quest': { const q = STORE.goals().sidequests.find(x => x.id === t.dataset.id); STORE.setQuest(t.dataset.id, q.status === 'done' ? 'active' : 'done'); renderGoals(); break; }
    case 'quest-add': { const inp = el('qinput'); if (inp && inp.value.trim()) { STORE.addQuest(inp.value.trim()); renderGoals(); } break; }
    case 'quest-del': STORE.delQuest(t.dataset.id); renderGoals(); break;
    case 'export': doExport(); break;
    case 'import': el('importFile').click(); break;
    case 'reset': if (confirm('Reset all data? This cannot be undone.')) { STORE.reset(); activePillar = 'body'; setView('today'); } break;
  }
}
function onInput(e) {
  const t = e.target.closest('[data-action]'); if (!t) return;
  if (t.dataset.action === 'symptom') STORE.setTap(TODAY(), 'body', 'symptom', t.value);
  if (t.dataset.action === 'review') STORE.setReview(t.dataset.k, t.value);
}

/* ---------- export / import ---------- */
function doExport() {
  const blob = new Blob([STORE.exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'limitless25-' + TODAY() + '.json'; a.click();
  URL.revokeObjectURL(url);
}
function onImportFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => { try { if (STORE.importJSON(r.result)) { activePillar = 'body'; setView('today'); alert('Imported.'); } else alert('Invalid file.'); } catch (_) { alert('Invalid file.'); } };
  r.readAsText(file);
}

/* ---------- boot ---------- */
function boot() {
  el('app').innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="lbl">LIMITLESS // COMMAND CENTRE</div>
        <div class="brandrow"><span class="val" id="hd-day">DAY 01</span><span class="lbl chip" id="hd-sprint">SPRINT 01 · BODY</span></div>
      </div>
      <div class="topright"><span class="why" id="hd-why"></span><span class="lbl live">● LIVE</span></div>
    </header>
    <div class="stats" id="stats"></div>
    <main>
      <section class="view active" id="view-today"></section>
      <section class="view" id="view-goals"></section>
      <section class="view" id="view-journey"></section>
    </main>
    <nav class="tabbar">
      <button class="tab active" data-action="tab" data-view="today">TODAY</button>
      <button class="tab" data-action="tab" data-view="goals">GOALS</button>
      <button class="tab" data-action="tab" data-view="journey">JOURNEY</button>
      <span class="tabspace"></span>
      <button class="tab io" data-action="export"><i class="ti ti-download"></i> EXPORT</button>
      <button class="tab io" data-action="import"><i class="ti ti-upload"></i> IMPORT</button>
    </nav>`;

  document.addEventListener('click', onAction);
  document.addEventListener('input', onInput);
  el('importFile').addEventListener('change', onImportFile);

  renderToday();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
document.addEventListener('DOMContentLoaded', boot);

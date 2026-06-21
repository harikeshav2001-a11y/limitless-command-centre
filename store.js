/* store.js — the single swappable data layer.
   UI never touches localStorage directly. Swap this module for cloud sync later
   without rewriting the UI. Data model v2: 4 pillars x 4 horizons. */
const STORE = (() => {
  const KEY = 'limitless25';

  const DEFAULT = {
    version: 2,
    updatedAt: 0,
    startDate: '2026-06-22',
    sprint: { number: 1, focus: 'body', weeks: 4, start: '2026-06-22' },
    settings: {
      sleepTimes: { lightsOut: '', wake: '' },
      skillLabel: 'Typography',
      affirmation: ''
    },
    days: {},
    goals: {
      short: [
        { id: 'trainingSplit', pillar: 'body', label: 'Lock training split', done: false },
        { id: 'checkup',       pillar: 'body', label: 'Master checkup done', done: false },
        { id: 'book1',         pillar: 'mind', label: 'Finish book #1',       done: false },
        { id: 'designOffer',   pillar: 'work', label: 'Draft + price one offer', done: false }
      ],
      sidequests: []
    },
    reviews: { w1: '', w2: '', w3: '', w4: '' }
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.version === 2) return raw;
    } catch (e) { /* fall through */ }
    return clone(DEFAULT);
  }

  let data = load();
  let saveCb = null;

  function save() {
    data.updatedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(data));
    if (saveCb) saveCb(data);          // notify sync layer (debounced push)
  }

  function blankDay() {
    return {
      body:  { workout: false, strength: false, protein: false, fibre: false, sleepHrs: 0, hair: false, symptom: '' },
      mind:  { focusHrs: 0, readMins: 0, focusRep: false },
      work:  { session: false, quality: 0 },
      skill: { rep: false, note: '' },
      clean: true,
      note: ''
    };
  }

  function getDay(date) {           // creates lazily — use for writes / today
    if (!data.days[date]) data.days[date] = blankDay();
    return data.days[date];
  }
  function peekDay(date) {          // never creates — use for reads / streaks
    return data.days[date] || null;
  }

  return {
    all:        () => data,
    settings:   () => data.settings,
    goals:      () => data.goals,
    reviews:    () => data.reviews,
    blankDay,
    getDay,
    peekDay,
    setTap(date, pillar, key, val) { getDay(date)[pillar][key] = val; save(); },
    setClean(date, val)           { getDay(date).clean = val; save(); },
    setNote(date, val)            { getDay(date).note = val; save(); },
    setReview(k, v)               { data.reviews[k] = v; save(); },
    setSkillLabel(v)              { data.settings.skillLabel = v; save(); },
    setGoal(id, done)             { const g = data.goals.short.find(x => x.id === id); if (g) { g.done = done; save(); } },
    addQuest(label)               { data.goals.sidequests.push({ id: 'sq' + Date.now(), label, status: 'active' }); save(); },
    setQuest(id, status)          { const q = data.goals.sidequests.find(x => x.id === id); if (q) { q.status = status; save(); } },
    delQuest(id)                  { data.goals.sidequests = data.goals.sidequests.filter(x => x.id !== id); save(); },
    onSave(cb)                    { saveCb = cb; },
    adopt(obj)                    { data = obj; localStorage.setItem(KEY, JSON.stringify(data)); }, // from remote pull; no echo-push
    exportJSON()                  { return JSON.stringify(data, null, 2); },
    importJSON(str)               { const o = JSON.parse(str); if (o && o.days && o.version === 2) { data = o; save(); return true; } return false; },
    reset()                       { data = clone(DEFAULT); save(); }
  };
})();

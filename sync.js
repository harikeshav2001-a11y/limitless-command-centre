/* sync.js — optional cloud sync to a PRIVATE GitHub data repo.
   The app stays fully usable with no token (local-only). With a token (stored
   only in this device's localStorage, never in the public code), it pushes
   state.json to a private repo so the AI can read it and so phone<->PC syncs. */
const SYNC = (() => {
  const OWNER = 'harikeshav2001-a11y';
  const REPO  = 'limitless-data';
  const PATH  = 'state.json';
  const BRANCH = 'main';
  const TKEY  = 'limitless25_token';
  const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

  let sha = null, timer = null, status = 'noauth';
  const listeners = [];

  const set = (s) => { status = s; listeners.forEach(f => f(s)); };
  const token = () => localStorage.getItem(TKEY) || '';
  const hasToken = () => !!token();
  const headers = () => ({ Authorization: 'token ' + token(), Accept: 'application/vnd.github+json' });
  const enc = (s) => btoa(unescape(encodeURIComponent(s)));
  const dec = (b) => decodeURIComponent(escape(atob(b.replace(/\n/g, ''))));

  function setToken(t) {
    if (t) { localStorage.setItem(TKEY, t); set('idle'); }
    else { localStorage.removeItem(TKEY); set('noauth'); }
  }

  async function pull() {
    if (!hasToken()) { set('noauth'); return null; }
    set('syncing');
    try {
      const r = await fetch(`${API}?ref=${BRANCH}&t=${Date.now()}`, { headers: headers(), cache: 'no-store' });
      if (r.status === 404) { sha = null; set('ok'); return null; }
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      sha = j.sha;
      set('ok');
      return JSON.parse(dec(j.content));
    } catch (e) { set('error'); return null; }
  }

  async function push(data) {
    if (!hasToken()) { set('noauth'); return false; }
    set('syncing');
    try {
      if (sha === null) {                          // learn current sha if file exists
        const h = await fetch(`${API}?ref=${BRANCH}`, { headers: headers(), cache: 'no-store' });
        if (h.ok) sha = (await h.json()).sha;
      }
      const body = { message: 'sync ' + new Date().toISOString(), content: enc(JSON.stringify(data, null, 2)), branch: BRANCH };
      if (sha) body.sha = sha;
      const r = await fetch(API, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
      if (!r.ok) throw new Error(r.status);
      sha = (await r.json()).content.sha;
      set('ok');
      return true;
    } catch (e) { set('error'); return false; }
  }

  function schedulePush(data) {
    if (!hasToken()) return;
    clearTimeout(timer);
    timer = setTimeout(() => push(data), 1500);     // debounce rapid taps
  }

  return {
    onStatus: (cb) => { listeners.push(cb); cb(status); },
    status: () => status,
    hasToken, setToken, pull, push, schedulePush
  };
})();

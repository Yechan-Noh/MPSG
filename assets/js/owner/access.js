(() => {
  'use strict';
  const script = document.currentScript;
  const base = script.dataset.base || '/MPSG';
  const mode = document.body.dataset.ownerMode;
  const storageKey = 'mtsg-owner-session-v1';
  const scope = 'https://www.googleapis.com/auth/drive.appdata';
  const status = document.querySelector('[data-owner-status]');
  const signIn = document.querySelector('[data-owner-signin]');
  const panel = document.querySelector('[data-owner-panel]');
  let config, expiryTimer, generation = 0, authorized = false, lastCheck = 0;
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('mtsg-owner-access') : null;
  const message = text => { if (status) status.textContent = text; };
  function readSession() {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey));
      return value && typeof value.token === 'string' && value.expiresAt > Date.now() + 5000 ? value : null;
    } catch { return null; }
  }
  function lock(text = 'Sign in with the authorized Google account.') {
    generation++;
    authorized = false;
    clearTimeout(expiryTimer);
    document.querySelectorAll('[data-owner-link]').forEach(e => e.hidden = true);
    document.querySelectorAll('[data-private-view], [data-private-style]').forEach(e => e.remove());
    if (panel) panel.hidden = false;
    if (mode) document.title = 'Owner sign-in · MTSG';
    message(text);
  }
  function signOut(broadcast = true) {
    sessionStorage.removeItem(storageKey);
    lock('You have signed out.');
    if (broadcast && channel) channel.postMessage('sign-out');
  }
  if (channel) channel.onmessage = e => { if (e.data === 'sign-out') signOut(false); };
  async function loadConfig() {
    if (!config) {
      const response = await fetch(base + '/assets/js/owner/config.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('not-ready');
      config = await response.json();
    }
    if (!config.clientId || !/^[A-Za-z0-9_-]+$/.test(config.fileId || '') || !/^[a-f0-9]{64}$/.test(config.sha256 || '')) throw new Error('not-ready');
    return config;
  }
  async function protectedContent(session) {
    const cfg = await loadConfig();
    const response = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(cfg.fileId) + '?alt=media', {
      headers: {Authorization: 'Bearer ' + session.token}, cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 || response.status === 404 ? 'denied' : 'unavailable');
    const text = await response.text();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
    if (hash !== cfg.sha256) throw new Error('integrity');
    return text;
  }
  function mountReport(html) {
    if (document.querySelector('[data-private-view]')) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script').forEach(e => e.remove());
    doc.querySelectorAll('style').forEach(e => {
      const style = document.createElement('style'); style.dataset.privateStyle = ''; style.textContent = e.textContent; document.head.append(style);
    });
    const view = document.createElement('div'); view.dataset.privateView = '';
    view.append(...Array.from(doc.body.childNodes)); document.body.append(view);
    if (panel) panel.hidden = true;
    document.title = 'Site Overview · MTSG';
    const frame = view.querySelector('#report'), link = view.querySelector('#report-link');
    view.querySelectorAll('[data-report]').forEach(button => button.addEventListener('click', () => {
      if (!readSession()) { signOut(); return; }
      view.querySelectorAll('[data-report]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      frame.src = button.dataset.report; frame.title = button.textContent + ' — private analytics report';
      link.href = button.dataset.report.replace('/embed/reporting/', '/reporting/');
    }));
    view.querySelectorAll('[data-owner-logout]').forEach(button => button.addEventListener('click', () => signOut()));
  }
  async function check(session = readSession(), persist = false) {
    const current = ++generation;
    if (!session) { lock(); return false; }
    try {
      message('Checking access…');
      const html = await protectedContent(session);
      if (current !== generation || session.expiresAt <= Date.now() + 5000) return false;
      if (persist) sessionStorage.setItem(storageKey, JSON.stringify(session));
      authorized = true; lastCheck = Date.now();
      document.querySelectorAll('[data-owner-link]').forEach(e => e.hidden = false);
      clearTimeout(expiryTimer);
      expiryTimer = setTimeout(() => signOut(false), Math.max(0, session.expiresAt - Date.now() - 5000));
      if (mode === 'dashboard') mountReport(html);
      if (mode === 'login') location.replace(base + '/dashboard/');
      return true;
    } catch (error) {
      if (current !== generation) return false;
      if (error.message === 'denied') sessionStorage.removeItem(storageKey);
      lock(error.message === 'not-ready' ? 'Sign-in setup is not complete yet.' : error.message === 'denied' ? 'This account cannot access this page. Use the authorized account.' : 'Access could not be verified. Please try again.');
      return false;
    }
  }
  async function googleLibrary() {
    if (window.google?.accounts?.oauth2) return;
    await new Promise((resolve, reject) => {
      const tag = document.createElement('script'); tag.src = 'https://accounts.google.com/gsi/client'; tag.onload = resolve; tag.onerror = reject; document.head.append(tag);
    });
  }
  if (signIn) {
    signIn.disabled = true;
    (async () => {
      try {
        const cfg = await loadConfig(); await googleLibrary();
        const client = google.accounts.oauth2.initTokenClient({client_id: cfg.clientId, scope, include_granted_scopes: false,
          callback: async result => {
            if (result.error || !result.access_token) { message('Sign-in was not completed.'); signIn.disabled = false; return; }
            const session = {token: result.access_token, expiresAt: Date.now() + Math.min(Number(result.expires_in) || 0, 3600) * 1000};
            message('Checking access…'); await check(session, true); signIn.disabled = false;
          },
          error_callback: () => { message('Sign-in was not completed. Please try again.'); signIn.disabled = false; }
        });
        signIn.addEventListener('click', () => {
          signIn.disabled = true; message('Connecting to Google…');
          client.requestAccessToken({prompt: 'select_account'});
        });
        signIn.disabled = false;
      } catch { message('Unable to start sign-in. Please reload to try again.'); }
    })();
  }
  window.addEventListener('pagehide', () => lock());
  window.addEventListener('pageshow', e => { if (e.persisted) check(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (!readSession() || Date.now() - lastCheck > 60000)) { lock(); check(); }
  });
  setInterval(() => { if (authorized && !readSession()) signOut(false); }, 15000);
  check();
})();

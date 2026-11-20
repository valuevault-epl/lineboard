// Tap-to-refresh, shared by the board (index.html) and the NBA Matchups page (the odds page has its own copy).
// It writes refresh.json to the public valuevault-epl/lineboard-requests repo with this phone's GitHub token (saved
// in the odds page's Settings as 'lineboard:refresh:token'). The cloud (a GitHub Actions workflow in that repo) and
// the always-on laptop, when it's on, re-run that league and publish, noting the request's id in data.json. This
// waits for that note and hands the new data.json back. A wait survives closing the app ('lineboard:refresh:wait').
(function () {
  'use strict';
  var REQ_API = 'https://api.github.com/repos/valuevault-epl/lineboard-requests/contents/refresh.json';
  var DATA_API = 'https://api.github.com/repos/valuevault-epl/lineboard/contents/data.json?ref=main';
  var TOKEN_KEY = 'lineboard:refresh:token', WAIT_KEY = 'lineboard:refresh:wait';
  var MAX_WAIT = 12 * 60e3, POLL = 8e3;
  var NAME = { nbl: 'NBL', nba: 'NBA', nfl: 'NFL' };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function token() { return (get(TOKEN_KEY) || '').trim(); }
  function headers(tok, raw) {
    var h = { 'Accept': raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (tok) h['Authorization'] = 'Bearer ' + tok;
    return h;
  }
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // the newest data.json: the GitHub API has a push within seconds (GitHub Pages can lag by minutes)
  async function data() {
    var tok = token();
    try {
      var r = await fetch(DATA_API, { cache: 'no-store', headers: headers(tok, true) });
      if (tok && (r.status === 401 || r.status === 403)) r = await fetch(DATA_API, { cache: 'no-store', headers: headers('', true) });
      if (r.ok) return await r.json();
    } catch (e) {}
    var p = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
    if (!p.ok) throw new Error('data.json: HTTP ' + p.status);
    return p.json();
  }

  async function ask(lgs) {
    var tok = token();
    if (!tok) throw Object.assign(new Error('no token'), { code: 'notoken' });
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var content = btoa(JSON.stringify({ id: id, leagues: lgs, at: new Date().toISOString() }));
    for (var attempt = 0; attempt < 3; attempt++) {
      var g = await fetch(REQ_API + '?ref=main&t=' + Date.now(), { cache: 'no-store', headers: headers(tok) });
      if (g.status === 401) throw new Error('GitHub didn\'t accept the refresh token (it may have expired). Check it on the odds page, under Settings.');
      var sha = g.ok ? (await g.json()).sha : undefined;
      var body = { message: 'Refresh ' + lgs.map(function (k) { return NAME[k] || k; }).join(', '), content: content };
      if (sha) body.sha = sha;
      var r = await fetch(REQ_API, { method: 'PUT', headers: headers(tok), body: JSON.stringify(body) });
      if (r.ok) return id;
      if (r.status === 409 || r.status === 422) continue;          // written by someone else in between: read again
      if (r.status === 401) throw new Error('GitHub didn\'t accept the refresh token (it may have expired). Check it on the odds page, under Settings.');
      if (r.status === 403 || r.status === 404) throw new Error('The refresh token can\'t write the lineboard-requests repo. Check its access on the odds page, under Settings.');
      throw new Error('GitHub returned ' + r.status + ' for the refresh request.');
    }
    throw new Error('Couldn\'t send the refresh request. Try again.');
  }

  function pending() {
    try { var w = JSON.parse(get(WAIT_KEY) || 'null'); return w && w.id && Date.now() - w.at < MAX_WAIT ? w : null; } catch (e) { return null; }
  }

  // polls until data.json carries this request's note (or every asked league has a new board).
  // Returns { d, done, failed } or null if nothing came back in time. onTick(minutes waited) for a status line.
  async function wait(w, onTick) {
    while (Date.now() - w.at < MAX_WAIT) {
      if (onTick) onTick(Math.max(0, Math.round((Date.now() - w.at) / 60000)));
      await sleep(POLL);
      var d;
      try { d = await data(); } catch (e) { continue; }
      var req = d.request && d.request.id === w.id ? d.request : null;
      var changed = w.lgs.every(function (k) { return d.leagues && d.leagues[k] && d.leagues[k].generated !== (w.before || {})[k]; });
      if (!req && !changed) continue;
      var cur = pending();
      if (cur && cur.id === w.id) put(WAIT_KEY, null);
      var failed = req ? (req.failed || []).filter(function (k) { return w.lgs.indexOf(k) >= 0; }) : [];
      return { d: d, failed: failed, done: w.lgs.filter(function (k) { return failed.indexOf(k) < 0; }), by: req && req.by };
    }
    var c = pending();
    if (c && c.id === w.id) put(WAIT_KEY, null);
    return null;
  }

  // ask for a refresh of these leagues and wait for it; `before` = each league's 'generated' now
  async function start(lgs, before, onTick) {
    var id = await ask(lgs);
    var w = { id: id, lgs: lgs, at: Date.now(), before: before || {} };
    put(WAIT_KEY, JSON.stringify(w));
    return wait(w, onTick);
  }

  window.LBRefresh = { NAME: NAME, token: token, start: start, wait: wait, pending: pending, data: data, MAX_WAIT: MAX_WAIT };
})();

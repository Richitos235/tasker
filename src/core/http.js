import { Dobby } from './state.js';

export function installHttp() {
  Dobby._post = async function (url, body) {
    const res = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      referrer: location.origin + '/game.php',
      body,
    });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('json')) return res.json();
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
  };

  Dobby._withH = function (path) {
    const hTok = Dobby.settings.hToken;
    return `${location.origin}/game.php?${path}&h=${encodeURIComponent(hTok)}`;
  };
}

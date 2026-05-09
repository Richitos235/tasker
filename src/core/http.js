import { Dobby } from './state.js';
import { safeUserMsg } from './utils.js';

export function installHttp() {
  Dobby._post = async function (url, body) {
    try {
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
      let data;
      if (ct.includes('json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
      }

      if (data?.error && String(data.msg).toLowerCase().includes('session')) {
        Dobby._log('❌ SESSION EXPIRED: Stopping script.');
        safeUserMsg('Invalid session! Refresh the page to capture a new token.', window.UserMessage?.TYPE_ERROR);
        Dobby.stop();
      }

      return data;
    } catch (e) {
      Dobby._log('❌ HTTP POST Error: ' + e.message);
      return { error: true, msg: e.message };
    }
  };

  Dobby._withH = function (path) {
    const hTok = Dobby.settings.hToken;
    return `${location.origin}/game.php?${path}&h=${encodeURIComponent(hTok)}`;
  };
}
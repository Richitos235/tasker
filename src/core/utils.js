export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const now = () => Date.now();
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const h = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export function safeUserMsg(text, type) {
  try {
    if (window.UserMessage) new UserMessage(text, type ?? UserMessage.TYPE_HINT).show();
    else console.log('[Tasker]', text);
  } catch (e) {
    console.log('[Tasker]', text);
  }
}

export const Cookie = {
  get(name) {
    const m = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
    );
    return m ? decodeURIComponent(m[1]) : null;
  },
  set(name, value, expiresDate) {
    const expires = expiresDate ? ';expires=' + expiresDate.toUTCString() : '';
    document.cookie = `${name}=${encodeURIComponent(value)}${expires};path=/;SameSite=Lax`;
  },
  del(name) {
    document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`;
  },
};

export async function waitForBagReady(cb, timeoutMs = 60000) {
  const t0 = Date.now();
  const interval = setInterval(() => {
    if (window.Bag && typeof Bag.search === 'function') {
      clearInterval(interval);
      console.log('[Tasker] Bag READY');
      try {
        cb();
      } catch (e) {
        console.warn('[Tasker] waitForBagReady cb failed', e);
      }
    } else if (Date.now() - t0 > timeoutMs) {
      clearInterval(interval);
      console.warn('[Tasker] waitForBagReady TIMEOUT', {
        hasBag: !!window.Bag,
        bagLoaded: !!(window.Bag && Bag.loaded),
        hasSearch: !!(window.Bag && typeof Bag.search === 'function'),
      });
    }
  }, 300);
}

export async function waitForTW() {
  const need = [
    () => window.$ && window.Ajax,
    () => window.GameMap && window.Character,
    () => window.JobList && window.JobsModel,
    () => window.TaskQueue,
    () => window.wman,
  ];
  const t0 = now();
  while (now() - t0 < 30000) {
    if (need.every((fn) => !!fn())) return true;
    await sleep(100);
  }
  return false;
}

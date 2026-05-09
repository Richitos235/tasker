import { Dobby } from '../core/state.js';

export function installMoney() {
  Dobby.money.readFromDOM = function () {
    try {
      const el = document.querySelector('#money');
      if (!el) return false;
      const raw = (el.textContent || '').trim();
      if (!raw) return false;
      const num = parseInt(raw.replace(/[^\d]/g, ''), 10);
      if (!Number.isFinite(num)) return false;
      Dobby.money.value = num;
      Dobby.money.formatted = raw + '$';
      if (
        Dobby.settings.autoBankEnabled &&
        Dobby.money.value >= Dobby.settings.autoBankThreshold &&
        Dobby.money.value > 0 &&
        Dobby.autoBank.canTrigger() &&
        Dobby.settings.hToken
      ) {
        Dobby._log(`🏦 Auto-bank threshold hit: $${Dobby.money.value} >= $${Dobby.settings.autoBankThreshold}`);
        Dobby.autoBank.startBankingSequence('threshold');
      }
      return true;
    } catch {
      return false;
    }
  };

  Dobby.money.startWatcher = function () {
    try {
      if (Dobby.money._interval) clearInterval(Dobby.money._interval);
      if (Dobby.money._observer) Dobby.money._observer.disconnect();
    } catch {}
    Dobby.money.readFromDOM();
    try {
      const el = document.querySelector('#money');
      if (el) {
        Dobby.money._observer = new MutationObserver(() => {
          const ok = Dobby.money.readFromDOM();
          if (ok && Dobby.win && Dobby.ui.tab === 'settings') {
            const box = document.querySelector('#d2_money_value');
            if (box) box.textContent = Dobby.money.formatted;
          }
        });
        Dobby.money._observer.observe(el, { characterData: true, childList: true, subtree: true });
      }
    } catch {}
    Dobby.money._interval = setInterval(() => {
      const ok = Dobby.money.readFromDOM();
      if (ok && Dobby.win && Dobby.ui.tab === 'settings') {
        const box = document.querySelector('#d2_money_value');
        if (box) box.textContent = Dobby.money.formatted;
      }
    }, 1500);
  };
}

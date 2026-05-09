import './core/utils.js';
import { installLogging } from './core/logging.js';
import { installController } from './core/controller.js';
import { installHttp } from './core/http.js';
import { installPersistence } from './core/persistence.js';
import { installAutoBank } from './systems/autoBank.js';
import { installMoney } from './systems/money.js';
import { installSets } from './systems/sets.js';
import { installConsumables } from './systems/consumables.js';
import { installVitals } from './systems/vitals.js';
import { installJobs } from './systems/jobs.js';
import { installAutoCapture } from './systems/autoCapture.js';
import { installTownHooks } from './ui/townHooks.js';
import { installUI } from './ui/ui.js';
import { Dobby } from './core/state.js';
import { waitForTW, safeUserMsg } from './core/utils.js';

installLogging();
installController();
installHttp();
installPersistence();
installAutoBank();
installMoney();
installSets();
installConsumables();
installVitals();
installJobs();
installAutoCapture();
installUI();
installTownHooks();

window.Dobby = Dobby;
window.Dobby2 = Dobby;

(async function init() {
  const ok = await waitForTW();
  if (!ok) return;

  try {
    Dobby.loadLanguage();
    Dobby.loadSets(() => {});
    try { Dobby._installInventoryWatcher(); } catch {}
    Dobby._loadPersist();
    Dobby._ensureRepeatState();
    Dobby._persist();
    Dobby.money.startWatcher();
    Dobby.createMenuIcon();
    Dobby._setupAutoCapture();
    try { Dobby.Consumables.init(); } catch (e) { console.log('[Tasker] Consumables.init err', e); }
    try { Dobby.FAB.install(); } catch (e) { console.log('[Tasker] FAB.install err', e); }

    if (Dobby.settings.autoResumeAfterRefresh) {
      const resumed = Dobby._loadAfterReload();
      if (resumed && Dobby.isRunning && Dobby.addedJobs.length) {
        Dobby.loadSets(() => {
          safeUserMsg('Auto-resume...', window.UserMessage?.TYPE_HINT);
          Dobby._log('Auto-resume after refresh.');
          Dobby.currentState = 'running';
          const token = Dobby._newToken();
          Dobby.run(token);
        });
      }
    }

    Dobby.loadJobData(() => {});
    Dobby._log('Tw Tasker Ultimate 3.0 loaded. Open via menu icon, floating ⚙️ button, or Tampermonkey menu.');
  } catch (e) {
    console.log('[Tasker] init error', e);
  }
})();

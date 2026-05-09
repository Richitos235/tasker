import { Dobby } from '../core/state.js';
import { sleep, safeUserMsg } from '../core/utils.js';

export function installAutoBank() {
  Dobby.autoBank.getMoneyFromDom = function () {
    const el = document.querySelector('#money');
    if (!el) return 0;
    const cleaned = String(el.textContent || '').replace(/\$/g, '').replace(/[^\d]/g, '');
    return cleaned ? Number(cleaned) : 0;
  };

  Dobby.autoBank.canTrigger = function () {
    if (Dobby.autoBank.inProgress) return false;
    if (Date.now() - Dobby.autoBank.lastStart < Dobby.settings.autoBankSafetyCooldownMs) return false;
    return true;
  };

  Dobby.autoBank.startBankingSequence = async function (reason) {
    const hTok = Dobby.settings.hToken;
    if (!hTok) {
      Dobby._log('❌ AUTO-BANK: missing h token!');
      return;
    }
    if (!Dobby.autoBank.canTrigger()) return;

    const moneyNow = Dobby.autoBank.getMoneyFromDom();
    const townId = Dobby.settings.autoBankTownId;
    if (!townId || townId <= 0) return;

    const wasRunning = Dobby.isRunning;
    Dobby.autoBank.inProgress = true;
    Dobby.autoBank.lastStart = Date.now();
    Dobby._log(`🏦 AUTO-BANK started (${reason}). Money=$${moneyNow}.`);

    if (wasRunning) {
      Dobby.isRunning = false;
      Dobby._cancel();
      Dobby.currentState = 'banking';
      Dobby.render();
    }

    try {
      try { if (TaskQueue?.cancelAll) TaskQueue.cancelAll(); } catch {}
      await sleep(500);

      const walkSet = Dobby.settings.autoBankWalkSet;
      if (walkSet >= 0) {
        try { EquipManager.switchEquip(Dobby.sets[walkSet].equip_manager_id); } catch {}
        await sleep(300);
      }

      const walkBody = `tasks%5B0%5D%5BunitId%5D=${townId}&tasks%5B0%5D%5Btype%5D=town&tasks%5B0%5D%5BtaskType%5D=walk`;
      const walkRes = await Dobby._post(Dobby._withH('window=task&action=add'), walkBody);

      if (walkRes && !walkRes.error) {
        const duration = walkRes.tasks?.[0]?.task?.data_obj?.duration;
        if (duration) {
          const mins = Math.round(duration / 60);
          Dobby._log(`Walking to town. Arrival in ${mins} minutes.`);
          safeUserMsg(`Walking to town. Arrival in ${mins} minutes.`, window.UserMessage?.TYPE_HINT);
        }

        let dateDone = walkRes.tasks?.[0]?.task?.date_done;
        let waitMs = 3000;
        if (dateDone) {
          waitMs = Math.max(500, (Number(dateDone) * 1000) - Date.now() + 500);
        }

        Dobby.currentState = `banking (walk ${Math.round(waitMs / 1000)}s)`;
        Dobby.render();
        await sleep(waitMs);

        const moneyToDeposit = Dobby.autoBank.getMoneyFromDom();
        if (moneyToDeposit > 0) {
          const depositRes = await Dobby._post(
            Dobby._withH('window=building_bank&action=deposit'),
            `town_id=${townId}&amount=${moneyToDeposit}`
          );
          if (!depositRes?.error) {
            Dobby._log(`✅ AUTO-BANK deposited $${moneyToDeposit}`);
            safeUserMsg(`🏦 Deposited $${moneyToDeposit}`, window.UserMessage?.TYPE_HINT);
          }
        }
      }
    } catch (err) {
      Dobby._log(`❌ AUTO-BANK error: ${err.message}`);
    } finally {
      Dobby.autoBank.inProgress = false;
      if (wasRunning) {
        Dobby.isRunning = true;
        Dobby.currentState = 'running';
        const token = Dobby._newToken();
        Dobby.run(token);
      } else {
        Dobby.currentState = 'idle';
      }
      Dobby.render();
    }
  };
}
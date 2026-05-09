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

  Dobby.autoBank._findDeepestDateDone = function (obj) {
    let deepest = null;
    const stack = [obj];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
      seen.add(cur);
      if (typeof cur.date_done === 'number') {
        if (!deepest || cur.date_done > deepest) deepest = cur.date_done;
      }
      for (const v of Object.values(cur)) if (v && typeof v === 'object') stack.push(v);
    }
    return deepest;
  };

  Dobby.autoBank.computeWaitMs = function (resp) {
    const dateDone = Dobby.autoBank._findDeepestDateDone(resp);
    if (!dateDone) return 3000;
    const doneMs = dateDone > 10000000000 ? dateDone : dateDone * 1000;
    const delta = doneMs - Date.now();
    return isFinite(delta) ? Math.max(500, delta + 500) : 3000;
  };

  Dobby.autoBank.startBankingSequence = async function (reason) {
    const hTok = Dobby.settings.hToken;
    if (!hTok) {
      Dobby._log('❌ AUTO-BANK: missing h token! Set it in Settings.');
      safeUserMsg('Auto-bank failed: no h-token!', window.UserMessage?.TYPE_ERROR);
      return;
    }
    if (!Dobby.autoBank.canTrigger()) return;

    const moneyNow = Dobby.autoBank.getMoneyFromDom();
    if (moneyNow <= 0) {
      Dobby._log('❌ AUTO-BANK: money read = 0 (DOM not ready?)');
      return;
    }

    const townId = Dobby.settings.autoBankTownId;
    if (!townId || townId <= 0) {
      Dobby._log('❌ AUTO-BANK: no town ID configured!');
      return;
    }

    const wasRunning = Dobby.isRunning;
    Dobby.autoBank.inProgress = true;
    Dobby.autoBank.lastStart = Date.now();
    Dobby._log(`🏦 AUTO-BANK started (${reason}). Money=$${moneyNow}. Threshold=$${Dobby.settings.autoBankThreshold}.`);

    if (wasRunning) {
      Dobby.isRunning = false;
      Dobby._cancel();
      Dobby.currentState = 'banking';
      Dobby._log('🏦 Paused job execution for banking.');
      Dobby.render();
    }

    try {
      Dobby._log('🏦 Cancelling current tasks...');
      try { if (TaskQueue?.cancelAll) TaskQueue.cancelAll(); } catch {}
      await sleep(500);

      const walkSet = Dobby.settings.autoBankWalkSet;
      if (walkSet >= 0 && Array.isArray(Dobby.sets) && Dobby.sets[walkSet]) {
        Dobby._log(`🏦 Equipping walk set: ${Dobby.sets[walkSet]?.name || 'Set ' + walkSet}`);
        try { EquipManager.switchEquip(Dobby.sets[walkSet].equip_manager_id); } catch {}
        await sleep(300);
      }

      Dobby._log(`🏦 Walking to town ID ${townId}...`);
      const walkBody = `tasks%5B0%5D%5BunitId%5D=${townId}&tasks%5B0%5D%5Btype%5D=town&tasks%5B0%5D%5BtaskType%5D=walk`;
      const walkRes = await Dobby._post(Dobby._withH('window=task&action=add'), walkBody);

      if (walkRes?.tasks?.[0]?.error) {
        Dobby._log(`❌ AUTO-BANK walk error: ${walkRes.tasks[0].msg || 'unknown'}`);
        throw new Error('Walk failed');
      }

      let walkHint = '';
      const taskData = walkRes.tasks?.[0]?.task;
      const dataObj = taskData?.data_obj;
      if (dataObj) {
        const durationSeconds = Number(dataObj.duration ?? dataObj.durationSeconds ?? dataObj.time);
        if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
          const mins = Math.floor(durationSeconds / 60);
          const secs = Math.round(durationSeconds % 60);
          walkHint += ` Travel time: ${mins}m ${secs}s`;
        }
        const coords = dataObj.coords || dataObj.coord || dataObj.coordinates;
        if (coords) {
          walkHint += ` coords=${typeof coords === 'string' ? coords : JSON.stringify(coords)}`;
        }
      }
      Dobby._log(`🏦 Walk to town ID ${townId} queued${walkHint}`);
      safeUserMsg(`🏦 Town walk queued${walkHint ? ` (${walkHint.trim()})` : ''}`, window.UserMessage?.TYPE_HINT);

      const waitMs = Dobby.autoBank.computeWaitMs(walkRes);
      Dobby._log(`🏦 Walk in progress, waiting ${Math.round(waitMs / 1000)}s...`);
      Dobby.currentState = `banking (walk ${Math.round(waitMs / 1000)}s)`;
      Dobby.render();
      await sleep(waitMs);

      const moneyToDeposit = Dobby.autoBank.getMoneyFromDom();
      if (moneyToDeposit <= 0) {
        Dobby._log('🏦 No money to deposit after walk.');
      } else {
        Dobby._log(`🏦 Depositing $${moneyToDeposit}...`);
        const depositRes = await Dobby._post(
          Dobby._withH('window=building_bank&action=deposit'),
          `town_id=${encodeURIComponent(String(townId))}&amount=${encodeURIComponent(String(moneyToDeposit))}`
        );
        if (depositRes?.error) {
          Dobby._log(`❌ AUTO-BANK deposit error: ${depositRes.msg || JSON.stringify(depositRes)}`);
        } else {
          Dobby._log(`✅ AUTO-BANK deposited $${moneyToDeposit} successfully!`);
          safeUserMsg(`🏦 Deposited $${moneyToDeposit}`, window.UserMessage?.TYPE_HINT);
        }
      }
    } catch (err) {
      console.error('[Tasker] Auto-bank error:', err);
      Dobby._log(`❌ AUTO-BANK error: ${String(err?.message || err)}`);
    } finally {
      Dobby.autoBank.inProgress = false;
      if (wasRunning && Dobby.addedJobs.length > 0) {
        Dobby._log('🏦 Resuming job execution...');
        await sleep(800);
        try { if (TaskQueue?.cancelAll) TaskQueue.cancelAll(); } catch {}
        await sleep(300);
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

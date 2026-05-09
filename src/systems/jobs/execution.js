import { Dobby } from '../../core/state.js';
import { sleep, clamp, safeUserMsg } from '../../core/utils.js';

export function installJobExecution() {
  Dobby._startJobViaAPI = async function (job, duration) {
    const hTok = Dobby.settings.hToken;
    if (!hTok) return { ok: false, error: false, msg: 'no h-token' };
    const body = `tasks%5B0%5D%5BjobId%5D=${job.id}&tasks%5B0%5D%5Bx%5D=${job.x}&tasks%5B0%5D%5By%5D=${job.y}&tasks%5B0%5D%5Bduration%5D=${duration}&tasks%5B0%5D%5BtaskType%5D=job`;
    try {
      const res = await Dobby._post(Dobby._withH('window=task&action=add'), body);
      if (res?.tasks?.[0]?.error) {
        return { ok: false, error: true, msg: res.tasks[0].msg || 'Unknown error', response: res };
      }
      return { ok: true, error: false, response: res };
    } catch (e) {
      return { ok: false, error: false, msg: String(e) };
    }
  };

  Dobby._startJobOnce = async function (job, duration, token) {
    if (!Dobby._alive(token)) return false;
    const before = Dobby._queueLen();
    try { JobWindow.startJob(job.id, job.x, job.y, duration); } catch (e) { return false; }
    const t0 = Date.now();
    while (Date.now() - t0 < 1500) {
      if (!Dobby._alive(token)) return false;
      const after = Dobby._queueLen();
      if (after > before) return true;
      await sleep(50);
    }
    return true;
  };

  Dobby.start = function () {
    if (!Dobby.addedJobs.length) return safeUserMsg('No jobs selected.', window.UserMessage?.TYPE_ERROR);
    Dobby._ensureRepeatState();
    const idx = Dobby._findNextRunnableIndex(Dobby.currentJobIndex);
    if (idx === -1) {
      safeUserMsg('All jobs finished (repeats = 0).', window.UserMessage?.TYPE_HINT);
      Dobby._log('STOP: all jobs finished by repeats.');
      Dobby.stop();
      return;
    }
    Dobby.currentJobIndex = idx;
    Dobby.isRunning = true;
    Dobby.currentState = 'running';
    Dobby._cancel();
    Dobby.createRoute();
    Dobby._persist();
    Dobby._log(`START: ${Dobby.addedJobs.length} jobs in route.`);
    const token = Dobby._newToken();
    Dobby.run(token);
    Dobby.render();
  };

  Dobby.stop = function () {
    Dobby.isRunning = false;
    Dobby.currentState = 'idle';
    Dobby._cancel();
    try { if (TaskQueue?.cancelAll) TaskQueue.cancelAll(); } catch {}
    Dobby._persist();
    Dobby._log('STOP.');
    Dobby.render();
  };

  Dobby._nextJobIndex = function () {
    if (!Dobby.addedJobs.length) return -1;
    const start = (Dobby.currentJobIndex + 1) % Dobby.addedJobs.length;
    const idx = Dobby._findNextRunnableIndex(start);
    if (idx === -1) return -1;
    Dobby.currentJobIndex = idx;
    return idx;
  };

  Dobby._shouldRotate = function (mot, limit) {
    if (!Dobby.settings.rotateJobs) return false;
    if (Dobby.addedJobs.length <= 1) return false;
    if (!(limit > 0)) return false;
    return mot <= limit;
  };

  Dobby.run = function (token) {
    if (!Dobby._alive(token)) return;
    if (!Dobby.addedJobs.length) {
      safeUserMsg('Finished (no jobs).', window.UserMessage?.TYPE_HINT);
      Dobby._log('WORK FINISHED: no jobs.');
      Dobby.stop();
      return;
    }
    const idx = Dobby._findNextRunnableIndex(Dobby.currentJobIndex);
    if (idx === -1) {
      safeUserMsg('All jobs finished (repeats done).', window.UserMessage?.TYPE_HINT);
      Dobby._log('STOP: all jobs finished by repeats.');
      Dobby.stop();
      return;
    }
    Dobby.currentJobIndex = idx;
    const min = Dobby.settings.jobDelayMin || 0;
    const max = Dobby.settings.jobDelayMax || 0;
    const delayMs = min === 0 && max === 0 ? 0 : Math.floor((Math.min(min, max) + Math.random() * Math.abs(max - min)) * 1000);
    Dobby._scheduled = setTimeout(async () => {
      if (!Dobby._alive(token)) return;
      try {
        if (Dobby.settings.addHealth || Dobby.settings.addEnergy) {
          await Dobby.Consumables.tryUse();
        }
      } catch (e) { Dobby._log('consumables tryUse err: ' + e); }

      if (Dobby.healthBelowLimit()) {
        safeUserMsg('Stop: health below limit.', window.UserMessage?.TYPE_ERROR);
        Dobby._log('STOP: health below limit.');
        Dobby.stop();
        return;
      }
      if (Dobby.Vitals.read('energy').cur <= 0) {
        safeUserMsg('Stop: no energy.', window.UserMessage?.TYPE_ERROR);
        Dobby._log('STOP: no energy.');
        Dobby.stop();
        return;
      }

      const job = Dobby.addedJobs[Dobby.currentJobIndex] || Dobby.addedJobs[0];
      if (!job) { Dobby.stop(); return; }
      if (!Dobby._isJobRunnable(job)) {
        Dobby._log(`SKIP (repeats done): "${Dobby.getDisplayName(job)}" -> next job`);
        const ni = Dobby._nextJobIndex();
        Dobby._persist();
        if (ni === -1) {
          safeUserMsg('All jobs finished (repeats done).', window.UserMessage?.TYPE_HINT);
          Dobby._log('STOP: all jobs finished by repeats.');
          Dobby.stop();
          return;
        }
        Dobby.run(token);
        return;
      }
      const mot = await Dobby.getJobMotivation(job);
      if (!Dobby._alive(token)) return;
      if (Dobby._shouldRotate(mot, job.stopMotivation)) {
        Dobby._log(`ROTATE NOW: "${Dobby.getDisplayName(job)}" motivation ${mot.toFixed(0)} <= limit ${job.stopMotivation} -> next job`);
        const ni = Dobby._nextJobIndex();
        Dobby._persist();
        if (ni === -1) {
          safeUserMsg('All jobs finished (repeats done).', window.UserMessage?.TYPE_HINT);
          Dobby._log('STOP: all jobs finished by repeats.');
          Dobby.stop();
          return;
        }
        Dobby.run(token);
        return;
      }
      await Dobby.doJobCycle(job, token);
    }, delayMs);
  };

  Dobby.doJobCycle = async function (job, token) {
    if (!Dobby._alive(token)) return;

    // Handle Town Walk tasks
    if (job.isTownWalk || job.type === "town") {
      const jobName = Dobby.getDisplayName(job);
      Dobby._log(`WALK: Starting "${jobName}" to town ${job.unitId}`);

      const payload = `tasks[0][unitId]=${job.unitId}&tasks[0][type]=town&tasks[0][taskType]=walk`;
      const result = await Dobby._post('/game.php?window=task&action=add&h=' + (Dobby.settings.hToken || ''), payload);

      // 1. Fix success check: Verify result exists, no error, and contains tasks array
      if (result && !result.error && Array.isArray(result.tasks) && result.tasks.length > 0) {
        const taskWrapper = result.tasks[0].task;
        const wayData = taskWrapper?.data_obj?.wayData;
        
        // 2. Calculate Travel Time: Extract date_start and date_done (seconds)
        const source = wayData || taskWrapper;
        const start = Number(source?.date_start || 0);
        const done = Number(source?.date_done || 0);
        const travelTime = done - start;

        // 3. Enhance Logging
        Dobby._log(`WALK: ${done} - ${start} = ${travelTime.toFixed(1)} sec - to walk to town.`);
        
        if (travelTime > 0) {
          safeUserMsg(`Walking to town. Arrival in ${Math.ceil(travelTime / 60)} minutes.`, window.UserMessage?.TYPE_HINT);
        }

        // 4. Wait Logic: Calculate wait time in ms from date_done vs Date.now()
        let waitMs = 0;
        if (done) {
          waitMs = Math.max(0, (done * 1000) - Date.now()) + 2000; // +2s safety buffer
        }

        if (waitMs > 0) {
          Dobby.currentState = 'walking';
          Dobby.render();
          await sleep(waitMs);
        }
      } else {
        Dobby._log(`WALK: Failed to queue walk to "${jobName}": ${result?.msg || 'Unknown error'}`);
        safeUserMsg(`Walk failed: ${jobName}`, window.UserMessage?.TYPE_ERROR);
      }

      // 5. Safe Queue Removal: Ensure job is removed regardless of success/failure
      const idx = Dobby.addedJobs.indexOf(job);
      if (idx >= 0) Dobby.addedJobs.splice(idx, 1);
      if (Dobby.currentJobIndex >= idx && Dobby.currentJobIndex > 0) Dobby.currentJobIndex--;
      Dobby._persist();

      Dobby.currentState = 'running';
      const ni = Dobby._nextJobIndex();
      if (ni === -1) {
        safeUserMsg('All tasks finished.', window.UserMessage?.TYPE_HINT);
        Dobby.stop();
        return;
      }
      Dobby.run(token);
      return;
    }

    const jobName = Dobby.getDisplayName(job);
    const dist = GameMap.calcWayTime(Character.position, { x: job.x, y: job.y });

    if (dist > 0) {
      Dobby._log(`Travel -> "${jobName}" (${job.x},${job.y}) dist=${dist?.formatDuration ? dist.formatDuration() : dist}`);
      await Dobby.equipSet(Dobby.travelSet, token);
      if (!Dobby._alive(token)) return;
      await Dobby._startJobOnce(job, 15, token);
      if (!Dobby._alive(token)) return;
      const t0 = Date.now();
      while (Date.now() - t0 < 600000) {
        if (!Dobby._alive(token)) return;
        const d = GameMap.calcWayTime(Character.position, { x: job.x, y: job.y });
        if (d === 0) break;
        await sleep(200);
      }
      try { if (TaskQueue?.cancelAll) TaskQueue.cancelAll(); } catch {}
      await sleep(150);
      await Dobby._nudgeJobState(job, token);
      if (!Dobby._alive(token)) return;
    }

    let usedBackupSet = false;
    const workingSet = Number.isFinite(Number(Dobby.settings.workingSetId)) ? Number(Dobby.settings.workingSetId) : -1;
    const backupSet = Number.isFinite(Number(Dobby.settings.backupSetId)) ? Number(Dobby.settings.backupSetId) : -1;

    if (workingSet >= 0) {
      Dobby._log(`EQUIP: Working set "${Dobby.getSetName(workingSet)}" before job.`);
      await Dobby.equipSet(workingSet, token);
    }
    if (!Dobby._alive(token)) return;

    let maxJobs = 4;
    try { maxJobs = Premium?.hasBonus('automation') ? 9 : 4; } catch {}
    const motBefore = await Dobby.getJobMotivation(job);
    if (!Dobby._alive(token)) return;
    let jobCount = Math.min(Character.energy, maxJobs);
    if (job.stopMotivation > 0) {
      const remaining = Math.max(0, Math.floor(motBefore - job.stopMotivation));
      jobCount = Math.min(jobCount, Math.max(1, remaining));
    }
    jobCount = clamp(jobCount, 1, maxJobs);

    const beforeXP = Character.experience;
    const beforeQ = Dobby._queueLen();
    const rptTot = Number(job.repeatTotal || 0);
    const rptRem = rptTot > 0 ? Number(job.repeatRemaining ?? rptTot) : 0;
    Dobby._log(`QUEUE: "${jobName}" x${jobCount} (mot=${motBefore.toFixed(0)})` + (rptTot > 0 ? ` | repeats: ${rptRem}/${rptTot}` : ` | repeats: ∞`));

    let firstJobResult = null;
    if (Dobby.settings.hToken) {
      firstJobResult = await Dobby._startJobViaAPI(job, 15);
    }

    if (firstJobResult && firstJobResult.error) {
      const errMsg = firstJobResult.msg || '';
      const isLevelError = Dobby._isLabourError(errMsg);

      if (isLevelError && backupSet >= 0) {
        Dobby._log(`⚠️ Labour error! Retrying with backup set "${Dobby.getSetName(backupSet)}"`);
        safeUserMsg(`⚠️ Labour error! Retrying with backup set...`, window.UserMessage?.TYPE_HINT);

        await Dobby.equipSet(backupSet, token);
        if (!Dobby._alive(token)) return;
        await sleep(300);

        const retryResult = await Dobby._startJobViaAPI(job, 15);

        if (retryResult && retryResult.error) {
          Dobby._log(`❌ Backup set failed: ${retryResult.msg}. Skipping.`);
          safeUserMsg(`❌ Backup set failed too! Skipping "${jobName}"`, window.UserMessage?.TYPE_ERROR);
          if (workingSet >= 0) await Dobby.equipSet(workingSet, token);
          const ni = Dobby._nextJobIndex();
          if (ni === -1) { Dobby.stop(); return; }
          Dobby.run(token);
          return;
        }

        Dobby._log('✅ Backup set worked.');
        usedBackupSet = true;
        jobCount = 1;

        const t0 = Date.now();
        while (Date.now() - t0 < 600000) {
          if (!Dobby._alive(token)) return;
          if (TaskQueue.queue.length === 0) break;
          await sleep(250);
        }
        if (workingSet >= 0) await Dobby.equipSet(workingSet, token);

      } else {
        Dobby._log(`❌ Job error on "${jobName}": ${errMsg}. Skipping.`);
        const ni = Dobby._nextJobIndex();
        if (ni === -1) { Dobby.stop(); return; }
        Dobby.run(token);
        return;
      }
    } else if (!firstJobResult || !firstJobResult.ok) {
      if (!firstJobResult) {
        for (let i = 0; i < jobCount; i++) {
          if (!Dobby._alive(token)) return;
          await Dobby._startJobOnce(job, 15, token);
          await sleep(25);
        }
      }
    } else {
      for (let i = 1; i < jobCount; i++) {
        if (!Dobby._alive(token)) return;
        await Dobby._startJobOnce(job, 15, token);
        await sleep(25);
      }
    }

    if (!usedBackupSet) {
      const t0 = Date.now();
      while (Date.now() - t0 < 600000) {
        if (!Dobby._alive(token)) return;
        if (TaskQueue.queue.length === 0) break;
        await sleep(250);
      }
    }

    const done = Math.max(0, usedBackupSet ? 1 : (beforeQ + jobCount - Dobby._queueLen()));
    Dobby.statistics.totalJobs += done;
    const gained = Math.max(0, Character.experience - beforeXP);
    Dobby.statistics.totalXp += gained;
    if (Number(job.repeatTotal || 0) > 0) {
      job.repeatRemaining = Math.max(0, (job.repeatRemaining ?? job.repeatTotal) - 1);
    }
    Dobby._persist();
    Dobby._log(`DONE: "${jobName}" completed=${done}, xp+${gained}`);

    if (Dobby.settings.autoRefreshAfterBatch && Dobby._alive(token)) {
      Dobby._saveForReload();
      setTimeout(() => location.reload(), Dobby.settings.refreshDelayMs || 1200);
      return;
    }

    let motAfter = motBefore;
    try { motAfter = await Dobby.getJobMotivation(job); } catch {}
    if (!Dobby._alive(token)) return;
    
    if (!Dobby._isJobRunnable(job) || Dobby._shouldRotate(motAfter, job.stopMotivation)) {
      const ni = Dobby._nextJobIndex();
      if (ni === -1) {
        safeUserMsg('All jobs finished.', window.UserMessage?.TYPE_HINT);
        Dobby.stop();
        return;
      }
    }
    Dobby.render();
    Dobby.run(token);
  };
}
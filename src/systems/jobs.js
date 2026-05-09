import { Dobby } from '../core/state.js';
import { JobPrototype } from '../core/prototypes.js';
import { sleep, clamp, safeUserMsg } from '../core/utils.js';

export function installJobs() {
  Dobby._isJobRunnable = function (job) {
    if (!job) return false;
    const tot = Number(job.repeatTotal || 0);
    if (tot <= 0) return true;
    const rem = Number(job.repeatRemaining ?? tot);
    return rem > 0;
  };

  Dobby._ensureJobPrototype = function (job) {
    if (!job || typeof job !== 'object') return job;
    // Ensure the object has the calculateDistance method from JobPrototype
    if (typeof job.calculateDistance !== 'function') {
      try {
        Object.setPrototypeOf(job, JobPrototype.prototype);
      } catch (e) {
        // Fallback: manually attach the method if prototype setting fails
        job.calculateDistance = JobPrototype.prototype.calculateDistance;
      }
    }
    return job;
  };

  Dobby._ensureRepeatState = function () {
    for (const j of Dobby.addedJobs) {
      const tot = Number(j.repeatTotal || 0);
      if (tot > 0) {
        if (!Number.isFinite(Number(j.repeatRemaining)) || Number(j.repeatRemaining) <= 0) {
          j.repeatRemaining = tot;
        }
      } else {
        j.repeatRemaining = 0;
      }
    }
  };

  Dobby._findNextRunnableIndex = function (startIdx) {
    const n = Dobby.addedJobs.length;
    if (!n) return -1;
    for (let k = 0; k < n; k++) {
      const idx = (startIdx + k) % n;
      if (Dobby._isJobRunnable(Dobby.addedJobs[idx])) return idx;
    }
    return -1;
  };

  Dobby._cleanupFinishedJobsOptional = function () {};

  Dobby.loadJobData = function (cb) {
    Ajax.get('work', 'index', {}, function (r) {
      if (r?.error) return;
      JobsModel.initJobs(r.jobs);
      cb();
    });
  };

  Dobby.checkIfFeatured = function (x, y, jobId) {
    try {
      const key = x + '-' + y;
      const jobData = GameMap.JobHandler.Featured[key];
      if (!jobData || !jobData[jobId]) return { silver: false, gold: false };
      return { silver: !!jobData[jobId].silver, gold: !!jobData[jobId].gold };
    } catch { return { silver: false, gold: false }; }
  };

  Dobby.getJobName = function (jobId) {
    try { return JobList.getJobById(jobId).name; } catch { return 'Job ' + jobId; }
  };

  Dobby.getDisplayName = function (job) {
    return job.customName || Dobby.getJobName(job.id);
  };

  Dobby.getJobIconHTML = function (job) {
    let shortname = '';
    try { shortname = JobList.getJobById(job.id).shortname; } catch {}
    const badge = job.gold ? 'gold' : job.silver ? 'silver' : '';
    const img = shortname ? `../images/jobs/${shortname}.png` : '';
    return `
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="position:relative;width:34px;height:34px;">
          <div style="position:absolute;inset:0;border-radius:8px;background:rgba(0,0,0,.25);"></div>
          ${img ? `<img src="${img}" style="position:absolute;inset:3px;width:28px;height:28px;">` : ''}
          ${badge ? `<div style="position:absolute;right:-6px;top:-6px;font-size:10px;padding:2px 6px;border-radius:8px;background:${badge === 'gold' ? '#f2c94c' : '#bdbdbd'};color:#111;border:1px solid rgba(0,0,0,.35);">${badge}</div>` : ''}
        </div>
        <button class="d2_center_btn" data-x="${job.x}" data-y="${job.y}">Center</button>
      </div>
    `;
  };

  Dobby.getAllUniqueJobs = function () {
    const filter = (Dobby.ui.filter || '').toLowerCase();
    for (const j of Dobby.allJobs) {
      Dobby._ensureJobPrototype(j);
      j.calculateDistance();
    }
    const bestById = new Map();
    for (const j of Dobby.allJobs) {
      let can = true;
      try { can = JobList.getJobById(j.id).canDo(); } catch { can = true; }
      if (!can) continue;
      if (filter) { const nm = Dobby.getJobName(j.id).toLowerCase(); if (!nm.includes(filter)) continue; }
      if (Dobby.ui.onlyCenter && j.id < 131) continue;
      const feat = Dobby.checkIfFeatured(j.x, j.y, j.id);
      j.silver = feat.silver; j.gold = feat.gold;
      if (j.silver && Dobby.ui.noSilver) continue;
      if (!j.silver && Dobby.ui.onlySilver) continue;
      if (Dobby.addedJobs.some((a) => a.id === j.id && a.x === j.x && a.y === j.y)) continue;
      const cur = bestById.get(j.id);
      if (!cur) { bestById.set(j.id, j); continue; }
      const score = (x) => (x.gold ? 2 : x.silver ? 1 : 0);
      if (score(j) > score(cur)) bestById.set(j.id, j);
      else if (score(j) === score(cur) && j.distance < cur.distance) bestById.set(j.id, j);
    }
    const out = [...bestById.values()];
    for (const j of out) {
      try {
        const model = JobsModel.Jobs.find((m) => m.id === j.id);
        if (!model) continue;
        let xp = model.basis.short.experience;
        let money = model.basis.short.money;
        const mot = (model.jobmotivation || 0) * 100;
        if (j.silver || j.gold) { xp = Math.ceil(1.5 * xp); money = Math.ceil(1.5 * money); }
        j.experience = xp; j.money = money; j.motivation = mot;
      } catch {}
    }
    out.sort((a, b) => a.distance - b.distance);
    return out;
  };

  Dobby.createRoute = function () {
    if (!Dobby.addedJobs.length) return;
    for (const j of Dobby.addedJobs) {
      // Fix: Ensure prototype is set before calling calculateDistance
      Dobby._ensureJobPrototype(j);
      if (typeof j.calculateDistance === 'function') {
        j.calculateDistance();
      }
    }
    let start = 0;
    for (let i = 1; i < Dobby.addedJobs.length; i++) {
      if (Dobby.addedJobs[i].distance < Dobby.addedJobs[start].distance) start = i;
    }
    const used = new Set([start]);
    const route = [Dobby.addedJobs[start]];
    while (route.length < Dobby.addedJobs.length) {
      const last = route[route.length - 1];
      let best = null, bestDist = Number.MAX_SAFE_INTEGER;
      for (let i = 0; i < Dobby.addedJobs.length; i++) {
        if (used.has(i)) continue;
        const cand = Dobby.addedJobs[i];
        const d = GameMap.calcWayTime({ x: last.x, y: last.y }, { x: cand.x, y: cand.y });
        if (d < bestDist) { bestDist = d; best = i; }
      }
      used.add(best);
      route.push(Dobby.addedJobs[best]);
    }
    Dobby.addedJobs = route;
    Dobby.currentJobIndex = 0;
  };

  Dobby.getJobMotivation = function (job) {
    return new Promise((resolve) => {
      Ajax.get('job', 'job', { jobId: job.id, x: job.x, y: job.y }, function (r) {
        resolve((r?.motivation || 0) * 100);
      });
    });
  };

  Dobby.healthBelowLimit = function () {
    try {
      const pct = Dobby.Vitals.pct('health');
      return pct <= (Dobby.settings.healthStop ?? 10);
    } catch { return false; }
  };

  Dobby._nudgeJobState = async function (job, token) {
    if (!Dobby.settings.jobStateNudge) return;
    if (!Dobby._alive(token)) return;
    try {
      if (GameMap?.JobHandler?.openJob) {
        GameMap.JobHandler.openJob(job.id, { x: job.x, y: job.y });
        await sleep(Dobby.settings.nudgeDelayMs || 300);
        try { $('.tw2gui_window.job').closest('.tw2gui_window').remove(); } catch {}
      } else if (JobWindow?.open) {
        JobWindow.open(job.id, job.x, job.y);
        await sleep(Dobby.settings.nudgeDelayMs || 300);
      }
    } catch {}
  };

  Dobby._isLabourError = function (msg) {
    if (!msg) return false;
    const text = String(msg).toLowerCase();
    return /labou?r|level|not enough|labour|labor|stamina|energie|energ|arbeits|arbeid|puntos/i.test(text);
  };

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

  Dobby._queueLen = () => (TaskQueue?.queue ? TaskQueue.queue.length : 0);

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

    if (job.isTownWalk) {
      const jobName = Dobby.getDisplayName(job);
      Dobby._log(`WALK: Starting "${jobName}" to town ${job.unitId}`);

      const payload = `tasks[0][unitId]=${job.unitId}&tasks[0][type]=town&tasks[0][taskType]=walk`;
      const result = await Dobby._post('/game.php?window=task&action=add&h=' + (Dobby.settings.hToken || ''), payload);

      if (result && !result.error) {
        // Extract duration and provide feedback
        const duration = result.tasks?.[0]?.task?.data_obj?.duration;
        if (duration) {
          const mins = Math.floor(duration / 60);
          Dobby._log(`Travel time to town: ${mins} minutes.`);
          safeUserMsg(`Traveling to town. Arrival in ${mins} minutes.`, window.UserMessage?.TYPE_HINT);
        }

        let dateDone = result.tasks?.[0]?.task?.date_done;
        let waitMs = 0;
        if (dateDone) {
          const doneTs = Number(dateDone) * 1000;
          waitMs = Math.max(0, doneTs - Date.now());
        }

        if (waitMs > 0) {
          Dobby.currentState = 'walking';
          await sleep(waitMs);
        }

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
      } else {
        Dobby._log(`WALK: Failed to queue walk to "${jobName}": ${result?.msg || 'Unknown error'}`);
        safeUserMsg(`Walk failed: ${jobName}`, window.UserMessage?.TYPE_ERROR);
        const ni = Dobby._nextJobIndex();
        if (ni === -1) { Dobby.stop(); return; }
        Dobby.run(token);
        return;
      }
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

  Dobby.loadJobsFromMap = function () {
    if (Dobby.jobsLoaded) return Dobby.openUI();
    safeUserMsg('Tasker: loading map jobs...', window.UserMessage?.TYPE_HINT);
    Dobby._log('Loading map jobs...');
    Ajax.get('map', 'get_minimap', {}, function (r) {
      const jobs = [];
      const tiles = [];
      let idx = 0, len = 0;
      const maxLen = 250;
      for (const groupId in r.job_groups) {
        const group = r.job_groups[groupId];
        const jobsGroup = JobList.getJobsByGroupId(parseInt(groupId, 10));
        for (let k = 0; k < group.length; k++) {
          const x = group[k][0], y = group[k][1];
          const tx = Math.floor(x / GameMap.tileSize), ty = Math.floor(y / GameMap.tileSize);
          if (len === 0) tiles[idx] = [];
          tiles[idx].push([tx, ty]);
          if (++len >= maxLen) { len = 0; idx++; }
          for (let i = 0; i < jobsGroup.length; i++) {
            jobs.push(new JobPrototype(x, y, jobsGroup[i].id));
          }
        }
      }
      let loaded = 0;
      const toLoad = tiles.length;
      for (let b = 0; b < tiles.length; b++) {
        GameMap.Data.Loader.load(tiles[b], function () {
          loaded++;
          if (loaded >= toLoad) {
            Dobby.jobsLoaded = true;
            Dobby.allJobs = jobs;
            Dobby.findAllConsumables();
            Dobby._log(`Map jobs loaded. Total raw entries=${jobs.length}.`);
            Dobby.openUI();
          }
        });
      }
    });
  };
}
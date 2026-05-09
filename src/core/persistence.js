import { Dobby } from './state.js';
import { JobPrototype } from './prototypes.js';
import { Cookie } from './utils.js';

export function installPersistence() {
  Dobby._saveForReload = function () {
    try {
      const tempExp = new Date(); tempExp.setDate(tempExp.getDate() + 1);
      const permExp = new Date(); permExp.setDate(permExp.getDate() + 3650);
      const temp = {
        addedJobs: Dobby.addedJobs.map((j) => ({
          x: j.x, y: j.y, id: j.id, customName: j.customName,
          silver: !!j.silver, gold: !!j.gold,
          stopMotivation: j.stopMotivation, set: j.set,
          repeatTotal: j.repeatTotal || 0, repeatRemaining: j.repeatRemaining || 0,
        })),
        currentJobIndex: Dobby.currentJobIndex,
        townBookmarks: Array.isArray(Dobby.townBookmarks) ? Dobby.townBookmarks.slice() : [],
        setsChoice: {
          travelSet: Dobby.travelSet, defaultJobSet: Dobby.defaultJobSet,
          healthSet: Dobby.healthSet, regenerationSet: Dobby.regenerationSet,
          backupSet: Dobby.backupSet,
        },
      };
      const perm = {
        settings: Dobby.settings,
        statistics: {
          totalJobs: Dobby.statistics.totalJobs,
          totalXp: Dobby.statistics.totalXp,
        },
        consumablesSelected: [...Dobby.consumableSelectedIds],
      };
      Cookie.set('dobby2_temp', JSON.stringify(temp), tempExp);
      Cookie.set('dobby2_perm', JSON.stringify(perm), permExp);
    } catch {}
  };

  Dobby._loadAfterReload = function () {
    try {
      const raw = localStorage.getItem('dobby2_state');
      if (!raw) return false;
      const st = JSON.parse(raw);
      localStorage.removeItem('dobby2_state');
      const maxAge = (st.settings?.resumeMaxAgeMinutes ?? 10) * 60 * 1000;
      if (Date.now() - st.ts > maxAge) return false;
      Dobby.settings = { ...Dobby.settings, ...st.settings };
      Dobby.statistics = st.statistics || Dobby.statistics;
      Dobby.travelSet = st.setsChoice?.travelSet ?? Dobby.travelSet;
      Dobby.defaultJobSet = st.setsChoice?.defaultJobSet ?? Dobby.defaultJobSet;
      Dobby.healthSet = st.setsChoice?.healthSet ?? Dobby.healthSet;
      Dobby.regenerationSet = st.setsChoice?.regenerationSet ?? Dobby.regenerationSet;
      Dobby.backupSet = st.setsChoice?.backupSet ?? Dobby.backupSet;
      Dobby.townBookmarks = Array.isArray(st.townBookmarks) ? st.townBookmarks.slice() : Dobby.townBookmarks;
      Dobby.consumableSelectedIds = new Set(st.consumablesSelected || []);
      Dobby.addedJobs = [];
      for (const j of st.addedJobs || []) {
        const jp = new JobPrototype(j.x, j.y, j.id, j.customName);
        jp.silver = !!j.silver; jp.gold = !!j.gold;
        jp.distance = j.distance || 0; jp.experience = j.experience || 0;
        jp.money = j.money || 0; jp.motivation = j.motivation || 0;
        jp.stopMotivation = j.stopMotivation ?? 75; jp.set = j.set ?? -2;
        jp.repeatTotal = Number(j.repeatTotal || 0);
        jp.repeatRemaining = Number(j.repeatRemaining || 0);
        Dobby.addedJobs.push(jp);
      }
      Dobby.currentJobIndex = st.currentJobIndex || 0;
      Dobby.isRunning = !!st.isRunning;
      return true;
    } catch (e) {
      try { localStorage.removeItem('dobby2_state'); } catch {}
      return false;
    }
  };

  Dobby._persist = function () {
    try {
      const tempExp = new Date(); tempExp.setDate(tempExp.getDate() + 1);
      const permExp = new Date(); permExp.setDate(permExp.getDate() + 3650);
      const temp = {
        addedJobs: Dobby.addedJobs.map((j) => ({
          x: j.x, y: j.y, id: j.id, customName: j.customName,
          silver: !!j.silver, gold: !!j.gold,
          stopMotivation: j.stopMotivation, set: j.set,
          repeatTotal: j.repeatTotal || 0, repeatRemaining: j.repeatRemaining || 0,
        })),
        currentJobIndex: Dobby.currentJobIndex,
        townBookmarks: Array.isArray(Dobby.townBookmarks) ? Dobby.townBookmarks.slice() : [],
        setsChoice: {
          travelSet: Dobby.travelSet, defaultJobSet: Dobby.defaultJobSet,
          healthSet: Dobby.healthSet, regenerationSet: Dobby.regenerationSet,
          backupSet: Dobby.backupSet,
        },
      };
      const perm = {
        settings: Dobby.settings,
        statistics: {
          totalJobs: Dobby.statistics.totalJobs,
          totalXp: Dobby.statistics.totalXp,
        },
        consumablesSelected: [...Dobby.consumableSelectedIds],
      };
      Cookie.set('dobby2_temp', JSON.stringify(temp), tempExp);
      Cookie.set('dobby2_perm', JSON.stringify(perm), permExp);
    } catch {}
  };

  Dobby._loadPersist = function () {
    try {
      const perm = Cookie.get('dobby2_perm');
      if (perm) {
        const o = JSON.parse(perm);
        if (o?.settings) Dobby.settings = { ...Dobby.settings, ...o.settings };
        if (o?.statistics?.totalJobs != null) Dobby.statistics.totalJobs = o.statistics.totalJobs;
        if (o?.statistics?.totalXp != null) Dobby.statistics.totalXp = o.statistics.totalXp;
        if (Array.isArray(o?.consumablesSelected)) Dobby.consumableSelectedIds = new Set(o.consumablesSelected);
      }
    } catch {}
    try {
      const temp = Cookie.get('dobby2_temp');
      if (temp) {
        const o = JSON.parse(temp);
        Dobby.addedJobs = [];
        for (const j of o.addedJobs || []) {
          const jp = new JobPrototype(j.x, j.y, j.id, j.customName);
          jp.silver = !!j.silver; jp.gold = !!j.gold;
          jp.stopMotivation = j.stopMotivation ?? 75; jp.set = j.set ?? -2;
          jp.repeatTotal = Number(j.repeatTotal || 0);
          jp.repeatRemaining = Number(j.repeatRemaining || 0);
          Dobby.addedJobs.push(jp);
        }
        Dobby.townBookmarks = Array.isArray(o.townBookmarks) ? o.townBookmarks.slice() : Dobby.townBookmarks;
        Dobby.currentJobIndex = o.currentJobIndex || 0;
        Dobby.travelSet = o.setsChoice?.travelSet ?? Dobby.travelSet;
        Dobby.defaultJobSet = o.setsChoice?.defaultJobSet ?? Dobby.defaultJobSet;
        Dobby.healthSet = o.setsChoice?.healthSet ?? Dobby.healthSet;
        Dobby.regenerationSet = o.setsChoice?.regenerationSet ?? Dobby.regenerationSet;
        Dobby.backupSet = o.setsChoice?.backupSet ?? Dobby.backupSet;
      }
    } catch {}
  };
}

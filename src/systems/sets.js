import { Dobby } from '../core/state.js';
import { sleep } from '../core/utils.js';

export function installSets() {
  Dobby._normalizeSetsResp = function (r) {
    if (!r) return [];
    if (Array.isArray(r)) return r;
    if (Array.isArray(r.data)) return r.data;
    if (r.msg && Array.isArray(r.msg.data)) return r.msg.data;
    if (r.data && Array.isArray(r.data.data)) return r.data.data;
    return [];
  };

  Dobby.loadSets = function (cb) {
    cb = cb || function () {};
    if (Array.isArray(Dobby.sets) && Dobby.sets.length) return cb();
    if (Dobby.setsLoading) {
      (async () => { while (Dobby.setsLoading) await sleep(50); cb(); })();
      return;
    }
    Dobby.setsLoading = true;
    const finish = (arr) => {
      Dobby.sets = Array.isArray(arr) ? arr : [];
      Dobby.setsLoading = false;
      try { Dobby._log(`👕 Sets loaded: ${Dobby.sets.length}`); } catch {}
      try {
        if (Dobby.win && Dobby.ui && Dobby.ui.tab === 'sets') {
          const $c = Dobby.win.$body ? Dobby.win.$body.find('.d2_content') : null;
          if ($c && $c.length) $c.html(Dobby.renderSetsTab());
        }
      } catch {}
      try { cb(); } catch {}
    };

    try {
      if (window.Ajax && Ajax.remoteCallMode) {
        Ajax.remoteCallMode('inventory', 'show_equip', {}, function (r) {
          const arr = Dobby._normalizeSetsResp(r);
          if (arr && arr.length) return finish(arr);
          Dobby._fetchSetsDirect().then(finish).catch(() => finish([]));
        });
        return;
      }
    } catch {}
    Dobby._fetchSetsDirect().then(finish).catch(() => finish([]));
  };

  Dobby._fetchSetsDirect = async function () {
    try {
      const res = await fetch('/game.php?window=inventory&mode=show_equip', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: '',
      });
      const j = await res.json();
      return Dobby._normalizeSetsResp(j);
    } catch (e) {
      try { Dobby._log('⚠️ direct sets fetch failed: ' + e); } catch {}
      return [];
    }
  };

  Dobby.refreshSets = function (cb) {
    Dobby.sets = null;
    Dobby.setsLoading = false;
    Dobby.loadSets(cb || function () {});
  };

  Dobby.equipSet = async function (setIndex, token) {
    if (!Dobby._alive(token)) return false;
    if (setIndex === -1) return true;
    if (!Array.isArray(Dobby.sets) || !Dobby.sets[setIndex]) return true;
    try {
      EquipManager.switchEquip(Dobby.sets[setIndex].equip_manager_id);
      await sleep(200);
      return true;
    } catch (e) { return true; }
  };

  Dobby.getSetName = function (setIndex) {
    if (setIndex === -2) return 'Best gear';
    if (setIndex === -1) return 'None';
    if (Array.isArray(Dobby.sets) && Dobby.sets[setIndex]) return Dobby.sets[setIndex].name || `Set ${setIndex}`;
    return `Set ${setIndex}`;
  };

  Dobby.getBestGearItems = function (jobId) {
    try {
      let mid = -1;
      for (let i = 0; i < JobsModel.Jobs.length; i++) {
        if (JobsModel.Jobs[i].id === jobId) { mid = i; break; }
      }
      if (mid === -1) return null;
      const res = west.item.Calculator.getBestSet(JobsModel.Jobs[mid].get('skills'), jobId);
      return res && res.getItems ? res.getItems() : null;
    } catch { return null; }
  };

  Dobby.equipBestGear = async function (jobId, token) {
    const items = Dobby.getBestGearItems(jobId);
    if (!items || !items.length) return true;
    try {
      for (const id of items) {
        if (!Dobby._alive(token)) return false;
        const it = ItemManager.get(id);
        if (!it) continue;
        if (!Wear.wear[id.type] || Wear.wear[id.type].obj.item_id !== id) {
          Wear.carry(Bag.getItemByItemId(id));
          await sleep(30);
        }
      }
    } catch {}
    await sleep(150);
    return true;
  };
}

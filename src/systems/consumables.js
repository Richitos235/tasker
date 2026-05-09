import { Dobby } from '../core/state.js';
import { ConsumablePrototype } from '../core/prototypes.js';
import { waitForBagReady, sleep } from '../core/utils.js';

export function installConsumables() {
  Dobby.loadLanguage = function () {
    Ajax.remoteCall('settings', 'settings', {}, function (resp) {
      try { Dobby.language = resp.lang.account.key || 'en_DK'; } catch { Dobby.language = 'en_DK'; }
    });
  };

  Dobby.parseConsumableBonuses = function (bonuses) {
    const keys = Dobby.searchKeys[Dobby.language] || Dobby.searchKeys.en_DK;
    const result = [0, 0, 0];
    function parseLine(text, kind) {
      let t = text;
      if (kind === 0) t = t.replace(keys.energyText, '');
      if (kind === 1) t = t.replace(keys.motivationText, '');
      if (kind === 2) t = t.replace(keys.healthText, '');
      t = t.trim();
      if (t.startsWith('+')) t = t.slice(1);
      t = t.replace('%', '').trim();
      const v = parseInt(t, 10);
      return Number.isFinite(v) ? v : 0;
    }
    for (const line of bonuses || []) {
      if (line.includes(keys.energyText)) result[0] = parseLine(line, 0);
      else if (line.includes(keys.motivationText)) result[1] = parseLine(line, 1);
      else if (line.includes(keys.healthText)) result[2] = parseLine(line, 2);
    }
    return result;
  };

  Dobby._toNumber = function (val) {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const s = val.trim().replace('%', '');
      if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : NaN;
      }
    }
    return NaN;
  };

  Dobby._extractBonus = function (obj) {
    let e = 0, m = 0, h = 0;
    if (!obj) return [0, 0, 0];
    const ub = obj.usebonus || obj.use_bonus || obj.usebonuses;
    if (!ub) return [0, 0, 0];

    const visit = (v) => {
      if (v == null) return;
      if (Array.isArray(v)) { v.forEach(visit); return; }
      if (typeof v !== 'object') return;
      for (const k of Object.keys(v)) {
        const lk = String(k).toLowerCase();
        const val = v[k];
        const num = Dobby._toNumber(val);
        if (Number.isFinite(num)) {
          if (lk.includes('energy')) e += num;
          else if (lk.includes('motiv')) m += num;
          else if (
            lk === 'hp' || lk === 'health' || lk === 'hitpoints' ||
            lk.includes('health') || lk.includes('hitpoints') ||
            lk.includes('lifepoints') || lk.includes('life_points')
          ) h += num;
        } else if (val && typeof val === 'object') {
          visit(val);
        }
      }
    };
    visit(ub);

    if (e === 0 && m === 0 && h === 0) {
      try {
        const b = Dobby.parseConsumableBonuses(ub);
        if (b && (b[0] || b[1] || b[2])) return b;
      } catch {}
    }
    return [e, m, h];
  };

  Dobby._parseBonusesString = function (item) {
    const ub = item?.obj?.usebonus || item?.usebonus || [];
    let energy = 0, motivation = 0, health = 0;
    const arr = Array.isArray(ub) ? ub : (typeof ub === 'object' ? Object.values(ub) : [ub]);
    for (const raw of arr) {
      const b = String(raw || '');
      const num = parseInt(b.replace(/[^\d-]/g, ''), 10) || 0;
      if (/energy/i.test(b)) energy = num || energy;
      if (/motiv/i.test(b)) motivation = num || motivation;
      if (/health|hp|life/i.test(b)) health = num || health;
    }
    return { energy, motivation, health };
  };

  Dobby.findAllConsumables = function () {
    const keys = Dobby.searchKeys[Dobby.language] || Dobby.searchKeys.en_DK;
    if (!keys || !window.Bag || typeof Bag.search !== 'function') {
      Dobby.allConsumables = [];
      return;
    }

    const queries = [keys.energy, keys.motivation, keys.health];
    const found = [];

    for (const q of queries) {
      try {
        const raw = Bag.search(q) || [];
        const arr = Array.isArray(raw) ? raw : Object.values(raw || {});
        found.push(...arr);
      } catch (err) {}
    }

    const map = new Map();
    for (const item of found) {
      try {
        const id = item?.obj?.item_id;
        if (!id) continue;
        const invId = item?.inv_id || null;
        let b = Dobby._extractBonus(item.obj);
        if (b[0] === 0 && b[1] === 0 && b[2] === 0) {
          const sb = Dobby._parseBonusesString(item);
          if (sb.energy || sb.motivation || sb.health) {
            b = [sb.energy, sb.motivation, sb.health];
          }
        }
        if (b[0] === 0 && b[1] === 0 && b[2] === 0) continue;
        
        if (map.has(id)) {
          const existing = map.get(id);
          existing.count += item.count || 0;
          if (!existing.invId && invId) existing.invId = invId;
          continue;
        }
        const c = new ConsumablePrototype(id, item.obj.image, item.obj.name);
        c.energy = b[0];
        c.motivation = b[1];
        c.health = b[2];
        c.count = item.count || 0;
        c.invId = invId;
        c.selected = Dobby.consumableSelectedIds ? Dobby.consumableSelectedIds.has(id) : true;
        map.set(id, c);
      } catch (err) {}
    }

    Dobby.allConsumables = [...map.values()].sort(
      (a, b) => b.energy + b.motivation + b.health - (a.energy + a.motivation + a.health)
    );
  };

  Dobby.Consumables = Dobby.Consumables || {};
  Dobby.Consumables.scan = function() {
    Dobby._log("Manual scan initiated");
    Dobby.findAllConsumables();
  };

  Dobby._installInventoryWatcher = function () {
    if (Dobby._invWatcherInstalled) return;
    Dobby._invWatcherInstalled = true;
    const refresh = () => {
      try { Dobby.findAllConsumables(); } catch {}
      try {
        if (Dobby.win && Dobby.ui && Dobby.ui.tab === 'consum') {
          const $c = Dobby.win.$body ? Dobby.win.$body.find('.d2_content') : null;
          if ($c && $c.length) $c.html(Dobby.renderConsumTab());
        }
      } catch {}
    };
    try {
      if (window.EventHandler && EventHandler.listen) {
        EventHandler.listen('inventory_changed', refresh);
        EventHandler.listen('item_used', refresh);
      }
    } catch {}
  };

  Dobby.Consumables = {
    ...Dobby.Consumables,
    cooldownMs: 10 * 60 * 1000,
    lastUseAt: Object.create(null),
    inFlight: false,
    initialized: false,
    _watcher: null,
    _globalCooldownUntil: 0,

    _now() { return Date.now(); },

    _parseCooldownFromDOM() {
      try {
        const el = document.querySelector('span.cooldown');
        if (!el) return null;
        const txt = String(el.innerText || el.textContent || '').trim();
        const parts = txt.match(/(\d+)([hms])/g);
        if (!parts) return null;
        let total = 0;
        for (const p of parts) {
          const v = parseInt(p, 10);
          if (p.includes('h')) total += v * 3600;
          else if (p.includes('m')) total += v * 60;
          else if (p.includes('s')) total += v;
        }
        return total > 0 ? total * 1000 : null;
      } catch { return null; }
    },

    _setCooldownFromServer(cooldownSeconds) {
      if (cooldownSeconds && cooldownSeconds > 0) {
        this._globalCooldownUntil = this._now() + (cooldownSeconds * 1000);
      } else {
        const dom = this._parseCooldownFromDOM();
        if (dom) this._globalCooldownUntil = this._now() + dom;
        else this._globalCooldownUntil = this._now() + this.cooldownMs;
      }
      try { Dobby._renderHeaderPill && Dobby._renderHeaderPill(); } catch {}
    },

    async _useItem(itemId, invId, itemName) {
      if (!itemId || !invId) return false;
      if (this._now() < this._globalCooldownUntil) return false;
      const hTok = Dobby.settings.hToken;
      if (!hTok) return false;
      
      const url  = `${location.origin}/game.php?window=itemuse&action=use_item&h=${hTok}`;
      const body = `item_id=${itemId}&item_count=1&lastInvId=${invId}`;
      try {
        const resp = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body, method: 'POST',
        });
        const data = await resp.json().catch(() => ({}));
        if (data && !data.error) {
          let cdSec = data.msg?.cooldown;
          this._setCooldownFromServer(Number.isFinite(cdSec) ? cdSec : null);
          Dobby._log(`✅ used "${itemName}"`);
          setTimeout(() => Dobby.findAllConsumables(), 1500);
          return true;
        }
        return false;
      } catch (err) {
        return false;
      }
    },

    async tryUse(opts) {
      if (this.inFlight) return false;
      if (this._now() < this._globalCooldownUntil) return false;
      const s = Dobby.settings;
      const force = !!(opts && opts.force);
      const kinds = [];
      if (s.addHealth) kinds.push('health');
      if (s.addEnergy) kinds.push('energy');
      if (!kinds.length) return false;

      for (const kind of kinds) {
        if (!force) {
          const v = Dobby.Vitals.read(kind);
          const pct = v.max > 0 ? (v.cur / v.max) * 100 : 100;
          const thr = kind === 'energy' ? s.useEnergyAt : s.useHealthAt;
          if (pct > thr) continue;
        }
        
        const list = (Dobby.allConsumables || []).filter(c => c.selected && c.count > 0 && c.invId);
        if (!list.length) continue;
        
        if (kind === 'energy') list.sort((a, b) => b.energy - a.energy);
        else list.sort((a, b) => b.health - a.health);
        
        const pick = list[0];
        if (!pick) continue;

        this.inFlight = true;
        try {
          const ok = await this._useItem(pick.id, pick.invId, pick.name);
          await sleep(ok ? 1500 : 800);
          this.inFlight = false;
          if (ok) return true;
        } catch (e) {
          this.inFlight = false;
        }
      }
      return false;
    },

    nextReadyMs() {
      const remaining = this._globalCooldownUntil - this._now();
      return remaining > 0 ? remaining : 0;
    },

    startWatcher() {
      if (this._watcher) return;
      const tick = async () => {
        try {
          const s = Dobby.settings;
          if (!s.consumablesAutoUse) return;
          if (this.inFlight || this._now() < this._globalCooldownUntil) return;
          await this.tryUse();
        } catch {}
      };
      this._watcher = setInterval(tick, Number(Dobby.settings.consumablesWatcherMs) || 5000);
    },

    stopWatcher() {
      if (this._watcher) { clearInterval(this._watcher); this._watcher = null; }
    },

    init() {
      if (this.initialized) return;
      this.initialized = true;
      
      try { this.startWatcher(); } catch {}
      
      waitForBagReady(() => {
        try { Dobby.findAllConsumables(); } catch (e) {}
      });
    },
  };
}
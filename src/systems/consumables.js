import { Dobby } from '../core/state.js';
import { ConsumablePrototype } from '../core/prototypes.js';
import { waitForBagReady } from '../core/utils.js';

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
    const debugPrefix = '[Tasker][Consumables DEBUG]';

    if (!keys || !window.Bag || typeof Bag.search !== 'function') {
      Dobby.allConsumables = [];
      try {
        console.log(debugPrefix, 'scanner not ready', {
          language: Dobby.language,
          hasKeys: !!keys,
          hasBag: !!window.Bag,
          bagKeys: window.Bag ? Object.keys(window.Bag).slice(0, 40) : [],
          hasBagSearch: !!(window.Bag && typeof Bag.search === 'function'),
          bagLoaded: !!(window.Bag && Bag.loaded),
        });
      } catch {}
      return;
    }

    const queries = [keys.energy, keys.motivation, keys.health];
    const found = [];

    try {
      console.log(debugPrefix, 'Bag items/source = Bag.search(language queries)', {
        language: Dobby.language,
        queries,
        bagKeys: Object.keys(window.Bag || {}).slice(0, 40),
      });
    } catch {}

    for (const q of queries) {
      try {
        const raw = Bag.search(q) || [];
        const arr = Array.isArray(raw) ? raw : Object.values(raw || {});
        found.push(...arr);
        console.log(debugPrefix, `Bag.search(${JSON.stringify(q)}) raw items:`, arr);
      } catch (err) {
        try { console.warn(debugPrefix, `Bag.search(${JSON.stringify(q)}) failed:`, err); } catch {}
      }
    }

    try { console.log(debugPrefix, 'raw items from Tasker (same source as CM):', found); } catch {}

    const map = new Map();
    for (const item of found) {
      try {
        const id = item?.obj?.item_id;
        if (!id) {
          console.log(debugPrefix, 'skip item without obj.item_id:', item);
          continue;
        }
        const invId = item?.inv_id || null;
        let b = Dobby._extractBonus(item.obj);
        if (b[0] === 0 && b[1] === 0 && b[2] === 0) {
          const sb = Dobby._parseBonusesString(item);
          if (sb.energy || sb.motivation || sb.health) {
            b = [sb.energy, sb.motivation, sb.health];
          }
        }
        if (b[0] === 0 && b[1] === 0 && b[2] === 0) {
          console.log(debugPrefix, 'skip item without parsed bonus:', {
            id,
            name: item?.obj?.name,
            usebonus: item?.obj?.usebonus,
            parsed: b,
          });
          continue;
        }
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
        if (Dobby.consumableSelectedIds && Dobby.consumableSelectedIds.size > 0) {
          c.selected = Dobby.consumableSelectedIds.has(id);
        } else {
          c.selected = true;
        }
        map.set(id, c);
      } catch (err) {
        try { console.warn(debugPrefix, 'failed to parse raw item:', item, err); } catch {}
      }
    }

    Dobby.allConsumables = [...map.values()].sort(
      (a, b) => b.energy + b.motivation + b.health - (a.energy + a.motivation + a.health)
    );

    try {
      console.log(debugPrefix, 'parsed consumables:', Dobby.allConsumables);
      console.log('[Tasker] findAllConsumables: CM-compatible scan found',
        Dobby.allConsumables.length, 'consumables from', found.length, 'raw search results.');
    } catch {}
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
    try {
      const oldOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (m, u) {
        try {
          if (typeof u === 'string' && (u.includes('inventory_changed') || u.includes('use_item'))) {
            this.addEventListener('load', () => setTimeout(refresh, 200));
          }
        } catch {}
        return oldOpen.apply(this, arguments);
      };
    } catch {}
  };

  Dobby.Consumables = {
    cooldownMs: 10 * 60 * 1000,
    lastUseAt: Object.create(null),
    inFlight: false,
    initialized: false,
    _watcher: null,
    _globalCooldownUntil: 0,
    _cachedH: null,

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
        Dobby._log(`🧪 Cooldown set ${Math.ceil(cooldownSeconds)}s (server)`);
      } else {
        const dom = this._parseCooldownFromDOM();
        if (dom) {
          this._globalCooldownUntil = this._now() + dom;
          Dobby._log(`🧪 Cooldown set ${Math.round(dom/1000)}s (DOM)`);
        } else {
          this._globalCooldownUntil = this._now() + this.cooldownMs;
          Dobby._log(`🧪 Cooldown set ${this.cooldownMs/1000}s (fallback)`);
        }
      }
      try { Dobby._renderHeaderPill && Dobby._renderHeaderPill(); } catch {}
    },

    _getH() {
      const manual = (Dobby.settings && Dobby.settings.hToken || '').trim();
      if (manual) return manual;
      if (this._cachedH) return this._cachedH;
      try {
        const u = new URLSearchParams(window.location.search).get('h');
        if (u) { this._cachedH = u; return u; }
      } catch {}
      try {
        const links = document.querySelectorAll('a[href*="game.php?"]');
        for (const a of links) {
          const m = a.href.match(/[?&]h=([^&]+)/);
          if (m) { this._cachedH = m[1]; return this._cachedH; }
        }
      } catch {}
      try {
        if (window.h_token) { this._cachedH = window.h_token; return this._cachedH; }
        if (window.H)       { this._cachedH = window.H;       return this._cachedH; }
        if (window.csrf)    { this._cachedH = window.csrf;    return this._cachedH; }
      } catch {}
      try {
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta && meta.content) { this._cachedH = meta.content; return this._cachedH; }
      } catch {}
      return null;
    },

    refresh() { try { Dobby.findAllConsumables(); } catch {} },

    _findBestItemForNeed(needType) {
      const list = (Dobby.allConsumables || []).filter(
        c => c.selected && c.count > 0 && c.invId
      );
      if (!list.length) return null;
      if (needType === 'energy') list.sort((a, b) => b.energy - a.energy);
      else if (needType === 'health') list.sort((a, b) => b.health - a.health);
      else return null;
      const top = list[0];
      if (!top) return null;
      const v = (needType === 'energy' ? top.energy : top.health);
      if (!v || v <= 0) return null;
      return top;
    },

    async _useItem(itemId, invId, itemName) {
      if (!itemId || !invId) {
        Dobby._log(`❌ Cannot use ${itemName}: missing item/inv id.`);
        return false;
      }
      if (this._now() < this._globalCooldownUntil) {
        const r = Math.ceil((this._globalCooldownUntil - this._now()) / 1000);
        Dobby._log(`⏳ Cooldown active (${r}s) — skip ${itemName}`);
        return false;
      }
      const hTok = this._getH();
      if (!hTok) {
        Dobby._log(`❌ No CSRF token (h). Set it manually in Settings → h-token.`);
        return false;
      }
      const url  = `${location.origin}/game.php?window=itemuse&action=use_item&h=${hTok}`;
      const body = `item_id=${itemId}&item_count=1&lastInvId=${invId}`;
      try {
        const resp = await fetch(url, {
          credentials: 'include',
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          referrer: window.location.href,
          body, method: 'POST', mode: 'cors',
        });
        const data = await resp.json().catch(() => ({}));
        if (data && !data.error) {
          let cdSec = null;
          if (data.msg && typeof data.msg === 'object' && data.msg.cooldown != null) {
            cdSec = parseFloat(data.msg.cooldown);
          }
          this._setCooldownFromServer(Number.isFinite(cdSec) ? cdSec : null);
          this.lastUseAt[itemId] = this._now();
          Dobby.statistics.consumablesUsed = (Dobby.statistics.consumablesUsed || 0) + 1;
          Dobby._log(`✅ used "${itemName}"`);
          setTimeout(() => {
            try { if (window.Bag && Bag.refresh) Bag.refresh(); } catch {}
            try { Dobby.findAllConsumables(); } catch {}
            try { Dobby._renderHeaderPill && Dobby._renderHeaderPill(); } catch {}
          }, 1500);
          return true;
        }
        const errMsg = (data && (typeof data.msg === 'string' ? data.msg : JSON.stringify(data.msg || data))) || 'unknown';
        Dobby._log(`❌ use_item "${itemName}" failed: ${errMsg}`);
        if (typeof errMsg === 'string' && /cannot use this item yet/i.test(errMsg)) {
          const dom = this._parseCooldownFromDOM();
          if (dom) this._setCooldownFromServer(dom / 1000);
          else this._globalCooldownUntil = this._now() + 2 * 60 * 1000;
        }
        return false;
      } catch (err) {
        Dobby._log(`❌ network error using ${itemName}: ${err && err.message}`);
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

      this.refresh();

      for (const kind of kinds) {
        if (!force) {
          const v = Dobby.Vitals.read(kind);
          const pct = v.max > 0 ? (v.cur / v.max) * 100 : 100;
          const thr = kind === 'energy'
            ? clamp(Number(s.useEnergyAt) || 0, 0, 100)
            : clamp(Number(s.useHealthAt) || 0, 0, 100);
          if (pct > thr) continue;
        }
        const pick = this._findBestItemForNeed(kind);
        if (!pick) {
          if (force) Dobby._log(`No ${kind} item selected/in-stock with valid inv slot.`);
          continue;
        }
        this.inFlight = true;
        try {
          const ok = await this._useItem(pick.id, pick.invId, pick.name);
          await sleep(ok ? 1500 : 800);
          this.inFlight = false;
          if (ok) return true;
        } catch (e) {
          this.inFlight = false;
          Dobby._log(`❌ tryUse exception: ${e && e.message}`);
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
          if (!(s.addEnergy || s.addHealth)) return;
          if (this.inFlight) return;
          if (this._now() < this._globalCooldownUntil) return;
          let need = false;
          if (s.addHealth) {
            const v = Dobby.Vitals.read('health');
            const p = v.max > 0 ? (v.cur / v.max) * 100 : 100;
            if (p <= (Number(s.useHealthAt) || 0)) need = true;
          }
          if (!need && s.addEnergy) {
            const v = Dobby.Vitals.read('energy');
            const p = v.max > 0 ? (v.cur / v.max) * 100 : 100;
            if (p <= (Number(s.useEnergyAt) || 0)) need = true;
          }
          if (!need) return;
          await this.tryUse();
        } catch {}
      };
      const ms = Math.max(1500, Number(Dobby.settings.consumablesWatcherMs) || 5000);
      this._watcher = setInterval(tick, ms);
      setTimeout(tick, 1500);
    },

    stopWatcher() {
      if (this._watcher) { clearInterval(this._watcher); this._watcher = null; }
    },

    init() {
      if (this.initialized) return;
      this.initialized = true;
      try {
        if (window.EventHandler) {
          EventHandler.listen('item_used', (itemId) => {
            try {
              this.lastUseAt[itemId] = this._now();
              const dom = this._parseCooldownFromDOM();
              if (dom) this._globalCooldownUntil = Math.max(this._globalCooldownUntil, this._now() + dom);
              Dobby._log(`🥃 manual item_used id=${itemId}`);
              try { Dobby._renderHeaderPill && Dobby._renderHeaderPill(); } catch {}
            } catch {}
          });
          EventHandler.listen('cooldown_changed', () => {
            try { Dobby._renderHeaderPill && Dobby._renderHeaderPill(); } catch {}
          });
        }
      } catch {}
      try { this.startWatcher(); } catch {}
      waitForBagReady(() => {
        console.log('Bag ready', window.Bag);
        try {
          Dobby.findAllConsumables();
          const items = Dobby.allConsumables || [];
          console.log('Found items', items);
          Dobby._log(`Consumables initialized. Found ${items.length} consumables.`);
        } catch (e) { console.log('[Tasker] delayed consumables scan failed', e); }
      });
    },
  };
}

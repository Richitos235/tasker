import { Dobby } from '../core/state.js';

export function installVitals() {
  Dobby.Vitals = {
    _parseBar(el) {
      try {
        if (!el) return null;
        const txt = String(el.textContent || '').trim();
        const m = txt.match(/(-?\d+)\s*\/\s*(\d+)/);
        if (!m) return null;
        const cur = parseInt(m[1], 10);
        const max = parseInt(m[2], 10);
        if (!Number.isFinite(cur) || !Number.isFinite(max) || max <= 0) return null;
        return { cur: Math.max(0, cur), max };
      } catch { return null; }
    },
    readDom(kind) {
      const sel = kind === 'energy' ? '.status_bar.energy_bar' : '.status_bar.health_bar';
      const el = document.querySelector(sel);
      return this._parseBar(el);
    },
    read(kind) {
      const dom = this.readDom(kind);
      if (dom) return dom;
      try {
        if (kind === 'energy') return { cur: Character.energy, max: Character.maxEnergy };
        return { cur: Character.health, max: Character.maxHealth };
      } catch { return { cur: 0, max: 0 }; }
    },
    pct(kind) {
      const v = this.read(kind);
      return v.max > 0 ? (v.cur / v.max) * 100 : 0;
    },
  };
}

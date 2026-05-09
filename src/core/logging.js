import { Dobby } from './state.js';

export function installLogging() {
  Dobby._log = function (msg) {
    try {
      const t = new Date();
      const ts = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
      Dobby.log.lines.push(`[${ts}] ${msg}`);
      if (Dobby.log.lines.length > Dobby.log.max) Dobby.log.lines.splice(0, Dobby.log.lines.length - Dobby.log.max);
      if (Dobby.win && Dobby.ui.tab === 'log') {
        const el = $('#d2_log_box');
        if (el.length) {
          el.text(Dobby.log.lines.join('\n'));
          el.scrollTop(el[0].scrollHeight);
        }
      }
    } catch {}
  };
}

import { Dobby } from '../core/state.js';
import { JobPrototype } from '../core/prototypes.js';
import { safeUserMsg } from '../core/utils.js';

export function installAutoCapture() {
  Dobby._setupAutoCapture = function () {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    const origFetch = window.fetch;

    function normalizeBody(body) {
      if (!body) return '';
      if (typeof body === 'string') return body;
      if (body instanceof URLSearchParams) return body.toString();
      if (body instanceof FormData) return new URLSearchParams([...body]).toString();
      try { return String(body); } catch { return ''; }
    }

    function saveTownFromBody(bodyStr) {
      const decoded = decodeURIComponent(bodyStr);
      const unitIdMatch = decoded.match(/\[unitId\]=(\d+)/);
      if (!unitIdMatch) return;
      const unitId = parseInt(unitIdMatch[1], 10);
      if (!Number.isFinite(unitId)) return;
      Dobby.autoSaveTown({ town_id: unitId, town_name: `Captured Town ${unitId}` });
    }

    function saveTownFromResponseText(text) {
      if (!text) return;
      try {
        const data = JSON.parse(text);
        if (data && (data.town_id || data.id || data.unitId)) {
          Dobby.autoSaveTown(data);
        }
      } catch {}
    }

    XMLHttpRequest.prototype.open = function (method, url) {
      this._taskerUrl = url;
      this._taskerMethod = (method || '').toUpperCase();
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      const xhr = this;
      const url = xhr._taskerUrl || '';
      const method = xhr._taskerMethod || '';
      const bodyStr = normalizeBody(body);

      if (method === 'POST' && url.includes('window=task') && url.includes('action=add')) {
        const decoded = decodeURIComponent(bodyStr);
        const isTownWalk = decoded.includes('[type]=town') && decoded.includes('[taskType]=walk');

        if (isTownWalk) {
          saveTownFromBody(bodyStr);
        }

        const taskTypeMatch = decoded.match(/\[taskType\]=(\w+)/);
        if (taskTypeMatch && taskTypeMatch[1] === 'job') {
          const hMatch = url.match(/[?&]h=([a-zA-Z0-9]+)/i);
          if (hMatch && hMatch[1]) {
            const detectedH = hMatch[1];
            if (Dobby.settings.hToken !== detectedH) {
              Dobby.settings.hToken = detectedH;
              Dobby._persist();
              Dobby._log(`AUTO-CAPTURE: h-token auto-detected: ${detectedH}`);
            }
          }

          const jobIdMatch = decoded.match(/\[jobId\]=(\d+)/);
          const xMatch = decoded.match(/\[x\]=(\d+)/);
          const yMatch = decoded.match(/\[y\]=(\d+)/);

          if (jobIdMatch && xMatch && yMatch && Dobby.settings.autoCaptureEnabled) {
            const jobId = parseInt(jobIdMatch[1], 10);
            const x = parseInt(xMatch[1], 10);
            const y = parseInt(yMatch[1], 10);

            if (Dobby.settings.autoCaptureNoDuplicates) {
              const exists = Dobby.addedJobs.some((j) => j.id === jobId && j.x === x && j.y === y);
              if (exists) {
                Dobby._log(`AUTO-CAPTURE: Skipped duplicate job ${jobId} at (${x},${y})`);
                return origSend.apply(this, arguments);
              }
            }

            const jp = new JobPrototype(x, y, jobId);
            try {
              const feat = Dobby.checkIfFeatured(x, y, jobId);
              jp.silver = feat.silver;
              jp.gold = feat.gold;
            } catch {}

            jp.stopMotivation = Dobby.settings.autoCaptureDefaultStopMot || 75;
            jp.set = Dobby.settings.autoCaptureDefaultSet ?? -2;
            jp.repeatTotal = 0;
            jp.repeatRemaining = 0;

            Dobby.addedJobs.push(jp);
            Dobby._persist();

            const jobName = Dobby.getJobName(jobId);
            Dobby._log(`AUTO-CAPTURE: Added "${jobName}" (id:${jobId}) at (${x},${y})`);

            if (Dobby.settings.autoCaptureNotify) {
              safeUserMsg(`✅ Auto-captured: ${jobName}`, window.UserMessage?.TYPE_HINT);
            }

            if (Dobby.win && Dobby.ui.tab === 'chosen') {
              Dobby.render();
            }
          }
        }
      }

      if (url.includes('window=town') && url.includes('mode=get_town')) {
        xhr.addEventListener('load', function () {
          saveTownFromResponseText(xhr.responseText || '');
          if (Dobby.win && Dobby.ui.tab === 'towns') {
            Dobby.render();
          }
        });
      }

      return origSend.apply(this, arguments);
    };

    if (typeof origFetch === 'function') {
      window.fetch = async function (resource, init) {
        let url = '';
        let method = 'GET';
        let bodyStr = '';

        if (typeof resource === 'string') {
          url = resource;
        } else if (resource instanceof Request) {
          url = resource.url || '';
          method = (resource.method || 'GET').toUpperCase();
        }

        if (init) {
          if (init.method) method = (init.method || method).toUpperCase();
          bodyStr = normalizeBody(init.body);
        }

        const response = await origFetch.apply(this, arguments);

        try {
          if (response && response.ok) {
            if (url.includes('window=town') && url.includes('mode=get_town')) {
              try {
                const clone = response.clone();
                const data = await clone.json();
                Dobby.autoSaveTown(data);
                if (Dobby.win && Dobby.ui.tab === 'towns') {
                  Dobby.render();
                }
              } catch {}
            }
            if (method === 'POST' && url.includes('window=task') && url.includes('action=add')) {
              const decoded = decodeURIComponent(bodyStr);
              if (decoded.includes('[type]=town') && decoded.includes('[taskType]=walk')) {
                saveTownFromBody(bodyStr);
              }
              const hMatch = url.match(/[?&]h=([a-zA-Z0-9]+)/i);
              if (hMatch && hMatch[1] && Dobby.settings.hToken !== hMatch[1]) {
                Dobby.settings.hToken = hMatch[1];
                Dobby._persist();
                Dobby._log(`AUTO-CAPTURE: h-token auto-detected: ${hMatch[1]}`);
              }
            }
          }
        } catch {}

        return response;
      };
    }

    Dobby._log('AUTO-CAPTURE: XHR interceptor installed.');
  };
}

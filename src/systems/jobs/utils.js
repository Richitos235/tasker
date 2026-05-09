import { Dobby } from '../../core/state.js';
import { sleep, safeUserMsg } from '../../core/utils.js';

export function installJobUtils() {
  Dobby.getJobMotivation = function (job) {
    return new Promise((resolve) => {
      Ajax.get('job', 'job', { jobId: job.id, x: job.x, y: job.y }, function (r) {
        if (r?.error && String(r.msg).toLowerCase().includes('session')) {
          Dobby._log('❌ SESSION EXPIRED: Stopping script.');
          safeUserMsg('Invalid session! Refresh the page to capture a new token.', window.UserMessage?.TYPE_ERROR);
          Dobby.stop();
          resolve(0);
          return;
        }
        resolve((r?.motivation || 0) * 100);
      });
    });
  };

  Dobby.executeWalkToTown = async function (townId) {
    return new Promise((resolve) => {
      Ajax.remoteCall('task', 'add', {
        tasks: [{
          unitId: townId,
          type: 'town',
          taskType: 'walk'
        }]
      }, function(resp) {
        if (resp.error) {
          Dobby._log(`❌ Error walking to town: ${resp.error}`);
          return resolve(0);
        }

        let walkDurationSeconds = 0;
        try {
          const taskObj = resp.tasks[0].task.data_obj;
          const wayData = taskObj.wayData;
          
          if (wayData) {
            const dateStart = wayData.date_start;
            const dateDone = wayData.date_done;
            walkDurationSeconds = dateDone - dateStart;
            
            const logMsg = `Walking to town... Travel time: ${walkDurationSeconds.toFixed(1)}s`;
            Dobby._log(logMsg);
            safeUserMsg(logMsg, window.UserMessage?.TYPE_SUCCESS);
          } else {
            Dobby._log("Already in town. No travel time needed.");
            safeUserMsg("Already at destination town.", window.UserMessage?.TYPE_HINT);
          }
        } catch (err) {
          Dobby._log("Could not parse walk duration from server reply.");
        }

        resolve(walkDurationSeconds);
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

  Dobby._queueLen = () => (TaskQueue?.queue ? TaskQueue.queue.length : 0);
}
import { Dobby } from '../core/state.js';
import { JobPrototype } from '../core/prototypes.js';
import { h, safeUserMsg, clamp, sleep } from '../core/utils.js';

export function installUI() {
  Dobby._injectCSS = function () {
    if (document.getElementById('dobby2_style')) return;
    const css = `
#dobby2_root { font-family: Arial, sans-serif; color: #e9eef5; }
#dobby2_root * { box-sizing: border-box; }
#dobby2_root .d2_header { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
#dobby2_root .d2_tabs { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
#dobby2_root .d2_tab { padding: 7px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: rgba(20,24,32,.72); color: #e9eef5; cursor: pointer; transition: background .15s ease, transform .05s ease; }
#dobby2_root .d2_tab:hover { background: rgba(40,48,64,.80); }
#dobby2_root .d2_tab:active { transform: translateY(1px); }
#dobby2_root .d2_tab.d2_active { background: rgba(90,120,220,.35); border-color: rgba(120,160,255,.35); }
#dobby2_root .d2_shell { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 12px; background: rgba(10,12,18,.86); box-shadow: 0 10px 30px rgba(0,0,0,.35); }
#dobby2_root .d2_content { max-height: 500px; overflow: auto; padding-right: 6px; }
#dobby2_root input, #dobby2_root select, #dobby2_root button, #dobby2_root textarea { color: #e9eef5; background: rgba(20,24,32,.78); border: 1px solid rgba(255,255,255,.14); border-radius: 10px; padding: 7px 10px; outline: none; }
#dobby2_root input::placeholder, #dobby2_root textarea::placeholder { color: rgba(233,238,245,.55); }
#dobby2_root button { cursor: pointer; }
#dobby2_root button:hover { background: rgba(40,48,64,.85); }
#dobby2_root button:active { transform: translateY(1px); }
#dobby2_root table { width: 100%; border-collapse: collapse; }
#dobby2_root th, #dobby2_root td { padding: 8px 6px; border-top: 1px solid rgba(255,255,255,.10); vertical-align: top; }
#dobby2_root thead th { position: sticky; top: 0; background: rgba(10,12,18,.95); z-index: 2; }
#dobby2_root .d2_muted { opacity: .8; }
#dobby2_root .d2_row_hi { background: rgba(242,201,76,.10); }
#dobby2_root .d2_toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
#dobby2_root .d2_right { margin-left:auto; opacity:.9; }
#dobby2_root .d2_pill { padding: 5px 10px; border-radius: 999px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.10); }
#dobby2_root .d2_split { display:grid; grid-template-columns: 1fr 320px; gap: 12px; align-items:start; }
#dobby2_root .d2_card { border: 1px solid rgba(255,255,255,.10); border-radius: 14px; background: rgba(20,24,32,.55); padding: 10px; }
#dobby2_root .d2_log_box { width: 100%; height: 320px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; line-height: 1.4; white-space: pre; overflow: auto; }
#dobby2_root .d2_drag_handle { cursor: grab; font-size: 18px; padding: 2px 6px; user-select: none; opacity: 0.6; transition: opacity .15s; }
#dobby2_root .d2_drag_handle:hover { opacity: 1; }
#dobby2_root .d2_drag_handle:active { cursor: grabbing; }
#dobby2_root tr.d2_dragging { opacity: 0.4; background: rgba(90,120,220,.15); }
#dobby2_root tr.d2_drag_over { border-top: 2px solid rgba(120,160,255,.7); }
#dobby2_root .d2_order_btns { display:flex; flex-direction:column; gap:2px; }
#dobby2_root .d2_order_btn { padding: 2px 6px; font-size: 11px; min-width: 24px; line-height: 1; }
#dobby2_root .d2_capture_badge { display:inline-block; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: bold; }
#dobby2_root .d2_capture_on { background: rgba(72,187,120,.3); border: 1px solid rgba(72,187,120,.5); color: #68d391; }
#dobby2_root .d2_capture_off { background: rgba(245,101,101,.2); border: 1px solid rgba(245,101,101,.4); color: #fc8181; }
#dobby2_root .d2_bank_badge { display:inline-block; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: bold; background: rgba(246,173,85,.3); border: 1px solid rgba(246,173,85,.5); color: #f6ad55; }
    `.trim();
    const style = document.createElement('style');
    style.id = 'dobby2_style';
    style.textContent = css;
    document.head.appendChild(style);
  };

  Dobby.openUI = function () {
    try {
      Dobby._injectCSS();
      let alive = false;
      try {
        const md = Dobby.win && Dobby.win.getMainDiv && Dobby.win.getMainDiv();
        alive = !!(md && md[0] && document.body.contains(md[0]));
      } catch { alive = false; }
      if (!alive) Dobby.win = null;
      if (Dobby.win) {
        try { Dobby.win.show && Dobby.win.show(); } catch {}
        Dobby.render();
        return;
      }
      Dobby.win = wman.open('dobby2_full').setResizeable(true).setMinSize(820, 560).setSize(900, 700).setMiniTitle('Tasker');
      try {
        if (Dobby.win.events && typeof Dobby.win.events === 'function') {
          Dobby.win.events().bind && Dobby.win.events().bind('close', () => { Dobby.win = null; });
        }
      } catch {}
      Dobby.win.appendToContentPane($(`<div id="dobby2_root" style="padding:10px;"></div>`));
      Dobby.render();
    } catch (e) {
      console.log('[Tasker] openUI failed', e);
      Dobby.win = null;
    }
  };

  Dobby.render = function () {
    const root = $('#dobby2_root');
    if (!root.length) return;

    if (Dobby.ui.tab === 'stats') Dobby.ui.tab = 'jobs';
    const tab = Dobby.ui.tab;
    const captureStatus = Dobby.settings.autoCaptureEnabled
      ? '<span class="d2_capture_badge d2_capture_on">⚡ Capture ON</span>'
      : '<span class="d2_capture_badge d2_capture_off">Capture OFF</span>';
    const bankStatus = Dobby.autoBank.inProgress
      ? '<span class="d2_bank_badge">🏦 Banking...</span>'
      : (Dobby.settings.autoBankEnabled ? '<span class="d2_bank_badge">🏦 Bank ON</span>' : '');

    root.html(`
      <div class="d2_header">
        <div class="d2_tabs">
          <button class="d2_tab ${tab === 'jobs' ? 'd2_active' : ''}" data-tab="jobs">Jobs</button>
          <button class="d2_tab ${tab === 'chosen' ? 'd2_active' : ''}" data-tab="chosen">Chosen (${Dobby.addedJobs.length})</button>
          <button class="d2_tab ${tab === 'towns' ? 'd2_active' : ''}" data-tab="towns">Towns (${(Dobby.townBookmarks||[]).length})</button>
          <button class="d2_tab ${tab === 'sets' ? 'd2_active' : ''}" data-tab="sets">Sets</button>
          <button class="d2_tab ${tab === 'consum' ? 'd2_active' : ''}" data-tab="consum">Consumables</button>
          <button class="d2_tab ${tab === 'settings' ? 'd2_active' : ''}" data-tab="settings">Settings</button>
          <button class="d2_tab ${tab === 'log' ? 'd2_active' : ''}" data-tab="log">Log</button>
        </div>

        ${captureStatus}
        ${bankStatus}

        <div class="d2_right d2_pill">
          State: <b>${h(Dobby.currentState)}</b> | Running: <b>${Dobby.isRunning ? 'YES' : 'NO'}</b>
        </div>
      </div>

      <div class="d2_shell">
        <div class="d2_content" id="d2_content"></div>
      </div>
    `);

    root.off('click.d2').on('click.d2', '.d2_tab', function () {
      Dobby.ui.tab = $(this).data('tab');
      Dobby.render();
    });

    const content = root.find('#d2_content');
    if (tab === 'jobs') content.html(Dobby.renderJobsTab());
    if (tab === 'chosen') content.html(Dobby.renderChosenTab());
    if (tab === 'towns') content.html(Dobby.renderTownsTab());
    if (tab === 'sets') content.html(Dobby.renderSetsTab());
    if (tab === 'consum') content.html(Dobby.renderConsumTab());
    if (tab === 'settings') content.html(Dobby.renderSettingsTab());
    if (tab === 'log') content.html(Dobby.renderLogTab());

    root.off('click.center').on('click.center', '.d2_center_btn', function () {
      const x = parseInt($(this).data('x'), 10);
      const y = parseInt($(this).data('y'), 10);
      try { GameMap.center(x, y); } catch {}
    });

    root.off('keyup.filter').on('keyup.filter', '.d2_filter', function () {
      Dobby.ui.filter = $(this).val() || '';
      Dobby.render();
    });

    root.off('change.filters').on('change.filters', '.d2_fchk', function () {
      const k = $(this).data('k');
      Dobby.ui[k] = !!$(this).prop('checked');
      Dobby.render();
    });

    root.off('click.addjob').on('click.addjob', '.d2_add_job', function () {
      const x = parseInt($(this).data('x'), 10);
      const y = parseInt($(this).data('y'), 10);
      const id = parseInt($(this).data('id'), 10);
      const j = Dobby.allJobs.find((a) => a.id === id && a.x === x && a.y === y);
      if (!j) return;
      const jp = new JobPrototype(j.x, j.y, j.id);
      jp.silver = !!j.silver; jp.gold = !!j.gold;
      jp.stopMotivation = 75; jp.set = -2;
      jp.repeatTotal = 0; jp.repeatRemaining = 0;
      Dobby.addedJobs.push(jp);
      Dobby._persist();
      Dobby._log(`Added job: "${Dobby.getJobName(id)}" (${x},${y})`);
      safeUserMsg(`Added: ${Dobby.getJobName(id)}`, window.UserMessage?.TYPE_HINT);
      Dobby.render();
    });

    root.off('click.rmjob').on('click.rmjob', '.d2_rm_job', function () {
      const idx = parseInt($(this).data('idx'), 10);
      if (!Number.isFinite(idx)) return;
      Dobby.addedJobs.splice(idx, 1);
      Dobby.currentJobIndex = clamp(Dobby.currentJobIndex, 0, Math.max(0, Dobby.addedJobs.length - 1));
      Dobby._persist();
      Dobby.render();
    });

    root.off('change.stopmot').on('change.stopmot', '.d2_stopmot', function () {
      const idx = parseInt($(this).data('idx'), 10);
      const v = parseInt($(this).val(), 10);
      if (!Number.isFinite(idx) || !Number.isFinite(v) || !Dobby.addedJobs[idx]) return;
      Dobby.addedJobs[idx].stopMotivation = clamp(v, 0, 100);
      Dobby._persist();
    });

    root.off('change.repeats').on('change.repeats', '.d2_repeats', function () {
      const idx = parseInt($(this).data('idx'), 10);
      const v = parseInt($(this).val(), 10);
      if (!Number.isFinite(idx) || !Dobby.addedJobs[idx]) return;
      const tot = Math.max(0, Number.isFinite(v) ? v : 0);
      const job = Dobby.addedJobs[idx];
      job.repeatTotal = tot;
      job.repeatRemaining = tot > 0 ? tot : 0;
      Dobby._persist();
      Dobby.render();
    });

    root.off('click.route').on('click.route', '.d2_route', function () {
      Dobby.createRoute();
      Dobby._persist();
      Dobby._log('Route created (nearest-neighbour).');
      Dobby.render();
      safeUserMsg('Route created.', window.UserMessage?.TYPE_HINT);
    });

    root.off('click.start').on('click.start', '.d2_start', function () { Dobby.start(); });
    root.off('click.stop').on('click.stop', '.d2_stop', function () { Dobby.stop(); });

    root.off('click.clear').on('click.clear', '.d2_clear', function () {
      Dobby.stop();
      Dobby.addedJobs = [];
      Dobby.currentJobIndex = 0;
      Dobby._persist();
      Dobby._log('Cleared all chosen jobs.');
      Dobby.render();
      safeUserMsg('Cleared.', window.UserMessage?.TYPE_HINT);
    });

    root.off('click.manaddbtn').on('click.manaddbtn', '.d2_manual_add_btn', function () {
      $('#d2_manual_add_box').toggle();
    });
    root.off('click.mancancel').on('click.mancancel', '.d2_manual_cancel', function () {
      $('#d2_manual_add_box').hide();
    });
    root.off('click.mansave').on('click.mansave', '.d2_manual_save', function () {
      const name = $('#d2_manual_name').val().trim();
      const rawData = $('#d2_manual_data').val();
      const data = decodeURIComponent(rawData);

      const typeMatch = data.match(/[?&]tasks\[0\]\[type\]=(\w+)/);
      const taskTypeMatch = data.match(/[?&]tasks\[0\]\[taskType\]=(\w+)/);
      const unitIdMatch = data.match(/[?&]tasks\[0\]\[unitId\]=(\d+)/);
      const hMatch = data.match(/[?&]h=([a-zA-Z0-9]+)/);

      if (typeMatch && taskTypeMatch && unitIdMatch && typeMatch[1] === 'town' && taskTypeMatch[1] === 'walk') {
        const unitId = parseInt(unitIdMatch[1], 10);
        const townName = name || `Town ${unitId}`;
        if (hMatch) {
          Dobby.settings.hToken = hMatch[1];
          Dobby._persist();
        }
        const task = new JobPrototype(0, 0, 0);
        task.isTownWalk = true;
        task.unitId = unitId;
        task.name = `Walk to ${townName}`;
        task.type = 'town';
        task.taskType = 'walk';
        task.repeatTotal = 1;
        task.repeatRemaining = 1;
        task.stopMotivation = 0;
        task.silver = false;
        task.gold = false;
        task.x = 0;
        task.y = 0;
        task.id = 0;
        Dobby.addedJobs.push(task);
        Dobby._persist();
        Dobby._log(`Manual added town walk: "${task.name}"`);
        safeUserMsg(`Added: ${task.name}`, window.UserMessage?.TYPE_HINT);
        $('#d2_manual_name').val('');
        $('#d2_manual_data').val('');
        $('#d2_manual_add_box').hide();
        Dobby.render();
        return;
      }

      const jid = data.match(/[?&]tasks\[0\]\[jobId\]=(\d+)/);
      const jx = data.match(/[?&]tasks\[0\]\[x\]=(\d+)/);
      const jy = data.match(/[?&]tasks\[0\]\[y\]=(\d+)/);
      if (!jid || !jx || !jy) {
        safeUserMsg('Invalid data format!', window.UserMessage?.TYPE_ERROR);
        return;
      }
      const jp = new JobPrototype(parseInt(jx[1], 10), parseInt(jy[1], 10), parseInt(jid[1], 10), name);
      jp.silver = false; jp.gold = false;
      jp.stopMotivation = 75; jp.set = -2;
      jp.repeatTotal = 0; jp.repeatRemaining = 0;
      Dobby.addedJobs.push(jp);
      Dobby._persist();
      const displayNm = name || `Job ${jp.id}`;
      Dobby._log(`Manual added job: "${displayNm}" (${jp.x},${jp.y})`);
      safeUserMsg(`Added: ${displayNm}`, window.UserMessage?.TYPE_HINT);
      $('#d2_manual_name').val('');
      $('#d2_manual_data').val('');
      $('#d2_manual_add_box').hide();
      Dobby.render();
    });

    root.off('click.townsave').on('click.townsave', '.d2_town_save', function () {
      const rawData = $('#d2_town_data').val().trim();
      if (!rawData) {
        safeUserMsg('Enter town JSON first.', window.UserMessage?.TYPE_ERROR);
        return;
      }
      let town;
      try {
        town = JSON.parse(rawData);
      } catch (e) {
        safeUserMsg('Invalid JSON format.', window.UserMessage?.TYPE_ERROR);
        return;
      }
      const townId = Number(town.town_id ?? town.id ?? town.unitId);
      const townName = town.town_name || town.name || `Town ${townId}`;
      const townX = Number(town.town_x ?? town.x ?? town.coordX ?? town.coord_x);
      const townY = Number(town.town_y ?? town.y ?? town.coordY ?? town.coord_y);
      if (!Number.isFinite(townId) || !townName || !Number.isFinite(townX) || !Number.isFinite(townY)) {
        safeUserMsg('Town JSON must include town_id, town_name, town_x, and town_y.', window.UserMessage?.TYPE_ERROR);
        return;
      }
      if (!Array.isArray(Dobby.townBookmarks)) Dobby.townBookmarks = [];
      if (Dobby.townBookmarks.some((t) => Number(t.town_id) === townId)) {
        safeUserMsg('Town already bookmarked.', window.UserMessage?.TYPE_HINT);
        return;
      }
      Dobby.townBookmarks.push({ town_id: townId, town_name: townName, town_x: townX, town_y: townY });
      Dobby._persist();
      Dobby._log(`Town bookmarked: ${townName} (${townX},${townY})`);
      safeUserMsg('Town bookmarked.', window.UserMessage?.TYPE_HINT);
      $('#d2_town_data').val('');
      Dobby.render();
    });

    root.off('click.townqueue').on('click.townqueue', '.d2_town_queue', function () {
      const idx = parseInt($(this).data('idx'), 10);
      if (!Number.isFinite(idx) || !Dobby.townBookmarks[idx]) return;
      const town = Dobby.townBookmarks[idx];
      const task = new JobPrototype(0, 0, 0);
      task.isTownWalk = true;
      task.unitId = Number(town.town_id);
      task.name = `Walk to ${town.town_name}`;
      task.type = 'town';
      task.taskType = 'walk';
      task.repeatTotal = 1;
      task.repeatRemaining = 1;
      task.stopMotivation = 0;
      task.silver = false;
      task.gold = false;
      task.x = Number(town.town_x) || 0;
      task.y = Number(town.town_y) || 0;
      task.id = 0;
      Dobby.addedJobs.push(task);
      Dobby._persist();
      Dobby._log(`Queued town walk: ${town.town_name}`);
      safeUserMsg('Town added to queue.', window.UserMessage?.TYPE_HINT);
      Dobby.render();
    });

    root.off('click.towndelete').on('click.towndelete', '.d2_town_delete', function () {
      const idx = parseInt($(this).data('idx'), 10);
      if (!Number.isFinite(idx) || !Dobby.townBookmarks[idx]) return;
      const removed = Dobby.townBookmarks.splice(idx, 1)[0];
      Dobby._persist();
      Dobby._log(`Removed town bookmark: ${removed.town_name}`);
      safeUserMsg('Town bookmark deleted.', window.UserMessage?.TYPE_HINT);
      Dobby.render();
    });

    root.off('click.moveup').on('click.moveup', '.d2_move_up', function () {
      const idx = parseInt($(this).data('idx'), 10);
      if (idx > 0) {
        Dobby._moveJob(idx, idx - 1);
        Dobby.render();
      }
    });
    root.off('click.movedown').on('click.movedown', '.d2_move_down', function () {
      const idx = parseInt($(this).data('idx'), 10);
      if (idx < Dobby.addedJobs.length - 1) {
        Dobby._moveJob(idx, idx + 1);
        Dobby.render();
      }
    });

    root.off('dragstart.reorder').on('dragstart.reorder', '.d2_chosen_row', function (e) {
      const idx = parseInt($(this).data('idx'), 10);
      Dobby._dragIdx = idx;
      $(this).addClass('d2_dragging');
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.setData('text/plain', String(idx));
    });
    root.off('dragend.reorder').on('dragend.reorder', '.d2_chosen_row', function () {
      $(this).removeClass('d2_dragging');
      root.find('.d2_drag_over').removeClass('d2_drag_over');
      Dobby._dragIdx = null;
    });
    root.off('dragover.reorder').on('dragover.reorder', '.d2_chosen_row', function (e) {
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = 'move';
      root.find('.d2_drag_over').removeClass('d2_drag_over');
      $(this).addClass('d2_drag_over');
    });
    root.off('drop.reorder').on('drop.reorder', '.d2_chosen_row', function (e) {
      e.preventDefault();
      const fromIdx = Dobby._dragIdx;
      const toIdx = parseInt($(this).data('idx'), 10);
      root.find('.d2_drag_over').removeClass('d2_drag_over');
      if (fromIdx !== null && fromIdx !== toIdx) {
        Dobby._moveJob(fromIdx, toIdx);
        Dobby.render();
      }
    });

    root.off('click.consrefresh').on('click.consrefresh', '.d2_cons_refresh', function () {
      Dobby.findAllConsumables();
      Dobby.render();
    });
    
    // Manual Scan Inventory Button Handler
    root.off('click.consscan').on('click.consscan', '.d2_cons_scan', async function () {
      const $btn = $(this);
      const oldText = $btn.text();
      $btn.text('Scanning...').prop('disabled', true);
      try {
        Dobby.Consumables.scan();
        await sleep(500);
      } finally {
        $btn.text(oldText).prop('disabled', false);
        Dobby.render();
      }
    });

    root.off('change.cons').on('change.cons', '.d2_cons_chk', function () {
      const id = parseInt($(this).data('id'), 10);
      const c = Dobby.allConsumables.find((x) => x.id === id);
      if (!c) return;
      c.selected = !!$(this).prop('checked');
      if (c.selected) Dobby.consumableSelectedIds.add(id);
      else Dobby.consumableSelectedIds.delete(id);
    });
    root.off('click.cons_all').on('click.cons_all', '.d2_cons_all', function () {
      Dobby.findAllConsumables();
      for (const c of Dobby.allConsumables) { c.selected = true; Dobby.consumableSelectedIds.add(c.id); }
      Dobby.render();
    });
    root.off('click.cons_none').on('click.cons_none', '.d2_cons_none', function () {
      Dobby.findAllConsumables();
      for (const c of Dobby.allConsumables) c.selected = false;
      Dobby.consumableSelectedIds = new Set();
      Dobby.render();
    });
    root.off('click.cons_save').on('click.cons_save', '.d2_cons_save', function () {
      Dobby._persist();
      safeUserMsg('Consumables selection saved.', window.UserMessage?.TYPE_HINT);
      Dobby.render();
    });
    root.off('click.cons_force').on('click.cons_force', '.d2_cons_force_use', async function () {
      const used = await Dobby.Consumables.tryUse({ force: true });
      if (!used) safeUserMsg('No matching consumable available.', window.UserMessage?.TYPE_HINT);
      Dobby.render();
    });

    root.off('change.settings').on('change.settings', '.d2_setting', function () {
      const k = $(this).data('k');
      if (!k) return;
      const el = this;
      const tag = (el.tagName || '').toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'checkbox') {
        Dobby.settings[k] = !!$(this).prop('checked');
      } else if (type === 'number') {
        Dobby.settings[k] = parseInt($(this).val(), 10);
      } else if (tag === 'textarea') {
        Dobby.settings[k] = String($(this).val() ?? '');
      } else {
        const v = $(this).val();
        Dobby.settings[k] = v == null ? '' : String(v);
      }
      Dobby._persist();
    });

    root.off('click.setsrefresh').on('click.setsrefresh', '.d2_sets_refresh', function () {
      Dobby.refreshSets(() => Dobby.render());
    });
    root.off('change.sets').on('change.sets', '.d2_set', function () {
      const k = $(this).data('k');
      const v = parseInt($(this).val(), 10);
      if (!k || !Number.isFinite(v)) return;
      if (k === 'workingSetId' || k === 'backupSetId') {
        Dobby.settings[k] = v;
      } else {
        Dobby[k] = v;
      }
      Dobby._persist();
    });
    root.off('click.log_clear').on('click.log_clear', '.d2_log_clear', function () {
      Dobby.log.lines = [];
      Dobby.render();
    });
    root.off('click.autobank_manual').on('click.autobank_manual', '.d2_autobank_manual', function () {
      Dobby.autoBank.startBankingSequence('manual');
    });
  };

  Dobby.renderJobsTab = function () {
    const sortKey = Dobby.ui.jobsSort || 'distance';
    const limit = Math.max(50, Math.min(2000, Number(Dobby.ui.jobsLimit) || 500));
    let all = Dobby.getAllUniqueJobs();
    const sorters = {
      distance: (a, b) => (Number(a.distance)||0) - (Number(b.distance)||0),
      money: (a, b) => (Number(b.money)||0) - (Number(a.money)||0),
      xp:    (a, b) => (Number(b.experience)||0) - (Number(a.experience)||0),
      name: (a, b) => Dobby.getDisplayName(a).localeCompare(Dobby.getDisplayName(b)),
    };
    try { all = all.slice().sort(sorters[sortKey] || sorters.distance); } catch {}
    const jobs = all.slice(0, limit);
    const rows = jobs
      .map((j) => {
        const nm = Dobby.getDisplayName(j);
        return `
          <tr>
            <td>${Dobby.getJobIconHTML(j)}</td>
            <td><b>${h(nm)}</b><div class="d2_muted" style="font-size:12px;">(${j.x},${j.y}) id:${j.id}</div></td>
            <td>${j.experience || ''}</td>
            <td>${j.money || ''}</td>
            <td>${j.distance?.formatDuration ? j.distance.formatDuration() : j.distance}</td>
            <td>${j.gold ? 'gold' : j.silver ? 'silver' : '-'}</td>
            <td><button class="d2_add_job" data-x="${j.x}" data-y="${j.y}" data-id="${j.id}">Add</button></td>
          </tr>
        `;
      })
      .join('');
    return `
      <div class="d2_toolbar">
        <input class="d2_filter" value="${h(Dobby.ui.filter)}" placeholder="Filter job name..." style="min-width:280px;">
        <label style="display:flex;gap:6px;align-items:center;"><input class="d2_fchk" data-k="onlySilver" type="checkbox" ${Dobby.ui.onlySilver ? 'checked' : ''}> Only silver</label>
        <label style="display:flex;gap:6px;align-items:center;"><input class="d2_fchk" data-k="noSilver" type="checkbox" ${Dobby.ui.noSilver ? 'checked' : ''}> No silver</label>
        <label style="display:flex;gap:6px;align-items:center;"><input class="d2_fchk" data-k="onlyCenter" type="checkbox" ${Dobby.ui.onlyCenter ? 'checked' : ''}> Center jobs</label>
        <span style="display:flex;gap:6px;align-items:center;">
          <span class="d2_muted">Sort:</span>
          <select class="d2_jobs_sort">
            <option value="money"   ${sortKey==='money'?'selected':''}>💰 Pay</option>
            <option value="xp"      ${sortKey==='xp'?'selected':''}>✨ XP</option>
            <option value="distance"${sortKey==='distance'?'selected':''}>📏 Distance</option>
            <option value="name"    ${sortKey==='name'?'selected':''}>🔤 Name</option>
          </select>
        </span>
        <span class="d2_right d2_pill">Showing: <b>${jobs.length}</b> / ${all.length}</span>
      </div>
      <table>
        <thead>
          <tr style="text-align:left;">
            <th>Icon</th><th>Job</th><th>XP</th><th>$</th><th>Distance</th><th>Type</th><th></th>
          </tr>
        </thead>
        <tbody>${rows || ''}</tbody>
      </table>
    `;
  };

  Dobby.renderChosenTab = function () {
    const rows = Dobby.addedJobs
      .map((j, idx) => {
        const nm = Dobby.getDisplayName(j);
        const hi = idx === Dobby.currentJobIndex ? 'class="d2_row_hi"' : '';
        const tot = Number(j.repeatTotal || 0);
        const rem = tot > 0 ? Number(j.repeatRemaining ?? tot) : 0;
        const rptTxt = tot > 0 ? `${rem}/${tot}` : '∞';

        if (j.isTownWalk) {
          return `
            <tr ${hi} class="d2_chosen_row" data-idx="${idx}" draggable="true">
              <td style="width:40px; text-align:center;">
                <div class="d2_drag_handle">⠿</div>
                <div class="d2_order_btns">
                  <button class="d2_order_btn d2_move_up" data-idx="${idx}">▲</button>
                  <button class="d2_order_btn d2_move_down" data-idx="${idx}">▼</button>
                </div>
              </td>
              <td>🏙️</td>
              <td><b>${h(nm)}</b><div class="d2_muted" style="font-size:12px;">Town walk</div></td>
              <td colspan="2" style="text-align:center;"><span class="d2_muted">Walk task</span></td>
              <td><button class="d2_rm_job" data-idx="${idx}" style="color:#fc8181;">✕</button></td>
            </tr>
          `;
        }

        return `
          <tr ${hi} class="d2_chosen_row" data-idx="${idx}" draggable="true">
            <td style="width:40px; text-align:center;">
              <div class="d2_drag_handle">⠿</div>
              <div class="d2_order_btns">
                <button class="d2_order_btn d2_move_up" data-idx="${idx}">▲</button>
                <button class="d2_order_btn d2_move_down" data-idx="${idx}">▼</button>
              </div>
            </td>
            <td>${Dobby.getJobIconHTML(j)}</td>
            <td><b>${h(nm)}</b><div class="d2_muted" style="font-size:12px;">(${j.x},${j.y}) id:${j.id}</div></td>
            <td>
              <input class="d2_stopmot" data-idx="${idx}" type="number" min="0" max="100" value="${j.stopMotivation}" style="width:80px;">
            </td>
            <td>
              <input class="d2_repeats" data-idx="${idx}" type="number" min="0" max="999999" value="${tot}" style="width:90px;">
              <div class="d2_muted" style="font-size:11px;margin-top:4px;"><b>${h(rptTxt)}</b></div>
            </td>
            <td><button class="d2_rm_job" data-idx="${idx}" style="color:#fc8181;">✕</button></td>
          </tr>
        `;
      })
      .join('');
    return `
      <div class="d2_toolbar">
        <button class="d2_route">🗺 Route</button>
        <button class="d2_start" style="background:rgba(72,187,120,.4);">▶ Start</button>
        <button class="d2_stop" style="background:rgba(245,101,101,.3);">⏹ Stop</button>
        <button class="d2_clear">🗑 Clear</button>
        <button class="d2_manual_add_btn">✏ Manual Add</button>
        <span class="d2_right d2_pill">Current: <b>${Dobby.currentJobIndex + 1}</b> / ${Dobby.addedJobs.length}</span>
      </div>
      <div id="d2_manual_add_box" class="d2_card" style="display:none; margin-bottom:12px;">
        <input id="d2_manual_name" placeholder="Custom Name" style="width:100%; margin-bottom:8px;">
        <textarea id="d2_manual_data" placeholder="Paste job data here..." style="width:100%; height:80px; margin-bottom:8px;"></textarea>
        <button class="d2_manual_save">Save</button>
        <button class="d2_manual_cancel">Cancel</button>
      </div>
      <table>
        <thead>
          <tr style="text-align:left;">
            <th style="width:40px;">Order</th><th>Icon</th><th>Job</th><th>RotMot%</th><th>Repeats</th><th></th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="6" class="d2_muted" style="padding:12px;">No jobs added.</td></tr>`}</tbody>
      </table>
    `;
  };

  Dobby.renderTownsTab = function () {
    if (!Array.isArray(Dobby.townBookmarks)) Dobby.townBookmarks = [];
    const rows = Dobby.townBookmarks.map((town, idx) => `
      <tr>
        <td><b>${h(town.town_name)}</b></td>
        <td>${h(town.town_x)}, ${h(town.town_y)}</td>
        <td><button class="d2_town_queue" data-idx="${idx}">Add to Queue</button></td>
        <td><button class="d2_town_delete" data-idx="${idx}" style="color:#fc8181;">Delete</button></td>
      </tr>
    `).join('');

    return `
      <div class="d2_card" style="margin-bottom:12px;">
        <textarea id="d2_town_data" placeholder='Paste town JSON' style="width:100%; height:80px; margin-bottom:8px;"></textarea>
        <button class="d2_town_save">Add Town</button>
      </div>
      <table>
        <thead>
          <tr style="text-align:left;">
            <th>Name</th><th>Coordinates</th><th>Add to Queue</th><th>Delete</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="4" class="d2_muted" style="padding:12px;">No town bookmarks.</td></tr>`}</tbody>
      </table>
    `;
  };

  function setPick(k, val) {
    const sets = Array.isArray(Dobby.sets) ? Dobby.sets : [];
    const opts = [];
    opts.push(`<option value="-1" ${val === -1 ? 'selected' : ''}>None</option>`);
    for (let i = 0; i < sets.length; i++) {
      opts.push(`<option value="${i}" ${val === i ? 'selected' : ''}>${h(sets[i]?.name || 'Set ' + i)}</option>`);
    }
    return `<select class="d2_set" data-k="${k}" style="min-width:300px;">${opts.join('')}</select>`;
  }

  Dobby.renderSetsTab = function () {
    if (!Array.isArray(Dobby.sets) || Dobby.sets.length === 0) {
      try { Dobby.loadSets(() => {}); } catch {}
      return `<div class="d2_card"><b>👕 Loading equipment sets…</b> <button class="d2_sets_refresh">Refresh</button></div>`;
    }
    return `
      <div class="d2_card" style="max-width:780px;">
        <div style="display:grid;grid-template-columns:220px 1fr;gap:10px;align-items:center;">
          <div><b>Working set</b></div><div>${setPick('workingSetId', Dobby.settings.workingSetId)}</div>
          <div><b>Back Up set</b></div><div>${setPick('backupSetId', Dobby.settings.backupSetId)}</div>
          <div><b>Travel set</b></div><div>${setPick('travelSet', Dobby.travelSet)}</div>
          <div><b>Health set</b></div><div>${setPick('healthSet', Dobby.healthSet)}</div>
          <div><b>Regeneration set</b></div><div>${setPick('regenerationSet', Dobby.regenerationSet)}</div>
        </div>
      </div>
    `;
  };

  Dobby.renderConsumTab = function () {
    const savedCount = Dobby.consumableSelectedIds?.size || 0;
    const total = Dobby.allConsumables.length;
    const s = Dobby.settings;
    const hp = Dobby.Vitals.read('health');
    const en = Dobby.Vitals.read('energy');
    
    const rows = Dobby.allConsumables
      .map((c) => `
          <tr>
            <td><input class="d2_cons_chk" data-id="${c.id}" type="checkbox" ${c.selected ? 'checked' : ''}></td>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                ${c.image ? `<img src="${c.image}" style="width:30px;height:30px;border-radius:8px;">` : ''}
                <div><b>${h(c.name)}</b></div>
              </div>
            </td>
            <td>${c.energy}%</td>
            <td>${c.motivation}%</td>
            <td>${c.health}%</td>
            <td>${c.count}</td>
          </tr>
        `)
      .join('');
      
    return `
      <div class="d2_card" style="margin-bottom:12px; background: rgba(90,120,220,.08);">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div class="d2_card">
            <b>❤️ Health: ${hp.cur}/${hp.max}</b>
            <label style="display:flex; gap:10px; align-items:center; margin-top:8px;">
              <input class="d2_setting" data-k="addHealth" type="checkbox" ${s.addHealth ? 'checked' : ''}> Auto-use
            </label>
            <input class="d2_setting" data-k="useHealthAt" type="number" value="${s.useHealthAt}" style="width:60px; margin-top:4px;"> %
          </div>
          <div class="d2_card">
            <b>⚡ Energy: ${en.cur}/${en.max}</b>
            <label style="display:flex; gap:10px; align-items:center; margin-top:8px;">
              <input class="d2_setting" data-k="addEnergy" type="checkbox" ${s.addEnergy ? 'checked' : ''}> Auto-use
            </label>
            <input class="d2_setting" data-k="useEnergyAt" type="number" value="${s.useEnergyAt}" style="width:60px; margin-top:4px;"> %
          </div>
        </div>
        <div style="margin-top:10px; display:flex; gap:10px;">
          <label><input class="d2_setting" data-k="consumablesAutoUse" type="checkbox" ${s.consumablesAutoUse ? 'checked' : ''}> Enable background auto-use</label>
          <button class="d2_cons_force_use">Use now (force)</button>
        </div>
      </div>

      <div class="d2_toolbar">
        <button class="d2_cons_scan" style="background:rgba(90,120,220,.5);">Scan Inventory</button>
        <button class="d2_cons_all">Select all</button>
        <button class="d2_cons_none">Deselect all</button>
        <button class="d2_cons_save">Save selection</button>
        <span class="d2_right d2_pill">Selected: <b>${savedCount}</b> / ${total}</span>
      </div>
      <div class="d2_card">
        <table>
          <thead>
            <tr style="text-align:left;">
               <th style="width:40px;">Use</th><th>Item</th><th>Energy</th><th>Motiv</th><th>Health</th><th>Count</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="6" class="d2_muted" style="padding:12px;">No consumables found. Click "Scan Inventory" to search.</td></tr>`}</tbody>
        </table>
      </div>
    `;
  };

  Dobby.renderSettingsTab = function () {
    const s = Dobby.settings;
    return `
      <div class="d2_card" style="margin-bottom:12px;">
        <b>h Token:</b> <input class="d2_setting" data-k="hToken" type="text" value="${h(s.hToken || '')}" style="width:300px;">
      </div>
      <div style="display:grid;grid-template-columns: 1fr 1fr; gap:12px;">
        <div class="d2_card">
          <label><input class="d2_setting" data-k="rotateJobs" type="checkbox" ${s.rotateJobs ? 'checked' : ''}> Rotate jobs</label><br>
          <label><input class="d2_setting" data-k="autoCaptureEnabled" type="checkbox" ${s.autoCaptureEnabled ? 'checked' : ''}> Enable Auto-Capture</label>
        </div>
        <div class="d2_card">
          Health stop %: <input class="d2_setting" data-k="healthStop" type="number" value="${s.healthStop}" style="width:60px;"><br>
          Set wear delay: <input class="d2_setting" data-k="setWearDelay" type="number" value="${s.setWearDelay}" style="width:60px;">
        </div>
      </div>
    `;
  };

  Dobby.renderLogTab = function () {
    const text = Dobby.log.lines.join('\n');
    return `
      <div class="d2_toolbar">
        <button class="d2_log_clear">Clear log</button>
      </div>
      <textarea id="d2_log_box" class="d2_log_box" readonly>${h(text)}</textarea>
    `;
  };

  $(document).on('change', '.d2_jobs_sort', function () {
    Dobby.ui.jobsSort = $(this).val();
    Dobby.render();
  });

  Dobby._renderHeaderPill = function () {
    try {
      const root = document.getElementById('dobby2_root');
      if (!root) return;
      const target = root.querySelector('.d2_header .d2_right');
      if (!target) return;
      let pill = root.querySelector('#d2_cd_pill');
      if (!pill) {
        pill = document.createElement('span');
        pill.id = 'd2_cd_pill';
        pill.className = 'd2_pill';
        pill.style.marginLeft = '6px';
        target.parentNode.insertBefore(pill, target);
      }
      const ms = Dobby.Consumables.nextReadyMs();
      pill.textContent = ms > 0 ? `⏱ CD ${Math.ceil(ms / 1000)}s` : '✅ Ready';
    } catch {}
  };
  
  setInterval(() => {
    if (document.getElementById('dobby2_root')) Dobby._renderHeaderPill();
  }, 5000);

  Dobby.createMenuIcon = function () {
    if (document.querySelector('#ui_menubar .d2_menu_icon')) return;
    const div = $('<div class="ui_menucontainer" />');
    const link = $('<div class="menulink d2_menu_icon" title="Tasker" />').css({
      backgroundImage: 'url(../images/map/icons/instantwork.png)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      width: '26px',
      height: '26px',
      cursor: 'pointer',
    });
    link.on('click', () => Dobby.loadJobsFromMap());
    $('#ui_menubar').append(div.append(link).append('<div class="menucontainer_bottom" />'));
  };
}
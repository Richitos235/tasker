import { defaultSettings, searchKeys } from '../config/settings.js';
import { safeUserMsg } from './utils.js';
import { JobPrototype } from './prototypes.js';
export { JobPrototype, ConsumablePrototype } from './prototypes.js';

export const Dobby = (window.Dobby2 = {
  isRunning: false,
  currentState: 'idle',
  _runToken: 0,
  _scheduled: null,
  jobsLoaded: false,
  allJobs: [],
  addedJobs: [],
  allConsumables: [],
  language: 'en_DK',
  money: {
    value: null,
    formatted: '—',
    _interval: null,
    _observer: null,
  },
  consumableSelectedIds: new Set(),
  log: { lines: [], max: 300 },
  currentJobIndex: 0,
  sets: null,
  setsLoading: false,
  travelSet: -1,
  defaultJobSet: -2,
  healthSet: -1,
  regenerationSet: -1,
  backupSet: -1,
  townBookmarks: [],
  settings: { ...defaultSettings },
  statistics: {
    jobsInSession: 0,
    xpInSession: 0,
    totalJobs: 0,
    totalXp: 0,
  },
  win: null,
  ui: {
    tab: 'jobs',
    filter: '',
    onlySilver: false,
    noSilver: false,
    onlyCenter: false,
    jobsSort: 'distance',
    jobsLimit: 500,
  },
  _dragIdx: null,
  searchKeys,
  autoBank: { inProgress: false, lastStart: 0 },
});

// Task logic for town walks
Dobby.addTownWalkTask = function(town) {
  const task = new JobPrototype(0, 0, 0);
  task.isTownWalk = true;
  task.unitId = town.town_id;
  task.name = "Walk to " + town.town_name;
  task.type = "town";
  task.taskType = "walk";
  task.repeatTotal = 1;
  task.repeatRemaining = 1;
  task.stopMotivation = 0;
  task.silver = false;
  task.gold = false;
  task.x = Number.isFinite(Number(town.town_x ?? town.x)) ? Number(town.town_x ?? town.x) : 0;
  task.y = Number.isFinite(Number(town.town_y ?? town.y)) ? Number(town.town_y ?? town.y) : 0;
  task.id = 0;

  Dobby.addedJobs.push(task);
  Dobby._persist();
  Dobby._log(`Added town walk: "${task.name}"`);
  safeUserMsg(`Added: ${task.name}`, window.UserMessage?.TYPE_HINT);
  Dobby.render();
};

Dobby.autoSaveTown = function (townData) {
    if (!Dobby.settings.autoCaptureTowns) return;
    if (!townData) return;
    const townId = Number(townData.town_id ?? townData.id ?? townData.unitId);
    if (!Number.isFinite(townId)) return;

    if (!Array.isArray(Dobby.townBookmarks)) Dobby.townBookmarks = [];
    if (Dobby.townBookmarks.some((t) => Number(t.town_id ?? t.id) === townId)) return;

    const townName = String(townData.town_name ?? townData.name ?? townData.townName ?? `Captured Town ${townId}`);
    const townX = Number(townData.town_x ?? townData.x ?? townData.coordX ?? townData.coord_x ?? 0);
    const townY = Number(townData.town_y ?? townData.y ?? townData.coordY ?? townData.coord_y ?? 0);

    Dobby.townBookmarks.push({
      town_id: townId,
      town_name: townName,
      town_x: Number.isFinite(townX) ? townX : 0,
      town_y: Number.isFinite(townY) ? townY : 0,
    });
    Dobby._persist();
    Dobby._log(`AUTO-CAPTURE: Town captured: ${townName} (${townId})`);
    if (Dobby.settings.autoCaptureNotify) {
      safeUserMsg(`Town '${townName}' captured!`, window.UserMessage?.TYPE_HINT);
    }
    if (Dobby.win && Dobby.ui.tab === 'towns') {
      Dobby.render();
    }
  };

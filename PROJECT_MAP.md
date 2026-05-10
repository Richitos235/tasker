# Tasker Project - Comprehensive API Documentation

## Project Structure Overview

```
src/
├── main.js                 # Entry point - initializes all systems
├── config/
│   └── settings.js        # Default configuration and language keys
├── core/
│   ├── controller.js      # Token & cancellation management
│   ├── http.js            # HTTP request handling
│   ├── logging.js         # Logging system
│   ├── persistence.js     # Cookie & localStorage management
│   ├── prototypes.js      # Class prototypes for data objects
│   ├── state.js           # Main Dobby state object & exports
│   └── utils.js           # Utility functions
├── ui/
│   ├── ui.js              # Main UI rendering & event handling
│   └── townHooks.js       # Town window hooks & automation
├── systems/
│   ├── autoBank.js        # Automatic banking system
│   ├── autoCapture.js     # Automatic job/town capturing
│   ├── consumables.js     # Consumable management & auto-use
│   ├── jobs.js            # Job system management
│   ├── money.js           # Money tracking & DOM monitoring
│   ├── sets.js            # Equipment set management
│   ├── vitals.js          # Health/Energy tracking
│   └── jobs/
│       ├── execution.js   # Job execution engine
│       └── utils.js       # Job-related utilities
```

---

## Core Files

### [main.js](src/main.js)
**Entry point - Initializes all game automation systems**

- **Imports all install* functions** - Sets up logging, HTTP, persistence, jobs, UI
- **window.Dobby = Dobby** - Exposes global Dobby object for console access
- **Init IIFE** - Async initialization sequence:
  - `Dobby.loadLanguage()` - Load user language settings
  - `Dobby.loadSets()` - Load equipment sets
  - `Dobby._installInventoryWatcher()` - Monitor inventory changes
  - `Dobby._loadPersist()` - Restore persisted data
  - `Dobby._ensureRepeatState()` - Initialize repeat counters
  - `Dobby._persist()` - Save current state
  - `Dobby.money.startWatcher()` - Begin money monitoring
  - `Dobby.createMenuIcon()` - Add UI menu button
  - `Dobby._setupAutoCapture()` - Enable automatic capturing
  - `Dobby.Consumables.init()` - Initialize consumable system
  - `Dobby.FAB.install()` - Install floating action button
  - Auto-resume logic if enabled

---

### [src/config/settings.js](src/config/settings.js)
**Configuration constants and language localization**

#### Exported Constants:

**`defaultSettings`** - Default configuration object with properties:
- `rotateJobs: boolean` - Enable job rotation on motivation threshold
- `jobDelayMin: number` - Minimum delay between jobs (seconds)
- `jobDelayMax: number` - Maximum delay between jobs (seconds)
- `setWearDelay: number` - Delay when switching equipment sets
- `healthStop: number` - Health percentage threshold to stop working
- `addEnergy: boolean` - Auto-use consumables for energy
- `addMotivation: boolean` - Auto-use consumables for motivation
- `addHealth: boolean` - Auto-use consumables for health
- `useEnergyAt: number` - Energy percentage threshold for auto-use
- `useHealthAt: number` - Health percentage threshold for auto-use
- `consumablesAutoUse: boolean` - Enable background consumable auto-use
- `consumablesWatcherMs: number` - Frequency of consumable checking (ms)
- `jobStateNudge: boolean` - Open job window to verify state
- `nudgeDelayMs: number` - Delay for job state nudge
- `autoRefreshAfterBatch: boolean` - Refresh page after job batch
- `refreshDelayMs: number` - Delay before page refresh
- `autoResumeAfterRefresh: boolean` - Auto-resume after page reload
- `resumeMaxAgeMinutes: number` - Max age for auto-resume
- `autoBankEnabled: boolean` - Enable automatic banking
- `autoBankThreshold: number` - Money amount to trigger banking
- `autoBankTownId: number` - Target town ID for banking
- `autoBankWalkSet: number` - Equipment set for travel to bank
- `autoBankSafetyCooldownMs: number` - Cooldown between bank runs
- `autoCaptureTowns: boolean` - Auto-capture towns from tasks
- `workingSetId: number` - Equipment set for working
- `backupSetId: number` - Equipment set for labor error recovery
- `autoCaptureEnabled: boolean` - Enable auto-capture of jobs
- `autoCaptureDefaultStopMot: number` - Default stop motivation %
- `autoCaptureDefaultSet: number` - Default equipment set for auto-captured jobs
- `autoCaptureNoDuplicates: boolean` - Skip duplicate jobs
- `autoCaptureNotify: boolean` - Show notifications for captures
- `hToken: string` - Authentication token for API calls

**`searchKeys`** - Localization object with language keys (en_DK, cs_CZ, sk_SK, pl_PL, hu_HU, ro_RO)
- `energy: string` - Energy bonus text
- `energyText: string` - Energy increase text
- `motivation: string` - Work motivation text
- `motivationText: string` - Motivation increase text
- `health: string` - Health bonus text
- `healthText: string` - Health bonus amount text

---

### [src/core/state.js](src/core/state.js)
**Main application state object and exports**

#### Exported Objects & Classes:

**`Dobby`** - Global application state object with structure:
- `isRunning: boolean` - Whether job automation is active
- `currentState: string` - Current state ('idle', 'running', 'walking', 'banking')
- `_runToken: number` - Current execution token
- `_scheduled: number` - Timeout ID for scheduled work
- `jobsLoaded: boolean` - Whether job data loaded
- `allJobs: array` - All available jobs from server
- `addedJobs: array` - User-selected jobs to execute
- `queueList: array` - Queue of tasks to execute
- `allConsumables: array` - All available consumables
- `language: string` - User's game language
- `money: object` - Money tracking object
  - `value: number` - Current money amount
  - `formatted: string` - Formatted money display
  - `_interval: number` - Update interval ID
  - `_observer: MutationObserver` - DOM watcher
- `consumableSelectedIds: Set` - IDs of selected consumables
- `log: object` - Logging object
  - `lines: array` - Log messages (max 300)
  - `max: number` - Max log lines (300)
- `currentJobIndex: number` - Index of current job
- `sets: array` - Equipment sets from server
- `setsLoading: boolean` - Whether sets are loading
- `travelSet: number` - Equipment set ID for travel
- `defaultJobSet: number` - Default equipment set for jobs
- `healthSet: number` - Equipment set for health recovery
- `regenerationSet: number` - Equipment set for regen
- `backupSet: number` - Equipment set for backup
- `townBookmarks: array` - Saved town locations
- `settings: object` - Current settings (from defaultSettings)
- `statistics: object` - Session & lifetime statistics
  - `jobsInSession: number`
  - `xpInSession: number`
  - `totalJobs: number`
  - `totalXp: number`
- `win: object` - UI window reference (wman window)
- `ui: object` - UI state
  - `tab: string` - Current tab ('jobs', 'chosen', 'queue', 'towns', 'sets', 'consum', 'settings', 'log')
  - `filter: string` - Job filter text
  - `onlySilver: boolean` - Show only silver jobs
  - `noSilver: boolean` - Hide silver jobs
  - `onlyCenter: boolean` - Show only center jobs
  - `jobsSort: string` - Sort key ('distance', 'money', 'xp', 'name')
  - `jobsLimit: number` - Display limit (default 500)
- `_dragIdx: number` - Dragged job index (for reordering)
- `searchKeys: object` - Language localization keys
- `autoBank: object` - Auto-bank state
  - `inProgress: boolean` - Banking in progress
  - `lastStart: number` - Last banking start timestamp

#### Methods (added by install functions):

**State Management:**
- `Dobby.addTownWalkTask(town)` - Add town walk task to queue
- `Dobby.autoSaveTown(townData)` - Auto-capture town from game data

**`JobPrototype`** - Class for job objects with properties:
- `x, y` - Job coordinates
- `id` - Job ID
- `customName` - User-defined name
- `silver, gold` - Job rarity flags
- `distance, experience, money, motivation` - Job stats
- `stopMotivation` - Stop working at this motivation %
- `repeatTotal, repeatRemaining` - Repeat counters
- `set` - Equipment set for job
- `calculateDistance()` - Calculate distance from current position

**`ConsumablePrototype`** - Class for consumable items with properties:
- `id, image, name` - Item identification
- `energy, motivation, health` - Bonus percentages
- `selected` - Whether user selected this consumable
- `count` - Number in inventory
- `invId` - Inventory ID

---

### [src/core/controller.js](src/core/controller.js)
**Token & execution control system**

#### Exported Function:
**`installController()`** - Installs controller methods on Dobby:

- **`Dobby._cancel()`** - Cancel scheduled timeout
  - Clears `Dobby._scheduled`
  - Resets token tracking

- **`Dobby._newToken()`** - Generate new execution token
  - Increments `Dobby._runToken`
  - Cancels previous scheduled work
  - Returns new token for this execution

- **`Dobby._alive(token: number): boolean`** - Check if token is current
  - Returns true if running and token matches current token
  - Used to abort stale async operations

---

### [src/core/http.js](src/core/http.js)
**HTTP request & API communication**

#### Exported Function:
**`installHttp()`** - Installs HTTP methods on Dobby:

- **`Dobby._post(url, body): Promise<object>`** - Make POST request
  - Handles fetch with credentials
  - Auto-detects JSON vs text responses
  - Detects session expiration errors
  - Stops automation if session invalid
  - Returns `{ error: boolean, msg?: string, ...data }`

- **`Dobby._withH(path): string`** - Add h-token to URL
  - Takes relative path like `window=task&action=add`
  - Returns full URL with h-token parameter
  - Used for authenticated API calls

---

### [src/core/logging.js](src/core/logging.js)
**Logging system with timestamping**

#### Exported Function:
**`installLogging()`** - Installs logging methods on Dobby:

- **`Dobby._log(msg: string)`** - Add timestamped log message
  - Adds timestamp in HH:MM:SS format
  - Stores in `Dobby.log.lines` (max 300 messages)
  - Auto-scrolls log in UI if log tab open
  - Called by all systems for debugging

---

### [src/core/persistence.js](src/core/persistence.js)
**Cookie & localStorage persistence**

#### Exported Function:
**`installPersistence()`** - Installs persistence methods on Dobby:

- **`Dobby._saveForReload()`** - Save state for page reload
  - Saves to cookies (dobby2_temp, dobby2_perm)
  - Temporary cookie expires in 1 day
  - Permanent cookie expires in 3650 days
  - Serializes: addedJobs, queueList, sets choices, bookmarks

- **`Dobby._loadAfterReload(): boolean`** - Restore state after reload
  - Reads from localStorage (dobby2_state)
  - Checks max age (default 10 minutes)
  - Restores jobs, queue, sets, bookmarks, consumables
  - Returns true if successfully restored

- **`Dobby._persist()`** - Persist current state to cookies
  - Called frequently to save progress
  - Serializes jobs, queue, bookmarks, stats
  - Stores settings and consumable selections

- **`Dobby._loadPersist()`** - Load persisted data from cookies
  - Reads dobby2_perm cookie
  - Restores settings, statistics, consumable selections
  - Called on initialization

---

### [src/core/prototypes.js](src/core/prototypes.js)
**Class definitions for data objects**

#### Exported Classes:

**`JobPrototype`** - Class constructor for job objects:
```javascript
new JobPrototype(x, y, id, customName)
```
- Properties: x, y, id, customName, silver, gold, distance, experience, money, motivation, stopMotivation, repeatTotal, repeatRemaining, set
- `calculateDistance()` - Uses GameMap.calcWayTime to set distance

**`ConsumablePrototype`** - Class constructor for consumables:
```javascript
new ConsumablePrototype(id, image, name)
```
- Properties: id, energy, motivation, health, selected, image, count, name, invId
- All values initialized to defaults (0 or false)

---

### [src/core/utils.js](src/core/utils.js)
**Utility functions and helpers**

#### Exported Functions & Objects:

- **`sleep(ms): Promise`** - Async sleep
  - Returns promise that resolves after ms milliseconds
  - Used for delays in async flows

- **`now(): number`** - Get current timestamp
  - Returns `Date.now()`
  - Quick reference for timing

- **`clamp(value, min, max): number`** - Clamp value to range
  - Ensures value stays between min and max
  - Used for input validation

- **`h(s): string`** - HTML escape string
  - Escapes: & < > " '
  - Prevents XSS when inserting into DOM

- **`safeUserMsg(text, type)`** - Show user notification
  - Uses game's UserMessage if available
  - Falls back to console.log
  - Types: TYPE_HINT, TYPE_ERROR, TYPE_SUCCESS

**`Cookie`** - Cookie management object:
- `Cookie.get(name): string | null` - Get cookie value
- `Cookie.set(name, value, expiresDate)` - Set cookie with expiration
- `Cookie.del(name)` - Delete cookie

- **`waitForBagReady(cb, timeoutMs): void`** - Wait for inventory system
  - Polls for window.Bag.search availability
  - Calls callback when ready
  - Times out after 60s by default

- **`waitForTW(): Promise<boolean>`** - Wait for game systems ready
  - Waits for: $, Ajax, GameMap, Character, JobList, JobsModel, TaskQueue, wman
  - Times out after 30 seconds
  - Returns true if all systems ready, false on timeout

---

## UI Files

### [src/ui/ui.js](src/ui/ui.js)
**Main UI rendering, styling, and event handling**

#### Exported Function:
**`installUI()`** - Installs UI methods on Dobby:

#### Core UI Methods:

- **`Dobby._injectCSS()`** - Inject UI stylesheet
  - Creates style element with all Dobby CSS rules
  - Uses dark color scheme
  - Only injects once (checks for existing #dobby2_style)

- **`Dobby.openUI()`** - Open UI window
  - Checks if window still alive
  - Creates new wman window (900x700, resizable, min 820x560)
  - Appends #dobby2_root div
  - Calls render()

- **`Dobby.render()`** - Render entire UI
  - Renders header with tabs and status pills
  - Renders content based on current tab
  - Sets up all event handlers

#### Event Handlers Setup:

**Tab Navigation:**
- Tab clicks set `Dobby.ui.tab` and re-render

**Jobs Tab:**
- `.d2_filter` - Filter jobs by name
- `.d2_fchk` - Toggle filters (onlySilver, noSilver, onlyCenter)
- `.d2_jobs_sort` - Change sort (distance, money, xp, name)

**Chosen Jobs Tab:**
- `.d2_add_job` - Add job from jobs list to chosen
- `.d2_rm_job` - Remove job from chosen list
- `.d2_stopmot` - Change stop motivation %
- `.d2_repeats` - Change repeat count
- `.d2_queue_job` - Move job to queue
- `.d2_route` - Create nearest-neighbor route
- `.d2_start` - Start running jobs
- `.d2_stop` - Stop job automation
- `.d2_clear` - Clear all chosen jobs
- `.d2_manual_add_btn` - Show manual add form
- `.d2_manual_save` - Parse and add manual job data
- `.d2_move_up` / `.d2_move_down` - Reorder jobs
- Drag/drop reordering of jobs

**Queue List Tab:**
- `.d2_queue_repeat` - Change queue item repeats
- `.d2_rm_queue` - Remove from queue
- `.d2_clear_queue` - Clear entire queue

**Towns Tab:**
- `.d2_town_save` - Add town from JSON
- `.d2_town_walk` - Walk to town (async walk with timer)
- `.d2_town_que` - Add town walk to queue
- `.d2_town_delete` - Delete town bookmark

**Sets Tab:**
- `.d2_set` - Select equipment set
- `.d2_sets_refresh` - Refresh equipment sets

**Consumables Tab:**
- `.d2_cons_refresh` - Find all consumables
- `.d2_cons_scan` - Scan inventory for consumables
- `.d2_cons_chk` - Toggle consumable selection
- `.d2_cons_all` - Select all consumables
- `.d2_cons_none` - Deselect all consumables
- `.d2_cons_save` - Save selection
- `.d2_cons_force_use` - Force use consumable now

**Settings Tab:**
- `.d2_setting` - Change settings (checkboxes, numbers, text)

**Log Tab:**
- `.d2_log_clear` - Clear log

**Banking:**
- `.d2_autobank_manual` - Manually trigger banking sequence

#### Render Functions (return HTML strings):

- **`Dobby.renderJobsTab(): string`** - Render available jobs
  - Filters by search, silver/center settings
  - Sorts by distance/money/xp/name
  - Shows job icons, XP, money, distance, featured status
  - Add button for each job
  - Shows limit and total counts

- **`Dobby.renderChosenTab(): string`** - Render selected jobs
  - Editable stop motivation %
  - Editable repeat counts
  - Drag/drop reordering with up/down buttons
  - Queue buttons for each job
  - Current job highlighting
  - Manual add form (hidden by default)

- **`Dobby.renderQueListTab(): string`** - Render job queue
  - Index, icon, name, repeats, remaining
  - Edit repeat counts
  - Remove buttons
  - Total queue count

- **`Dobby.renderTownsTab(): string`** - Render town bookmarks
  - Town name, coordinates
  - Walk button (starts async travel with timer)
  - Queue button to add walk task
  - Delete button
  - Manual JSON add form

- **`Dobby.renderSetsTab(): string`** - Render equipment set selectors
  - Working set, backup set, travel set
  - Health set, regeneration set
  - Dropdowns for each set
  - Refresh button

- **`Dobby.renderConsumTab(): string`** - Render consumables UI
  - Current health/energy with auto-use checkboxes
  - Threshold inputs
  - Auto-use background toggle
  - Consumable table with image, name, bonuses, count
  - Scan, select all/none, save buttons

- **`Dobby.renderSettingsTab(): string`** - Render settings
  - h-token input
  - Toggle controls for features
  - Number inputs for thresholds

- **`Dobby.renderLogTab(): string`** - Render log viewer
  - Readonly textarea with all log lines
  - Clear button

#### Helper Methods:

- **`Dobby.getJobName(jobId): string`** - Get job display name
  - Queries JobList from game
  - Falls back to `Job {id}`

- **`Dobby.getDisplayName(job): string`** - Get custom or job name
  - Returns job.customName if set
  - Otherwise calls getJobName(job.id)

- **`Dobby.getJobIconHTML(job): string`** - Generate job icon HTML
  - Creates icon div with job image
  - Shows gold/silver badge if featured
  - Includes center button for map navigation

- **`Dobby.getAllUniqueJobs(): array`** - Get filtered & sorted jobs
  - Filters by search, can-do status, silver/center settings
  - Returns best location per job ID
  - Calculates XP/money/motivation bonuses
  - Sorts by distance

- **`Dobby.createRoute()`** - Create nearest-neighbor route
  - Reorders addedJobs by nearest-neighbor algorithm
  - Persists changes

- **`Dobby.walkToTown(townId, btn): Promise<number>`** - Walk to town
  - Async function to queue town walk via API
  - Updates button with countdown timer during travel
  - Returns travel time in seconds
  - Handles errors with button state changes

---

### [src/ui/townHooks.js](src/ui/townHooks.js)
**Town window integration for adding town walks**

#### Exported Function:
**`installTownHooks()`** - Installs town window hooks:

- Intercepts Ajax.remoteCallMode for town_get calls to capture town data
- Observes DOM for town window creation
- Injects "Add to Tasker Queue" button into town windows
- On button click: calls `Dobby.addTownWalkTask(townData)`
- Scans existing town windows on init

---

## System Files

### [src/systems/jobs.js](src/systems/jobs.js)
**Job management and querying**

#### Exported Function:
**`installJobs()`** - Installs job methods on Dobby:

- **`Dobby._isJobRunnable(job): boolean`** - Check if job can run
  - Returns true if no repeatTotal or remaining > 0
  - Used to skip finished jobs

- **`Dobby._ensureJobPrototype(job): object`** - Fix job prototype
  - Ensures job has calculateDistance method
  - Repairs deserialized jobs

- **`Dobby._moveJob(fromIndex, toIndex)`** - Reorder jobs
  - Moves job from one position to another
  - Calls persist and render

- **`Dobby._ensureRepeatState()`** - Initialize repeat counters
  - Ensures repeatRemaining is set from repeatTotal
  - Runs on startup

- **`Dobby._findNextRunnableIndex(startIdx): number`** - Find next runnable job
  - Searches circularly from startIdx
  - Returns -1 if none found

- **`Dobby.loadJobData(cb)`** - Load job data from server
  - Calls Ajax.get to fetch job list
  - Initializes JobsModel with jobs
  - Calls callback when done

- **`Dobby.checkIfFeatured(x, y, jobId): object`** - Check job rarity
  - Returns `{ silver: boolean, gold: boolean }`
  - Queries GameMap.JobHandler.Featured

- **`Dobby.getJobName(jobId): string`** - Get job name
  - Queries JobList by ID
  - Falls back to `Job {id}`

- **`Dobby.getDisplayName(job): string`** - Get custom or job name
  - Returns customName if set
  - Else returns getJobName(job.id)

- **`Dobby.getJobIconHTML(job): string`** - Generate job icon HTML
  - Shows job image, gold/silver badge
  - Includes center map button

- **`Dobby.getAllUniqueJobs(): array`** - Get unique filtered jobs
  - Filters by search text, can-do status
  - Returns best location per job
  - Calculates XP/money with featured bonus
  - Sorts by distance

- **`Dobby.createRoute()`** - Create nearest-neighbor route
  - Calculates distances for all jobs
  - Reorders to minimize total travel
  - Persists changes

---

### [src/systems/money.js](src/systems/money.js)
**Money tracking and auto-banking trigger**

#### Exported Function:
**`installMoney()`** - Installs money methods on Dobby:

- **`Dobby.money.readFromDOM(): boolean`** - Read money from page
  - Extracts from #money element
  - Sets `Dobby.money.value` and `formatted`
  - Triggers auto-bank if threshold met
  - Returns true if successfully read

- **`Dobby.money.startWatcher()`** - Start money monitoring
  - Kills previous interval/observer
  - Reads initial value
  - Observes DOM mutations on #money
  - Sets interval for backup polling (1.5s)
  - Updates UI if settings tab visible

---

### [src/systems/sets.js](src/systems/sets.js)
**Equipment set management**

#### Exported Function:
**`installSets()`** - Installs equipment methods on Dobby:

- **`Dobby._normalizeSetsResp(r): array`** - Parse sets response
  - Handles various response formats from server
  - Returns array or empty array

- **`Dobby.loadSets(cb)`** - Load equipment sets from server
  - Sets `Dobby.setsLoading` flag
  - Tries Ajax.remoteCallMode first
  - Falls back to direct fetch
  - Calls callback when complete
  - Updates UI if sets tab visible

- **`Dobby._fetchSetsDirect(): Promise<array>`** - Fetch sets via fetch API
  - Direct HTTP call to game API
  - Returns parsed sets array

- **`Dobby.refreshSets(cb)`** - Refresh equipment sets
  - Clears cached sets
  - Calls loadSets(cb)

- **`Dobby.equipSet(setIndex, token): Promise<boolean>`** - Switch to equipment set
  - Returns true if successful or no-op (index -1)
  - Calls EquipManager.switchEquip
  - Awaits 200ms for equip animation

- **`Dobby.getSetName(setIndex): string`** - Get set display name
  - Special names for -2 (Best gear), -1 (None)
  - Returns set name from data
  - Falls back to `Set {index}`

- **`Dobby.getBestGearItems(jobId): array | null`** - Get best gear for job
  - Uses game's item calculator
  - Returns array of item IDs

- **`Dobby.equipBestGear(jobId, token): Promise<boolean>`** - Equip best gear
  - Uses item calculator to find best items
  - Equips each item via Wear.carry
  - Respects execution token for cancellation

---

### [src/systems/vitals.js](src/systems/vitals.js)
**Health and Energy tracking**

#### Exported Function:
**`installVitals()`** - Installs vitals methods on Dobby:

**`Dobby.Vitals`** - Object with vitals methods:
- **`_parseBar(el): object | null`** - Parse status bar element
  - Extracts "X / Y" format
  - Returns `{ cur: number, max: number }`

- **`readDom(kind): object | null`** - Read from DOM
  - Queries .status_bar.energy_bar or .health_bar
  - Returns parsed bar data

- **`read(kind): object`** - Read vitals (DOM or game)
  - Tries DOM first
  - Falls back to Character.energy/health
  - Returns `{ cur: number, max: number }`

- **`pct(kind): number`** - Get vitals percentage
  - Returns current / max * 100
  - Returns 0 if max is 0

---

### [src/systems/autoBank.js](src/systems/autoBank.js)
**Automatic banking system**

#### Exported Function:
**`installAutoBank()`** - Installs auto-bank methods on Dobby:

**`Dobby.autoBank`** - Banking object with methods:

- **`getMoneyFromDom(): number`** - Extract money from page
  - Reads #money element
  - Removes $ and commas
  - Returns numeric value

- **`canTrigger(): boolean`** - Check if banking can proceed
  - Returns false if already banking
  - Returns false if in cooldown period
  - Otherwise true

- **`startBankingSequence(reason: string)`** - Execute banking
  - Validates h-token exists
  - Checks canTrigger()
  - Pauses job execution if running
  - Cancels task queue
  - Equips walk set if configured
  - Posts walk-to-bank task to server
  - Waits for travel to complete
  - Deposits all money to bank
  - Resumes job execution if was running
  - Sets state to 'banking' during sequence
  - Logs all steps

---

### [src/systems/autoCapture.js](src/systems/autoCapture.js)
**Automatic job and town capturing**

#### Exported Function:
**`installAutoCapture()`** - Installs auto-capture by hooking network:

- **`Dobby._setupAutoCapture()`** - Setup XHR/fetch interceptors
  - Intercepts XMLHttpRequest.open/send
  - Intercepts window.fetch
  - On POST to window=task&action=add:
    - Extracts job/town data from request body
    - Auto-detects h-token from URL
    - Adds captured jobs to addedJobs if enabled
    - Skips duplicates if enabled
    - Shows notifications if enabled
  - On GET to window=town&mode=get_town:
    - Extracts town data from response
    - Auto-captures town to townBookmarks if enabled
    - Shows notifications if enabled

---

### [src/systems/consumables.js](src/systems/consumables.js)
**Consumable item management and auto-use**

#### Exported Function:
**`installConsumables()`** - Installs consumable methods:

- **`Dobby.loadLanguage()`** - Load user's game language
  - Calls Ajax to get settings
  - Sets Dobby.language

- **`Dobby.parseConsumableBonuses(bonuses): [energy, motiv, health]`** - Parse bonus text
  - Uses language-specific search keys
  - Extracts numeric bonuses
  - Returns array of three values

- **`Dobby._toNumber(val): number`** - Convert value to number
  - Handles string percentages
  - Returns NaN if invalid

- **`Dobby._extractBonus(obj): [energy, motiv, health]`** - Extract bonuses from consumable object
  - Recursively searches object for numeric bonuses
  - Uses language-specific key matching
  - Falls back to text parsing

- **`Dobby._parseBonusesString(item): object`** - Parse bonus string
  - Returns `{ energy, motivation, health }`

- **`Dobby.findAllConsumables()`** - Search inventory for consumables
  - Uses Bag.search() for keywords
  - Deduplicates by item ID
  - Sorts by total bonus (descending)
  - Stores in Dobby.allConsumables

- **`Dobby._installInventoryWatcher()`** - Watch inventory for changes
  - Listens for inventory_changed and item_used events
  - Refreshes consumables list
  - Updates UI if visible

**`Dobby.Consumables`** - Consumable usage object:
- `cooldownMs: number` - Cooldown between uses
- `lastUseAt: object` - Track cooldowns per consumable
- `inFlight: boolean` - Request in progress flag
- `initialized: boolean` - Initialization flag
- **`_now(): number`** - Get current time
- **`_parseCooldownFromDOM(): number | null`** - Parse cooldown timer from page
- **`init()`** - Initialize consumable system
- **`scan()`** - Manual consumable scan
- **`tryUse(options): Promise<boolean>`** - Try to use consumable
  - Auto-selects consumable based on current vitals
  - Respects cooldown
  - Uses selected consumables that match needs
  - Returns true if used, false if none available

---

### [src/systems/jobs/execution.js](src/systems/jobs/execution.js)
**Job execution engine - core automation logic**

#### Exported Function:
**`installJobExecution()`** - Installs job execution methods:

#### Execution Control:

- **`Dobby.start()`** - Start job automation
  - Checks queue has items
  - Sets isRunning = true, state = 'running'
  - Generates new token
  - Calls run(token)

- **`Dobby.stop()`** - Stop job automation
  - Sets isRunning = false, state = 'idle'
  - Cancels scheduled work
  - Cancels TaskQueue
  - Persists and renders

- **`Dobby.run(token): void`** - Main execution loop
  - Checks token is alive
  - Checks queue not empty
  - Applies job delay (jobDelayMin to jobDelayMax)
  - Schedules executeQueNext after delay
  - Tries to use consumables if enabled
  - Checks health above stop threshold
  - Checks energy > 0

#### Job Execution:

- **`Dobby.executeQueNext(token)`** - Execute next queued task
  - Gets first task from queue
  - Skips if not runnable
  - Equips travel set if configured
  - Posts task to server via API
  - For town walks: waits for travel time
  - Decrements repeat counter
  - Removes from queue if done
  - Calls run(token) for next

- **`Dobby.doJobCycle(job, token)`** - Execute single job cycle
  - **Town walks:** Posts walk request, waits for travel, removes job
  - **Regular jobs:**
    - Calculates travel distance
    - Waits for character to reach job location
    - Equips working set
    - Gets job motivation level
    - Calculates how many times to do job (limited by energy and motivation stop)
    - Tries API method first (if h-token set)
    - Falls back to UI method if API not available
    - Handles labor/level errors with backup set retry
    - Waits for queue to complete
    - Updates statistics
    - Handles auto-refresh if enabled
    - Checks if job done or motivation too low
    - Rotates to next job or stops

#### Job Queuing:

- **`Dobby._nextJobIndex(): number`** - Get next job to run
  - Searches circularly from currentJobIndex + 1
  - Returns -1 if no runnable jobs

- **`Dobby._shouldRotate(motivation, stopMot): boolean`** - Check if should rotate
  - Returns false if rotation disabled
  - Returns false if only 1 job
  - Returns true if motivation <= stopMot

#### Job Starting:

- **`Dobby._startJobViaAPI(job, duration): Promise<object>`** - Start job via API
  - Requires h-token
  - Posts job start request
  - Returns `{ ok: boolean, error?: boolean, msg?: string, response: object }`

- **`Dobby._startJobOnce(job, duration, token): Promise<boolean>`** - Start job via UI
  - Calls JobWindow.startJob
  - Polls queue length to verify job started
  - Times out after 1.5s
  - Returns true if started

---

### [src/systems/jobs/utils.js](src/systems/jobs/utils.js)
**Job utility functions**

#### Exported Function:
**`installJobUtils()`** - Installs job utility methods:

- **`Dobby.getJobMotivation(job): Promise<number>`** - Get job motivation level
  - Calls Ajax.get to fetch job data
  - Returns motivation as percentage (0-100)
  - Detects session expiration and stops

- **`Dobby.executeWalkToTown(townId): Promise<number>`** - Walk to town async
  - Posts town walk task to server
  - Extracts wayData from response
  - Calculates walk duration
  - Returns duration in seconds
  - Shows user notification

- **`Dobby.healthBelowLimit(): boolean`** - Check health threshold
  - Returns true if health% <= healthStop setting
  - Used to stop automation for safety

- **`Dobby._nudgeJobState(job, token)`** - Open job window to verify
  - Optional feature to check job details
  - Opens job window via GameMap or JobWindow
  - Closes after nudgeDelayMs

- **`Dobby._isLabourError(msg): boolean`** - Detect labor/level errors
  - Pattern matches against error message
  - Used to trigger backup set retry

- **`Dobby._queueLen(): number`** - Get task queue length
  - Returns TaskQueue.queue length or 0

---

## Data Flow & Execution

### Initialization Flow:
1. Page loads, main.js imports all systems
2. Each system's `install*()` function adds methods to Dobby
3. Init IIFE waits for game systems (waitForTW)
4. Loads language, sets, inventory watcher
5. Restores persisted state
6. Starts money watcher
7. Creates UI menu icon
8. Sets up auto-capture interceptors
9. Optionally auto-resumes if enabled

### Job Execution Flow:
1. User adds jobs to "Chosen" tab (addedJobs)
2. User clicks "+" to move jobs to queue (queueList)
3. User clicks "Start" to begin automation
4. `Dobby.start()` sets running flag and calls `run(token)`
5. `run()` applies delay and calls `executeQueNext(token)`
6. `executeQueNext()` gets first queue item and calls `doJobCycle()`
7. `doJobCycle()` handles travel, equipment switching, job execution
8. After job cycle completes, `run()` called again for next task
9. Automation stops when queue empty or health/energy critical

### Auto-Capture Flow:
1. XHR/fetch interceptor installed on init
2. User plays game and completes tasks
3. On task POST, interceptor checks if job/town
4. Auto-extracts data from request
5. If enabled and not duplicate, adds to addedJobs or townBookmarks
6. Shows notification to user
7. User can immediately queue captured jobs

### Banking Flow:
1. Money watcher monitors #money DOM element
2. If money >= autoBankThreshold, triggers `startBankingSequence()`
3. Pauses job execution
4. Equips walk set
5. Posts town walk request
6. Waits for travel time
7. Posts deposit request
8. Resumes job execution
9. Returns to original state

---

## Key Constants & Defaults

- **Max log lines:** 300
- **Consumable cooldown:** 10 minutes
- **Money watcher interval:** 1.5 seconds
- **Job queue poll interval:** 50ms (checks per 50ms if job in queue)
- **Default job duration:** 15 seconds
- **Travel wait timeout:** 10 minutes (600000ms)
- **Bank cooldown:** 30 seconds (configurable)
- **Resume max age:** 10 minutes (configurable)
- **Temp cookie expiry:** 1 day
- **Perm cookie expiry:** 10 years (3650 days)

---

## Configuration Categories

### Job Execution Settings:
- `rotateJobs`, `jobDelayMin`, `jobDelayMax`, `nudgeDelayMs`

### Health & Energy Management:
- `healthStop`, `addHealth`, `addEnergy`, `addMotivation`, `useHealthAt`, `useEnergyAt`

### Equipment Management:
- `workingSetId`, `backupSetId` (in settings), `travelSet`, `healthSet`, `regenerationSet`

### Consumables:
- `consumablesAutoUse`, `consumablesWatcherMs`

### Auto-Capture:
- `autoCaptureEnabled`, `autoCaptureDefaultStopMot`, `autoCaptureDefaultSet`, `autoCaptureNoDuplicates`, `autoCaptureNotify`, `autoCaptureTowns`

### Auto-Banking:
- `autoBankEnabled`, `autoBankThreshold`, `autoBankTownId`, `autoBankWalkSet`, `autoBankSafetyCooldownMs`

### Refresh & Resume:
- `autoRefreshAfterBatch`, `refreshDelayMs`, `autoResumeAfterRefresh`, `resumeMaxAgeMinutes`, `hToken`

---

## UI Tabs & Components

| Tab | Purpose | Key Components |
|-----|---------|-----------------|
| Jobs | Browse available jobs | Filter, sort, add buttons |
| Chosen | Manage selected jobs | Edit stop motivation, repeats, reorder, queue |
| Queue | View queued tasks | Edit repeats, remove, start/stop |
| Towns | Manage town bookmarks | Add from JSON, walk, queue walk, delete |
| Sets | Choose equipment sets | Dropdowns for working/backup/travel/health/regen sets |
| Consumables | Manage consumables | Scan inventory, select items, set thresholds |
| Settings | Configure automation | Checkboxes, inputs, h-token field |
| Log | View execution log | Timestamped messages, clear button |

---

## CSS Classes & Styling

All UI elements prefixed with `d2_` or `dobby2_`:
- `.d2_root` - Main container
- `.d2_tab` / `.d2_active` - Tab navigation
- `.d2_content` - Tab content area
- `.d2_shell` - Themed container
- `.d2_card` - Styled card component
- `.d2_toolbar` - Button toolbar
- `.d2_table` - Styled tables
- `.d2_pill` - Rounded badge
- `.d2_muted` - Reduced opacity text
- `.d2_row_hi` - Row highlighting
- `.d2_dragging` - Drag state
- `.d2_drag_over` - Drop target state
- `.d2_capture_badge` - Capture status indicator
- `.d2_bank_badge` - Banking status indicator

---

## Error Handling

- **Session expiration:** Detected in HTTP responses, triggers stop() with user notification
- **Labor/Level errors:** Triggers backup set retry if configured
- **Health critical:** Stops automation if health <= healthStop
- **No energy:** Stops automation if energy = 0
- **Network errors:** Logged and caught, skips task, continues
- **Missing data:** Graceful fallbacks (default names, zero values, empty arrays)

---

**Document Generated:** 2026-05-10  
**Project:** Tasker - TW Game Automation  
**Version:** 3.0 (Ultimate)

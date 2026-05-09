# AI Development Rules - Tasker Ultimate

This document defines the technical stack and architectural rules for the Tasker Ultimate userscript project.

## Tech Stack
- **Vite**: Used as the build tool to bundle modular ESM source code into a single IIFE userscript (`tasker.user.js`).
- **Vanilla JavaScript (ESM)**: The core logic is written in modern JavaScript using ES modules for better maintainability.
- **jQuery**: The primary library for DOM manipulation, event handling, and UI rendering, leveraging the version already present in the game environment.
- **The West Game API**: Extensive integration with game-specific globals such as `GameMap`, `Character`, `Ajax`, `TaskQueue`, and `wman`.
- **Custom CSS-in-JS**: UI styling is managed via a centralized CSS injection system in the UI module.
- **Modular Architecture**: The codebase is strictly divided into `core` (state and utilities), `systems` (game logic and automation), and `ui` (rendering and hooks).
- **Persistence Layer**: State is synchronized between memory, Cookies, and LocalStorage to ensure persistence across page refreshes.

## Library & Implementation Rules

### 1. UI & Rendering
- **jQuery**: Use jQuery for all DOM interactions and event delegation.
- **Templates**: Use ES6 template literals for HTML generation within the `src/ui/` modules.
- **Styling**: All new CSS rules must be added to the `_injectCSS` function in `src/ui/ui.js`. Do not create external `.css` files.

### 2. Game Integration
- **Globals**: Always access game objects via `window` or check for their existence before use (e.g., `if (window.GameMap)`).
- **Ajax**: Use `Dobby._post` or `Ajax.remoteCall` for server communication to ensure CSRF tokens (h-tokens) are handled correctly.
- **Hooks**: Use `MutationObserver` or XHR interception (as seen in `autoCapture.js`) to react to game state changes that don't provide native events.

### 3. State Management
- **Single Source of Truth**: All application state must reside in the `Dobby` object defined in `src/core/state.js`.
- **Persistence**: Any state change that should survive a refresh must be followed by a call to `Dobby._persist()`.

### 4. Modularity
- **New Features**: Create a new file in `src/systems/` for any new automation logic.
- **Initialization**: Register new systems in `src/main.js` using an `installX()` pattern.
- **Separation of Concerns**: Keep logic (systems) separate from presentation (ui). Systems should update the `Dobby` state, and UI should reflect that state.

### 5. Coding Standards
- **Async/Await**: Prefer `async/await` over raw promises or callbacks for network requests and delays.
- **Safety**: Use `safeUserMsg` for user-facing notifications to ensure they don't crash if the game's message system is unavailable.
- **Performance**: Use `MutationObserver` sparingly and always disconnect observers when they are no longer needed.
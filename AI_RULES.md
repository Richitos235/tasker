This refined version of your AI_rules.md is designed to be more "machine-readable" for an LLM. It uses a stricter hierarchy, clarifies the relationship between modules, and fixes the "Dobby" naming convention to be project-specific.
AI Development Rules: Tasker Ultimate

This document serves as the source of truth for architectural decisions, coding standards, and the technical stack for the Tasker Ultimate userscript.
🛠 Technical Stack

    Build Tool: Vite (Bundles modular ESM into a single IIFE tasker.user.js).

    Language: Vanilla JavaScript (ES6+ ESM).

    Libraries:

        jQuery: Primary DOM/UI engine (use version provided by the game environment).

        The West Game API: Integration with window.GameMap, Character, Ajax, TaskQueue, and wman.

    Styling: Centralized CSS-in-JS injection (No external .css files).

🏛 Architectural Structure

The codebase follows a strict Modular ESM pattern. AI must adhere to this folder structure:

    src/core/: Application state, persistence, and global utilities.

    src/systems/: Business logic, automation, and game-specific engines.

    src/ui/: DOM construction, jQuery event listeners, and CSS injection.

    src/main.js: The entry point for initialization and module registration.

📜 Implementation Rules
1. State & Persistence

    Single Source of Truth: All state must be stored in the Tasker (or project-defined) object within src/core/state.js.

    Persistence: Call Tasker._persist() immediately after updating any state that must survive a page reload (Cookies/LocalStorage).

    Reactive UI: Systems should update the state; UI modules should listen for state changes or be manually refreshed via hooks.

2. UI & Styling

    jQuery Only: Use jQuery for all DOM selection, manipulation, and event delegation.

    CSS Injection: Add all styles to the _injectCSS method in src/ui/ui.js. Use standard CSS strings within template literals.

    Templates: Generate HTML using ES6 Template Literals within src/ui/ sub-modules.

3. Game Integration & Safety

    Global Access: Always check for game globals before execution (e.g., if (typeof GameMap !== 'undefined')).

    Server Comm: Use Ajax.remoteCall or the internal _post wrapper to ensure h-token (CSRF) headers are automatically included.

    Interception: Prefer MutationObserver or XHR interception for reacting to game updates where native API hooks are missing.

4. Modularity & Workflow

    Feature Isolation: One feature per file in src/systems/.

    The "Install" Pattern: New modules must export an install() or init() function and be registered in src/main.js.

    No Side Effects: Importing a module should never execute code; execution must wait for the install call.

✍️ Coding Standards

    Async Patterns: Use async/await for all network requests or timed delays. Avoid setTimeout chains.

    Naming: Use camelCase for variables/functions and _snake_case or UPPER_CASE for internal game constants if required by the API.

    Error Handling: Wrap game-sensitive calls in try/catch. Use safeUserMsg (if available) to notify the user of failures without breaking the game UI.

    Performance: Disconnect MutationObservers when the relevant UI component is closed to prevent memory leaks.

    Note to AI: When generating code, provide the file path at the top of the code block. If modifying existing logic, provide the full updated function to ensure context is maintained.

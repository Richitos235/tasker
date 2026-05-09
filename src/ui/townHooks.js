// FILE: src/ui/townHooks.js
// ACTION: NEW

import { Dobby } from '../core/state.js';
import { safeUserMsg } from '../core/utils.js';

export function installTownHooks() {
  let lastTownData = null;

  // Hook into Ajax to capture town data
  const originalRemoteCallMode = window.Ajax?.remoteCallMode;
  if (originalRemoteCallMode) {
    window.Ajax.remoteCallMode = function(windowName, mode, params, callback) {
      if (windowName === 'town' && mode === 'get_town') {
        const originalCallback = callback;
        callback = function(response) {
          lastTownData = response;
          return originalCallback.apply(this, arguments);
        };
      }
      return originalRemoteCallMode.apply(this, arguments);
    };
  }

  // Observer for town window injection
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const townWindow = node.querySelector?.('.tw2gui_window') || node.closest?.('.tw2gui_window');
          if (townWindow && townWindow.querySelector('[data-town-window]')) {
            injectTownWalkButton(townWindow);
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  function injectTownWalkButton(townWindow) {
    if (townWindow.querySelector('.dobby-town-walk-btn')) return; // Already injected

    const townNameEl = townWindow.querySelector('h2') || townWindow.querySelector('.town-name');
    if (!townNameEl) return;

    const btn = document.createElement('a');
    btn.className = 'dobby-town-walk-btn button';
    btn.textContent = 'Add to Tasker Queue';
    btn.style.cssText = 'margin-left: 10px;';
    btn.onclick = () => addTownWalkToQueue();

    townNameEl.appendChild(btn);
  }

  function addTownWalkToQueue() {
    if (!lastTownData || !lastTownData.town_id) {
      safeUserMsg('No town data available. Open town window first.', window.UserMessage?.TYPE_ERROR);
      return;
    }

    Dobby.addTownWalkTask(lastTownData);
  }

  // Also check existing town windows on init
  setTimeout(() => {
    document.querySelectorAll('.tw2gui_window').forEach((win) => {
      if (win.querySelector('[data-town-window]') || win.textContent.includes('Town')) {
        injectTownWalkButton(win);
      }
    });
  }, 1000);
}
import { Dobby } from './state.js';

export function installController() {
  Dobby._cancel = function () {
    if (Dobby._scheduled) {
      clearTimeout(Dobby._scheduled);
      Dobby._scheduled = null;
    }
  };

  Dobby._newToken = function () {
    Dobby._runToken++;
    Dobby._cancel();
    return Dobby._runToken;
  };

  Dobby._alive = function (token) {
    return Dobby.isRunning && token === Dobby._runToken;
  };
}

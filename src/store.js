/**
 * This module keeps a reference to the Peaks Store, provided
 * by Deepdub Composer.
 */
define([], function () {
  "use strict";

  let _store;

  return {
    setStore(store) {
      _store = store;
    },
    getState() {
      return _store.getState();
    },
    subscribe(...args) {
      return _store.subscribe(...args);
    },
    setState(...args) {
      return _store.setState(...args);
    },
  };
});

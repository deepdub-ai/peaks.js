/**
 * This module keeps a reference to the Peaks Store, provided
 * by Deepdub Composer.
 */
define([], function () {
  "use strict";

  const stores = {};

  return {
    setStore(store, context) {
      stores[context] = store;
    },
    getState(context) {
      return stores[context].getState();
    },
    setState(context, ...args) {
      return stores[context].setState(...args);
    },
    subscribe(context, ...args) {
      return stores[context].subscribe(...args);
    },
  };
});

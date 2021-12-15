/**
 * This module keeps a reference to the Peaks Store, provided
 * by Deepdub Composer.
 */
define([], function () {
  "use strict";

  let _store;
  let _trackId;

  return {
    getStore() {
      if (!_store) {
        console.error('store not defined');
        return null;
      }

      return _store;
    },
    setStore(store) {
      _store = store;
    },
    getTrackId() {
      if (!_trackId) {
        console.error('trackId not defined');
        return null;
      }

      return _trackId;
    },
    setTrackId(trackId) {
      _trackId = trackId;
    }
  };
});

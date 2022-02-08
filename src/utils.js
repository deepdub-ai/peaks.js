/**
 * @file
 *
 * Some general utility functions.
 *
 * @module utils
 */

define(function() {
  'use strict';

  if (typeof Number.isFinite !== 'function') {
    Number.isFinite = function isFinite(value) {
      if (typeof value !== 'number') {
        return false;
      }

      // Check for NaN and infinity
      // eslint-disable-next-line no-self-compare
      if (value !== value || value === Infinity || value === -Infinity) {
        return false;
      }

      return true;
    };
  }

  function zeroPad(number, precision) {
    number = number.toString();

    while (number.length < precision) {
      number = '0' + number;
    }

    return number;
  }

  return {

    /**
     * Returns a formatted time string.
     *
     * @param {Number} time The time to be formatted, in seconds.
     * @param {Number} precision Decimal places to which time is displayed
     * @returns {String}
     */

    formatTime: function(time, precision) {
      var result = [];

      var fractionSeconds = Math.floor((time % 1) * Math.pow(10, precision));
      var seconds = Math.floor(time);
      var minutes = Math.floor(seconds / 60);
      var hours = Math.floor(minutes / 60);

      if (hours > 0) {
        result.push(hours); // Hours
      }
      result.push(minutes % 60); // Mins
      result.push(seconds % 60); // Seconds

      for (var i = 0; i < result.length; i++) {
        result[i] = zeroPad(result[i], 2);
      }

      result = result.join(':');

      if (precision > 0) {
        result += '.' + zeroPad(fractionSeconds, precision);
      }

      return result;
    },

    formatTimecode: function(time, fps) {
      const adjustedTime = (time * (24000 / 1001)) / fps
      const hour = String(Math.floor(adjustedTime / (60 * 60))).padStart(2, '0');
      const mins = String(Math.floor(adjustedTime / 60) % 60).padStart(2, '0');
      const secs = String(Math.floor(adjustedTime % 60)).padStart(2, '0');
      const frame = String(Math.floor((adjustedTime % 1) * fps)).padStart(2, '0');

      return `${hour}:${mins}:${secs}:${frame}`;
    },

    /**
     * Rounds the given value up to the nearest given multiple.
     *
     * @param {Number} value
     * @param {Number} multiple
     * @returns {Number}
     *
     * @example
     * roundUpToNearest(5.5, 3); // returns 6
     * roundUpToNearest(141.0, 10); // returns 150
     * roundUpToNearest(-5.5, 3); // returns -6
     */

    roundUpToNearest: function(value, multiple) {
      if (multiple === 0) {
        return 0;
      }

      var multiplier = 1;

      if (value < 0.0) {
        multiplier = -1;
        value = -value;
      }

      var roundedUp = Math.ceil(value);

      return multiplier * (((roundedUp + multiple - 1) / multiple) | 0) * multiple;
    },

    clamp: function(value, min, max) {
      if (value < min) {
        return min;
      }
      else if (value > max) {
        return max;
      }
      else {
        return value;
      }
    },

    extend: function(to, from) {
      for (var key in from) {
        if (this.objectHasProperty(from, key)) {
          to[key] = from[key];
        }
      }

      return to;
    },

    /**
     * Checks whether the given array contains values in ascending order.
     *
     * @param {Array<Number>} array The array to test
     * @returns {Boolean}
     */

    isInAscendingOrder: function(array) {
      if (array.length === 0) {
        return true;
      }

      var value = array[0];

      for (var i = 1; i < array.length; i++) {
        if (value >= array[i]) {
          return false;
        }

        value = array[i];
      }

      return true;
    },

    /**
     * Checks whether the given value is a number.
     *
     * @param {Number} value The value to test
     * @returns {Boolean}
     */

    isNumber: function(value) {
      return typeof value === 'number';
    },

    /**
     * Checks whether the given value is a valid timestamp.
     *
     * @param {Number} value The value to test
     * @returns {Boolean}
     */

    isValidTime: function(value) {
      return (typeof value === 'number') && Number.isFinite(value);
    },

    /**
     * Checks whether the given value is a valid object.
     *
     * @param {Object|Array} value The value to test
     * @returns {Boolean}
     */

    isObject: function(value) {
      return (value !== null) && (typeof value === 'object')
        && !Array.isArray(value);
    },

    /**
     * Checks whether the given value is a valid string.
     *
     * @param {String} value The value to test
     * @returns {Boolean}
     */

    isString: function(value) {
      return typeof value === 'string';
    },

    /**
     * Checks whether the given value is a valid ArrayBuffer.
     *
     * @param {ArrayBuffer} value The value to test
     * @returns {Boolean}
     */

    isArrayBuffer: function(value) {
      return Object.prototype.toString.call(value).includes('ArrayBuffer');
    },

    /**
     * Checks whether the given value is null or undefined.
     *
     * @param {Object} value The value to test
     * @returns {Boolean}
     */

    isNullOrUndefined: function(value) {
      return value === undefined || value === null;
    },

    /**
     * Checks whether the given value is a function.
     *
     * @param {Function} value The value to test
     * @returns {Boolean}
     */

    isFunction: function(value) {
      return typeof value === 'function';
    },

    /**
     * Checks whether the given value is a boolean.
     *
     * @param {Function} value The value to test
     * @returns {Boolean}
     */

    isBoolean: function(value) {
      return value === true || value === false;
    },

    /**
     * Checks whether the given value is a valid HTML element.
     *
     * @param {HTMLElement} value The value to test
     * @returns {Boolean}
     */

    isHTMLElement: function(value) {
      return value instanceof HTMLElement;
    },

    /**
     * Checks whether the given value is an array
     * @param {Function} value The value to test
     * @returns {Boolean}
     */

    isArray: function(value) {
      return Array.isArray(value);
    },

    /**
     * Checks whether the given value is a valid linear gradient color
     * @param {Function} value The value to test
     * @returns {Boolean}
     */

    isLinearGradientColor: function(value) {
      return this.isObject(value) &&
              this.objectHasProperty(value, 'linearGradientStart') &&
              this.objectHasProperty(value, 'linearGradientEnd') &&
              this.objectHasProperty(value, 'linearGradientColorStops') &&
              this.isNumber(value.linearGradientStart) &&
              this.isNumber(value.linearGradientEnd) &&
              this.isArray(value.linearGradientColorStops) &&
              value.linearGradientColorStops.length === 2;
    },

    objectHasProperty: function(object, field) {
      return Object.prototype.hasOwnProperty.call(object, field);
    },

    // Users with both a mouse and a track show the scroll bars,
    // thus this method detects them as mouse users.
    //
    // FIXME Find a better solution.
    //
    detectPointingDevice: function() {
      return 'trackpad'

      // const scrollEl = document.createElement('div');
      // const childEl = document.createElement('div');

      // scrollEl.style.width = '1px';
      // scrollEl.style.height = '1px';
      // scrollEl.style.overflow = 'auto';
      // scrollEl.style.position = 'fixed';
      // scrollEl.style.visibility = 'hidden';
      // childEl.style.height = '2px';

      // scrollEl.appendChild(childEl);
      // document.body.appendChild(scrollEl);

      // const scrollbarWidth = scrollEl.offsetWidth - scrollEl.clientWidth;
      // const controlDevice = scrollbarWidth ? 'mouse' : 'trackpad';

      // scrollEl.remove();

      // return controlDevice;
    }
  };
});

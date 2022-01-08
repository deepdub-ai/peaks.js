/**
 * @file
 *
 * Defines the {@link WaveformShape} class.
 *
 * @module waveform-shape
 */

define(['./utils', 'konva', './store'], function(Utils, Konva, store) {
  'use strict';

  /**
   * Waveform shape options.
   *
   * @typedef {Object} WaveformShapeOptions
   * @global
   * @property {String | LinearGradientColor} color Waveform color.
   * @property {WaveformOverview|WaveformZoomView} view The view object
   *   that contains the waveform shape.
   * @property {Segment?} segment If given, render a waveform image
   *   covering the segment's time range. Otherwise, render the entire
   *   waveform duration.
   */

  /**
   * Creates a Konva.Shape object that renders a waveform image.
   *
   * @class
   * @alias WaveformShape
   *
   * @param {WaveformShapeOptions} options
   */

  function WaveformShape(options) {
    this._color = options.color;
    this._type = options.type || 'playback';
    this._pattern = options.pattern;
    this._peaks = options.peaks;

    this.viewName = options.view.getName()

    var shapeOptions = {};

    if (options.pattern) {
      shapeOptions.fillPatternImage = options.pattern
    } else if (Utils.isString(options.color)) {
      shapeOptions.fill = options.color;
    }
    else if (Utils.isObject(options.color)) {
      if (!Utils.isLinearGradientColor(options.color)) {
        throw new TypeError('Not a valid linear gradient color object');
      }

      var startY = options.view._height * (options.color.linearGradientStart / 100);
      var endY = options.view._height * (options.color.linearGradientEnd / 100);

      shapeOptions.fillLinearGradientStartPointY = startY;
      shapeOptions.fillLinearGradientEndPointY = endY;
      shapeOptions.fillLinearGradientColorStops = [
        0, options.color.linearGradientColorStops[0],
        1, options.color.linearGradientColorStops[1]
      ];
    }
    else {
      throw new TypeError('Unknown type for color property');
    }

    Konva.Shape.call(this, shapeOptions);

    this._view = options.view;
    this._segment = options.segment;
    this._getWaveformData = options.getWaveformData || options.view.getWaveformData;

    this.sceneFunc(this._sceneFunc);

    this.hitFunc(this._waveformShapeHitFunc);
  }

  WaveformShape.prototype = Object.create(Konva.Shape.prototype);

  WaveformShape.prototype.setWaveformColor = function(color) {
    if (this._pattern) {
      this.fillPatternImage = this._pattern;
    } else if (Utils.isString(color)) {
      this.fill(color);
    }
    else if (Utils.isLinearGradientColor(color)) {
      var startY = this._view._height * (color.linearGradientStart / 100);
      var endY = this._view._height * (color.linearGradientEnd / 100);

      this.fillLinearGradientStartPointY(startY);
      this.fillLinearGradientEndPointY(endY);
      this.fillLinearGradientColorStops([
        0, color.linearGradientColorStops[0],
        1, color.linearGradientColorStops[1]
      ]);
    }
    else {
      throw new TypeError('Unknown type for color property');
    }
  };

  WaveformShape.prototype.fitToView = function() {
    this.setWaveformColor(this._color);
  };

  WaveformShape.prototype._sceneFunc = function(context) {
    if (context) {
      this._prevContext = context
    } else {
      context = this._prevContext
    }

    if (this._segment && this._segment.isHidden()) {
      return
    }

    const segmentDetailsHeight = this._view.getName() === 'zoomview'
      ? store.getStore().getState().getSegmentDetailsHeight(store.getTrackId())
      : 0;

    var frameOffset = this._view.getFrameOffset();
    var width = this._view.getWidth();
    var height = this._view.getHeight() - segmentDetailsHeight;
    let waveformData = this._getWaveformData()

    if (!waveformData) {
      return
    }

    this._drawWaveform(
      context,
      waveformData,
      Math.round(frameOffset),
      Math.round(this._segment ? this._view.timeToPixels(this._segment.startTime) : frameOffset),
      Math.floor(this._segment ? this._view.timeToPixels(this._segment.endTime)   : frameOffset + width),
      width,
      height,
      segmentDetailsHeight
    );
  };

  /**
   * Draws a waveform on a canvas context.
   *
   * @param {Konva.Context} context The canvas context to draw on.
   * @param {WaveformData} waveformData The waveform data to draw.
   * @param {Number} frameOffset The start position of the waveform shown
   *   in the view, in pixels.
   * @param {Number} startPixels The start position of the waveform to draw,
   *   in pixels.
   * @param {Number} endPixels The end position of the waveform to draw,
   *   in pixels.
   * @param {Number} width The width of the waveform area, in pixels.
   * @param {Number} height The height of the waveform area, in pixels.
   */

  WaveformShape.prototype._drawWaveform = function(context, waveformData,
      frameOffset, startPixels, endPixels, width, height, segmentDetailsHeight) {
    if (startPixels < frameOffset) {
      startPixels = frameOffset;
    }

    var limit = frameOffset + width;
    if (endPixels > limit) {
      endPixels = limit;
    }

    if (!this._segment) {
      if (endPixels > waveformData.length) {
        endPixels = waveformData.length;
      }
    } else if (this._segment.type !== 'SELECTION_REGION') {
      const segmentStartPixel = this._view.timeToPixels(this._segment.startTime);
      if (endPixels > segmentStartPixel + waveformData.length) {
        endPixels = segmentStartPixel + waveformData.length;
      }
    }

    var channels = waveformData.channels;

    var waveformTop = 0;
    var waveformHeight = Math.floor(height / channels);

    for (var i = 0; i < channels; i++) {
      if (i === channels - 1) {
        waveformHeight = height - (channels - 1) * waveformHeight;
      }

      this._drawChannel(
        context,
        waveformData.channel(i),
        frameOffset,
        startPixels,
        endPixels,
        waveformTop,
        waveformHeight,
        segmentDetailsHeight
      );

      waveformTop += waveformHeight;
    }
  };

  /**
   * Draws a single waveform channel on a canvas context.
   *
   * @param {Konva.Context} context The canvas context to draw on.
   * @param {WaveformDataChannel} channel The waveform data to draw.
   * @param {Number} frameOffset The start position of the waveform shown
   *   in the view, in pixels.
   * @param {Number} startPixels The start position of the waveform to draw,
   *   in pixels.
   * @param {Number} endPixels The end position of the waveform to draw,
   *   in pixels.
   * @param {Number} top The top of the waveform channel area, in pixels.
   * @param {Number} height The height of the waveform channel area, in pixels.
   */

  WaveformShape.prototype._drawChannel = function(context, channel, frameOffset, startPixels, endPixels, top, height, segmentDetailsHeight) {
    store.getStore().getState().drawChannelFunc.call(
      this,
      context,
      channel,
      frameOffset,
      startPixels,
      endPixels,
      top,
      height,
      segmentDetailsHeight,
      WaveformShape.scaleY
    )
  };

  WaveformShape.prototype._waveformShapeHitFunc = function(context) {
    if (!this._segment) {
      return;
    }

    var frameOffset = this._view.getFrameOffset();
    var viewWidth = this._view.getWidth();
    var viewHeight = this._view.getHeight();

    var startPixels = this._view.timeToPixels(this._segment.startTime);
    var endPixels   = this._view.timeToPixels(this._segment.endTime);

    var offsetY = 10;
    var hitRectHeight = viewHeight - 2 * offsetY;

    if (hitRectHeight < 0) {
      hitRectHeight = 0;
    }

    var hitRectLeft = startPixels - frameOffset;
    var hitRectWidth = endPixels - startPixels;

    if (hitRectLeft < 0) {
      hitRectWidth -= -hitRectLeft;
      hitRectLeft = 0;
    }

    if (hitRectLeft + hitRectWidth > viewWidth) {
      hitRectWidth -= hitRectLeft + hitRectWidth - viewWidth;
    }

    context.beginPath();
    context.rect(hitRectLeft, offsetY, hitRectWidth, hitRectHeight);
    context.closePath();
    context.fillStrokeShape(this);
  };

  /**
   * Scales the waveform data for drawing on a canvas context.
   *
   * @see {@link https://stats.stackexchange.com/questions/281162}
   *
   * @todo Assumes 8-bit waveform data (-128 to 127 range)
   *
   * @param {Number} amplitude The waveform data point amplitude.
   * @param {Number} height The height of the waveform, in pixels.
   * @param {Number} scale Amplitude scaling factor.
   * @returns {Number} The scaled waveform data point.
   */

  WaveformShape.scaleY = function(amplitude, height, scale) {
    var y = -(height - 1) * (amplitude * scale + 128) / 255 + (height - 1);

    return Utils.clamp(Math.floor(y), 0, height - 1);
  };

  return WaveformShape;
});

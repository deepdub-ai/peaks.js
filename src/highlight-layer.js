/**
 * @file
 *
 * Defines the {@link HighlightLayer} class.
 *
 * @module highlight-layer
 */

define([
  './utils',
  'konva'
], function(
    Utils,
    Konva) {
  'use strict';

  /**
   * Creates the highlight region that shows the position of the zoomable
   * waveform view in the overview waveform.
   *
   * @class
   * @alias HighlightLayer
   *
   * @param {WaveformOverview} view
   * @param {Number} offset
   * @param {String} color
   */

  function HighlightLayer(view, offset, color) {
    this._view          = view;
    this._offset        = offset;
    this._color         = color;
    this._layer         = new Konva.FastLayer();
    this._highlightRect = null;
    this._startTime     = null;
    this._endTime       = null;
  }

  HighlightLayer.prototype.addToStage = function(stage) {
    stage.add(this._layer);
  };

  HighlightLayer.prototype.showHighlight = function(startTime, endTime) {
    if (!this._highlightRect) {
      this._createHighlightRect(startTime, endTime);
    }

    this._update(startTime, endTime);
  };

  HighlightLayer.prototype.setHighlightBounds = function(yPct, heightPct) {
    const newHeight = heightPct * this._view.getHeight()
    const newY = yPct * (this._view.getHeight() - newHeight);

    this._yPct = yPct;
    this._heightPct = heightPct;

    this._highlightRect.setAttrs({
      y:      newY,
      height: newHeight
    });

    this._layer.draw();
  };

  HighlightLayer.prototype.getHighlightBounds = function() {
    const height = this._highlightRect.height();

    return {
      yPct: this._highlightRect.y() / (this._view.getHeight() - height),
      heightPct: height / this._view.getHeight(),
    }
  };

  HighlightLayer.prototype.setHighlightY = function(y) {
    y = Utils.clamp(y, 0, this._view.getHeight() - this._highlightRect.height());

    this._highlightRect.setAttrs({ y: y })

    this._layer.draw();
  };

  HighlightLayer.prototype.getBounds = function() {
    return {
      x: this._highlightRect.x(),
      y: this._highlightRect.y(),
      width: this._highlightRect.width(),
      height: this._highlightRect.height(),
    }
  };

  /**
   * Updates the position of the highlight region.
   *
   * @param {Number} startTime The start of the highlight region, in seconds.
   * @param {Number} endTime The end of the highlight region, in seconds.
   */

  HighlightLayer.prototype._update = function(startTime, endTime) {
    this._startTime = startTime;
    this._endTime = endTime;

    var startOffset = this._view.timeToPixels(startTime);
    var endOffset   = this._view.timeToPixels(endTime);

    this._width = endOffset - startOffset;

    this._highlightRect.setAttrs({
      x:     startOffset,
      width: this._width
    });

    this._layer.draw();
  };

  HighlightLayer.prototype._createHighlightRect = function(startTime, endTime) {
    this._startTime = startTime;
    this._endTime   = endTime;

    var startOffset = this._view.timeToPixels(startTime);
    var endOffset   = this._view.timeToPixels(endTime);

    this._width = endOffset - startOffset

    // Create with default y and height, the real values are set in fitToView().
    this._highlightRect = new Konva.Rect({
      startOffset:  0,
      y:            0,
      width:        this._width,
      stroke:       this._color,
      strokeWidth:  1,
      height:       0,
      fill:         this._color,
      opacity:      0.3,
      cornerRadius: 2
    });

    this.fitToView();

    this._layer.add(this._highlightRect);
  };

  HighlightLayer.prototype.removeHighlight = function() {
    if (this._highlightRect) {
      this._highlightRect.destroy();
      this._highlightRect = null;
      this._layer.draw();
    }
  };

  HighlightLayer.prototype.updateHighlight = function() {
    if (this._highlightRect) {
      this._update(this._startTime, this._endTime);
    }
  };

  HighlightLayer.prototype.fitToView = function() {
    if (this._highlightRect) {
      this.setHighlightBounds(this._yPct, this._heightPct);
    }
  };

  return HighlightLayer;
});

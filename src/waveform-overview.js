/**
 * @file
 *
 * Defines the {@link WaveformOverview} class.
 *
 * @module waveform-overview
 */

define([
  './highlight-layer',
  './mouse-drag-handler',
  './playhead-layer',
  './points-layer',
  './segments-layer',
  './waveform-axis',
  './waveform-shape',
  './utils',
  'konva'
], function(
    HighlightLayer,
    MouseDragHandler,
    PlayheadLayer,
    PointsLayer,
    SegmentsLayer,
    WaveformAxis,
    WaveformShape,
    Utils,
    Konva) {
  'use strict';

  /**
   * Creates the overview waveform view.
   *
   * @class
   * @alias WaveformOverview
   *
   * @param {WaveformData} waveformData
   * @param {HTMLElement} container
   * @param {Peaks} peaks
   */

  function WaveformOverview(waveformData, container, peaks) {
    var self = this;

    self._originalWaveformData = waveformData;
    self._container = container;
    self._peaks = peaks;

    // Bind event handlers
    self._onTimeUpdate = self._onTimeUpdate.bind(this);
    self._onPlay = self._onPlay.bind(this);
    self._onPause = self._onPause.bind(this);
    self._onZoomviewDisplaying = self._onZoomviewDisplaying.bind(this);
    self._onWindowResize = self._onWindowResize.bind(this);

    // Register event handlers
    peaks.on('player.timeupdate', self._onTimeUpdate);
    peaks.on('player.play', self._onPlay);
    peaks.on('player.pause', self._onPause);
    peaks.on('zoomview.displaying', self._onZoomviewDisplaying);
    peaks.on('window_resize', self._onWindowResize);

    self._amplitudeScale = 1.0;
    self._timeLabelPrecision = peaks.options.timeLabelPrecision;

    self._options = peaks.options;

    self._width = container.clientWidth;
    self._height = container.clientHeight || self._options.height;

    self._data = waveformData;

    self._isSeeking = false;

    if (self._width !== 0) {
      try {
        self._data = waveformData.resample({ width: self._width });
      }
      catch (error) {
        // This error usually indicates that the waveform length
        // is less than the container width
      }
    }

    // Disable warning: The stage has 6 layers.
    // Recommended maximum number of layers is 3-5.
    Konva.showWarnings = false;

    self._resizeTimeoutId = null;

    self._stage = new Konva.Stage({
      container: container,
      width: self._width,
      height: self._height
    });

    self._waveformLayer = new Konva.FastLayer();

    self._createWaveform();

    self._segmentsLayer = new SegmentsLayer(peaks, self, false);
    self._segmentsLayer.addToStage(self._stage);

    self._pointsLayer = new PointsLayer(peaks, self, false);
    self._pointsLayer.addToStage(self._stage);

    self._highlightLayer = new HighlightLayer(
      self,
      self._options.overviewHighlightOffset,
      self._options.overviewHighlightColor
    );
    self._highlightLayer.addToStage(self._stage);

    if (!self._options.hideAxis) {
      self._createAxisLabels();
    }

    self._playheadLayer = new PlayheadLayer({
      player: self._peaks.player,
      view: self,
      showPlayheadTime: false,
      playheadColor: self._options.playheadColor,
      playheadTextColor: self._options.playheadTextColor,
      playheadFontFamily: self._options.fontFamily,
      playheadFontSize: self._options.fontSize,
      playheadFontStyle: self._options.fontStyle
    });

    self._playheadLayer.addToStage(self._stage);

    var time = self._peaks.player.getCurrentTime();

    this._playheadLayer.updatePlayheadTime(time);

    var highlightMouseDownOffset = 0;
    self._onMouseDownAndMouseMove = (mousePosX, mousePosY) => {
      self._highlightLayer.setHighlightY(mousePosY - highlightMouseDownOffset);

      if (self._isCtrlSeeking || self._options.overviewSeeksZoomview) {
        mousePosX = Utils.clamp(mousePosX, 0, self._width);

        let time = self.pixelsToTime(mousePosX);
        let timeCentered = self.pixelsToTime(mousePosX - self._highlightLayer._width / 2);
        const duration = self._getDuration();

        if (time > duration) {
          time = duration;
        }

        if (timeCentered > duration) {
          timeCentered = duration;
        }

        // Update the playhead position. This gives a smoother visual update
        // than if we only use the player.timeupdate event.
        self._playheadLayer.updatePlayheadTime(time);

        self._peaks.player.seek(time);
        self._peaks.views.getView('zoomview')._syncPlayhead(timeCentered, { exact: true, playheadTime: time, cause: 'overview-drag-scroll' });
      } else {
        let time = self.pixelsToTime(mousePosX - self._highlightLayer._width / 2);
        const duration = self._getDuration();

        if (time > duration) {
          time = duration;
        }
        self._peaks.views.getView('zoomview')._syncPlayhead(time, { exact: true, persistPlayhead: true, cause: 'overview-drag-scroll' });
      }
    }

    self._mouseDragHandler = new MouseDragHandler(self._stage, {
      onMouseDown: function(mousePosX, mousePosY, event) {
        self._isSeeking = true;
        self._isCtrlSeeking = event.evt.ctrlKey;
        var highlightBounds = self._highlightLayer.getBounds()
        var yOffset = mousePosY - highlightBounds.y
        const clampedHighlightMouseDownOffset = Utils.clamp(yOffset, 0, highlightBounds.height);
        if (yOffset !== clampedHighlightMouseDownOffset) {
          highlightMouseDownOffset = highlightBounds.height / 2;
        } else {
          highlightMouseDownOffset = yOffset
        }
        // var yOffset = highlightBounds.y >= mousePosY && highlightBounds.y + highlightBounds.height >= mousePosY;
        self._onMouseDownAndMouseMove(mousePosX, mousePosY);
      },

      onMouseMove: function(eventType, mousePosX, mousePosY) {
        self._onMouseDownAndMouseMove(mousePosX, mousePosY);
      },

      onMouseUp: function() {
        self._isSeeking = false
        self._isCtrlSeeking = false
      }
    }, {
      preventContextMenu: true
    });

    this._stage.on('dblclick', function(event) {
      var pixelIndex = event.evt.layerX;

      var time = self.pixelsToTime(pixelIndex);

      self._peaks.emit('overview.dblclick', time);
    });
  }

  WaveformOverview.prototype.getName = function() {
    return 'overview';
  };

  WaveformOverview.prototype.update = function(startTime, endTime) {
    if (startTime === this._startTime && endTime === this._endTime) {
      return
    }

    this._startTime = startTime;
    this._endTime = endTime;

    this._onZoomviewDisplaying(startTime, endTime)
  };

  WaveformOverview.prototype._onTimeUpdate = function(time) {
    this._playheadLayer.updatePlayheadTime(time);
  };

  WaveformOverview.prototype._onPlay = function(time) {
    this._playheadLayer.updatePlayheadTime(time);
  };

  WaveformOverview.prototype._onPause = function(time) {
    this._playheadLayer.stop(time);
  };

  WaveformOverview.prototype._onZoomviewDisplaying = function(startTime, endTime) {
    this.showHighlight(startTime, endTime);
  };

  WaveformOverview.prototype.showHighlight = function(startTime, endTime) {
    this._highlightLayer.showHighlight(startTime, endTime);
  };

  WaveformOverview.prototype.setHighlightBounds = function(y, height) {
    this._highlightLayer.setHighlightBounds(y, height)
  };

  WaveformOverview.prototype._onWindowResize = function() {
    //
    // After merge changes from SEGMENTS PANELS, it seems like the following
    // commented-out block of code is no longer needed.
    //
    // Note that I made changes to this commented-out block in the GENEDIT
    // branch.
    //
    // TODO So just make sure resizing the window still works as expected.
    //

    // var self = this;

    // if (self._resizeTimeoutId) {
    //   clearTimeout(self._resizeTimeoutId);
    //   self._resizeTimeoutId = null;
    // }

    // // Avoid resampling waveform data to zero width
    // if (self._container.clientWidth !== 0) {
    //   self._width = self._container.clientWidth;
    //   self._stage.setWidth(self._width);

    //   self._resizeTimeoutId = setTimeout(function() {
    //     if (self._originalWaveformData.duration === 0) {
    //       return
    //     }

    //     self._width = self._container.clientWidth;
    //     const options = { width: self._width }
    //     self._data = self._originalWaveformData.resample(options);
    //     this._peaks.options.store.getState().setResampleOptions('overview', options)
    //     self._stage.setWidth(self._width);

    //     self._updateWaveform();
    //   }, 500);
    // }
    this.fitToContainer();
  };

  WaveformOverview.prototype.setWaveformData = function(waveformData) {
    this._originalWaveformData = waveformData;

    if (this._width !== 0) {
      this._data = waveformData.resample({ width: this._width });
    }
    else {
      this._data = waveformData;
    }

    this._updateWaveform();
  };

  /**
   * Returns the pixel index for a given time, for the current zoom level.
   *
   * @param {Number} time Time, in seconds.
   * @returns {Number} Pixel index.
   */

  WaveformOverview.prototype.timeToPixels = function(time) {
    if (this._peaks.options.silence) {
      return Math.floor(time / this._peaks.options.silence.duration * this.getWidth())
    }

    return Math.floor(time * this._data.sample_rate / this._data.scale);
  };

  /**
   * Returns the time for a given pixel index, for the current zoom level.
   *
   * @param {Number} pixels Pixel index.
   * @returns {Number} Time, in seconds.
   */

  WaveformOverview.prototype.pixelsToTime = function(pixels) {
    if (this._peaks.options.silence) {
      return pixels / this.getWidth() * this._peaks.options.silence.duration;
    }

    return pixels * this._data.scale / this._data.sample_rate;
  };

  /**
   * @returns {Number} The start position of the waveform shown in the view,
   *   in pixels.
   */

  WaveformOverview.prototype.getFrameOffset = function() {
    return 0;
  };

  /**
   * @returns {Number} The width of the view, in pixels.
   */

  WaveformOverview.prototype.getWidth = function() {
    return this._width;
  };

  /**
   * @returns {Number} The height of the view, in pixels.
   */

  WaveformOverview.prototype.getHeight = function() {
    return this._height;
  };

  /**
   * @returns {Number} The media duration, in seconds.
   */

  WaveformOverview.prototype._getDuration = function() {
    return this._peaks.player.getDuration();
  };

  /**
   * Adjusts the amplitude scale of waveform shown in the view, which allows
   * users to zoom the waveform vertically.
   *
   * @param {Number} scale The new amplitude scale factor
   */

  WaveformOverview.prototype.setAmplitudeScale = function(scale) {
    if (!Utils.isNumber(scale) || !Number.isFinite(scale)) {
      throw new Error('view.setAmplitudeScale(): Scale must be a valid number');
    }

    this._amplitudeScale = scale;

    this._waveformLayer.draw();
    this._segmentsLayer.draw();
  };

  WaveformOverview.prototype.getAmplitudeScale = function() {
    return this._amplitudeScale;
  };

  /**
   * @returns {WaveformData} The view's waveform data.
   */

  WaveformOverview.prototype.getWaveformData = function() {
    return this._data;
  };

  /**
   * Creates a {WaveformShape} object that draws the waveform in the view,
   * and adds it to the wav
   */

  WaveformOverview.prototype._createWaveform = function() {
    this._waveformShape = new WaveformShape({
      color: this._options.overviewWaveformColor,
      view: this,
      peaks: this._peaks,
    });

    this._waveformLayer.add(this._waveformShape);
    this._stage.add(this._waveformLayer);
  };

  WaveformOverview.prototype._createAxisLabels = function() {
    this._axisLayer = new Konva.FastLayer();

    this._axis = new WaveformAxis(this, {
      axisGridlineColor:   this._options.axisGridlineColor,
      axisLabelColor:      this._options.axisLabelColor,
      axisLabelFontFamily: this._options.fontFamily,
      axisLabelFontSize:   this._options.fontSize,
      axisLabelFontStyle:  this._options.fontStyle,
      axisHideTop:         true,
    });

    this._axis.addToLayer(this._axisLayer);
    this._stage.add(this._axisLayer);
  };

  WaveformOverview.prototype.removeHighlightRect = function() {
    this._highlightLayer.removeHighlight();
  };

  WaveformOverview.prototype._updateWaveform = function() {
    this._waveformLayer.draw();
    this._axisLayer.draw();

    var playheadTime = this._peaks.player.getCurrentTime();

    this._playheadLayer.updatePlayheadTime(playheadTime);

    this._highlightLayer.updateHighlight();

    var frameStartTime = 0;
    var frameEndTime   = this.pixelsToTime(this._width);

    this._pointsLayer.updatePoints(frameStartTime, frameEndTime);
    this._segmentsLayer.updateSegments(frameStartTime, frameEndTime);
  };

  WaveformOverview.prototype.setWaveformColor = function(color) {
    this._waveformShape.setWaveformColor(color);
    this._waveformLayer.draw();
  };

  WaveformOverview.prototype.showPlayheadTime = function(show) {
    this._playheadLayer.showPlayheadTime(show);
  };

  WaveformOverview.prototype.setTimeLabelPrecision = function(precision) {
    this._timeLabelPrecision = precision;
    this._playheadLayer.updatePlayheadText();
  };

  WaveformOverview.prototype.formatTime = function(time) {
    return Utils.formatTimecode(time, this._peaks.options.fps || 24);
  };

  WaveformOverview.prototype.enableAutoScroll = function() {
    // The overview waveform doesn't support scrolling,
    // so nothing to do here.
  };

  WaveformOverview.prototype.enableMarkerEditing = function(enable) {
    this._segmentsLayer.enableEditing(enable);
    this._pointsLayer.enableEditing(enable);
  };

  WaveformOverview.prototype.fitToContainer = function() {
    if (this._container.clientWidth === 0 || this._container.clientHeight === 0) {
      return;
    }

    if (this._container.clientWidth !== this._width) {
      this._width = this._container.clientWidth;
      this._stage.setWidth(this._width);

      try {
        const options = { width: this._width }
        this._peaks.options.store.getState().setResampleOptions('overview', options)
        this._data = this._originalWaveformData.resample(options);
        // updateWaveform = true;
      }
      catch (error) {
        // Ignore, and leave this._data as it was
        // The following 2 lines of code were in SEGMENTS PANELS branch.
        //
        // TODO Make sure commenting them out doesn't break stuff.
        //
        // if (this._resizeTimeoutId) {
        //   clearTimeout(this._resizeTimeoutId);
      }

      this._resizeTimeoutId = setTimeout(() => {
        this._data = this._originalWaveformData.resample({ width: this._width });
        this._updateWaveform();
        this._resizeTimeoutId = null;
      }, 500);
    }

    this._height = this._container.clientHeight;
    this._stage.setHeight(this._height);

    this._waveformShape.fitToView();
    this._playheadLayer.fitToView();
    this._segmentsLayer.fitToView();
    this._pointsLayer.fitToView();
    this._highlightLayer.fitToView();

    this._stage.draw();
  };

  WaveformOverview.prototype.setPlayheadLineColor = function(color) {
    this._playheadLayer.setPlayheadLineColor(color)
  }

  WaveformOverview.prototype.getHighlightBounds = function() {
    return this._highlightLayer.getHighlightBounds()
  }

  WaveformOverview.prototype.destroy = function() {
    if (this._resizeTimeoutId) {
      clearTimeout(this._resizeTimeoutId);
    }

    this._peaks.off('player.play', this._onPlay);
    this._peaks.off('player.pause', this._onPause);
    this._peaks.off('player.timeupdate', this._onTimeUpdate);
    this._peaks.off('zoomview.displaying', this._onZoomviewDisplaying);
    this._peaks.off('window_resize', this._onWindowResize);

    this._playheadLayer.destroy();
    this._segmentsLayer.destroy();
    this._pointsLayer.destroy();

    if (this._stage) {
      this._stage.destroy();
      this._stage = null;
    }
  };

  return WaveformOverview;
});

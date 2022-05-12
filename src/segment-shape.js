/**
 * @file
 *
 * Defines the {@link SegmentShape} class.
 *
 * @module segment-shape
 */

define([
  './segment-marker',
  './waveform-shape',
  './store'
], function(
    SegmentMarker,
    WaveformShape,
    store) {
  'use strict';

  var defaultFontFamily = 'sans-serif';
  var defaultFontSize = 10;
  var defaultFontShape = 'normal';

  /**
   * Creates a waveform segment shape with optional start and end markers.
   *
   * @class
   * @alias SegmentShape
   *
   * @param {Segment} segment
   * @param {Peaks} peaks
   * @param {SegmentsLayer} layer
   * @param {WaveformOverview|WaveformZoomView} view
   */

  function SegmentShape(segment, peaks, layer, view) {
    this._segment       = segment;
    this._peaks         = peaks;
    this._layer         = layer;
    this._view          = view;
    this._waveformShape = null;
    this._label         = null;
    this._startMarker   = null;
    this._endMarker     = null;
    this._color         = segment.color;
    this._showWaveform  = !segment.hideWaveform;

    this.getWaveformData = this.getWaveformData.bind(this);

    if (this._showWaveform) {
      this._waveformShape = new WaveformShape({
        color:   segment.color,
        pattern: segment.pattern,
        view:    view,
        segment: segment,
        getWaveformData: segment.waveformId ? this.getWaveformData : undefined,
        paddingTop: this._paddingTop,
        peaks:   peaks,
      });
    }

    this._onMouseEnter = this._onMouseEnter.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
    this._onClick      = this._onClick.bind(this);
    this._getSegmentDetailsHeight = this._getSegmentDetailsHeight.bind(this);

    // Set up event handlers to show/hide the segment label text when the user
    // hovers the mouse over the segment.
    if (this._showWaveform) {
      this._waveformShape.on('mouseenter', this._onMouseEnter);
      this._waveformShape.on('mouseleave', this._onMouseLeave);
      this._waveformShape.on('click', this._onClick);
    }

    // Event handlers for markers
    this._onSegmentHandleDrag      = this._onSegmentHandleDrag.bind(this);
    this._onSegmentHandleDragStart = this._onSegmentHandleDragStart.bind(this);
    this._onSegmentHandleDragEnd   = this._onSegmentHandleDragEnd.bind(this);

    this._label = this._peaks.options.createSegmentLabel({
      segment:    segment,
      view:       this._view.getName(),
      layer:      this._layer,
      fontFamily: this._peaks.options.fontFamily,
      fontSize:   this._peaks.options.fontSize,
      fontStyle:  this._peaks.options.fontStyle
    });

    if (this._label) {
      this._label.hide();
    }

    this._createMarkers();
  }

  SegmentShape.prototype._getSegmentDetailsHeight = function() {
    const trackId = this._peaks.options.trackId
    return this._view.getName() === 'zoomview'
      ? store.getState(this._peaks.context).getSegmentDetailsHeight(trackId)
      : 0;
  },

  SegmentShape.prototype.updatePosition = function() {
    var segmentStartOffset = this._view.timeToPixels(this._segment.startTime);
    var segmentEndOffset   = this._view.timeToPixels(this._segment.endTime);

    var frameStartOffset = this._view.getFrameOffset();

    var startPixel = segmentStartOffset - frameStartOffset;
    var endPixel   = segmentEndOffset   - frameStartOffset;

    var marker = this.getStartMarker();

    if (marker) {
      marker.setX(startPixel - marker.getWidth());
    }

    marker = this.getEndMarker();

    if (marker) {
      marker.setX(endPixel);
    }
  };

  SegmentShape.prototype.getSegment = function() {
    return this._segment;
  };

  SegmentShape.prototype.getStartMarker = function() {
    return this._startMarker;
  };

  SegmentShape.prototype.getEndMarker = function() {
    return this._endMarker;
  };

  SegmentShape.prototype.addToLayer = function(layer) {
    if (this._showWaveform) {
      layer.add(this._waveformShape);
    }

    if (this._label) {
      layer.add(this._label);
    }

    if (this._startMarker) {
      this._startMarker.addToLayer(layer);
    }

    if (this._endMarker) {
      this._endMarker.addToLayer(layer);
    }
  };

  SegmentShape.prototype._createMarkers = function() {
    var editable = this._layer.isEditingEnabled() && this._segment.editable;

    if (!editable) {
      return;
    }

    var startMarker = this._peaks.options.createSegmentMarker({
      segment:      this._segment,
      draggable:    editable,
      startMarker:  true,
      color:        this._peaks.options.segmentStartMarkerColor,
      fontFamily:   this._peaks.options.fontFamily || defaultFontFamily,
      fontSize:     this._peaks.options.fontSize || defaultFontSize,
      fontStyle:    this._peaks.options.fontStyle || defaultFontShape,
      layer:        this._layer,
      view:         this._view.getName(),
      getEndMarker: () => this._endMarker,
      segmentDetailsHeight: this._getSegmentDetailsHeight(),
      context:      this._segment._peaks.options.context
    });

    if (startMarker) {
      this._startMarker = new SegmentMarker({
        layer:        this._layer,
        segment:      this._segment,
        segmentShape: this,
        draggable:    editable,
        startMarker:  true,
        marker:       startMarker,
        onDrag:       this._onSegmentHandleDrag,
        onDragStart:  this._onSegmentHandleDragStart,
        onDragEnd:    this._onSegmentHandleDragEnd,
        getEndMarker: () => this._endMarker
      });
    }

    var endMarker = this._peaks.options.createSegmentMarker({
      segment:      this._segment,
      draggable:    editable,
      startMarker:  false,
      color:        this._peaks.options.segmentEndMarkerColor,
      fontFamily:   this._peaks.options.fontFamily || defaultFontFamily,
      fontSize:     this._peaks.options.fontSize || defaultFontSize,
      fontStyle:    this._peaks.options.fontStyle || defaultFontShape,
      layer:        this._layer,
      view:         this._view.getName(),
      getStartMarker: () => this._startMarker,
      segmentDetailsHeight: this._getSegmentDetailsHeight(),
      context: this._segment._peaks.options.context
    });

    if (endMarker) {
      this._endMarker = new SegmentMarker({
        layer:        this._layer,
        segment:      this._segment,
        segmentShape: this,
        draggable:    editable,
        startMarker:  false,
        marker:       endMarker,
        onDrag:       this._onSegmentHandleDrag,
        onDragStart:  this._onSegmentHandleDragStart,
        onDragEnd:    this._onSegmentHandleDragEnd,
        getStartMarker: () => this._startMarker
      });
    }
  };

  SegmentShape.prototype._onMouseEnter = function() {
    if (this._label) {
      this._label.show();
      this._layer.draw();
    }

    this._peaks.emit('segments.mouseenter', this._segment);
  };

  SegmentShape.prototype._onMouseLeave = function() {
    if (this._label) {
      this._label.hide();
      this._layer.draw();
    }

    this._peaks.emit('segments.mouseleave', this._segment);
  };

  SegmentShape.prototype._onClick = function(e) {
    this._peaks.emit('segments.click', this._segment, e.evt);
  };

  /**
   * @param {SegmentMarker} segmentMarker
   */

  SegmentShape.prototype._onSegmentHandleDrag = function(segmentMarker) {
    var frameOffset = this._view.getFrameOffset();
    var width = this._view.getWidth();

    var startMarker = segmentMarker.isStartMarker();

    var startMarkerX = this._startMarker.getX();
    var endMarkerX = this._endMarker.getX();

    if (startMarker && startMarkerX >= 0) {
      var startMarkerOffset = frameOffset +
                              startMarkerX +
                              this._startMarker.getWidth();

      this._segment._setStartTime(this._view.pixelsToTime(startMarkerOffset));

      segmentMarker.timeUpdated(this._segment.startTime);
    }

    if (!startMarker && endMarkerX < width) {
      var endMarkerOffset = frameOffset + endMarkerX;

      this._segment._setEndTime(this._view.pixelsToTime(endMarkerOffset));

      segmentMarker.timeUpdated(this._segment.endTime);
    }

    this._peaks.emit('segments.dragged', this._segment, startMarker);
  };

  /**
   * @param {SegmentMarker} segmentMarker
   */

  SegmentShape.prototype._onSegmentHandleDragStart = function(segmentMarker) {
    var startMarker = segmentMarker.isStartMarker();

    this._peaks.emit('segments.dragstart', this._segment, startMarker);
  };

  /**
   * @param {SegmentMarker} segmentMarker
   */

  SegmentShape.prototype._onSegmentHandleDragEnd = function(segmentMarker) {
    var startMarker = segmentMarker.isStartMarker();

    this._peaks.emit('segments.dragend', this._segment, startMarker);
  };

  SegmentShape.prototype.getWaveformData = function() {
    const view = this._view.getName()

    const state = store.getState(this._peaks.context);

    const waveform = state.getWaveformById(view, this._segment.waveformId, this._segment.id)

    if (waveform && waveform.data) {
      return waveform.data;
    }

    if (this.viewName === 'overview') {
      return null;
    }

    const originalWaveform = state.getOriginalWaveformById('zoomview', this._segment.waveformId)

    if (originalWaveform) {
      return originalWaveform;
    }

    const silentWaveform = state.getSilentWaveform();

    return silentWaveform;
  };

  SegmentShape.prototype.fitToView = function() {
    if (this._startMarker) {
      this._startMarker.fitToView();
    }

    if (this._endMarker) {
      this._endMarker.fitToView();
    }

    if (this._showWaveform) {
      this._waveformShape.setWaveformColor(this._color);
    }
  };

  SegmentShape.prototype.hide = function() {
    if (this._startMarker) {
      this._startMarker.hide();
    }

    if (this._endMarker) {
      this._endMarker.hide();
    }
  };

  SegmentShape.prototype.destroy = function() {
    if (this._showWaveform) {
      this._waveformShape.destroy();
    }

    if (this._label) {
      this._label.destroy();
    }

    if (this._startMarker) {
      this._startMarker.destroy();
    }

    if (this._endMarker) {
      this._endMarker.destroy();
    }
  };

  return SegmentShape;
});

/**
 * @file
 *
 * Defines the {@link SegmentMarker} class.
 *
 * @module segment-marker
 */

define([
  'konva'
], function(Konva) {
  'use strict';

  /**
   * Parameters for the {@link SegmentMarker} constructor.
   *
   * @typedef {Object} SegmentMarkerOptions
   * @global
   * @property {Segment} segment
   * @property {SegmentShape} segmentShape
   * @property {Boolean} draggable If true, marker is draggable.
   * @property {Boolean} startMarker If <code>true</code>, the marker indicates
   *   the start time of the segment. If <code>false</code>, the marker
   *   indicates the end time of the segment.
   * @property {Function} onDrag
   * @property {Function} onDragStart
   * @property {Function} onDragEnd
   */

  /**
   * Creates a Left or Right side segment handle marker.
   *
   * @class
   * @alias SegmentMarker
   *
   * @param {SegmentMarkerOptions} options
   */

  function SegmentMarker(options) {
    this._segment       = options.segment;
    this._marker        = options.marker;
    this._segmentShape  = options.segmentShape;
    this._draggable     = options.draggable;
    this._layer         = options.layer;
    this._startMarker   = options.startMarker;

    // TODO add this to peaks.options
    this._handleDrag    = false;

    this._onDrag      = options.onDrag;
    this._onDragStart = options.onDragStart;
    this._onDragEnd   = options.onDragEnd;

    this._dragBoundFunc = this._dragBoundFunc.bind(this);

    this._group = new Konva.Group({
      draggable:     this._draggable,
      dragBoundFunc: this._dragBoundFunc
    });

    this._bindDefaultEventHandlers();

    this._marker.init(this._group);
  }

  SegmentMarker.prototype._bindDefaultEventHandlers = function() {
    var self = this;

    if (self._draggable && self._handleDrag) {
      self._group.on('dragmove', function(/*event*/) {
        self._onDrag(self);
        // window.onPeaksDragMouseMove(event, self)
      });

      self._group.on('dragstart', function(event) {
        self.isAltKeyDownWhenMouseDown = event.evt.altKey
        self.initDragTargetX = event.target.getX()
        self._onDragStart(self);
        // window.onPeaksDragMouseDown(event, self)
      });

      self._group.on('dragend', function() {
        self._onDragEnd(self);
      });
    }
  };

  SegmentMarker.prototype._dragBoundFunc = function(pos) {
    var marker;
    var limit;

    const slowDownFactor = this.isAltKeyDownWhenMouseDown ? 1 / 10 : 1
    let posX = (pos.x - (this.initDragTargetX || 0)) * slowDownFactor + (this.initDragTargetX || 0)

    if (this._startMarker) {
      marker = this._segmentShape.getEndMarker();
      limit  = marker.getX() - marker.getWidth();

      if (posX > limit) {
        posX = limit;
      }
    }
    else {
      marker = this._segmentShape.getStartMarker();
      limit  = marker.getX() + marker.getWidth();

      if (posX < limit) {
        posX = limit;
      }
    }


    return {
      x: posX,
      y: this._group.getAbsolutePosition().y
    };
  };

  SegmentMarker.prototype.addToLayer = function(layer) {
    layer.add(this._group);
  };

  SegmentMarker.prototype.fitToView = function() {
    this._marker.fitToView();
  };

  SegmentMarker.prototype.getSegment = function() {
    return this._segment;
  };

  SegmentMarker.prototype.getX = function() {
    return this._group.getX();
  };

  SegmentMarker.prototype.getWidth = function() {
    return this._group.getWidth();
  };

  SegmentMarker.prototype.isStartMarker = function() {
    return this._startMarker;
  };

  SegmentMarker.prototype.setX = function(x) {
    this._group.setX(x);
  };

  SegmentMarker.prototype.timeUpdated = function(time) {
    if (this._marker.timeUpdated) {
      this._marker.timeUpdated(time);
    }
  };

  SegmentMarker.prototype.hide = function() {
    this._group.hide();
  };

  SegmentMarker.prototype.destroy = function() {
    if (this._marker.destroy) {
      this._marker.destroy();
    }

    this._group.destroyChildren();
    this._group.destroy();
  };

  return SegmentMarker;
});

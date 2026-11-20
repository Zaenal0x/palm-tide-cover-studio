// layouts.js — panel geometry for PALM TIDE Cover Studio.
// Every layout returns rects in normalised 0..1 space plus the index of its
// hero panel. The Mosaic is the signature layout: one big character panel
// anchoring the frame, staggered photo panels filling every other edge.
(function () {
  'use strict';

  function mosaic(aspect) {
    if (aspect >= 0.9) {
      // Landscape / square: character hero down the left, stagger to the right.
      return {
        hero: 0,
        rects: [
          { x: 0, y: 0, w: 0.42, h: 1 },
          { x: 0.42, y: 0, w: 0.29, h: 0.52 },
          { x: 0.71, y: 0, w: 0.29, h: 0.52 },
          { x: 0.42, y: 0.52, w: 0.58, h: 0.23 },
          { x: 0.42, y: 0.75, w: 0.29, h: 0.25 },
          { x: 0.71, y: 0.75, w: 0.29, h: 0.25 }
        ]
      };
    }
    // Portrait: character hero across the top, stagger below.
    return {
      hero: 0,
      rects: [
        { x: 0, y: 0, w: 1, h: 0.42 },
        { x: 0, y: 0.42, w: 0.52, h: 0.29 },
        { x: 0.52, y: 0.42, w: 0.48, h: 0.29 },
        { x: 0, y: 0.71, w: 1, h: 0.13 },
        { x: 0, y: 0.84, w: 0.52, h: 0.16 },
        { x: 0.52, y: 0.84, w: 0.48, h: 0.16 }
      ]
    };
  }

  function hero() {
    return {
      hero: 0,
      rects: [
        { x: 0, y: 0, w: 1, h: 0.66 },
        { x: 0, y: 0.66, w: 1 / 3, h: 0.34 },
        { x: 1 / 3, y: 0.66, w: 1 / 3, h: 0.34 },
        { x: 2 / 3, y: 0.66, w: 1 / 3, h: 0.34 }
      ]
    };
  }

  function comic() {
    return {
      hero: 0,
      rects: [
        { x: 0, y: 0, w: 0.56, h: 0.58 },
        { x: 0.56, y: 0, w: 0.44, h: 0.58 },
        { x: 0, y: 0.58, w: 0.44, h: 0.42 },
        { x: 0.44, y: 0.58, w: 0.56, h: 0.42 }
      ]
    };
  }

  function grid9() {
    var rects = [];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
      rects.push({ x: c / 3, y: r / 3, w: 1 / 3, h: 1 / 3 });
    }
    return { hero: 4, rects: rects };
  }

  function single() { return { hero: 0, rects: [{ x: 0, y: 0, w: 1, h: 1 }] }; }

  function duo() {
    return { hero: 0, rects: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }] };
  }

  function trio() {
    return {
      hero: 0,
      rects: [
        { x: 0, y: 0, w: 0.52, h: 1 },
        { x: 0.52, y: 0, w: 0.48, h: 0.5 },
        { x: 0.52, y: 0.5, w: 0.48, h: 0.5 }
      ]
    };
  }

  function quad() {
    return {
      hero: 0,
      rects: [
        { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
      ]
    };
  }

  var LAYOUTS = {
    mosaic: { label: 'Mosaic — Character Key Art', build: mosaic },
    hero: { label: 'Hero + Strip', build: hero },
    comic: { label: 'Comic Quad', build: comic },
    grid9: { label: '9-Panel Grid', build: grid9 },
    single: { label: '1 Panel', build: single },
    duo: { label: '2 Panels', build: duo },
    trio: { label: '3 Panels', build: trio },
    quad: { label: '4 Panels', build: quad }
  };

  window.PTL = { LAYOUTS: LAYOUTS };
})();

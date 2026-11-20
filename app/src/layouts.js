// layouts.js — panel geometry for every cover layout, as fractions of the
// cover frame. The composer insets each rect by half the layout gutter, so
// mosaic gutters stay hairline and the photo field runs edge to edge.

export const TAGS = [
  { place: 'PALM BOULEVARD', time: 'GOLDEN HOUR', sub: 'Convertible Row' },
  { place: 'DOWNTOWN', time: 'DUSK', sub: 'Skyline Rooftop' },
  { place: 'NEON DISTRICT', time: 'MIDNIGHT', sub: 'After Hours' },
  { place: 'MARINA BAY', time: 'SUNSET', sub: 'Pier Nine' },
  { place: 'VICE BEACH', time: 'AFTERNOON', sub: 'Ocean Drive' },
  { place: 'THE PIER', time: 'BLUE HOUR', sub: 'Boardwalk' },
  { place: 'LITTLE HAVANA', time: 'NOON', sub: 'Calle Ocho' },
  { place: 'STAR ISLAND', time: 'DAWN', sub: 'Millionaire Row' },
  { place: 'SOUTH POINTE', time: 'DUSK', sub: 'Lifeguard Post' },
];

const P = (x, y, w, h, extra = {}) => ({ x, y, w, h, ...extra });

export const LAYOUTS = {
  mosaic: {
    name: 'Mosaic',
    gutter: 3,
    titlePos: 'center',
    panels: [
      P(0, 0, 0.42, 1, { hero: true }),
      P(0.42, 0, 0.29, 0.5),
      P(0.71, 0, 0.29, 0.5),
      P(0.42, 0.5, 0.19, 0.5),
      P(0.61, 0.5, 0.19, 0.5),
      P(0.80, 0.5, 0.20, 0.5),
    ],
  },
  hero: {
    name: 'Hero',
    gutter: 10,
    titlePos: 'top',
    panels: [
      P(0, 0, 0.58, 1, { hero: true }),
      P(0.58, 0, 0.42, 0.5, { tilt: 0.035 }),
      P(0.58, 0.5, 0.42, 0.5, { tilt: -0.035 }),
    ],
  },
  comic: {
    name: 'Comic',
    gutter: 10,
    titlePos: 'top',
    panels: [
      P(0, 0, 1, 0.42, { hero: true }),
      P(0, 0.42, 0.34, 0.58),
      P(0.34, 0.42, 0.33, 0.58),
      P(0.67, 0.42, 0.33, 0.58),
    ],
  },
  nine: {
    name: '9-Panel',
    gutter: 8,
    titlePos: 'top',
    panels: [
      P(0, 0, 1 / 3, 1 / 3), P(1 / 3, 0, 1 / 3, 1 / 3), P(2 / 3, 0, 1 / 3, 1 / 3),
      P(0, 1 / 3, 1 / 3, 1 / 3), P(1 / 3, 1 / 3, 1 / 3, 1 / 3, { hero: true }), P(2 / 3, 1 / 3, 1 / 3, 1 / 3),
      P(0, 2 / 3, 1 / 3, 1 / 3), P(1 / 3, 2 / 3, 1 / 3, 1 / 3), P(2 / 3, 2 / 3, 1 / 3, 1 / 3),
    ],
  },
  one: {
    name: '1-Panel',
    gutter: 0,
    titlePos: 'top',
    panels: [P(0, 0, 1, 1, { hero: true })],
  },
  two: {
    name: '2-Panel',
    gutter: 8,
    titlePos: 'top',
    panels: [P(0, 0, 0.5, 1, { hero: true }), P(0.5, 0, 0.5, 1)],
  },
  three: {
    name: '3-Panel',
    gutter: 8,
    titlePos: 'top',
    panels: [P(0, 0, 1 / 3, 1), P(1 / 3, 0, 1 / 3, 1, { hero: true }), P(2 / 3, 0, 1 / 3, 1)],
  },
  four: {
    name: '4-Panel',
    gutter: 8,
    titlePos: 'top',
    panels: [
      P(0, 0, 0.5, 0.5, { hero: true }), P(0.5, 0, 0.5, 0.5),
      P(0, 0.5, 0.5, 0.5), P(0.5, 0.5, 0.5, 0.5),
    ],
  },
};

export const LAYOUT_KEYS = Object.keys(LAYOUTS);

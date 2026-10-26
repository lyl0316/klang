// The 47 Swiss cities from Sheng's Switzerland location filter (screenshot, 2026-10-25).
// `snapshot` is the upcoming-concert count Sheng showed for that city; the demo
// generator reproduces exactly these counts for the window starting DEMO_ANCHOR.
// Coordinates are approximate town centres (WGS84), used only for the schematic map.

export const CANTONS = {
  AG: 'Aargau', AR: 'Appenzell Ausserrhoden', BE: 'Bern', BL: 'Basel-Landschaft',
  BS: 'Basel-Stadt', FR: 'Fribourg', GE: 'Geneva', GL: 'Glarus', GR: 'Graubünden',
  JU: 'Jura', LU: 'Lucerne', NE: 'Neuchâtel', OW: 'Obwalden', SG: 'St. Gallen',
  SH: 'Schaffhausen', SO: 'Solothurn', SZ: 'Schwyz', TG: 'Thurgau', TI: 'Ticino',
  VD: 'Vaud', VS: 'Valais', ZG: 'Zug', ZH: 'Zurich',
};

export const CITIES = [
  { id: 'zurich', name: 'Zurich', canton: 'ZH', lat: 47.3769, lon: 8.5417, snapshot: 355 },
  { id: 'geneva', name: 'Geneva', canton: 'GE', lat: 46.2044, lon: 6.1432, snapshot: 130 },
  { id: 'basel', name: 'Basel', canton: 'BS', lat: 47.5596, lon: 7.5886, snapshot: 123 },
  { id: 'winterthur', name: 'Winterthur', canton: 'ZH', lat: 47.4988, lon: 8.7237, snapshot: 65 },
  { id: 'bern', name: 'Bern', canton: 'BE', lat: 46.948, lon: 7.4474, snapshot: 58 },
  { id: 'lucerne', name: 'Lucerne', canton: 'LU', lat: 47.0502, lon: 8.3093, snapshot: 46 },
  { id: 'lausanne', name: 'Lausanne', canton: 'VD', lat: 46.5197, lon: 6.6323, snapshot: 15 },
  { id: 'trogen', name: 'Trogen', canton: 'AR', lat: 47.4078, lon: 9.4647, snapshot: 9 },
  { id: 'kriens', name: 'Kriens', canton: 'LU', lat: 47.0336, lon: 8.2775, snapshot: 4 },
  { id: 'sion', name: 'Sion', canton: 'VS', lat: 46.2331, lon: 7.3606, snapshot: 3 },
  { id: 'st-gallen', name: 'St. Gallen', canton: 'SG', lat: 47.4245, lon: 9.3767, snapshot: 3 },
  { id: 'chur', name: 'Chur', canton: 'GR', lat: 46.8499, lon: 9.5329, snapshot: 2 },
  { id: 'fribourg', name: 'Fribourg', canton: 'FR', lat: 46.8065, lon: 7.162, snapshot: 2 },
  { id: 'lugano', name: 'Lugano', canton: 'TI', lat: 46.0037, lon: 8.9511, snapshot: 2 },
  { id: 'schaffhausen', name: 'Schaffhausen', canton: 'SH', lat: 47.6973, lon: 8.6349, snapshot: 2 },
  { id: 'bex', name: 'Bex', canton: 'VD', lat: 46.25, lon: 7.0094, snapshot: 1 },
  { id: 'brugg', name: 'Brugg', canton: 'AG', lat: 47.481, lon: 8.2083, snapshot: 1 },
  { id: 'dietikon', name: 'Dietikon', canton: 'ZH', lat: 47.4017, lon: 8.4001, snapshot: 1 },
  { id: 'dudingen', name: 'Düdingen', canton: 'FR', lat: 46.849, lon: 7.188, snapshot: 1 },
  { id: 'engelberg', name: 'Engelberg', canton: 'OW', lat: 46.8199, lon: 8.4034, snapshot: 1 },
  { id: 'frauenfeld', name: 'Frauenfeld', canton: 'TG', lat: 47.5536, lon: 8.8987, snapshot: 1 },
  { id: 'herisau', name: 'Herisau', canton: 'AR', lat: 47.3861, lon: 9.2792, snapshot: 1 },
  { id: 'la-chaux-de-fonds', name: 'La Chaux-de-Fonds', canton: 'NE', lat: 47.0999, lon: 6.8259, snapshot: 1 },
  { id: 'liestal', name: 'Liestal', canton: 'BL', lat: 47.484, lon: 7.7346, snapshot: 1 },
  { id: 'lutry', name: 'Lutry', canton: 'VD', lat: 46.503, lon: 6.687, snapshot: 1 },
  { id: 'mels', name: 'Mels', canton: 'SG', lat: 47.0466, lon: 9.4211, snapshot: 1 },
  { id: 'neuchatel', name: 'Neuchâtel', canton: 'NE', lat: 46.99, lon: 6.9293, snapshot: 1 },
  { id: 'olten', name: 'Olten', canton: 'SO', lat: 47.35, lon: 7.9033, snapshot: 1 },
  { id: 'porrentruy', name: 'Porrentruy', canton: 'JU', lat: 47.4155, lon: 7.0755, snapshot: 1 },
  { id: 'riehen', name: 'Riehen', canton: 'BS', lat: 47.5788, lon: 7.6468, snapshot: 1 },
  { id: 'romainmotier', name: 'Romainmôtier', canton: 'VD', lat: 46.6936, lon: 6.4614, snapshot: 1 },
  { id: 'saanen', name: 'Saanen', canton: 'BE', lat: 46.4893, lon: 7.26, snapshot: 1 },
  { id: 'saint-maurice', name: 'Saint-Maurice', canton: 'VS', lat: 46.2183, lon: 7.0034, snapshot: 1 },
  { id: 'vernier', name: 'Vernier', canton: 'GE', lat: 46.217, lon: 6.085, snapshot: 1 },
  { id: 'zug', name: 'Zug', canton: 'ZG', lat: 47.1662, lon: 8.5155, snapshot: 1 },
  { id: 'aarau', name: 'Aarau', canton: 'AG', lat: 47.3925, lon: 8.0444, snapshot: 0 },
  { id: 'ascona', name: 'Ascona', canton: 'TI', lat: 46.1573, lon: 8.7726, snapshot: 0 },
  { id: 'einsiedeln', name: 'Einsiedeln', canton: 'SZ', lat: 47.1285, lon: 8.7474, snapshot: 0 },
  { id: 'glarus', name: 'Glarus', canton: 'GL', lat: 47.0404, lon: 9.0679, snapshot: 0 },
  { id: 'gstaad', name: 'Gstaad', canton: 'BE', lat: 46.475, lon: 7.2861, snapshot: 0 },
  { id: 'kusnacht', name: 'Küsnacht', canton: 'ZH', lat: 47.318, lon: 8.583, snapshot: 0 },
  { id: 'locarno', name: 'Locarno', canton: 'TI', lat: 46.1709, lon: 8.7995, snapshot: 0 },
  { id: 'montreux', name: 'Montreux', canton: 'VD', lat: 46.4312, lon: 6.9107, snapshot: 0 },
  { id: 'mezieres', name: 'Mézières', canton: 'VD', lat: 46.594, lon: 6.768, snapshot: 0 },
  { id: 'pully', name: 'Pully', canton: 'VD', lat: 46.51, lon: 6.662, snapshot: 0 },
  { id: 'teufen', name: 'Teufen', canton: 'AR', lat: 47.39, lon: 9.387, snapshot: 0 },
  { id: 'verbier', name: 'Verbier', canton: 'VS', lat: 46.096, lon: 7.2286, snapshot: 0 },
];

// Very rough, hand-drawn outline of Switzerland as [lon, lat] points. It is only a
// visual backdrop for the bubble map; it is not geographically precise.
export const SWISS_OUTLINE = [
  [5.96, 46.14], [6.12, 46.40], [6.38, 46.71], [6.47, 46.91], [6.75, 47.06], [6.95, 47.20],
  [7.00, 47.32], [6.88, 47.37], [6.98, 47.47], [7.13, 47.50], [7.43, 47.46], [7.56, 47.59],
  [7.70, 47.55], [8.10, 47.56], [8.23, 47.61], [8.40, 47.65], [8.57, 47.81], [8.73, 47.72],
  [8.88, 47.66], [9.18, 47.66], [9.56, 47.53], [9.55, 47.30], [9.48, 47.06], [9.60, 47.05],
  [9.87, 46.99], [10.10, 46.86], [10.47, 46.97], [10.45, 46.55], [10.15, 46.40], [10.15, 46.25],
  [9.95, 46.38], [9.70, 46.33], [9.28, 46.50], [9.04, 46.04], [9.03, 45.82], [8.95, 45.95],
  [8.80, 46.10], [8.72, 46.10], [8.45, 46.25], [8.15, 46.25], [7.86, 45.92], [7.04, 45.92],
  [6.80, 46.13], [6.80, 46.40], [6.52, 46.45], [6.25, 46.35], [6.17, 46.30], [6.10, 46.15],
];

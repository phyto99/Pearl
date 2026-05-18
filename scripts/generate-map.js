#!/usr/bin/env node
/**
 * Generates all philosophy maps for the gallery.
 *
 * CRITICAL: Creatures move into Air (0), NOT Water (9).
 *   Water (9) is a physics element that falls/spreads — it blocks all
 *   creature movement because their XML only checks for element 0 (Air).
 *   The ocean MUST be Air. Water should never appear in marine maps.
 *
 * FOOD WEB:
 *   Orca (11) eats SeaLion (12) + SeaOtter (14)  — threshold 60
 *   SeaLion (12) eats Cod (16) + Squid (17)       — threshold 55
 *   Octopus (13) eats Crab (18) + SeaUrchin (15)  — threshold 65
 *   SeaOtter (14) eats SeaUrchin (15) + Crab (18) — threshold 50
 *   SeaUrchin (15): reproduces 1-in-8  (fastest)
 *   Crab (18):      reproduces 1-in-10
 *   Squid (17):     reproduces 1-in-18
 *   Cod (16):       reproduces 1-in-20 (slowest)
 *
 * STABLE STARTING TARGETS (in ~4000 Air cells of a 75×75 world):
 *   SeaUrchin ~200, Crab ~180, Squid ~150, Cod ~120 — total prey ~650
 *   SeaOtter ~60, Octopus ~60, SeaLion ~50, Orca ~25 — total predators ~195
 *   Ratio ~1 predator : 3.3 prey — validated against LV demo in ca-philosophy.html
 *   Cross-predation (Crab/Urchin eaten by BOTH Octopus+Otter) creates stability buffer.
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 75, H = 75;

// Element indices (match starterblocks.js)
const AIR = 0, WALL = 1, CITY = 2, HARBOR = 3, HOME_HARBOR = 4,
      HOME_ISLAND = 5, ISLAND = 6, SHIP = 7, TRAIL = 8, WATER = 9, SAND = 10,
      ORCA = 11, SEA_LION = 12, OCTOPUS = 13, SEA_OTTER = 14,
      SEA_URCHIN = 15, COD = 16, SQUID = 17, CRAB = 18;

// Thumbnail colors — Air shown as ocean-blue so maps are readable
const THUMB_COLORS = [
  [160, 200, 240],  // 0  Air → ocean blue
  [23,  28,  25 ],  // 1  Wall
  [85,  85,  85 ],  // 2  City
  [139, 69,  19 ],  // 3  Harbor
  [75,  0,   130],  // 4  HomeHarbor
  [50,  205, 50 ],  // 5  HomeIsland
  [34,  80,  34 ],  // 6  Island
  [0,   102, 255],  // 7  Ship
  [68,  136, 255],  // 8  Trail
  [53,  87,  240],  // 9  Water (won't appear)
  [224, 202, 158],  // 10 Sand
  [0,   206, 209],  // 11 Orca
  [148, 0,   211],  // 12 SeaLion
  [255, 0,   255],  // 13 Octopus
  [255, 215, 0  ],  // 14 SeaOtter
  [255, 140, 0  ],  // 15 SeaUrchin
  [139, 90,  30 ],  // 16 Cod
  [127, 255, 0  ],  // 17 Squid
  [220, 20,  60 ],  // 18 Crab
];

// ── Grid helpers ─────────────────────────────────────────────────────────────
function makeGrid()           { return new Array(W * H).fill(AIR); }
function idx(x, y)            { return y * W + x; }
function dist(x1,y1,x2,y2)   { return Math.sqrt((x2-x1)**2+(y2-y1)**2); }
function inBounds(x, y)       { return x >= 0 && x < W && y >= 0 && y < H; }

// deterministic LCG so maps are reproducible
function makePrng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
}

function placeIsland(grid, cx, cy, r, type = ISLAND) {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (dist(x, y, cx, cy) <= r) grid[idx(x, y)] = type;
}

function addWallBorder(grid) {
  const SOLID = new Set([ISLAND, HOME_ISLAND, CITY, HARBOR, HOME_HARBOR]);
  const toWall = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[idx(x,y)] !== AIR) continue;
      for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx=x+dx, ny=y+dy;
        if (inBounds(nx,ny) && SOLID.has(grid[idx(nx,ny)])) { toWall.push(idx(x,y)); break; }
      }
    }
  }
  for (const i of toWall) grid[i] = WALL;
}

function setIfAir(grid, x, y, type) {
  if (inBounds(x,y) && grid[idx(x,y)] === AIR) grid[idx(x,y)] = type;
}

function setIfIsland(grid, x, y, type) {
  const c = grid[idx(x,y)];
  if (inBounds(x,y) && (c===ISLAND||c===HOME_ISLAND)) grid[idx(x,y)] = type;
}

function findCoast(grid, cx, cy, r, dx, dy) {
  for (let i = r; i >= 1; i--) {
    const x=cx+dx*i, y=cy+dy*i;
    if (!inBounds(x,y)) continue;
    const c = grid[idx(x,y)];
    if (c!==ISLAND && c!==HOME_ISLAND) continue;
    const nx=x+dx, ny=y+dy;
    if (!inBounds(nx,ny) || grid[idx(nx,ny)]===AIR||grid[idx(nx,ny)]===WALL)
      return [x,y];
  }
  return null;
}

// Scatter N copies of a creature into Air cells, avoiding clustered islands
function scatter(grid, rng, type, count) {
  let placed = 0, attempts = 0;
  while (placed < count && attempts < count * 20) {
    attempts++;
    const x = 1 + Math.floor(rng() * (W-2));
    const y = 1 + Math.floor(rng() * (H-2));
    if (grid[idx(x,y)] === AIR) { grid[idx(x,y)] = type; placed++; }
  }
}

// Scatter creatures preferentially near a given center point
function scatterNear(grid, rng, type, count, cx, cy, sigma) {
  let placed=0, attempts=0;
  while (placed < count && attempts < count*30) {
    attempts++;
    const x = Math.round(cx + (rng()-0.5)*2*sigma);
    const y = Math.round(cy + (rng()-0.5)*2*sigma);
    if (inBounds(x,y) && grid[idx(x,y)] === AIR) { grid[idx(x,y)] = type; placed++; }
  }
}

// Scatter in horizontal band (y1..y2)
function scatterBand(grid, rng, type, count, y1, y2) {
  let placed=0, attempts=0;
  while (placed < count && attempts < count*20) {
    attempts++;
    const x = 1 + Math.floor(rng()*(W-2));
    const y = y1 + Math.floor(rng()*(y2-y1+1));
    if (inBounds(x,y) && grid[idx(x,y)] === AIR) { grid[idx(x,y)] = type; placed++; }
  }
}

function buildSands(grid, rng) {
  const s = new Uint8Array(W * H * 4);
  for (let i = 0; i < W*H; i++) {
    s[i*4+0] = grid[i];
    s[i*4+1] = Math.floor(rng()*100);
    s[i*4+2] = 0;
    s[i*4+3] = 0;
  }
  return s;
}

// ── PNG writer ────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c;}
  return t;
})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_TABLE[(c^b[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function pngChunk(type,data){const t=Buffer.from(type,'ascii'),l=Buffer.alloc(4),cb=Buffer.alloc(4);l.writeUInt32BE(data.length);cb.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([l,t,data,cb]);}

function generatePNG(grid, scale=4) {
  const pW=W*scale, pH=H*scale;
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(pW,0);ihdr.writeUInt32BE(pH,4);ihdr[8]=8;ihdr[9]=2;
  const raw=Buffer.alloc(pH*(1+pW*3));
  for(let gy=0;gy<H;gy++){
    const base=THUMB_COLORS[grid[idx(0,gy)]]||[0,0,0]; // unused
    for(let sy=0;sy<scale;sy++){
      const row=(gy*scale+sy)*(1+pW*3);
      raw[row]=0; // filter None
      for(let gx=0;gx<W;gx++){
        const c=THUMB_COLORS[grid[idx(gx,gy)]]||[0,0,0];
        for(let sx=0;sx<scale;sx++){
          const di=row+1+(gx*scale+sx)*3;
          raw[di]=c[0];raw[di+1]=c[1];raw[di+2]=c[2];
        }
      }
    }
  }
  const comp=zlib.deflateSync(raw,{level:6});
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',ihdr),pngChunk('IDAT',comp),pngChunk('IEND',Buffer.alloc(0))]);
}

// ── All 19 elements enabled ───────────────────────────────────────────────────
const ALL_ENABLED = new Array(19).fill(false);

function saveMap(id, title, description, philosophy, grid, rng) {
  const sands = buildSands(grid, rng);
  const data = { id, title, description, philosophy, createdAt: '2026-05-17T00:00:00Z', worldWidth: W, worldHeight: H, disabled: ALL_ENABLED, sandsBase64: Buffer.from(sands).toString('base64') };
  fs.writeFileSync(path.join(mapsDir, `${id}.json`), JSON.stringify(data));
  fs.writeFileSync(path.join(thumbDir, `${id}.png`), generatePNG(grid, 4));
  console.log(`✓ ${id}: ${title}`);
  return { id, title, description, philosophy, createdAt: '2026-05-17T00:00:00Z', thumbnail: `/maps/thumbnails/${id}.png` };
}

const mapsDir = path.join(__dirname,'..','public','maps');
const thumbDir = path.join(mapsDir,'thumbnails');
fs.mkdirSync(thumbDir, { recursive: true });

const manifest = [];

// ═══════════════════════════════════════════════════════════════════════════════
// MAP 001 — Open Ocean  (Local Lotka-Volterra)
// Philosophy: maximum open space, well-mixed populations.
// All creatures evenly scattered. LV waves travel across the whole world.
// The least island coverage → most Air → fastest LV cycle time.
// ═══════════════════════════════════════════════════════════════════════════════
{
  const rng = makePrng(1001);
  const grid = makeGrid(); // all Air by default

  // Minimal geography: home island + two tiny outposts
  placeIsland(grid, 37, 37, 4, HOME_ISLAND);
  placeIsland(grid, 12, 12, 3, ISLAND);
  placeIsland(grid, 62, 60, 3, ISLAND);
  addWallBorder(grid);

  const hc = findCoast(grid, 37, 37, 4, 0, -1);
  if (hc) { setIfIsland(grid, hc[0], hc[1], HOME_HARBOR); setIfIsland(grid, hc[0]+1, hc[1], HOME_HARBOR); }
  const h1 = findCoast(grid, 12, 12, 3, 1, 0);
  if (h1) setIfIsland(grid, h1[0], h1[1], HARBOR);
  const h2 = findCoast(grid, 62, 60, 3, -1, 0);
  if (h2) setIfIsland(grid, h2[0], h2[1], HARBOR);

  // Dense, even scatter — classic LV starting conditions
  // Prey-to-predator ratio ~3.4:1 matches LV demo parameters
  scatter(grid, rng, SEA_URCHIN, 220);
  scatter(grid, rng, CRAB,       190);
  scatter(grid, rng, SQUID,      160);
  scatter(grid, rng, COD,        130);
  scatter(grid, rng, SEA_OTTER,   65);
  scatter(grid, rng, OCTOPUS,     60);
  scatter(grid, rng, SEA_LION,    50);
  scatter(grid, rng, ORCA,        28);

  manifest.push(saveMap('map-001','Open Ocean','Balanced Lotka-Volterra — maximum open space, even predator-prey mix. LV population waves travel freely across the whole world.',
    'Local Lotka-Volterra', grid, rng));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAP 002 — Archipelago  (Energy Budget)
// Philosophy: space is structured; resources cluster near land.
// Prey cluster near islands (energy hotspots). Predators patrol edges.
// Island proximity = metabolic benefit. Further from land = starvation risk.
// ═══════════════════════════════════════════════════════════════════════════════
{
  const rng = makePrng(2002);
  const grid = makeGrid();

  // Rich island geography — six islands of varying sizes
  placeIsland(grid, 20, 40, 5, HOME_ISLAND);
  placeIsland(grid, 56, 17, 7, ISLAND);
  placeIsland(grid, 60, 57, 5, ISLAND);
  placeIsland(grid, 10, 14, 4, ISLAND);
  placeIsland(grid, 13, 62, 4, ISLAND);
  placeIsland(grid, 46, 40, 4, ISLAND);
  addWallBorder(grid);

  // Buildings
  const hc = findCoast(grid, 20, 40, 5, 0, -1);
  if (hc) { setIfIsland(grid, hc[0], hc[1], HOME_HARBOR); setIfIsland(grid, hc[0]+1, hc[1], HOME_HARBOR); }
  setIfIsland(grid, 56, 17, CITY); setIfIsland(grid, 57, 17, CITY);
  const h1 = findCoast(grid, 56, 17, 7, 0, 1); if (h1) setIfIsland(grid, h1[0], h1[1], HARBOR);
  const h2 = findCoast(grid, 56, 17, 7, -1, 0); if (h2) setIfIsland(grid, h2[0], h2[1], HARBOR);
  setIfIsland(grid, 60, 57, CITY);
  const h3 = findCoast(grid, 60, 57, 5, -1, 0); if (h3) setIfIsland(grid, h3[0], h3[1], HARBOR);
  const h4 = findCoast(grid, 10, 14, 4, 1, 0); if (h4) setIfIsland(grid, h4[0], h4[1], HARBOR);
  setIfIsland(grid, 13, 62, CITY);
  const h5 = findCoast(grid, 13, 62, 4, 0, -1); if (h5) setIfIsland(grid, h5[0], h5[1], HARBOR);
  const h6 = findCoast(grid, 46, 40, 4, -1, 0); if (h6) setIfIsland(grid, h6[0], h6[1], HARBOR);

  // Energy budget philosophy: prey cluster near islands (high-energy zones)
  // Predators patrol the edges between island clusters
  const islands = [[20,40],[56,17],[60,57],[10,14],[13,62],[46,40]];
  const preyPerIsland = [38, 30, 28, 22, 22, 22]; // weighted by island size

  islands.forEach(([cx,cy], i) => {
    const n = preyPerIsland[i];
    scatterNear(grid, rng, SEA_URCHIN, n, cx, cy, 8);
    scatterNear(grid, rng, CRAB,       Math.round(n*0.85), cx, cy, 9);
    scatterNear(grid, rng, SQUID,      Math.round(n*0.65), cx, cy, 10);
    scatterNear(grid, rng, COD,        Math.round(n*0.55), cx, cy, 11);
  });
  // Predators in open water between islands
  scatter(grid, rng, SEA_OTTER,  55);
  scatter(grid, rng, OCTOPUS,    55);
  scatter(grid, rng, SEA_LION,   45);
  scatter(grid, rng, ORCA,       22);

  manifest.push(saveMap('map-002','Archipelago','Energy Budget — prey cluster near island coasts (energy hotspots). Predators patrol open water between land. Distance from land = starvation risk.',
    'Energy Budget', grid, rng));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAP 003 — Turing Stripes  (Reaction-Diffusion)
// Philosophy: two-species activator-inhibitor.
// Prey (activator) arranged in horizontal bands; predators (inhibitor) in
// alternating bands. Inhibitor diffuses faster → Turing instability → striped
// patterns persist. Implemented with 2 focal species: Crab vs Octopus.
// Other species present in low density to prevent complete empty zones.
// ═══════════════════════════════════════════════════════════════════════════════
{
  const rng = makePrng(3003);
  const grid = makeGrid();

  // Sparse geography — mostly open, R-D needs space to breathe
  placeIsland(grid, 37, 7, 3, HOME_ISLAND);
  placeIsland(grid, 37, 67, 3, ISLAND);
  placeIsland(grid, 7, 37, 3, ISLAND);
  placeIsland(grid, 67, 37, 3, ISLAND);
  addWallBorder(grid);

  const hc = findCoast(grid, 37, 7, 3, 0, 1); if (hc) setIfIsland(grid, hc[0], hc[1], HOME_HARBOR);
  const h1 = findCoast(grid, 37, 67, 3, 0, -1); if (h1) setIfIsland(grid, h1[0], h1[1], HARBOR);
  const h2 = findCoast(grid, 7, 37, 3, 1, 0); if (h2) setIfIsland(grid, h2[0], h2[1], HARBOR);
  const h3 = findCoast(grid, 67, 37, 3, -1, 0); if (h3) setIfIsland(grid, h3[0], h3[1], HARBOR);

  // Alternating prey/predator horizontal bands — Turing stripe initial condition
  // Bands: prey band (15 rows) → predator band (10 rows) → prey band → …
  // Using Crab (activator) vs Octopus (inhibitor) as the focal pair
  const bandDefs = [
    { y1: 0,  y2: 14, prey: CRAB,      count: 140, predator: null,    pc: 0 },
    { y1: 15, y2: 24, prey: null,       count: 0,   predator: OCTOPUS, pc: 70 },
    { y1: 25, y2: 39, prey: CRAB,      count: 140, predator: null,    pc: 0 },
    { y1: 40, y2: 49, prey: null,       count: 0,   predator: OCTOPUS, pc: 70 },
    { y1: 50, y2: 64, prey: CRAB,      count: 140, predator: null,    pc: 0 },
    { y1: 65, y2: 74, prey: null,       count: 0,   predator: OCTOPUS, pc: 70 },
  ];
  for (const b of bandDefs) {
    if (b.prey)    scatterBand(grid, rng, b.prey,    b.count, b.y1, b.y2);
    if (b.predator) scatterBand(grid, rng, b.predator, b.pc,   b.y1, b.y2);
  }
  // Low-density background fauna to prevent dead zones in pure-inhibitor bands
  scatter(grid, rng, SEA_URCHIN, 60);
  scatter(grid, rng, SQUID,      50);
  scatter(grid, rng, COD,        40);
  scatter(grid, rng, SEA_OTTER,  25);
  scatter(grid, rng, SEA_LION,   20);
  scatter(grid, rng, ORCA,       10);

  manifest.push(saveMap('map-003','Turing Stripes','Reaction-Diffusion — Crab (activator) vs Octopus (inhibitor) in alternating bands. Inhibitor diffuses faster than activator → Turing instability → self-organising stripes persist.',
    'Reaction-Diffusion', grid, rng));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAP 004 — Patch Dynamics  (Spatial Lottery)
// Philosophy: space is the limiting resource. Many isolated water pockets
// separated by island chains. Each pocket = independent lottery.
// Extinction in one patch is offset by reproduction in adjacent patches.
// Coexistence guaranteed because no single predator can dominate all patches.
// ═══════════════════════════════════════════════════════════════════════════════
{
  const rng = makePrng(4004);
  const grid = makeGrid();

  // Grid of islands creating isolated pockets (~5×5 cell each)
  // Island barriers every 13 cells → 5 columns × 5 rows of pockets
  const islandPositions = [
    // Vertical dividers
    [13,5],[13,18],[13,31],[13,44],[13,57],[13,70],
    [26,5],[26,18],[26,31],[26,44],[26,57],[26,70],
    [39,5],[39,18],[39,31],[39,44],[39,57],[39,70],
    [52,5],[52,18],[52,31],[52,44],[52,57],[52,70],
    [65,5],[65,18],[65,31],[65,44],[65,57],[65,70],
    // Horizontal dividers
    [6,13],[19,13],[32,13],[45,13],[58,13],[71,13],
    [6,26],[19,26],[32,26],[45,26],[58,26],[71,26],
    [6,39],[19,39],[32,39],[45,39],[58,39],[71,39],
    [6,52],[19,52],[32,52],[45,52],[58,52],[71,52],
    [6,65],[19,65],[32,65],[45,65],[58,65],[71,65],
  ];
  for (const [cx,cy] of islandPositions) placeIsland(grid, cx, cy, 2, ISLAND);

  // Home island in center pocket
  placeIsland(grid, 6, 6, 2, HOME_ISLAND);
  addWallBorder(grid);

  const hc = findCoast(grid, 6, 6, 2, 1, 0); if (hc) setIfIsland(grid, hc[0], hc[1], HOME_HARBOR);

  // Each pocket gets all 8 species in small amounts — spatial lottery initial cond.
  // Pockets approximately at:
  const pocketCenters = [];
  for (let py = 0; py < 6; py++)
    for (let px = 0; px < 6; px++)
      pocketCenters.push([5 + px*13, 5 + py*13]);

  for (const [cx,cy] of pocketCenters) {
    // Small independent ecosystem per pocket
    scatterNear(grid, rng, SEA_URCHIN, 6,  cx, cy, 3);
    scatterNear(grid, rng, CRAB,       5,  cx, cy, 3);
    scatterNear(grid, rng, SQUID,      4,  cx, cy, 3);
    scatterNear(grid, rng, COD,        3,  cx, cy, 3);
    scatterNear(grid, rng, SEA_OTTER,  2,  cx, cy, 3);
    scatterNear(grid, rng, OCTOPUS,    2,  cx, cy, 3);
    scatterNear(grid, rng, SEA_LION,   1,  cx, cy, 3);
    if (rng() < 0.4) scatterNear(grid, rng, ORCA, 1, cx, cy, 3);
  }

  manifest.push(saveMap('map-004','Patch Dynamics','Spatial Lottery — isolated water pockets divided by island chains. Each pocket runs an independent ecosystem. Extinction in one patch is offset by adjacent pockets. No single predator can sweep the whole world.',
    'Spatial Lottery', grid, rng));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAP 005 — Harbor Routes  (Signalling / Stigmergy)
// Philosophy: the environment mediates interaction. Islands arranged in chains
// with harbor corridors. Creatures concentrate along harbor routes — the harbors
// act as pheromone trails, channelling movement into corridors. Ship trails will
// naturally follow the same corridors, making loop-capture topologically clean.
// ═══════════════════════════════════════════════════════════════════════════════
{
  const rng = makePrng(5005);
  const grid = makeGrid();

  // Three island chains forming a triangular harbor route
  // Chain A: NW→NE (top)
  const chainA = [[8,10],[22,8],[36,10],[50,8],[64,10]];
  // Chain B: NE→SE (right)
  const chainB = [[65,24],[67,38],[65,52],[64,65]];
  // Chain C: SE→NW (bottom-left)
  const chainC = [[50,66],[36,64],[22,66],[10,64]];

  // Home island in center
  placeIsland(grid, 37, 37, 4, HOME_ISLAND);

  for (const [cx,cy] of [...chainA,...chainB,...chainC]) placeIsland(grid, cx, cy, 3, ISLAND);
  addWallBorder(grid);

  // Harbors on the facing sides of each chain island, forming corridors
  const harborDirs = [
    ...chainA.map(([cx,cy]) => [cx, cy, 0, 1]),   // harbor faces south (toward center)
    ...chainB.map(([cx,cy]) => [cx, cy, -1, 0]),  // harbor faces west
    ...chainC.map(([cx,cy]) => [cx, cy, 0, -1]),  // harbor faces north
  ];
  for (const [cx, cy, dx, dy] of harborDirs) {
    const hc = findCoast(grid, cx, cy, 3, dx, dy);
    if (hc) setIfIsland(grid, hc[0], hc[1], HARBOR);
  }
  // Home harbor
  const hh = findCoast(grid, 37, 37, 4, 0, -1);
  if (hh) { setIfIsland(grid, hh[0], hh[1], HOME_HARBOR); setIfIsland(grid, hh[0]+1, hh[1], HOME_HARBOR); }

  // Stigmergy philosophy: creatures cluster along the three corridors
  // Corridor A (between chain A and center): prey lane
  scatterBand(grid, rng, SEA_URCHIN,  55, 10, 25);
  scatterBand(grid, rng, CRAB,        45, 10, 25);
  scatterBand(grid, rng, SQUID,       35, 10, 25);
  scatterBand(grid, rng, COD,         28, 10, 25);

  // Corridor B (right side): mid-level predators hunt here
  for (let y = 20; y < 65; y++)
    for (let x = 45; x < 68; x++)
      if (grid[idx(x,y)] === AIR && rng() < 0.055) {
        const r = rng();
        grid[idx(x,y)] = r < 0.45 ? SEA_URCHIN : r < 0.75 ? CRAB : r < 0.88 ? SEA_OTTER : OCTOPUS;
      }

  // Corridor C (bottom): mixed zone
  scatterBand(grid, rng, SQUID,       30, 50, 68);
  scatterBand(grid, rng, COD,         25, 50, 68);
  scatterBand(grid, rng, SEA_LION,    20, 50, 68);

  // Apex predators (Orca) patrolling the full triangle
  scatter(grid, rng, SEA_OTTER,  30);
  scatter(grid, rng, OCTOPUS,    28);
  scatter(grid, rng, SEA_LION,   22);
  scatter(grid, rng, ORCA,       12);

  manifest.push(saveMap('map-005','Harbor Routes','Signalling / Stigmergy — island chains form triangular harbor corridors. Prey concentrate in lanes. Predators hunt the corridors. Ship trails naturally follow the same routes, making loop-capture topologically clean.',
    'Signalling & Stigmergy', grid, rng));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAP 006 — GoL Clusters  (Density-Counted / Game of Life)
// Philosophy: outcome depends on local count of neighbors, not identity.
// Prey arranged in stable-density clusters (≥3 neighbours → reproduce,
// ≤1 → die of isolation). Predators placed at cluster boundaries where prey
// density crosses the predator's kill threshold. Cluster geometry drives fate.
// ═══════════════════════════════════════════════════════════════════════════════
{
  const rng = makePrng(6006);
  const grid = makeGrid();

  // Minimal geography — GoL needs open space for pattern evolution
  placeIsland(grid, 37, 37, 3, HOME_ISLAND);
  addWallBorder(grid);
  const hc = findCoast(grid, 37, 37, 3, 0, -1);
  if (hc) setIfIsland(grid, hc[0], hc[1], HOME_HARBOR);

  // Place prey in 5×5 dense blocks (GoL "still-life" metaphor)
  // These are separated by corridors where predators sit
  const preyBlocks = [
    [8,8],[8,24],[8,40],[8,56],
    [24,8],[24,24],[24,56],
    [40,8],[40,56],
    [56,8],[56,24],[56,40],[56,56],
  ];
  for (const [bx,by] of preyBlocks) {
    for (let dy=-3; dy<=3; dy++) {
      for (let dx=-3; dx<=3; dx++) {
        const r = rng();
        const type = r<0.35 ? SEA_URCHIN : r<0.60 ? CRAB : r<0.75 ? SQUID : COD;
        setIfAir(grid, bx+dx, by+dy, type);
      }
    }
  }

  // Predators in corridors between blocks — density boundary positions
  const corridors = [
    [16,8],[16,24],[16,40],[16,56],
    [8,16],[24,16],[40,16],[56,16],
    [8,32],[24,32],[56,32],
    [8,48],[24,48],[40,48],[56,48],
    [16,64],[40,64],[56,64],
    [32,8],[32,24],[32,56],[48,8],[48,24],[48,40],[48,56],
    [32,40],[32,48],[32,64],
  ];
  for (const [cx,cy] of corridors) {
    const r = rng();
    const type = r<0.30 ? SEA_OTTER : r<0.55 ? OCTOPUS : r<0.76 ? SEA_LION : ORCA;
    setIfAir(grid, cx, cy, type);
    if (rng()<0.5) setIfAir(grid, cx+1, cy, type);
    if (rng()<0.4) setIfAir(grid, cx, cy+1, type);
  }

  manifest.push(saveMap('map-006','GoL Clusters','Density-Counted / Game of Life — prey in dense 5×5 blocks, predators at block boundaries. Local neighbor count drives reproduction and survival. Cluster geometry determines ecosystem fate.',
    'Density-Counted (GoL)', grid, rng));
}

// ── Write manifest ────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(mapsDir,'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n✓ manifest.json — ${manifest.length} maps`);
console.log('Done.');

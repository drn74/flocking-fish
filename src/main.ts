// main.ts — entry point.
// Initialises PIXI.Application, creates TWO independent simulation flocks,
// wires up Tweakpane controls, resize handler, and mouse events.

import * as PIXI from 'pixi.js';
import { Pane } from 'tweakpane';
import { config1, config2, sharedConfig } from './config.ts';
import { Grid } from './Grid.ts';
import { PathSpline } from './PathSpline.ts';
import { Flock } from './Flock.ts';

// ---------------------------------------------------------------------------
// PIXI Application
// ---------------------------------------------------------------------------

const app = new PIXI.Application();

await app.init({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x323232,
  antialias: true,
  resizeTo: window,
});

document.body.appendChild(app.canvas);

// ---------------------------------------------------------------------------
// Simulation objects
// ---------------------------------------------------------------------------

let W = app.screen.width;
let H = app.screen.height;

const grid = new Grid(sharedConfig.gridCols, sharedConfig.gridRows, W, H);

// Flock 1 — grey/white fish, cyan CP, yellow active target
const spline1 = new PathSpline(
  W / 2, H / 2, W * 0.40, H * 0.35,
  0x00c8ff,   // cpColor: cyan
  0xffdc00,   // activeColor: yellow
);
const flock1 = new Flock(config1);

// Flock 2 — coral/orange fish, aqua CP, warm-orange active target
const spline2 = new PathSpline(
  W * 0.65, H * 0.50, W * 0.22, H * 0.28,
  0x00e0a0,   // cpColor: aqua green
  0xffaa44,   // activeColor: warm orange
);
const flock2 = new Flock(config2);

// --- PIXI layers (draw order: grid → spline1 → spline2 → boids1 → boids2) ---

const gridLayer    = grid.graphics;
const splineLayer1 = spline1.graphics;
const splineLayer2 = spline2.graphics;
const boidLayer1   = new PIXI.Container();
const boidLayer2   = new PIXI.Container();

app.stage.addChild(gridLayer);
app.stage.addChild(splineLayer1);
app.stage.addChild(splineLayer2);
app.stage.addChild(boidLayer1);
app.stage.addChild(boidLayer2);

// --- Waypoint index labels — Flock 1 (white) ---
const labelTexts1: PIXI.Text[] = [];
for (let i = 0; i < spline1.size(); i++) {
  const t = new PIXI.Text({
    text: String(i),
    style: { fontSize: 10, fill: 0xffffff },
  });
  labelTexts1.push(t);
  app.stage.addChild(t);
}

// --- Waypoint index labels — Flock 2 (aqua green) ---
const labelTexts2: PIXI.Text[] = [];
for (let i = 0; i < spline2.size(); i++) {
  const t = new PIXI.Text({
    text: String(i),
    style: { fontSize: 10, fill: 0x00e0a0 },
  });
  labelTexts2.push(t);
  app.stage.addChild(t);
}

// --- Populate boids ---

function populateAllBoids(): void {
  for (const b of flock1.boids) boidLayer1.removeChild(b.gfx);
  for (const b of flock2.boids) boidLayer2.removeChild(b.gfx);

  flock1.repopulate(W, H);
  flock2.repopulate(W, H);

  for (const b of flock1.boids) boidLayer1.addChild(b.gfx);
  for (const b of flock2.boids) boidLayer2.addChild(b.gfx);
}

populateAllBoids();

// ---------------------------------------------------------------------------
// Resize handler
// ---------------------------------------------------------------------------

function onResize(): void {
  W = app.screen.width;
  H = app.screen.height;
  grid.resize(W, H);
}

window.addEventListener('resize', onResize);

// ---------------------------------------------------------------------------
// Mouse interaction
// Priority: spline1 CPs → spline2 CPs → grid toggle
// mousemove / mouseup are delegated to both splines
// (only the one with dragIndex >= 0 will act)
// ---------------------------------------------------------------------------

app.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  if (!spline1.handleMousePressed(mx, my)) {
    if (!spline2.handleMousePressed(mx, my)) {
      grid.toggleCell(mx, my);
    }
  }
});

app.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  spline1.handleMouseDragged(mx, my);
  spline2.handleMouseDragged(mx, my);
});

app.canvas.addEventListener('mouseup', () => {
  spline1.handleMouseReleased();
  spline2.handleMouseReleased();
});

app.canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
  const t = e.touches[0];
  const mx = t.clientX - rect.left;
  const my = t.clientY - rect.top;
  if (!spline1.handleMousePressed(mx, my)) {
    if (!spline2.handleMousePressed(mx, my)) {
      grid.toggleCell(mx, my);
    }
  }
}, { passive: false });

app.canvas.addEventListener('touchmove', (e: TouchEvent) => {
  e.preventDefault();
  const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
  const t = e.touches[0];
  const mx = t.clientX - rect.left;
  const my = t.clientY - rect.top;
  spline1.handleMouseDragged(mx, my);
  spline2.handleMouseDragged(mx, my);
}, { passive: false });

app.canvas.addEventListener('touchend', () => {
  spline1.handleMouseReleased();
  spline2.handleMouseReleased();
});

// ---------------------------------------------------------------------------
// Tweakpane UI
// ---------------------------------------------------------------------------

const pane = new Pane({ title: 'Flocking Fish' });

// --- Flock 1 ---

const f1Pop = pane.addFolder({ title: 'Flock 1 — Population' });
f1Pop.addBinding(config1, 'boidCount', { min: 1, max: 500, step: 1, label: 'boid count' })
  .on('change', () => { populateAllBoids(); });

const f1Phys = pane.addFolder({ title: 'Flock 1 — Physics', expanded: false });
f1Phys.addBinding(config1, 'maxSpeed',      { min: 0.5,  max: 8,   step: 0.1,   label: 'max speed' });
f1Phys.addBinding(config1, 'maxForce',      { min: 0.005, max: 0.2, step: 0.005, label: 'max force' });
f1Phys.addBinding(config1, 'separationDist',{ min: 5,    max: 80,  step: 1,     label: 'sep dist' });
f1Phys.addBinding(config1, 'neighborDist',  { min: 10,   max: 150, step: 1,     label: 'neighbor dist' });

const f1W = pane.addFolder({ title: 'Flock 1 — Weights', expanded: false });
f1W.addBinding(config1.weights, 'separation',       { min: 0, max: 5,  step: 0.1 });
f1W.addBinding(config1.weights, 'alignment',        { min: 0, max: 5,  step: 0.1 });
f1W.addBinding(config1.weights, 'cohesion',         { min: 0, max: 5,  step: 0.1 });
f1W.addBinding(config1.weights, 'pathFollowing',    { min: 0, max: 5,  step: 0.1, label: 'path following' });
f1W.addBinding(config1.weights, 'obstacleRepulsion',{ min: 0, max: 10, step: 0.1, label: 'obstacle repulsion' });
f1W.addBinding(config1.weights, 'borderRepulsion',  { min: 0, max: 10, step: 0.1, label: 'border repulsion' });
f1W.addBinding(config1.weights, 'centroidSeek',     { min: 0, max: 5,  step: 0.1, label: 'centroid seek' });

// --- Flock 2 ---

const f2Pop = pane.addFolder({ title: 'Flock 2 — Population' });
f2Pop.addBinding(config2, 'boidCount', { min: 1, max: 500, step: 1, label: 'boid count' })
  .on('change', () => { populateAllBoids(); });

const f2Phys = pane.addFolder({ title: 'Flock 2 — Physics', expanded: false });
f2Phys.addBinding(config2, 'maxSpeed',      { min: 0.5,  max: 8,   step: 0.1,   label: 'max speed' });
f2Phys.addBinding(config2, 'maxForce',      { min: 0.005, max: 0.2, step: 0.005, label: 'max force' });
f2Phys.addBinding(config2, 'separationDist',{ min: 5,    max: 80,  step: 1,     label: 'sep dist' });
f2Phys.addBinding(config2, 'neighborDist',  { min: 10,   max: 150, step: 1,     label: 'neighbor dist' });

const f2W = pane.addFolder({ title: 'Flock 2 — Weights', expanded: false });
f2W.addBinding(config2.weights, 'separation',       { min: 0, max: 5,  step: 0.1 });
f2W.addBinding(config2.weights, 'alignment',        { min: 0, max: 5,  step: 0.1 });
f2W.addBinding(config2.weights, 'cohesion',         { min: 0, max: 5,  step: 0.1 });
f2W.addBinding(config2.weights, 'pathFollowing',    { min: 0, max: 5,  step: 0.1, label: 'path following' });
f2W.addBinding(config2.weights, 'obstacleRepulsion',{ min: 0, max: 10, step: 0.1, label: 'obstacle repulsion' });
f2W.addBinding(config2.weights, 'borderRepulsion',  { min: 0, max: 10, step: 0.1, label: 'border repulsion' });
f2W.addBinding(config2.weights, 'centroidSeek',     { min: 0, max: 5,  step: 0.1, label: 'centroid seek' });

// --- Interaction (global) ---

const interactionFolder = pane.addFolder({ title: 'Interaction' });
interactionFolder.addBinding(sharedConfig, 'crossFlockSeparationWeight', {
  min: 0, max: 10, step: 0.1, label: 'cross-flock repulsion',
});

// --- Spatial (shared) ---

const spatialFolder = pane.addFolder({ title: 'Spatial', expanded: false });
spatialFolder.addBinding(sharedConfig, 'arrivalRadius',         { min: 10,  max: 200, step: 1,   label: 'arrival radius' });
spatialFolder.addBinding(sharedConfig, 'borderMargin',          { min: 0,   max: 200, step: 1,   label: 'border margin' });
spatialFolder.addBinding(sharedConfig, 'borderRepulsionEnabled',{ label: 'border repulsion' });

// --- Rendering (shared) ---

const renderFolder = pane.addFolder({ title: 'Rendering', expanded: false });
renderFolder.addBinding(sharedConfig, 'showGrid', { label: 'show grid' });
renderFolder.addBinding(sharedConfig, 'showPath', { label: 'show path' });

pane.addButton({ title: 'Reset / Repopulate All' }).on('click', () => { populateAllBoids(); });

// Suppress unused-variable warnings (folders used for organisation only)
void f1Pop; void f1Phys; void f1W;
void f2Pop; void f2Phys; void f2W;
void interactionFolder; void spatialFolder; void renderFolder;

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

app.ticker.add(() => {
  flock1.run(spline1, grid, flock2, W, H);
  flock2.run(spline2, grid, flock1, W, H);
  grid.draw();
  spline1.draw();
  spline2.draw();

  if (sharedConfig.showPath) {
    // Flock 1 labels — white
    const labels1 = spline1.getLabelData();
    for (let i = 0; i < labelTexts1.length; i++) {
      labelTexts1[i].visible = true;
      labelTexts1[i].position.set(labels1[i].x, labels1[i].y);
    }
    // Flock 2 labels — aqua green
    const labels2 = spline2.getLabelData();
    for (let i = 0; i < labelTexts2.length; i++) {
      labelTexts2[i].visible = true;
      labelTexts2[i].position.set(labels2[i].x, labels2[i].y);
    }
  } else {
    for (const t of labelTexts1) t.visible = false;
    for (const t of labelTexts2) t.visible = false;
  }
});

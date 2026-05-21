// main.ts — entry point.
// Initialises PIXI.Application, creates the simulation objects,
// wires up Tweakpane controls, resize handler, and mouse events.

import * as PIXI from 'pixi.js';
import { Pane } from 'tweakpane';
import { config } from './config.ts';
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

const grid = new Grid(config.gridCols, config.gridRows, W, H);
const spline = new PathSpline(W / 2, H / 2, W * 0.40, H * 0.35);
const flock = new Flock();

// --- PIXI layers (draw order: grid → spline → boids) ---

const gridLayer = grid.graphics;
const splineLayer = spline.graphics;
const boidLayer = new PIXI.Container();

app.stage.addChild(gridLayer);
app.stage.addChild(splineLayer);
app.stage.addChild(boidLayer);

// --- Waypoint index labels ---
const labelTexts: PIXI.Text[] = [];
for (let i = 0; i < spline.size(); i++) {
  const t = new PIXI.Text({
    text: String(i),
    style: {
      fontSize: 10,
      fill: 0xffffff,
    },
  });
  labelTexts.push(t);
  app.stage.addChild(t);
}

// --- Populate boids ---

function populateBoids(): void {
  for (const b of flock.boids) {
    boidLayer.removeChild(b.gfx);
  }
  flock.repopulate(W, H);
  for (const b of flock.boids) {
    boidLayer.addChild(b.gfx);
  }
}

populateBoids();

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
// Priority: CP drag first, then grid toggle
// ---------------------------------------------------------------------------

app.canvas.addEventListener('mousedown', (e: MouseEvent) => {
  const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  if (!spline.handleMousePressed(mx, my)) {
    grid.toggleCell(mx, my);
  }
});

app.canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  spline.handleMouseDragged(mx, my);
});

app.canvas.addEventListener('mouseup', () => {
  spline.handleMouseReleased();
});

app.canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
  const t = e.touches[0];
  const mx = t.clientX - rect.left;
  const my = t.clientY - rect.top;
  if (!spline.handleMousePressed(mx, my)) {
    grid.toggleCell(mx, my);
  }
}, { passive: false });

app.canvas.addEventListener('touchmove', (e: TouchEvent) => {
  e.preventDefault();
  const rect = (app.canvas as HTMLCanvasElement).getBoundingClientRect();
  const t = e.touches[0];
  spline.handleMouseDragged(t.clientX - rect.left, t.clientY - rect.top);
}, { passive: false });

app.canvas.addEventListener('touchend', () => {
  spline.handleMouseReleased();
});

// ---------------------------------------------------------------------------
// Tweakpane UI
// ---------------------------------------------------------------------------

const pane = new Pane({ title: 'Flocking Fish' });

const boidFolder = pane.addFolder({ title: 'Population' });
boidFolder.addBinding(config, 'boidCount', { min: 1, max: 500, step: 1, label: 'boid count' })
  .on('change', () => { populateBoids(); });

const physicsFolder = pane.addFolder({ title: 'Physics' });
physicsFolder.addBinding(config, 'maxSpeed', { min: 0.5, max: 8, step: 0.1, label: 'max speed' });
physicsFolder.addBinding(config, 'maxForce', { min: 0.005, max: 0.2, step: 0.005, label: 'max force' });
physicsFolder.addBinding(config, 'separationDist', { min: 5, max: 80, step: 1, label: 'sep dist' });
physicsFolder.addBinding(config, 'neighborDist', { min: 10, max: 150, step: 1, label: 'neighbor dist' });

const weightsFolder = pane.addFolder({ title: 'Weights' });
weightsFolder.addBinding(config.weights, 'separation', { min: 0, max: 5, step: 0.1 });
weightsFolder.addBinding(config.weights, 'alignment', { min: 0, max: 5, step: 0.1 });
weightsFolder.addBinding(config.weights, 'cohesion', { min: 0, max: 5, step: 0.1 });
weightsFolder.addBinding(config.weights, 'pathFollowing', { min: 0, max: 5, step: 0.1, label: 'path following' });
weightsFolder.addBinding(config.weights, 'obstacleRepulsion', { min: 0, max: 10, step: 0.1, label: 'obstacle repulsion' });
weightsFolder.addBinding(config.weights, 'borderRepulsion', { min: 0, max: 10, step: 0.1, label: 'border repulsion' });
weightsFolder.addBinding(config.weights, 'centroidSeek', { min: 0, max: 5, step: 0.1, label: 'centroid seek' });

const spatialFolder = pane.addFolder({ title: 'Spatial' });
spatialFolder.addBinding(config, 'arrivalRadius', { min: 10, max: 200, step: 1, label: 'arrival radius' });
spatialFolder.addBinding(config, 'borderMargin', { min: 0, max: 200, step: 1, label: 'border margin' });
spatialFolder.addBinding(config, 'borderRepulsionEnabled', { label: 'border repulsion' });

const renderFolder = pane.addFolder({ title: 'Rendering' });
renderFolder.addBinding(config, 'showGrid', { label: 'show grid' });
renderFolder.addBinding(config, 'showPath', { label: 'show path' });

pane.addButton({ title: 'Reset / Repopulate' }).on('click', () => { populateBoids(); });

// Suppress unused-variable warnings (folders used for organisation only)
void boidFolder;
void physicsFolder;
void weightsFolder;
void spatialFolder;
void renderFolder;

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

app.ticker.add(() => {
  flock.run(spline, grid, W, H);
  grid.draw();
  spline.draw();

  if (config.showPath) {
    const labels = spline.getLabelData();
    for (let i = 0; i < labelTexts.length; i++) {
      labelTexts[i].visible = true;
      labelTexts[i].position.set(labels[i].x, labels[i].y);
    }
  } else {
    for (const t of labelTexts) t.visible = false;
  }
});

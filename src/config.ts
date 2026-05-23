// Central configuration — per-flock and shared simulation parameters.
// config1 / config2 hold independent values for each flock.
// sharedConfig holds parameters common to both flocks.
// Tweakpane binds directly to these objects.

// ---------------------------------------------------------------------------
// Per-flock config
// ---------------------------------------------------------------------------

export type FlockWeights = {
  separation: number;
  alignment: number;
  cohesion: number;
  pathFollowing: number;
  obstacleRepulsion: number;
  borderRepulsion: number;
  centroidSeek: number;
};

export type FlockConfig = {
  boidCount: number;
  maxSpeed: number;
  maxForce: number;
  separationDist: number;
  neighborDist: number;
  weights: FlockWeights;
  boidColor: number;   // PIXI hex color for fish fill
  boidAlpha: number;   // fill alpha
};

// Flock 1 — grey/white fish (original values)
export const config1: FlockConfig = {
  boidCount: 50,
  maxSpeed: 2,
  maxForce: 0.03,
  separationDist: 25,
  neighborDist: 50,
  weights: {
    separation: 1.5,
    alignment: 1.0,
    cohesion: 1.0,
    pathFollowing: 0.5,
    obstacleRepulsion: 3.0,
    borderRepulsion: 2.0,
    centroidSeek: 1.5,
  },
  boidColor: 0x00c8ff,  // cyan — matches spline1 CP color
  boidAlpha: 0.85,
};

// Flock 2 — aqua green fish
export const config2: FlockConfig = {
  boidCount: 50,
  maxSpeed: 2,
  maxForce: 0.03,
  separationDist: 25,
  neighborDist: 50,
  weights: {
    separation: 1.5,
    alignment: 1.0,
    cohesion: 1.0,
    pathFollowing: 0.5,
    obstacleRepulsion: 3.0,
    borderRepulsion: 2.0,
    centroidSeek: 1.5,
  },
  boidColor: 0xff0000,  // red
  boidAlpha: 0.85,
};

// ---------------------------------------------------------------------------
// Shared config (applies to both flocks)
// ---------------------------------------------------------------------------

export const sharedConfig = {
  // Grid obstacle system
  gridCols: 4,
  gridRows: 3,
  repulsionRadiusFactor: 1.5,

  // Path / waypoint (shared arrival threshold)
  arrivalRadius: 80,

  // Border repulsion
  borderMargin: 80,
  borderRepulsionEnabled: true,

  // Inter-flock repulsion weight (global slider)
  crossFlockSeparationWeight: 1.5,

  // Rendering toggles
  showGrid: true,
  showPath: true,
};

export type SharedConfig = typeof sharedConfig;

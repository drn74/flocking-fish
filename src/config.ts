// Central configuration — all simulation parameters.
// Mirrors the constants scattered across the .pde source files.
// Tweakpane binds directly to this object.

export const config = {
  // Boid population
  boidCount: 150,

  // Per-boid physics
  maxSpeed: 2,
  maxForce: 0.03,

  // Flocking radii
  separationDist: 25,
  neighborDist: 50,

  // Force weights (match .pde values exactly)
  weights: {
    separation: 1.5,
    alignment: 1.0,
    cohesion: 1.0,
    pathFollowing: 0.5,
    obstacleRepulsion: 3.0,
    borderRepulsion: 2.0,
    centroidSeek: 1.5,
  },

  // Grid obstacle system
  gridCols: 4,
  gridRows: 3,
  repulsionRadiusFactor: 1.5,

  // Path / waypoint
  arrivalRadius: 80,

  // Border repulsion
  borderMargin: 80,
  borderRepulsionEnabled: true,

  // Rendering toggles
  showGrid: true,
  showPath: true,
};

export type Config = typeof config;

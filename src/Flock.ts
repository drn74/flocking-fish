// Flock — manages the array of Boid objects.
// Mirrors Flock.pde exactly:
//   - computes centroid each frame
//   - handles waypoint routing with obstacle-skip guard
//   - passes shared target to each boid after routing decision

import { Boid } from './Boid.ts';
import type { PathSpline } from './PathSpline.ts';
import type { Grid } from './Grid.ts';
import { Vector2D } from './Vector2D.ts';
import { config } from './config.ts';

export class Flock {
  boids: Boid[];

  constructor() {
    this.boids = [];
  }

  addBoid(b: Boid): void {
    this.boids.push(b);
  }

  run(spline: PathSpline, grid: Grid, canvasW: number, canvasH: number): void {
    const n = this.boids.length;

    // --- Centroid of the flock ---
    const centroid = new Vector2D(0, 0);
    for (const b of this.boids) {
      centroid.add(b.position);
    }
    if (n > 0) centroid.div(n);

    // --- Waypoint routing with obstacle-skip ---
    // If current waypoint is in an obstacle cell → advance by 1 this frame.
    // Guard: if ALL waypoints are obstacles, do not advance (prevents infinite loop).
    let allObstacle = true;
    for (let offset = 0; offset < spline.size(); offset++) {
      const candidate = spline.getPointAt(spline.currentIndex + offset);
      if (!grid.isObstacle(candidate)) {
        allObstacle = false;
        break;
      }
    }

    if (!allObstacle) {
      if (grid.isObstacle(spline.getCurrentTarget())) {
        // Current waypoint is an obstacle: advance 1 (re-checked next frame)
        spline.advanceTarget();
      } else {
        // Waypoint is safe: normal arrival check
        if (Vector2D.dist(centroid, spline.getCurrentTarget()) < config.arrivalRadius) {
          spline.advanceTarget();
        }
      }
    }
    // If allObstacle: don't advance; getCurrentTarget() stays unchanged.

    // Target is read AFTER the potential advanceTarget() call
    const target = spline.getCurrentTarget();

    // --- Update each boid ---
    for (const b of this.boids) {
      b.flock(this.boids, target, grid, centroid, canvasW, canvasH);
      b.update();
      b.borders(canvasW, canvasH);
      b.render();
    }
  }

  // Replace the boid array with a fresh set (used when boidCount changes)
  repopulate(canvasW: number, canvasH: number): void {
    const cx = canvasW / 2;
    const cy = canvasH / 2;
    this.boids = [];
    for (let i = 0; i < config.boidCount; i++) {
      this.boids.push(new Boid(cx, cy));
    }
  }
}

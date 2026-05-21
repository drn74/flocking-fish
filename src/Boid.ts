// Boid — single flocking agent.
// Physics mirrors Boid.pde exactly:
//   - Reynolds steering: normalize → mult(maxspeed) → sub(velocity) → limit(maxforce)
//   - centroid-seek only when neighborCount === 0 (distance threshold 50px, fixed)
//   - border repulsion uses linear falloff from each edge
//   - obstacle repulsion averages directions, then applies Reynolds steering

import * as PIXI from 'pixi.js';
import { Vector2D } from './Vector2D.ts';
import { config } from './config.ts';
import type { Grid } from './Grid.ts';

export class Boid {
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;

  readonly r: number = 2.0;
  get maxspeed(): number { return config.maxSpeed; }
  get maxforce(): number { return config.maxForce; }

  // PIXI display object — shape drawn once, position/rotation updated every frame
  readonly gfx: PIXI.Graphics;

  constructor(x: number, y: number) {
    this.position = new Vector2D(x, y);
    this.acceleration = new Vector2D(0, 0);

    // Random initial velocity (replaces PVector.random2D() from Processing.js)
    const angle = Math.random() * Math.PI * 2;
    this.velocity = new Vector2D(Math.cos(angle), Math.sin(angle));

    this.gfx = new PIXI.Graphics();
    this.drawShape();
  }

  // Draw triangle shape once at construction (pivot at center).
  // Matches .pde render: vertices (0,-r*2), (-r,r*2), (r,r*2).
  // fill(200, 100) in Processing = RGB(200,200,200) at alpha 100/255 ≈ 0.39.
  // In Pixi.js v8, call fill() then stroke() on the same closed path.
  private drawShape(): void {
    const r = this.r;
    this.gfx
      .poly([0, -r * 2, -r, r * 2, r, r * 2], true)
      .fill({ color: 0xc8c8c8, alpha: 0.39 })
      .stroke({ color: 0xffffff, width: 1 });
  }

  applyForce(force: Vector2D): void {
    this.acceleration.add(force);
  }

  // Accumulate all forces for this frame
  flock(boids: Boid[], target: Vector2D, grid: Grid, centroid: Vector2D, canvasW: number, canvasH: number): void {
    const sep = this.separate(boids);
    const ali = this.align(boids);
    const coh = this.cohesion(boids);

    sep.mult(config.weights.separation);
    ali.mult(config.weights.alignment);
    coh.mult(config.weights.cohesion);

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);

    // Waypoint steering — always active
    const pf = this.followTarget(target);
    pf.mult(config.weights.pathFollowing);
    this.applyForce(pf);

    // Radial repulsion from obstacle cells
    const repel = this.repelFromObstacles(grid);
    repel.mult(config.weights.obstacleRepulsion);
    this.applyForce(repel);

    // Soft border repulsion
    if (config.borderRepulsionEnabled) {
      const br = this.repelFromBorders(canvasW, canvasH);
      br.mult(config.weights.borderRepulsion);
      this.applyForce(br);
    }

    // Centroid-seek: only when boid has no neighbors within 50px
    // (fixed 50px threshold, NOT neighborDist from config — matches .pde)
    let neighborCount = 0;
    for (const other of boids) {
      const d = Vector2D.dist(this.position, other.position);
      if (d > 0 && d < 50) neighborCount++;
    }
    if (neighborCount === 0) {
      const cs = this.seek(centroid);
      cs.mult(config.weights.centroidSeek);
      this.applyForce(cs);
    }
  }

  update(): void {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  // Wraparound borders — safety net even when border repulsion is active
  borders(canvasW: number, canvasH: number): void {
    const r = this.r;
    if (this.position.x < -r) this.position.x = canvasW + r;
    if (this.position.y < -r) this.position.y = canvasH + r;
    if (this.position.x > canvasW + r) this.position.x = -r;
    if (this.position.y > canvasH + r) this.position.y = -r;
  }

  // Sync PIXI graphics to physics state
  render(): void {
    this.gfx.position.set(this.position.x, this.position.y);
    // heading() returns atan2(y, x); add PI/2 to align tip with velocity
    // (matches .pde: theta = velocity.heading2D() + radians(90))
    this.gfx.rotation = this.velocity.heading() + Math.PI / 2;
  }

  // --- Reynolds seek ---

  seek(target: Vector2D): Vector2D {
    const desired = Vector2D.sub(target, this.position);
    desired.normalize();
    desired.mult(this.maxspeed);
    const steer = Vector2D.sub(desired, this.velocity);
    steer.limit(this.maxforce);
    return steer;
  }

  followTarget(target: Vector2D): Vector2D {
    return this.seek(target);
  }

  // --- Separation ---

  separate(boids: Boid[]): Vector2D {
    const desiredSeparation = config.separationDist;
    const steer = new Vector2D(0, 0);
    let count = 0;

    for (const other of boids) {
      const d = Vector2D.dist(this.position, other.position);
      if (d > 0 && d < desiredSeparation) {
        const diff = Vector2D.sub(this.position, other.position);
        diff.normalize();
        diff.div(d);       // weight by distance
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) steer.div(count);

    if (steer.mag() > 0) {
      steer.normalize();
      steer.mult(this.maxspeed);
      steer.sub(this.velocity);
      steer.limit(this.maxforce);
    }

    return steer;
  }

  // --- Alignment ---

  align(boids: Boid[]): Vector2D {
    const neighborDist = config.neighborDist;
    const sum = new Vector2D(0, 0);
    let count = 0;

    for (const other of boids) {
      const d = Vector2D.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.velocity);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      sum.normalize();
      sum.mult(this.maxspeed);
      const steer = Vector2D.sub(sum, this.velocity);
      steer.limit(this.maxforce);
      return steer;
    }

    return new Vector2D(0, 0);
  }

  // --- Cohesion ---

  cohesion(boids: Boid[]): Vector2D {
    const neighborDist = config.neighborDist;
    const sum = new Vector2D(0, 0);
    let count = 0;

    for (const other of boids) {
      const d = Vector2D.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.position);
        count++;
      }
    }

    if (count > 0) {
      sum.div(count);
      return this.seek(sum);
    }

    return new Vector2D(0, 0);
  }

  // --- Obstacle repulsion ---
  // Radial repulsion from all active obstacle cells.
  // Linear falloff: strength = 1 - (d / repRadius).
  // After averaging directions, applies Reynolds steering.

  repelFromObstacles(grid: Grid): Vector2D {
    const steer = new Vector2D(0, 0);
    let count = 0;
    const repRadius = grid.getRepulsionRadius();

    for (let c = 0; c < grid.cols; c++) {
      for (let r = 0; r < grid.rows; r++) {
        if (grid.getCell(c, r)) {
          const center = grid.getCellCenter(c, r);
          const d = Vector2D.dist(this.position, center);
          if (d < repRadius && d > 0) {
            const away = Vector2D.sub(this.position, center);
            away.normalize();
            const strength = 1.0 - (d / repRadius);
            away.mult(strength);
            steer.add(away);
            count++;
          }
        }
      }
    }

    if (count > 0) steer.div(count);

    // Reynolds steering
    if (steer.mag() > 0) {
      steer.normalize();
      steer.mult(this.maxspeed);
      steer.sub(this.velocity);
      steer.limit(this.maxforce);
    }

    return steer;
  }

  // --- Border repulsion ---
  // Linear falloff from each edge, active within BORDER_MARGIN px.
  // canvasW/H are injected by Flock so the Boid doesn't need window access.

  repelFromBorders(canvasW: number, canvasH: number): Vector2D {
    const steer = new Vector2D(0, 0);
    const margin = config.borderMargin;
    const W = canvasW;
    const H = canvasH;

    if (this.position.x < margin) {
      steer.add(new Vector2D(1.0 - (this.position.x / margin), 0));
    }
    if (this.position.x > W - margin) {
      steer.add(new Vector2D(-(1.0 - ((W - this.position.x) / margin)), 0));
    }
    if (this.position.y < margin) {
      steer.add(new Vector2D(0, 1.0 - (this.position.y / margin)));
    }
    if (this.position.y > H - margin) {
      steer.add(new Vector2D(0, -(1.0 - ((H - this.position.y) / margin))));
    }

    if (steer.mag() > 0) {
      steer.normalize();
      steer.mult(this.maxspeed);
      steer.sub(this.velocity);
      steer.limit(this.maxforce);
    }

    return steer;
  }
}

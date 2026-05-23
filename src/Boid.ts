// Boid — single flocking agent.
// Physics mirrors Boid.pde exactly:
//   - Reynolds steering: normalize → mult(maxspeed) → sub(velocity) → limit(maxforce)
//   - centroid-seek only when neighborCount === 0 (distance threshold 50px, fixed)
//   - border repulsion uses linear falloff from each edge
//   - obstacle repulsion averages directions, then applies Reynolds steering

import * as PIXI from 'pixi.js';
import { Vector2D } from './Vector2D.ts';
import { sharedConfig } from './config.ts';
import type { FlockConfig } from './config.ts';
import type { Grid } from './Grid.ts';

// Distance from the flock centroid beyond which a boid is treated as "lost"
// and pulled back, even if it has nearby buddies. Covers the failure mode
// where two boids drift together and reinforce each other's heading.
const ISOLATION_DISTANCE = 150;

export class Boid {
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;

  readonly r: number = 2.0;
  get maxspeed(): number { return this.cfg.maxSpeed; }
  get maxforce(): number { return this.cfg.maxForce; }

  private readonly cfg: FlockConfig;

  // PIXI display object — shape drawn once, position/rotation updated every frame
  readonly gfx: PIXI.Graphics;

  constructor(x: number, y: number, cfg: FlockConfig) {
    this.cfg = cfg;
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
      .fill({ color: this.cfg.boidColor, alpha: this.cfg.boidAlpha })
      .stroke({ color: 0xffffff, width: 1 });
  }

  applyForce(force: Vector2D): void {
    this.acceleration.add(force);
  }

  // Accumulate all forces for this frame
  flock(boids: Boid[], enemyBoids: Boid[], target: Vector2D, grid: Grid, centroid: Vector2D, canvasW: number, canvasH: number): void {
    const sep = this.separate(boids);
    const ali = this.align(boids);
    const coh = this.cohesion(boids);

    sep.mult(this.cfg.weights.separation);
    ali.mult(this.cfg.weights.alignment);
    coh.mult(this.cfg.weights.cohesion);

    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);

    // Waypoint steering — always active
    const pf = this.followTarget(target);
    pf.mult(this.cfg.weights.pathFollowing);
    this.applyForce(pf);

    // Radial repulsion from obstacle cells
    const repel = this.repelFromObstacles(grid);
    repel.mult(this.cfg.weights.obstacleRepulsion);
    this.applyForce(repel);

    // Soft border repulsion
    if (sharedConfig.borderRepulsionEnabled) {
      const br = this.repelFromBorders(canvasW, canvasH);
      br.mult(this.cfg.weights.borderRepulsion);
      this.applyForce(br);
    }

    // Cross-flock separation — repulsion only, does not affect own alignment/cohesion
    const crossSep = this.separateFromEnemy(enemyBoids);
    crossSep.mult(sharedConfig.crossFlockSeparationWeight);
    this.applyForce(crossSep);

    // Centroid-seek: pull lone or strayed boids back to the school.
    // Trigger A: no neighbors within 50px (truly isolated — matches .pde).
    // Trigger B: farther than ISOLATION_DISTANCE from the flock centroid
    //   (covers the 2-buddies-drifting-together case where neighborCount === 1
    //   would otherwise suppress the recovery force indefinitely).
    let neighborCount = 0;
    for (const other of boids) {
      const d = Vector2D.dist(this.position, other.position);
      if (d > 0 && d < 50) neighborCount++;
    }
    const distFromCentroid = Vector2D.dist(this.position, centroid);
    if (neighborCount === 0 || distFromCentroid > ISOLATION_DISTANCE) {
      const cs = this.seek(centroid);
      cs.mult(this.cfg.weights.centroidSeek);
      this.applyForce(cs);
    }
  }

  update(): void {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  // Hard boundary — clamps position to canvas and zeroes out velocity
  // toward the wall. The border repulsion force deflects boids before
  // they reach the edge; this is the absolute fallback.
  borders(canvasW: number, canvasH: number): void {
    const r = this.r;
    if (this.position.x < r)          { this.position.x = r;          if (this.velocity.x < 0) this.velocity.x = 0; }
    if (this.position.y < r)          { this.position.y = r;          if (this.velocity.y < 0) this.velocity.y = 0; }
    if (this.position.x > canvasW - r){ this.position.x = canvasW - r; if (this.velocity.x > 0) this.velocity.x = 0; }
    if (this.position.y > canvasH - r){ this.position.y = canvasH - r; if (this.velocity.y > 0) this.velocity.y = 0; }
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
    const desiredSeparation = this.cfg.separationDist;
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

  // --- Cross-flock separation ---
  // Repels this boid away from enemy-flock boids.
  // Uses own separationDist as detection radius.
  // Does NOT affect alignment or cohesion of the own flock.

  separateFromEnemy(enemyBoids: Boid[]): Vector2D {
    const desiredSeparation = this.cfg.separationDist;
    const steer = new Vector2D(0, 0);
    let count = 0;

    for (const other of enemyBoids) {
      const d = Vector2D.dist(this.position, other.position);
      if (d > 0 && d < desiredSeparation) {
        const diff = Vector2D.sub(this.position, other.position);
        diff.normalize();
        diff.div(d);
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
    const neighborDist = this.cfg.neighborDist;
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
    const neighborDist = this.cfg.neighborDist;
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
    const margin = sharedConfig.borderMargin;
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

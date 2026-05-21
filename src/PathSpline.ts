// PathSpline — Waypoint manager with interactive control points.
// 8 waypoints on an ellipse; supports shared-target switching and drag & drop.
// Mirrors PathSpline.pde exactly, including wrap-around modular indexing.

import * as PIXI from 'pixi.js';
import { Vector2D } from './Vector2D.ts';
import { config } from './config.ts';

const CP_RADIUS = 8;          // visual + hit-test radius (matches SPLINE_CP_RADIUS)
const HIT_MULTIPLIER = 1.5;   // hit zone = CP_RADIUS * 1.5

export class PathSpline {
  pts: Vector2D[];        // control points (waypoints)
  currentIndex: number;   // index of the current target waypoint
  private dragIndex: number;  // index of CP being dragged, -1 if none

  readonly graphics: PIXI.Graphics;

  constructor(cx: number, cy: number, rx: number, ry: number) {
    this.pts = [];
    this.dragIndex = -1;
    this.currentIndex = 0;

    const N = 8;
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i) / N;
      this.pts.push(new Vector2D(
        cx + Math.cos(angle) * rx,
        cy + Math.sin(angle) * ry,
      ));
    }

    this.graphics = new PIXI.Graphics();
  }

  // --- Waypoint access ---

  getCurrentTarget(): Vector2D {
    return this.pts[this.currentIndex];
  }

  // Advance to the next waypoint (clockwise, modulo N)
  advanceTarget(): void {
    this.currentIndex = (this.currentIndex + 1) % this.pts.length;
  }

  size(): number {
    return this.pts.length;
  }

  // Absolute index with wrap-around (matches getPointAt in .pde)
  getPointAt(absoluteIndex: number): Vector2D {
    const n = this.pts.length;
    let idx = absoluteIndex % n;
    if (idx < 0) idx += n;
    return this.pts[idx];
  }

  // --- Mouse interaction ---

  // Returns true if a CP was hit (consumes event), false otherwise
  handleMousePressed(mx: number, my: number): boolean {
    this.dragIndex = -1;
    for (let i = 0; i < this.pts.length; i++) {
      const p = this.pts[i];
      const dx = mx - p.x;
      const dy = my - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < CP_RADIUS * HIT_MULTIPLIER) {
        this.dragIndex = i;
        return true;
      }
    }
    return false;
  }

  handleMouseDragged(mx: number, my: number): void {
    if (this.dragIndex >= 0) {
      this.pts[this.dragIndex].x = mx;
      this.pts[this.dragIndex].y = my;
    }
  }

  handleMouseReleased(): void {
    this.dragIndex = -1;
  }

  // --- Rendering ---

  draw(): void {
    const g = this.graphics;
    g.clear();

    if (!config.showPath) return;

    for (let i = 0; i < this.pts.length; i++) {
      const p = this.pts[i];
      const isCurrent = i === this.currentIndex;

      if (isCurrent) {
        // Yellow: current target
        g.circle(p.x, p.y, CP_RADIUS);
        g.fill({ color: 0xffdc00, alpha: 0.24 });
        g.circle(p.x, p.y, CP_RADIUS);
        g.stroke({ color: 0xffdc00, width: 1.5 });
      } else {
        // Cyan: other waypoints
        g.circle(p.x, p.y, CP_RADIUS);
        g.stroke({ color: 0x00c8ff, width: 1.5 });
      }
    }
  }

  // Draw waypoint index labels (done separately using PIXI.Text in main)
  getLabelData(): Array<{ x: number; y: number; label: string }> {
    return this.pts.map((p, i) => ({
      x: p.x + CP_RADIUS + 4,
      y: p.y,
      label: String(i),
    }));
  }
}

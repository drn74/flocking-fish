// Grid — interactive NxM obstacle grid.
// Each cell can be toggled as an obstacle zone via mouse click.
// Uses a 1D boolean array with index = col * rows + row
// (matches Grid.pde exactly, including repulsion radius formula).

import * as PIXI from 'pixi.js';
import { Vector2D } from './Vector2D.ts';
import { config } from './config.ts';

export class Grid {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  private cells: boolean[];

  // PIXI graphics layer for rendering (redrawn each frame because state changes)
  readonly graphics: PIXI.Graphics;

  constructor(cols: number, rows: number, canvasW: number, canvasH: number) {
    this.cols = cols;
    this.rows = rows;
    this.cellW = canvasW / cols;
    this.cellH = canvasH / rows;
    this.cells = new Array<boolean>(cols * rows).fill(false);
    this.graphics = new PIXI.Graphics();
  }

  // Resize grid when canvas changes (cell dimensions must be recalculated)
  resize(canvasW: number, canvasH: number): void {
    this.cellW = canvasW / this.cols;
    this.cellH = canvasH / this.rows;
  }

  // --- Cell access (1D array, col * rows + row) ---

  getCell(c: number, r: number): boolean {
    return this.cells[c * this.rows + r];
  }

  setCell(c: number, r: number, v: boolean): void {
    this.cells[c * this.rows + r] = v;
  }

  // --- Interaction ---

  toggleCell(mx: number, my: number): void {
    const c = Math.floor(mx / this.cellW);
    const r = Math.floor(my / this.cellH);
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      this.setCell(c, r, !this.getCell(c, r));
    }
  }

  // --- Spatial queries ---

  isObstacle(pos: Vector2D): boolean {
    const c = Math.floor(pos.x / this.cellW);
    const r = Math.floor(pos.y / this.cellH);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return false;
    return this.getCell(c, r);
  }

  getCellCenter(c: number, r: number): Vector2D {
    return new Vector2D(
      (c + 0.5) * this.cellW,
      (r + 0.5) * this.cellH,
    );
  }

  // Repulsion radius: 1.5x inscribed radius of the cell
  getRepulsionRadius(): number {
    const inscribed = Math.min(this.cellW, this.cellH) / 2;
    return inscribed * config.repulsionRadiusFactor;
  }

  // --- Rendering ---

  draw(): void {
    const g = this.graphics;
    g.clear();

    if (!config.showGrid) return;

    // 1. Red overlay for obstacle cells (drawn first, under grid lines)
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.getCell(c, r)) {
          g.rect(c * this.cellW, r * this.cellH, this.cellW, this.cellH);
          g.fill({ color: 0xff0000, alpha: 0.24 });
        }
      }
    }

    // 2. Grid lines
    const lineAlpha = 0.16;
    for (let c = 0; c <= this.cols; c++) {
      g.moveTo(c * this.cellW, 0);
      g.lineTo(c * this.cellW, this.cellH * this.rows);
      g.stroke({ color: 0xffffff, alpha: lineAlpha, width: 1 });
    }
    for (let r = 0; r <= this.rows; r++) {
      g.moveTo(0, r * this.cellH);
      g.lineTo(this.cellW * this.cols, r * this.cellH);
      g.stroke({ color: 0xffffff, alpha: lineAlpha, width: 1 });
    }
  }
}

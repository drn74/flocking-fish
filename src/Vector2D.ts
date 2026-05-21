// Vector2D — replaces PVector from Processing.js.
// Supports both mutable (in-place) and static (immutable) operations.
// All methods that modify the vector return `this` for chaining.

export class Vector2D {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  // --- In-place operations ---

  add(v: Vector2D): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector2D): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  div(s: number): this {
    if (s !== 0) {
      this.x /= s;
      this.y /= s;
    }
    return this;
  }

  normalize(): this {
    const m = this.mag();
    if (m > 0) {
      this.x /= m;
      this.y /= m;
    }
    return this;
  }

  limit(max: number): this {
    if (this.magSq() > max * max) {
      this.normalize();
      this.mult(max);
    }
    return this;
  }

  // --- Magnitude helpers ---

  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  // --- Heading (angle of the vector, used for rotation) ---

  heading(): number {
    return Math.atan2(this.y, this.x);
  }

  // --- Copy ---

  copy(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  // --- Static operations (return new vector, leave operands unchanged) ---

  static add(a: Vector2D, b: Vector2D): Vector2D {
    return new Vector2D(a.x + b.x, a.y + b.y);
  }

  static sub(a: Vector2D, b: Vector2D): Vector2D {
    return new Vector2D(a.x - b.x, a.y - b.y);
  }

  static dist(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static distSq(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  // Random unit vector (replaces PVector.random2D())
  static random2D(): Vector2D {
    const angle = Math.random() * Math.PI * 2;
    return new Vector2D(Math.cos(angle), Math.sin(angle));
  }
}

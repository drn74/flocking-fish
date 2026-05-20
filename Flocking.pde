/**
 * Flocking - Spline Path Guidance
 * Boids seguono una spline Catmull-Rom interattiva.
 * Control point: drag & drop con il mouse.
 */

Flock flock;
PathSpline spline;

void setup() {
  size(window.innerWidth, window.innerHeight);
  flock = new Flock();
  // Inizializza la spline: ellisse centrata sul canvas
  // rx = 40% della larghezza, ry = 35% dell'altezza
  spline = new PathSpline(width / 2.0, height / 2.0,
                           width * 0.40, height * 0.35);
  // Aggiungi i boid al centro — convergeranno sulla spline
  for (int i = 0; i < 150; i++) {
    flock.addBoid(new Boid(width / 2.0, height / 2.0));
  }
}

void draw() {
  background(50);
  spline.draw();      // spline renderizzata PRIMA dei boid (sotto)
  flock.run(spline);  // boid passano e leggono la spline
}

// Drag & drop dei control point
void mousePressed() {
  spline.handleMousePressed(mouseX, mouseY);
}

void mouseDragged() {
  spline.handleMouseDragged(mouseX, mouseY);
}

void mouseReleased() {
  spline.handleMouseReleased();
}

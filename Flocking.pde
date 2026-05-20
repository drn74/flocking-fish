/**
 * Flocking - Spline Path Guidance
 * Boids seguono una spline Catmull-Rom interattiva.
 * Control point: drag & drop con il mouse.
 */

Flock flock;
PathSpline spline;
Grid grid;

void setup() {
  size(window.innerWidth, window.innerHeight);
  flock = new Flock();
  // Inizializza la spline: ellisse centrata sul canvas
  // rx = 40% della larghezza, ry = 35% dell'altezza
  spline = new PathSpline(width / 2.0, height / 2.0,
                           width * 0.40, height * 0.35);
  grid = new Grid(GRID_COLS, GRID_ROWS, width, height);
  // Aggiungi i boid al centro — convergeranno sulla spline
  for (int i = 0; i < 150; i++) {
    flock.addBoid(new Boid(width / 2.0, height / 2.0));
  }
}

void draw() {
  background(50);
  grid.draw();        // griglia + overlay ostacoli (sotto i boid)
  spline.draw();      // control point waypoint
  flock.run(spline, grid);
}

// Drag & drop dei control point — priorita' 1.
// Se nessun CP e' colpito, il click attiva/disattiva la cella griglia — priorita' 2.
void mousePressed() {
  if (!spline.handleMousePressed(mouseX, mouseY)) {
    grid.toggleCell(mouseX, mouseY);
  }
}

void mouseDragged() {
  spline.handleMouseDragged(mouseX, mouseY);
}

void mouseReleased() {
  spline.handleMouseReleased();
}

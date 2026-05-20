// Obstacle — cerchio fisso che i boid evitano e che innesca il panico.

float OBSTACLE_RADIUS = 40.0;   // raggio visivo e trigger panico

class Obstacle {

  PVector position;
  float radius;

  Obstacle(float x, float y) {
    position = new PVector(x, y);
    radius = OBSTACLE_RADIUS;
  }

  // Restituisce true se pos e' dentro il raggio dell'ostacolo
  boolean contains(PVector pos) {
    return PVector.dist(pos, position) < radius;
  }

  // Rendering: cerchio rosso semitrasparente con bordo pieno.
  // pushStyle()/popStyle() garantiscono che stroke, fill e strokeWeight
  // non contaminino il rendering dei boid che avviene subito dopo.
  void draw() {
    pushStyle();
    stroke(220, 50, 50);
    strokeWeight(2.0);
    fill(220, 50, 50, 60);
    ellipse(position.x, position.y, radius * 2, radius * 2);
    popStyle();
  }
}

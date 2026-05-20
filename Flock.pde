// The Flock (a list of Boid objects)

float ARRIVAL_RADIUS = 80.0;  // distanza centroide-waypoint per avanzare al successivo

class Flock {
  ArrayList<Boid> boids; // An ArrayList for all the boids

  Flock() {
    boids = new ArrayList<Boid>(); // Initialize the ArrayList
  }

  void run(PathSpline spline, Grid grid) {
    int n = boids.size();

    // --- Centroide del branco ---
    PVector centroid = new PVector(0, 0);
    for (int i = 0; i < n; i++) {
      Boid b = (Boid) boids.get(i);
      centroid.add(b.position);
    }
    if (n > 0) centroid.div((float) n);

    // --- Routing waypoint con skip celle ostacolo ---
    // Se il waypoint corrente e' in cella ostacolo → avanza di 1 per frame.
    // Prima verifica se TUTTI i waypoint sono ostacolo (caso limite: non avanzare).
    boolean allObstacle = true;
    for (int offset = 0; offset < spline.size(); offset++) {
      PVector candidate = spline.getPointAt(spline.currentIndex + offset);
      if (!grid.isObstacle(candidate)) {
        allObstacle = false;
        break;
      }
    }

    if (!allObstacle) {
      if (grid.isObstacle(spline.getCurrentTarget())) {
        // Waypoint corrente e' ostacolo: avanza di 1 (il loop ricontrollera' al prossimo frame)
        spline.advanceTarget();
      } else {
        // Waypoint corrente e' sicuro: logica centroide normale
        if (PVector.dist(centroid, spline.getCurrentTarget()) < ARRIVAL_RADIUS) {
          spline.advanceTarget();
        }
      }
    }
    // Se allObstacle: non avanza, spline.getCurrentTarget() rimane invariato

    // Target letto DOPO l'eventuale advanceTarget() — i boid ricevono gia' il target aggiornato
    PVector target = spline.getCurrentTarget();

    // --- Aggiorna ogni boid ---
    for (int i = 0; i < n; i++) {
      Boid b = (Boid) boids.get(i);
      b.run(boids, target, grid, centroid);
    }
  }

  void addBoid(Boid b) {
    boids.add(b);
  }

}

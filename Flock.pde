// The Flock (a list of Boid objects)

float ARRIVAL_RADIUS = 80.0;  // distanza centroide-waypoint per avanzare al successivo

class Flock {
  ArrayList<Boid> boids; // An ArrayList for all the boids

  Flock() {
    boids = new ArrayList<Boid>(); // Initialize the ArrayList
  }

  void run(PathSpline spline, ArrayList<Obstacle> obstacles) {
    // 1. Recupera il target condiviso corrente
    PVector target = spline.getCurrentTarget();

    // 2. Calcola il centroide del branco (media posizioni di tutti i boid)
    PVector centroid = new PVector(0, 0);
    int n = boids.size();
    for (int i = 0; i < n; i++) {
      centroid.add(boids.get(i).position);
    }
    if (n > 0) {
      centroid.div((float) n);
    }

    // 3. Se il centroide e' abbastanza vicino al waypoint corrente, avanza al successivo
    if (PVector.dist(centroid, target) < ARRIVAL_RADIUS) {
      spline.advanceTarget();
      target = spline.getCurrentTarget();  // aggiorna il riferimento dopo lo switch
    }

    // 4. Propaga il target e la lista ostacoli a ogni boid
    for (Boid b : boids) {
      b.run(boids, target, obstacles);
    }
  }

  void addBoid(Boid b) {
    boids.add(b);
  }

}

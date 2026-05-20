// The Boid class

// Path following constants
float PATH_WEIGHT              = 0.5;   // forza waypoint: bassa perche' il flocking deve dominare
float REPULSION_WEIGHT         = 3.0;   // peso forza repulsiva celle ostacolo
float CENTROID_WEIGHT          = 1.5;   // forza centroide: attiva solo quando il boid e' isolato dal branco
boolean BORDER_REPULSION       = true;  // true = bordo morbido; false = wraparound classico
float BORDER_MARGIN            = 80.0;  // pixel dal bordo in cui inizia la repulsione
float BORDER_REPULSION_WEIGHT  = 2.0;   // peso forza bordo

class Boid {

  PVector position;
  PVector velocity;
  PVector acceleration;
  float r;
  float maxforce;       // Maximum steering force
  float maxspeed;       // Maximum speed

    Boid(float x, float y) {
    acceleration = new PVector(0, 0);

    // This is a new PVector method not yet implemented in JS
    // velocity = PVector.random2D();

    // Leaving the code temporarily this way so that this example runs in JS
    float angle = random(TWO_PI);
    velocity = new PVector(cos(angle), sin(angle));

    position = new PVector(x, y);
    r = 2.0;
    maxspeed = 2;
    maxforce = 0.03;
  }

  void run(ArrayList<Boid> boids, PVector target, Grid grid, PVector centroid) {
    flock(boids, target, grid, centroid);
    update();
    borders();
    render();
  }

  void applyForce(PVector force) {
    // We could add mass here if we want A = F / M
    acceleration.add(force);
  }

  // Accumula forze per questo frame: flocking standard + waypoint + repulsione ostacoli + centroid-seek.
  void flock(ArrayList<Boid> boids, PVector target, Grid grid, PVector centroid) {
    // Forze flocking standard
    PVector sep = separate(boids);
    PVector ali = align(boids);
    PVector coh = cohesion(boids);
    sep.mult(1.5);
    ali.mult(1.0);
    coh.mult(1.0);
    applyForce(sep);
    applyForce(ali);
    applyForce(coh);

    // Waypoint steering — sempre attivo
    PVector pf = followTarget(target);
    pf.mult(PATH_WEIGHT);
    applyForce(pf);

    // Repulsione radiale dalle celle ostacolo
    PVector repel = repelFromObstacles(grid);
    repel.mult(REPULSION_WEIGHT);
    applyForce(repel);

    // Repulsione dai bordi del canvas (bordo morbido)
    if (BORDER_REPULSION) {
      PVector br = repelFromBorders();
      br.mult(BORDER_REPULSION_WEIGHT);
      applyForce(br);
    }

    // Centroid-seek: attivo solo se il boid non ha vicini entro neighbordist (isolato dal branco)
    int neighborCount = 0;
    for (int i = 0; i < boids.size(); i++) {
      Boid other = (Boid) boids.get(i);
      float d = PVector.dist(position, other.position);
      if (d > 0 && d < 50) neighborCount++;
    }
    if (neighborCount == 0) {
      PVector cs = seek(centroid);
      cs.mult(CENTROID_WEIGHT);
      applyForce(cs);
    }
  }

  // Method to update position
  void update() {
    // Update velocity
    velocity.add(acceleration);
    // Limit speed
    velocity.limit(maxspeed);
    position.add(velocity);
    // Reset accelertion to 0 each cycle
    acceleration.mult(0);
  }

  // A method that calculates and applies a steering force towards a target
  // STEER = DESIRED MINUS VELOCITY
  PVector seek(PVector target) {
    PVector desired = PVector.sub(target, position);  // A vector pointing from the position to the target
    // Scale to maximum speed
    desired.normalize();
    desired.mult(maxspeed);

    // Above two lines of code below could be condensed with new PVector setMag() method
    // Not using this method until Processing.js catches up
    // desired.setMag(maxspeed);

    // Steering = Desired minus Velocity
    PVector steer = PVector.sub(desired, velocity);
    steer.limit(maxforce);  // Limit to maximum steering force
    return steer;
  }

  // Forza di steering verso il waypoint condiviso del branco
  PVector followTarget(PVector target) {
    return seek(target);
  }

  // Forza di repulsione radiale aggregata da tutte le celle ostacolo attive.
  // La forza e' proporzionale alla vicinanza al centro: massima al centro, zero al raggio.
  PVector repelFromObstacles(Grid grid) {
    PVector steer = new PVector(0, 0);
    int count = 0;
    float repRadius = grid.getRepulsionRadius();

    for (int c = 0; c < grid.cols; c++) {
      for (int r = 0; r < grid.rows; r++) {
        if (grid.getCell(c, r)) {
          PVector center = grid.getCellCenter(c, r);
          float d = PVector.dist(position, center);
          if (d < repRadius && d > 0) {
            // Direzione: via dal centro della cella
            PVector away = PVector.sub(position, center);
            away.normalize();
            // Intensita': lineare, da 1.0 (al centro) a 0.0 (al bordo del raggio)
            float strength = 1.0 - (d / repRadius);
            away.mult(strength);
            steer.add(away);
            count++;
          }
        }
      }
    }

    if (count > 0) {
      steer.div((float) count);
    }

    // Steering Reynolds: desired - velocity, limitato a maxforce
    // setMag() non disponibile in Processing.js v1.6.6 — normalize + mult manuale
    if (steer.mag() > 0) {
      steer.normalize();
      steer.mult(maxspeed);
      steer.sub(velocity);
      steer.limit(maxforce);
    }

    return steer;
  }

  // Forza di repulsione dai 4 bordi del canvas.
  // Falloff lineare: massima al bordo, zero a BORDER_MARGIN pixel di distanza.
  PVector repelFromBorders() {
    PVector steer = new PVector(0, 0);

    if (position.x < BORDER_MARGIN) {
      steer.add(new PVector(1.0 - (position.x / BORDER_MARGIN), 0));
    }
    if (position.x > width - BORDER_MARGIN) {
      steer.add(new PVector(-(1.0 - ((width - position.x) / BORDER_MARGIN)), 0));
    }
    if (position.y < BORDER_MARGIN) {
      steer.add(new PVector(0, 1.0 - (position.y / BORDER_MARGIN)));
    }
    if (position.y > height - BORDER_MARGIN) {
      steer.add(new PVector(0, -(1.0 - ((height - position.y) / BORDER_MARGIN))));
    }

    if (steer.mag() > 0) {
      steer.normalize();
      steer.mult(maxspeed);
      steer.sub(velocity);
      steer.limit(maxforce);
    }
    return steer;
  }

  void render() {
    float theta = velocity.heading2D() + radians(90);
    // heading2D() corretto per Processing.js v1.6.6 — non usare heading()
    fill(200, 100);
    stroke(255);
    pushMatrix();
    translate(position.x, position.y);
    rotate(theta);
    beginShape(TRIANGLES);
    vertex(0, -r*2);
    vertex(-r, r*2);
    vertex(r, r*2);
    endShape();
    popMatrix();
  }

  // Wraparound
  void borders() {
    if (position.x < -r) position.x = width+r;
    if (position.y < -r) position.y = height+r;
    if (position.x > width+r) position.x = -r;
    if (position.y > height+r) position.y = -r;
  }

  // Separation
  // Method checks for nearby boids and steers away
  PVector separate (ArrayList<Boid> boids) {
    float desiredseparation = 25.0f;
    PVector steer = new PVector(0, 0, 0);
    int count = 0;
    // For every boid in the system, check if it's too close
    for (Boid other : boids) {
      float d = PVector.dist(position, other.position);
      // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
      if ((d > 0) && (d < desiredseparation)) {
        // Calculate vector pointing away from neighbor
        PVector diff = PVector.sub(position, other.position);
        diff.normalize();
        diff.div(d);        // Weight by distance
        steer.add(diff);
        count++;            // Keep track of how many
      }
    }
    // Average -- divide by how many
    if (count > 0) {
      steer.div((float)count);
    }

    // As long as the vector is greater than 0
    if (steer.mag() > 0) {
      // First two lines of code below could be condensed with new PVector setMag() method
      // Not using this method until Processing.js catches up
      // steer.setMag(maxspeed);

      // Implement Reynolds: Steering = Desired - Velocity
      steer.normalize();
      steer.mult(maxspeed);
      steer.sub(velocity);
      steer.limit(maxforce);
    }
    return steer;
  }

  // Alignment
  // For every nearby boid in the system, calculate the average velocity
  PVector align (ArrayList<Boid> boids) {
    float neighbordist = 50;
    PVector sum = new PVector(0, 0);
    int count = 0;
    for (Boid other : boids) {
      float d = PVector.dist(position, other.position);
      if ((d > 0) && (d < neighbordist)) {
        sum.add(other.velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.div((float)count);
      // First two lines of code below could be condensed with new PVector setMag() method
      // Not using this method until Processing.js catches up
      // sum.setMag(maxspeed);

      // Implement Reynolds: Steering = Desired - Velocity
      sum.normalize();
      sum.mult(maxspeed);
      PVector steer = PVector.sub(sum, velocity);
      steer.limit(maxforce);
      return steer;
    } 
    else {
      return new PVector(0, 0);
    }
  }

  // Cohesion
  // For the average position (i.e. center) of all nearby boids, calculate steering vector towards that position
  PVector cohesion (ArrayList<Boid> boids) {
    float neighbordist = 50;
    PVector sum = new PVector(0, 0);   // Start with empty vector to accumulate all positions
    int count = 0;
    for (Boid other : boids) {
      float d = PVector.dist(position, other.position);
      if ((d > 0) && (d < neighbordist)) {
        sum.add(other.position); // Add position
        count++;
      }
    }
    if (count > 0) {
      sum.div((float)count);
      return seek(sum);  // Steer towards the position
    } 
    else {
      return new PVector(0, 0);
    }
  }
}

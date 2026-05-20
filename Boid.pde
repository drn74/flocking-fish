// The Boid class

// Path following and panic constants
float PATH_WEIGHT        = 0.5;   // forza waypoint: bassa perche' il flocking deve dominare
float AVOID_WEIGHT       = 3.0;   // peso massimo fuga ostacoli (a panicLevel = 1.0)
float DECAY_RATE         = 0.97;  // smorzamento panico per frame (~100 frame a calma completa)
float PROPAGATION_FACTOR = 0.75;  // frazione panico trasmessa ai vicini
float PANIC_RADIUS       = 50.0;  // raggio entro cui si propaga il panico tra boid

class Boid {

  PVector position;
  PVector velocity;
  PVector acceleration;
  float r;
  float maxforce;    // Maximum steering force
  float maxspeed;    // Maximum speed
  float panicLevel;  // 0.0 = calmo, 1.0 = panico pieno

  Boid(float x, float y) {
    acceleration = new PVector(0, 0);

    // PVector.random2D() non e' implementato in Processing.js v1.6.6 — angolo manuale
    float angle = random(TWO_PI);
    velocity = new PVector(cos(angle), sin(angle));

    position = new PVector(x, y);
    r = 2.0;
    maxspeed = 2;
    maxforce = 0.03;
    panicLevel = 0.0;
  }

  void run(ArrayList<Boid> boids, PVector target, ArrayList<Obstacle> obstacles) {
    flock(boids, target, obstacles);
    update();
    borders();
    render();
  }

  void applyForce(PVector force) {
    // We could add mass here if we want A = F / M
    acceleration.add(force);
  }

  // Accumula acceleration da tutte le forze: flocking, waypoint, propagazione panico, fuga ostacoli.
  // Ordine critico: propagazione PRIMA del decay; avoidObstacles() DOPO il decay
  // (sovrascrive panicLevel a 1.0 se il boid e' dentro un ostacolo).
  void flock(ArrayList<Boid> boids, PVector target, ArrayList<Obstacle> obstacles) {
    // --- Forze flocking standard ---
    PVector sep = separate(boids);
    PVector ali = align(boids);
    PVector coh = cohesion(boids);
    sep.mult(1.5);
    ali.mult(1.0);
    coh.mult(1.0);
    applyForce(sep);
    applyForce(ali);
    applyForce(coh);

    // Waypoint steering — target condiviso dal branco, peso basso per non annullare il flocking
    PVector pf = followTarget(target);
    pf.mult(PATH_WEIGHT);
    applyForce(pf);

    // --- Propagazione panico (PRIMA del decay) ---
    // Legge panicLevel dei vicini e aggiorna il proprio — non modifica i vicini.
    // Cast esplicito (Boid) necessario: Processing.js tratta ArrayList come non-generica a runtime.
    for (int i = 0; i < boids.size(); i++) {
      Boid other = (Boid) boids.get(i);
      float d = PVector.dist(position, other.position);
      if (d > 0 && d < PANIC_RADIUS) {
        panicLevel = max(panicLevel, other.panicLevel * PROPAGATION_FACTOR);
      }
    }

    // --- Decay panico (DOPO la propagazione) ---
    // Se il boid e' dentro un ostacolo, avoidObstacles() riportera' panicLevel a 1.0.
    panicLevel = panicLevel * DECAY_RATE;

    // --- Forza di fuga ostacoli ---
    // avoidObstacles() imposta panicLevel=1.0 se il boid e' dentro un ostacolo (override del decay).
    PVector avoid = avoidObstacles(obstacles);
    avoid.mult(AVOID_WEIGHT * panicLevel);
    applyForce(avoid);
  }

  // Calcola la forza di fuga aggregata da tutti gli ostacoli.
  // Effetto collaterale: imposta panicLevel = 1.0 se il boid e' dentro almeno un ostacolo.
  // La forza restituita e' gia' nella forma Reynolds steering (desired - velocity), limitata a maxforce.
  PVector avoidObstacles(ArrayList<Obstacle> obstacles) {
    PVector steer = new PVector(0, 0);
    int count = 0;
    boolean inObstacle = false;

    for (int i = 0; i < obstacles.size(); i++) {
      Obstacle obs = (Obstacle) obstacles.get(i);
      float d = PVector.dist(position, obs.position);

      if (d < obs.radius) {
        // Trigger primario: boid dentro il raggio — panico immediato
        inObstacle = true;

        // Vettore di fuga: punta via dall'ostacolo
        PVector away = PVector.sub(position, obs.position);
        // Se il boid e' esattamente al centro (d==0), scegliere direzione casuale
        if (away.mag() == 0) {
          float angle = random(TWO_PI);
          away = new PVector(cos(angle), sin(angle));
        }
        away.normalize();
        // Scala inversamente alla distanza: piu' vicino = forza maggiore; d+1 evita divisione per zero
        away.div(d + 1);
        steer.add(away);
        count++;
      }
    }

    // Imposta panico solo se il boid e' dentro un ostacolo in questo frame
    if (inObstacle) {
      panicLevel = 1.0;
    }

    if (count > 0) {
      steer.div((float) count);
    }

    // Applica Reynolds steering se la forza e' non nulla
    // setMag() non disponibile in Processing.js v1.6.6 — normalize + mult manuale
    if (steer.mag() > 0) {
      steer.normalize();
      steer.mult(maxspeed);
      steer.sub(velocity);
      steer.limit(maxforce);
    }

    return steer;
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

  void render() {
    // heading2D() corretto per Processing.js v1.6.6 — non usare heading()
    float theta = velocity.heading2D() + radians(90);

    // Interpola colore tra calmo (grigio-azzurro) e panico (rosso-arancio)
    // panicLevel = 0.0 → fill(200, 200, 220, 100)
    // panicLevel = 1.0 → fill(255, 80, 30, 180)
    float r_col = lerp(200, 255, panicLevel);
    float g_col = lerp(200, 80,  panicLevel);
    float b_col = lerp(220, 30,  panicLevel);
    float a_col = lerp(100, 180, panicLevel);

    fill(r_col, g_col, b_col, a_col);
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

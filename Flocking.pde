/**
 * Flocking - Spline Path Guidance + Ostacoli e Panico
 * Control point spline: drag & drop con il mouse.
 * Ostacoli: click su canvas vuoto per aggiungere, click su ostacolo per rimuovere.
 */

Flock flock;
PathSpline spline;
ArrayList<Obstacle> obstacles;   // lista globale degli ostacoli attivi

void setup() {
  size(window.innerWidth, window.innerHeight);
  flock = new Flock();
  spline = new PathSpline(width / 2.0, height / 2.0,
                           width * 0.40, height * 0.35);
  obstacles = new ArrayList<Obstacle>();   // lista vuota all'avvio
  for (int i = 0; i < 150; i++) {
    flock.addBoid(new Boid(width / 2.0, height / 2.0));
  }
}

void draw() {
  background(50);
  spline.draw();                    // spline sotto i boid
  // Disegna ostacoli DOPO spline, PRIMA dei boid (visualmente sotto i boid)
  for (int i = 0; i < obstacles.size(); i++) {
    ((Obstacle) obstacles.get(i)).draw();
  }
  flock.run(spline, obstacles);     // passa ostacoli al branco
}

// Priorita' click:
// 1. Spline CP drag (gestito da PathSpline) — se agganciato, stop
// 2. Rimuovi ostacolo se click dentro un ostacolo esistente
// 3. Altrimenti aggiungi nuovo ostacolo
void mousePressed() {
  // Priorita' 1: CP spline
  if (spline.handleMousePressed(mouseX, mouseY)) {
    return;  // CP agganciato — non fare altro
  }

  // Priorita' 2: rimuovi ostacolo se click dentro un ostacolo esistente.
  // Loop con indice inverso: rimuovere da indici alti verso bassi non invalida
  // gli indici non ancora visitati (pattern corretto per ArrayList in Processing.js).
  for (int i = obstacles.size() - 1; i >= 0; i--) {
    Obstacle obs = (Obstacle) obstacles.get(i);
    if (obs.contains(new PVector(mouseX, mouseY))) {
      obstacles.remove(i);
      return;  // rimosso — non aggiungere
    }
  }

  // Priorita' 3: aggiungi nuovo ostacolo
  obstacles.add(new Obstacle(mouseX, mouseY));
}

void mouseDragged() {
  spline.handleMouseDragged(mouseX, mouseY);
}

void mouseReleased() {
  spline.handleMouseReleased();
}

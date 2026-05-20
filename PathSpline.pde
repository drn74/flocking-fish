// PathSpline — Waypoint manager con control point interattivi.
// Gestisce un insieme di 8 waypoint su ellisse, lo switching del target condiviso,
// il rendering dei punti numerati, e il drag & drop.

int SPLINE_CP_RADIUS = 8;  // raggio visivo e hit-test dei control point (ridotto da 10)

class PathSpline {

  ArrayList<PVector> pts;  // control point (waypoint)
  int dragIndex;           // indice CP in drag, -1 se nessuno
  int currentIndex;        // indice del waypoint target corrente

  // Costruisce 8 waypoint su ellisse centrata in (cx, cy) con semiassi rx, ry
  PathSpline(float cx, float cy, float rx, float ry) {
    pts = new ArrayList<PVector>();
    dragIndex = -1;
    currentIndex = 0;
    int N = 8;
    for (int i = 0; i < N; i++) {
      float angle = TWO_PI * i / N;
      float px = cx + cos(angle) * rx;
      float py = cy + sin(angle) * ry;
      pts.add(new PVector(px, py));
    }
  }

  // Restituisce il waypoint target corrente
  PVector getCurrentTarget() {
    return pts.get(currentIndex);
  }

  // Avanza al waypoint successivo in senso orario (modulo N)
  void advanceTarget() {
    currentIndex = (currentIndex + 1) % pts.size();
  }

  // Disegna i control point come cerchietti numerati.
  // Il waypoint corrente e' evidenziato in giallo; gli altri in ciano.
  // Nessuna curva, nessuna linea.
  void draw() {
    int N = pts.size();
    for (int i = 0; i < N; i++) {
      PVector p = pts.get(i);
      if (i == currentIndex) {
        stroke(255, 220, 0);
        fill(255, 220, 0, 60);
      } else {
        stroke(0, 200, 255);
        noFill();
      }
      strokeWeight(1.5);
      ellipse(p.x, p.y, SPLINE_CP_RADIUS * 2, SPLINE_CP_RADIUS * 2);
      // Numero indice accanto al cerchio
      fill(255);
      noStroke();
      textSize(10);
      text(i, p.x + SPLINE_CP_RADIUS + 4, p.y);
    }
    strokeWeight(1);  // reset — evita contaminazione rendering boid
  }

  // Inizia il drag del control point piu' vicino entro SPLINE_CP_RADIUS * 1.5.
  // Restituisce true se un CP e' stato agganciato (il click non deve fare altro),
  // false se nessun CP e' stato colpito (il click e' libero per altre azioni).
  boolean handleMousePressed(float mx, float my) {
    dragIndex = -1;
    int N = pts.size();
    for (int i = 0; i < N; i++) {
      PVector p = pts.get(i);
      float d = dist(mx, my, p.x, p.y);
      if (d < SPLINE_CP_RADIUS * 1.5) {
        dragIndex = i;
        return true;   // CP agganciato — stop, non aggiungere ostacolo
      }
    }
    return false;      // nessun CP colpito — click libero per ostacoli
  }

  // Sposta il CP in drag alla posizione del mouse
  void handleMouseDragged(float mx, float my) {
    if (dragIndex >= 0) {
      pts.get(dragIndex).x = mx;
      pts.get(dragIndex).y = my;
    }
  }

  // Rilascia il drag
  void handleMouseReleased() {
    dragIndex = -1;
  }

}

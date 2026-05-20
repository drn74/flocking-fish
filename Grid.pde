// Grid — Reticolo interattivo NxM celle.
// Ogni cella puo' essere attivata come zona ostacolo via click.
// Array 1D con helper getCell/setCell (boolean[][] non garantito in Processing.js).

int GRID_COLS = 4;
int GRID_ROWS = 3;
float REPULSION_RADIUS_FACTOR = 1.5;

class Grid {

  int cols, rows;
  float cellW, cellH;
  boolean[] cells;  // 1D array: indice = col * rows + row

  Grid(int cols, int rows, float w, float h) {
    this.cols = cols;
    this.rows = rows;
    this.cellW = w / (float) cols;
    this.cellH = h / (float) rows;
    cells = new boolean[cols * rows];
    // boolean[] inizializzato a false da Processing — OK
  }

  // --- Accesso cella ---

  boolean getCell(int c, int r) {
    return cells[c * rows + r];
  }

  void setCell(int c, int r, boolean v) {
    cells[c * rows + r] = v;
  }

  // --- Rendering ---

  void draw() {
    // 1. Overlay rosso celle ostacolo (PRIMA delle linee)
    noStroke();
    fill(255, 0, 0, 60);
    for (int c = 0; c < cols; c++) {
      for (int r = 0; r < rows; r++) {
        if (getCell(c, r)) {
          rect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }
    // 2. Linee griglia
    stroke(255, 40);
    strokeWeight(1);
    for (int c = 0; c <= cols; c++) {
      line(c * cellW, 0, c * cellW, height);
    }
    for (int r = 0; r <= rows; r++) {
      line(0, r * cellH, width, r * cellH);
    }
  }

  // --- Interazione ---

  // Attiva/disattiva la cella corrispondente alla coordinata schermo (mx, my)
  void toggleCell(float mx, float my) {
    int c = (int)(mx / cellW);
    int r = (int)(my / cellH);
    if (c >= 0 && c < cols && r >= 0 && r < rows) {
      setCell(c, r, !getCell(c, r));
    }
  }

  // --- Query spaziali ---

  // Restituisce true se la posizione pos e' dentro una cella ostacolo
  boolean isObstacle(PVector pos) {
    int c = (int)(pos.x / cellW);
    int r = (int)(pos.y / cellH);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return false;
    return getCell(c, r);
  }

  // Centro geometrico della cella (col, row)
  PVector getCellCenter(int c, int r) {
    return new PVector((c + 0.5) * cellW, (r + 0.5) * cellH);
  }

  // Raggio del campo di repulsione: 1.5x il raggio inscritto della cella
  float getRepulsionRadius() {
    float inscribed = min(cellW, cellH) / 2.0;
    return inscribed * REPULSION_RADIUS_FACTOR;
  }

}

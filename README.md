# Flocking Fish — Extended Simulation

Basato sul [Flocking Demo di Daniel Shiffman](https://processing.org/examples/flocking.html).  
Runtime: **Processing.js v1.6.6** su canvas HTML5, server Express su `localhost:3000`.

---

## Progetto originale

Il progetto di partenza implementa l'algoritmo di Craig Reynolds (Boids, 1987) con tre forze di steering:

| Forza | Raggio | Peso |
|---|---|---|
| **Separation** — steer lontano dai vicini troppo vicini | 25 px | 1.5 |
| **Alignment** — allinea la velocità alla media dei vicini | 50 px | 1.0 |
| **Cohesion** — steer verso il centro di massa dei vicini | 50 px | 1.0 |

**Interazione originale:** click sul canvas → aggiunge un nuovo boid nella posizione del mouse.  
**Bordi:** wraparound — il boid esce da un lato e rientra dall'altro (effetto Pac-Man).  
**File originali:** `Boid.pde`, `Flock.pde`, `Flocking.pde`.

---

## Modifiche in questa versione

### 1. Nuovo file: `PathSpline.pde`

Gestisce 8 waypoint fissi disposti su un'ellisse centrata sul canvas (semiassi: 40% larghezza, 35% altezza). Il branco si muove come unità verso un target condiviso, avanzando al waypoint successivo quando il **centroide** del branco entra entro `ARRIVAL_RADIUS` dal target corrente.

**Metodi pubblici:**
- `getCurrentTarget()` → `PVector` — waypoint attivo
- `advanceTarget()` — avanza al successivo in senso orario (modulo 8)
- `handleMousePressed(mx, my)` → `boolean` — aggancia il control point più vicino entro `SPLINE_CP_RADIUS * 1.5` px; restituisce `true` se agganciato (consuma l'evento mouse)
- `handleMouseDragged(mx, my)` / `handleMouseReleased()` — drag & drop dei control point
- `getPointAt(absoluteIndex)` — restituisce il waypoint all'indice con wrap
- `size()` — numero di waypoint

**Rendering:** cerchietti numerati 0–7; waypoint attivo in giallo, gli altri in ciano.

**Costante:** `SPLINE_CP_RADIUS = 8` (raggio visivo e hit-test).

---

### 2. Nuovo file: `Grid.pde`

Reticolo interattivo NxM che sovrappone il canvas. Ogni cella può essere attivata come zona ostacolo con un click. Le celle attive vengono disegnate con un overlay rosso semitrasparente; il reticolo è visibile con linee bianche a bassa opacità.

**Struttura interna:** array 1D `boolean[] cells` con indice `col * rows + row` (non `boolean[][]` — non garantito in Processing.js).

**Metodi pubblici:**
- `getCell(c, r)` / `setCell(c, r, v)` — accesso cella
- `toggleCell(mx, my)` — attiva/disattiva la cella corrispondente alla coordinata schermo
- `isObstacle(pos)` — true se la posizione `pos` è dentro una cella ostacolo
- `getCellCenter(c, r)` → `PVector` — centro geometrico della cella
- `getRepulsionRadius()` → `float` — raggio del campo di repulsione: `min(cellW, cellH) / 2 * REPULSION_RADIUS_FACTOR`

**Costanti globali:**

| Costante | Default | Descrizione |
|---|---|---|
| `GRID_COLS` | 4 | Colonne del reticolo |
| `GRID_ROWS` | 3 | Righe del reticolo |
| `REPULSION_RADIUS_FACTOR` | 1.5 | Moltiplicatore del raggio di repulsione oltre il bordo della cella |

---

### 3. `Boid.pde` — modifiche

#### 3a. Firma di `run()` e `flock()`

**Originale:**
```java
void run(ArrayList<Boid> boids)
void flock(ArrayList<Boid> boids)
```

**Attuale:**
```java
void run(ArrayList<Boid> boids, PVector target, Grid grid, PVector centroid)
void flock(ArrayList<Boid> boids, PVector target, Grid grid, PVector centroid)
```

I parametri aggiuntivi portano a ogni boid il target condiviso, il riferimento alla griglia e il centroide del branco.

#### 3b. Nuova forza: `followTarget(PVector target)`

Wrappa `seek(target)`. Mantiene una firma separata per chiarezza semantica.

Applicata in `flock()` con peso `PATH_WEIGHT = 0.5` — volutamente basso per lasciare che le forze di flocking dominino.

#### 3c. Nuova forza: `repelFromObstacles(Grid grid)`

Per ogni cella ostacolo attiva, calcola la distanza dal centro della cella. Se il boid è entro `getRepulsionRadius()`, applica una forza radiale verso l'esterno con intensità lineare:

```
strength = 1.0 - (d / repRadius)   // 1.0 al centro, 0.0 al bordo
```

Le forze di più celle vengono sommate e mediate. Poi viene applicata la formula di Reynolds:

```
steer = normalize(steer) * maxspeed - velocity
steer.limit(maxforce)
```

Applicata in `flock()` con peso `REPULSION_WEIGHT = 3.0`.

#### 3d. Nuova forza: `repelFromBorders()`

Repulsione morbida dai 4 bordi del canvas con lo stesso schema lineare delle celle ostacolo. Attiva solo quando `BORDER_REPULSION = true`.

Per ciascuno dei 4 bordi, se il boid è entro `BORDER_MARGIN` pixel:

```
strength = 1.0 - (distanza_dal_bordo / BORDER_MARGIN)
```

Le componenti x e y vengono sommate, poi Reynolds viene applicato come sopra. Applicata con peso `BORDER_REPULSION_WEIGHT = 2.0`.

Quando `BORDER_REPULSION = false`, il metodo non viene chiamato e rimane attivo il wraparound originale (`borders()`).

#### 3e. Centroid-seek per boid isolati

Alla fine di `flock()`, conta i vicini entro 50 px. Se il conteggio è zero (boid isolato dal branco), applica `seek(centroid)` con peso `CENTROID_WEIGHT = 1.5`.

Questo risolve il caso in cui un boid espulso da un ostacolo o uscito dal bordo continua in linea retta: senza vicini le forze di flocking sono tutte zero, e `PATH_WEIGHT * maxforce = 0.015` era troppo debole per curvare visibilmente il boid. Con il centroid-seek la forza effettiva sale a `0.045`, riducendo il tempo di recupero da ~267 frame a ~67 frame.

#### 3f. Costanti aggiunte in `Boid.pde`

| Costante | Default | Descrizione |
|---|---|---|
| `PATH_WEIGHT` | 0.5 | Peso forza waypoint |
| `REPULSION_WEIGHT` | 3.0 | Peso repulsione celle ostacolo |
| `CENTROID_WEIGHT` | 1.5 | Peso centroid-seek (solo se isolato) |
| `BORDER_REPULSION` | `true` | Flag bordo morbido on/off |
| `BORDER_MARGIN` | 80.0 | Pixel dal bordo in cui inizia la repulsione |
| `BORDER_REPULSION_WEIGHT` | 2.0 | Peso forza bordo |

---

### 4. `Flock.pde` — modifiche

**Firma `run()`:**

```java
// Originale
void run()

// Attuale
void run(PathSpline spline, Grid grid)
```

**Logica aggiunta in `run()`:**

1. **Calcolo centroide** — media delle posizioni di tutti i boid ad ogni frame.

2. **Routing waypoint con skip celle ostacolo:**
   - Se il waypoint corrente è in una cella ostacolo → `advanceTarget()` (una volta per frame, non in loop).
   - Prima verifica se *tutti* i waypoint sono ostacolo (`allObstacle` guard) — in quel caso non avanza per evitare un loop infinito.
   - Se il waypoint è libero → avanza quando il centroide è entro `ARRIVAL_RADIUS = 80 px`.

3. **Target letto dopo `advanceTarget()`** — i boid ricevono già il waypoint aggiornato nello stesso frame.

4. **Centroide passato a ogni boid** — `b.run(boids, target, grid, centroid)`.

---

### 5. `Flocking.pde` — modifiche

**`setup()`:**  
Aggiunge l'inizializzazione di `PathSpline` e `Grid`. La spline viene costruita centrata sul canvas con i semiassi proporzionali alle dimensioni della finestra.

**`draw()`:**  
Ordine di rendering: `grid.draw()` → `spline.draw()` → `flock.run(spline, grid)`.  
La griglia viene disegnata per prima (sotto i boid e i control point).

**`mousePressed()` — priorità:**
1. `spline.handleMousePressed(mouseX, mouseY)` — se agganciato un CP, stop (non togglare la cella)
2. `grid.toggleCell(mouseX, mouseY)` — altrimenti attiva/disattiva la cella

**`mouseDragged()` / `mouseReleased()`:** delegati alla spline per il drag dei control point.

---

### 6. `index.html` — modifiche

**Originale:**
```html
<canvas data-processing-sources="Flocking.pde Boid.pde Flock.pde"></canvas>
```

**Attuale:**
```html
<canvas data-processing-sources="Grid.pde PathSpline.pde Flocking.pde Boid.pde Flock.pde"></canvas>
```

`Grid.pde` deve essere il primo file perché definisce le costanti globali `GRID_COLS`, `GRID_ROWS` e `REPULSION_RADIUS_FACTOR` usate da `Flocking.pde` nel costruttore di `Grid`.

---

## Controlli

| Azione | Effetto |
|---|---|
| Click su cella del reticolo | Attiva/disattiva cella come ostacolo (overlay rosso) |
| Click su control point (cerchio numerato) | Seleziona il CP per il drag |
| Drag control point | Sposta il waypoint — il branco aggiorna il percorso in tempo reale |
| Click su spazio vuoto (no CP, no cella) | Nessun effetto (il click è consumato dal gestore griglia) |

---

## Parametri tunerabili

Tutti i valori sono costanti globali nei rispettivi file `.pde`. Non richiedono ricompilazione — basta ricaricare il browser dopo la modifica.

| Costante | File | Default | Effetto |
|---|---|---|---|
| `GRID_COLS` | Grid.pde | 4 | Colonne reticolo |
| `GRID_ROWS` | Grid.pde | 3 | Righe reticolo |
| `REPULSION_RADIUS_FACTOR` | Grid.pde | 1.5 | Estensione campo repulsivo oltre il bordo cella |
| `ARRIVAL_RADIUS` | Flock.pde | 80.0 | Distanza centroide-waypoint per avanzare |
| `PATH_WEIGHT` | Boid.pde | 0.5 | Forza verso il waypoint |
| `REPULSION_WEIGHT` | Boid.pde | 3.0 | Forza repulsiva celle ostacolo |
| `CENTROID_WEIGHT` | Boid.pde | 1.5 | Forza centroid-seek (solo boid isolati) |
| `BORDER_REPULSION` | Boid.pde | true | Bordo morbido on/off |
| `BORDER_MARGIN` | Boid.pde | 80.0 | Pixel dal bordo in cui inizia la repulsione |
| `BORDER_REPULSION_WEIGHT` | Boid.pde | 2.0 | Forza repulsiva bordi canvas |
| `SPLINE_CP_RADIUS` | PathSpline.pde | 8 | Raggio visivo e hit-test control point |

---

## Note Processing.js v1.6.6

- `PVector.random2D()` non disponibile → velocità iniziale via `cos/sin` su angolo casuale
- `heading()` non disponibile → usare `heading2D()`
- `setMag()` non disponibile → `normalize()` + `mult()` manuale
- `boolean[][]` non garantito → array 1D con indice `col * rows + row`
- Cast esplicito `(Boid)` e `(PVector)` su tutti i `ArrayList.get(i)` nei loop indicizzati

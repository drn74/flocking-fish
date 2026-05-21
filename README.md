# Flocking Fish — TypeScript + Pixi.js

Porting moderno della simulazione di flocking originale basata su **Processing.js**.  
Stessa fisica, stessi comportamenti — stack completamente rinnovato.

## Stack

| | Originale | Questa versione |
|---|---|---|
| Linguaggio | Processing.js (syntax Java) | TypeScript 6 |
| Rendering | Canvas 2D (CPU) | **Pixi.js v8** (WebGL, GPU) |
| Dev server | Express statico | **Vite 8** |
| UI parametri | Costanti nel codice | **Tweakpane v4** (live, a runtime) |
| Build | Nessuna | `tsc + vite build` |

## Avvio rapido

```bash
cd flocking-conv
npm install
npm run dev        # http://localhost:5173
npm run build      # build produzione in dist/
```

## Struttura del progetto

```
src/
  config.ts       — tutti i parametri della simulazione (bind Tweakpane)
  Vector2D.ts     — rimpiazzo di PVector con operazioni mutabili e statiche
  Grid.ts         — reticolo NxM celle ostacolo con PIXI.Graphics
  PathSpline.ts   — 8 waypoint su ellisse, drag & drop control point
  Boid.ts         — fisica completa del singolo agente
  Flock.ts        — gestione branco, centroide, routing waypoint
  main.ts         — PIXI.Application, Tweakpane, resize, mouse/touch
```

## Fisica della simulazione

Ogni boid accumula 6 forze per frame, tutte calcolate con la formula di Reynolds:

```
desired = normalize(direction) × maxSpeed
steer   = desired − velocity
steer.limit(maxForce)
```

| Forza | Peso default | Attivazione |
|---|---|---|
| Separation | 1.5 | Sempre (raggio 25 px) |
| Alignment | 1.0 | Sempre (raggio 50 px) |
| Cohesion | 1.0 | Sempre (raggio 50 px) |
| Path following | 0.5 | Sempre — segue il waypoint condiviso |
| Obstacle repulsion | 3.0 | Se entro il raggio di una cella ostacolo |
| Border repulsion | 2.0 | Se entro `borderMargin` dal bordo (disabilitabile) |
| Centroid-seek | 1.5 | Solo se zero vicini entro 50 px (boid isolato) |

### Gestione waypoint

Il branco condivide un singolo target. Il centroide avanza al waypoint successivo (in senso orario) quando entra entro `arrivalRadius` dal target corrente.  
Se il waypoint corrente cade in una cella ostacolo, viene saltato (una volta per frame); una guardia `allObstacle` impedisce loop infiniti quando tutte le celle sono ostacolo.

### Boid isolati

Quando un boid si separa dal branco (nessun vicino entro 50 px), le forze di flocking valgono zero. Senza il centroid-seek la forza residua sul waypoint (`0.5 × maxForce = 0.015`) richiederebbe ~267 frame per invertire la rotta. Con il centroid-seek la forza effettiva sale a `0.06`, riportando il boid al branco in ~67 frame.

## Controlli

| Azione | Effetto |
|---|---|
| Click su cella del reticolo | Attiva / disattiva cella come ostacolo (overlay rosso) |
| Click su control point (cerchio numerato) | Seleziona il CP per il drag |
| Drag control point | Sposta il waypoint in tempo reale |
| Touch (mobile) | Stesso comportamento del mouse |

## Parametri — Tweakpane

Tutti i valori sono in `src/config.ts` e modificabili live dal pannello laterale senza ricaricare.

| Parametro | Default | Descrizione |
|---|---|---|
| `boidCount` | 150 | Numero di boid (Reset/Repopulate richiesto) |
| `maxSpeed` | 2 | Velocità massima px/frame |
| `maxForce` | 0.03 | Forza di steering massima |
| `separationDist` | 25 | Raggio separation |
| `neighborDist` | 50 | Raggio alignment e cohesion |
| `weights.separation` | 1.5 | Peso separation |
| `weights.alignment` | 1.0 | Peso alignment |
| `weights.cohesion` | 1.0 | Peso cohesion |
| `weights.pathFollowing` | 0.5 | Peso forza waypoint |
| `weights.obstacleRepulsion` | 3.0 | Peso repulsione celle ostacolo |
| `weights.borderRepulsion` | 2.0 | Peso repulsione bordi |
| `weights.centroidSeek` | 1.5 | Peso centroid-seek (solo isolati) |
| `gridCols` / `gridRows` | 4 / 3 | Dimensioni reticolo |
| `repulsionRadiusFactor` | 1.5 | Estensione campo repulsivo oltre bordo cella |
| `arrivalRadius` | 80 | Distanza centroide-waypoint per avanzare |
| `borderMargin` | 80 | Pixel dal bordo in cui inizia la repulsione |
| `borderRepulsionEnabled` | true | Bordo morbido on/off |
| `showGrid` | true | Visibilità reticolo |
| `showPath` | true | Visibilità waypoint |

## Differenze rispetto all'originale Processing.js

### Rendering — GPU invece di CPU

Nell'originale ogni boid viene ridisegnato da zero ogni frame tramite Canvas 2D API. In questa versione la forma è disegnata **una sola volta** nel costruttore come `PIXI.Graphics`. Il loop di aggiornamento modifica solo `.position.x`, `.position.y` e `.rotation` — operazioni eseguite interamente sulla GPU tramite WebGL. Il risultato è una simulazione stabile a 60 FPS con migliaia di boid.

### Vector2D — rimpiazzo di PVector

`PVector` di Processing non esiste in TypeScript. `Vector2D` replica l'interfaccia mutabile di PVector con metodi in-place (`add`, `sub`, `mult`, `div`, `limit`, `normalize`) e varianti statiche che restituiscono nuovi vettori (`Vector2D.sub`, `Vector2D.dist`). Il metodo `random2D()` è implementato nativamente — non servono più i workaround `cos(angle)/sin(angle)` di Processing.js.

### Tweakpane — parametri live

Tutti i valori che nell'originale erano costanti globali sparse nei `.pde` sono centralizzati in `config.ts` e accessibili via slider/checkbox nel pannello Tweakpane senza toccare il codice.

### Touch support

Il mouse handler è replicato anche per eventi touch, rendendo la simulazione utilizzabile su tablet.

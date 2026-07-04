# AetherSense AI: Weather Satellite Simulation & Telemetry Dashboard

**AetherSense AI** is a premium, interactive weather satellite telemetry and precipitation simulation control room. Built entirely in vanilla client-side technologies, it models a geostationary meteorological satellite scanning Earth coordinates and runs a local, offline climate physics engine to predict precipitation rates and profile historical decadal patterns.

---

## Technical Honesty & Simulation Disclaimer
**IMPORTANT NOTE**: *This application is a mathematical simulation. Atmospheric calculations, cloud sensor images, and precipitation predictions are generated procedurally based on rule-based equations (2D noise filters, latitude constraints, and geographical parameters) and do not represent real-time live satellite measurements or a trained machine learning model. It is designed to demonstrate UI/UX design, modular system architecture, and telemetry visual rendering.*

---

## Features

1. **Interactive Target Scan Map (Leaflet.js)**:
   - Drag, zoom, and select any coordinates on a dark-themed world map.
   - Includes manual coordinate search coordinates and coordinates synchronization.
   - Renders an animated custom targeting reticle overlay with a pulsing radar scan.
   - Toggles between **Google Maps Satellite Hybrid** (satellite photography + boundary layers) and **Google Maps Roadmap** vector tiles.

2. **Multispectral Live Feed Canvas**:
   - Renders dynamic procedural clouds and wind drift at 1 FPS using **2D Fractal Brownian Motion (FBM) Perlin Noise**.
   - Supports 4 spectral band views:
     - **Visible (VIS)**: True-color cloud thickness and shadows.
     - **Infrared (IR)**: Temperature-calibrated heights (colder convective cloud tops render violet/cyan).
     - **Water Vapor (WV)**: Middle-to-upper atmospheric water vapor concentration streams.
     - **Radar (RADAR)**: Direct precipitation cores (light green, moderate yellow, convective red).

3. **Procedural Climate Engine**:
   - Simulates realistic meteorological conditions (Temperature, Humidity, Pressure, Wind, Rain) client-side.
   - Calculates atmospheric properties based on geography:
     - **Latitude**: Thermal gradients decreasing from equator to poles.
     - **Climate Zone**: Automatically maps coordinates into Köppen zones (Tropical, Arid, Temperate, Continental, Polar).
     - **Elevation & Ocean Distance**: Elevation decreases temperature (lapse rate) and pressure, while ocean proximity dampens seasonal swings.
     - **Seasonality**: Sine/cosine vectors simulate yearly month-to-month solar angle offsets.
     - **Historical Anomaly**: Adapts conditions based on the selected year's historical climate indices (e.g. 2016 Super El Niño, 2022 Triple-Dip La Niña, 2026 Solar Max Peak).

4. **Simulated Predictive Engine**:
   - Simulates a Convolutional Neural Network extraction pipeline.
   - Calculates cloud optical thickness, moisture indices, and cloud-top temperatures from active spectral frames.
   - Maps inputs to precipitation classification (None, Light, Moderate, Heavy), mm/hour intensity values, and confidence scores (which fluctuate based on sensor noise and band suitability).
   - Displays real-time model telemetry, input tensors, and latent space weights.

5. **3-Day Future Outlook Forecast**:
   - Simulates localized weather front progressions to predict Day +1, Day +2, and Day +3 temperatures, rain probabilities, and rain classes.

6. **State Management & Performance Guardrails**:
   - **Central Pub-Sub Store** (`js/state.js`) coordinates all state updates (coordinates, active year, active band, seconds tick) in a decoupled, event-driven pattern.
   - **Lazy Rendering**: Canvas calculations render *only* when the canvas panel is active in the viewport.
   - **Throttling**: Chart.js updates are throttled to 1 tick/second max to minimize re-renders.
   - **Debouncing**: Suggestion dropdown queries and marker updates are debounced by 150ms on search key entries.

---

## Technology Stack

- **Structure**: HTML5 (Semantic elements)
- **Styling**: Vanilla CSS3 (Glassmorphism, CSS Grid & Flexbox, Neon colors, Glow effects, Web animations, Responsive media queries)
- **Scripting**: Vanilla JavaScript (ES6 Modules, Canvas API, seeded random generation)
- **Libraries (CDN)**:
  - Leaflet.js (Map interface)
  - Chart.js (Graphical telemetry)
  - Bootstrap Icons (Interface icons)

---

## File Structure

```
satellite-weather-monitor/
├── index.html                  # Core layout and structural grids
├── style.css                   # Space control room visual design & animation keyframes
├── app.js                      # Central orchestrator coordinating simulation updates & UI bindings
├── js/
│   ├── state.js                # Central Pub-Sub state manager
│   ├── map.js                  # Leaflet map configuration and coordinate sync
│   ├── satellite-feed.js       # Canvas multi-spectral procedural animation
│   ├── climate-engine.js       # Geographic climate generator & 3-day forecast outlook
│   ├── ai-predictor.js         # Simulated deep learning inference
│   ├── telemetry.js            # HUD details and bottom terminal logging
│   ├── charts.js               # Chart.js live and 10-year trend graphs
│   ├── history.js              # Timeline slider and decadal data aggregation
│   └── utils.js                # Perlin noise generator, math conversions, and MAP_CONFIG
├── data/
│   ├── climate-zones.json      # Baseline climate zones configuration
│   ├── monthly-patterns.json   # Seasonal hemispheric offsets
│   ├── historical-simulation.json # Historical climate anomalies (2016-2026)
│   └── cities.json             # Pre-seeded list of 45+ global cities & coordinates
└── README.md                   # Project documentation
```

---

## Map Tile Provider Settings & Known Limitations

The map supports a dual-mode provider configuration in `js/utils.js`:
- **Google Dev Mode** (`MAP_PROVIDER: 'google-dev'`): Loads Google roadmap and satellite hybrid tiles. This option is rate-limited and intended for development or prototype visualization.
- **Production Mode** (`MAP_PROVIDER: 'maptiler'`): Production-safe MapTiler roadmap and satellite layers. Requires entering your API key in `MAPTILER_API_KEY`.
- **Offline / Grid Fallback**: Leaflet falls back to local tile coordinates and CartoDB Dark Matter styles if network connectivity is lost.

---

## How to Run Locally

Since the application uses ES Modules (`import`/`export`), web browsers restrict loading files directly from the local file system (`file://` protocol) due to CORS policies. You must run the application through a local web server:

### Option 1: Python HTTP Server (Built-in)
If you have Python installed, open terminal/command prompt, navigate to the folder, and run:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your web browser.

---

## Responsive Breakpoints
- **Desktop (>1200px)**: 3-column control center layout.
- **Tablet (768px - 1200px)**: 2-column layout. The map and search occupy the left column; the canvas and metrics occupy the right column; log consoles stack underneath.
- **Mobile (<768px)**: Single-column vertical stack with **HUD Tab Navigation** (tabs toggle between Map view, Satellite Feed, and Predictive Console) to maximize screen area.

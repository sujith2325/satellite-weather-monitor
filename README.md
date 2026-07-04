# 🌍 AetherSense AI
## Weather Satellite Simulation & Telemetry Dashboard

AetherSense AI is a premium, interactive weather satellite telemetry and precipitation simulation dashboard. Built entirely with vanilla web technologies, it simulates a geostationary meteorological satellite scanning Earth, generating procedural multispectral imagery, atmospheric telemetry, and precipitation estimates using a client-side climate simulation engine.

> **Status:** 🚧 Under Development

---

## 📖 Overview

The application combines interactive cartography, procedural graphics, climate simulation, and real-time telemetry into a modern space-agency-inspired control room interface.

Users can select any location on Earth to visualize simulated satellite imagery, analyze atmospheric conditions, explore historical climate trends, and generate a 3-day weather outlook.

---

# ⚠️ Simulation Disclaimer

**AetherSense AI is an educational visualization project.**

It **does not use live satellite feeds, real meteorological datasets, or trained machine learning models.**

Instead, weather conditions are generated procedurally using:

- Fractal Brownian Motion (FBM)
- Perlin Noise
- Latitude & longitude constraints
- Climate zone mapping
- Seasonal mathematical models
- Historical anomaly simulations

The project demonstrates:

- Modern UI/UX
- Canvas rendering
- Modular JavaScript architecture
- Client-side simulation techniques
- Interactive geospatial visualization

---

# ✨ Features

## 🛰️ Interactive Weather Map

- Dark themed Leaflet.js world map
- Coordinate selection by clicking
- Manual latitude & longitude search
- Animated targeting reticle
- Live coordinate synchronization

Supports:

- Google Satellite Hybrid
- Google Roadmap
- MapTiler
- Offline fallback mode

---

## 🌤️ Multispectral Satellite Feed

Procedurally generated satellite imagery updated every second.

Available spectral modes:

- 🌞 Visible (VIS)
- 🌡️ Infrared (IR)
- 💧 Water Vapor (WV)
- 🌧️ Radar (RADAR)

Clouds are generated using Fractal Brownian Motion and animated wind fields.

---

## 🌦️ Climate Simulation Engine

Generates atmospheric conditions using:

- Latitude
- Longitude
- Climate Zone
- Elevation
- Ocean proximity
- Seasonal cycles
- Historical anomalies

Produces:

- Temperature
- Humidity
- Pressure
- Wind Speed
- Cloud Density
- Rain Probability
- Rainfall (mm/hr)

---

## 🤖 Simulated AI Prediction Engine

Imitates an AI inference pipeline by calculating:

- Cloud optical thickness
- Moisture indices
- Convective potential
- Cloud-top temperature
- Sensor confidence

Outputs:

- Rain Probability
- Rainfall Intensity
- Rainfall (mm/hr)
- Confidence Score

Rainfall Classes:

- None
- Light
- Moderate
- Heavy

---

## 📅 Historical Climate Timeline

Explore simulated historical weather conditions from:

**2016 → 2026**

Includes:

- Historical satellite imagery
- Annual rainfall
- Temperature trends
- Climate anomalies

---

## 📈 Live Telemetry Dashboard

Real-time HUD displaying:

- Temperature
- Pressure
- Humidity
- Wind Speed
- Rainfall
- Cloud Cover
- Sensor Noise
- Signal Strength
- Orbital Status

---

## 📊 Weather Analytics

Interactive Chart.js visualizations:

- Rainfall Trends
- Temperature History
- Pressure Variation
- Humidity Trends
- Historical Anomalies

---

## 🔮 3-Day Outlook

Simulated localized forecast including:

- Day +1
- Day +2
- Day +3

For each day:

- Temperature
- Rain Probability
- Rainfall
- Weather Class

---

# ⚙️ Architecture

State management follows a lightweight Pub-Sub architecture.

```
User Input
      │
      ▼
State Manager
      │
 ┌────┴───────────────┐
 │                    │
 ▼                    ▼
Leaflet Map      Climate Engine
 │                    │
 ▼                    ▼
Satellite Feed   AI Predictor
 │                    │
 └──────┬─────────────┘
        ▼
 Telemetry Dashboard
        ▼
    Chart.js
```

---

# 🚀 Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)

### Graphics

- HTML5 Canvas API

### Libraries

- Leaflet.js
- Chart.js
- Bootstrap Icons

---

# 📂 Project Structure

satellite-weather-monitor/
│
├── index.html
├── style.css
├── app.js
│
├── js/
│   ├── state.js
│   ├── map.js
│   ├── satellite-feed.js
│   ├── climate-engine.js
│   ├── ai-predictor.js
│   ├── telemetry.js
│   ├── charts.js
│   ├── history.js
│   └── utils.js
│
├── data/
│   ├── climate-zones.json
│   ├── monthly-patterns.json
│   ├── historical-simulation.json
│   └── cities.json
│
├── assets/
│
└── README.md


# 🖥️ Running Locally

Because the project uses ES Modules (`import/export`), open it through a local web server.

## Option 1 — Python

bash
python -m http.server 8000

Visit:


http://localhost:8000


## Option 2 — VS Code Live Server

1. Install **Live Server**
2. Open the project in VS Code
3. Right-click `index.html`
4. Select **Open with Live Server**

---

# 🌍 Map Providers

Supported providers:

- Google Hybrid
- Google Roadmap
- MapTiler
- CartoDB Dark Matter

Production deployments should use a valid **MapTiler API key**.

---

# 📱 Responsive Design

| Device | Layout |
|---------|--------|
| Desktop | 3-column control room |
| Tablet | 2-column dashboard |
| Mobile | Single-column with tab navigation |

---

# 🚀 Future Improvements

- 3D Earth (Three.js)
- WebGL cloud rendering
- Wind particle animation
- Lightning simulation
- Storm tracking
- Hurricane visualization
- Day/Night Earth
- Terrain shading
- Progressive Web App (PWA)
- Offline caching
- PDF report export
- Weather alert system

---

# 📸 Screenshots

Screenshots will be added as development progresses.

---

# 📄 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

**Sujith Kumar**

- GitHub: https://github.com/sujith2325

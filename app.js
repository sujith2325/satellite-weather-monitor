/**
 * AetherSense AI - Central Application Orchestrator
 * Integrates map, charts, history, telemetry, and simulation engines via a central Pub-Sub store.
 */

import { store } from './js/state.js';
import { ClimateEngine } from './js/climate-engine.js';
import { AIPredictor } from './js/ai-predictor.js';
import { SatelliteFeed } from './js/satellite-feed.js';
import { MapManager } from './js/map.js';
import { ChartManager } from './js/charts.js';
import { HistoryManager } from './js/history.js';
import { TelemetryManager } from './js/telemetry.js';
import { KtoC } from './js/utils.js';
import { ReportGenerator } from './js/reports.js';

class AetherSenseApp {
  constructor() {
    this.climateEngine = new ClimateEngine();
    this.predictor = new AIPredictor();
    this.feed = new SatelliteFeed('satellite-canvas');
    this.telemetry = new TelemetryManager('console-logs');
    
    this.map = null;
    this.charts = null;
    this.history = null;
    
    // Core state sync
    this.lat = 15.0;
    this.lon = 45.0;
    this.activeYear = 2026;
    this.activeBand = 'VIS';
    this.isPlaying = true;
    this.tickSpeedMs = 1000;
    this.secondsTick = 0;
    this.timerId = null;
    this.cities = [];
    this.reports = null;
    this.selectedCity = null;
  }

  async run() {
    this.telemetry.log("Establishing connection to orbital network...", "system");
    this.telemetry.log("Satellite array locked: METEOSCAN-09", "success");
    
    // 1. Initialize Climate Engine
    this.telemetry.log("Loading Procedural Climate Engine database...", "system");
    await this.climateEngine.initialize();
    this.telemetry.log("Database parameters mapped (Köppen zones loaded).", "success");

    // Initialize Reports Compiler
    this.reports = new ReportGenerator(this.climateEngine);

    // Load cities database
    this.telemetry.log("Loading global cities directory...", "system");
    try {
      this.cities = await fetch('./data/cities.json').then(r => r.json());
      this.telemetry.log("Global cities directory mapped (45 key regions loaded).", "success");
    } catch (e) {
      console.error("[AetherSenseApp] Failed to load cities database.", e);
      this.telemetry.log("Warning: Cities database offline.", "warn");
    }

    // 2. Initialize UI managers
    this.initMap();
    this.initCharts();
    this.initHistory();
    this.initCitySearch();
    this.initMobileTabs();
    this.bindStaticUI();

    // 3. Initialize central state subscriptions
    this.initSubscriptions();

    // 4. Perform initial predictions and trends load
    this.handleCoordinateOrYearChange(true);

    // 5. Start simulation loop
    this.telemetry.log("Loading offline predictive model weights...", "system");
    this.telemetry.log("Inference matrix loaded: DenseConv2D-Precip", "success");
    this.telemetry.log("Predictive simulation engine: Ready", "success");
    
    this.startLoop();
  }

  initMap() {
    this.map = new MapManager('leaflet-map', this.lat, this.lon);
    this.map.initialize();
  }

  initCharts() {
    this.charts = new ChartManager('live-precip-chart', 'decadal-trends-chart');
    this.charts.initialize(this.climateEngine);
  }

  initHistory() {
    this.history = new HistoryManager('timeline-slider', 'timeline-year-badge', 'timeline-anomaly-panel');
    this.history.initialize();
  }

  initSubscriptions() {
    // Sync local orchestrator variables with store changes (emitted by map click, timeline slider)
    store.subscribe('state:changed', (state) => {
      let changeDetected = false;
      
      if (state.lat !== this.lat || state.lon !== this.lon) {
        this.lat = state.lat;
        this.lon = state.lon;
        
        // Update input coordinates fields
        document.getElementById('input-lat').value = this.lat.toFixed(4);
        document.getElementById('input-lon').value = this.lon.toFixed(4);
        
        this.telemetry.log(`Scanner target updated: [${this.lat.toFixed(4)}°N, ${this.lon.toFixed(4)}°E]`, 'success');
        changeDetected = true;
      }
      
      if (state.activeYear !== this.activeYear) {
        this.activeYear = state.activeYear;
        changeDetected = true;
      }

      if (state.activeBand !== this.activeBand) {
        this.activeBand = state.activeBand;
      }

      if (state.selectedCity !== undefined) {
        this.selectedCity = state.selectedCity;
      }

      if (changeDetected) {
        this.handleCoordinateOrYearChange(false); // trends recalculated independently in charts.js
      }

      // Update manual metrics tables on telemetry pings
      if (state.climateData && state.aiData) {
        this.updateDashboardMetrics(state.climateData, state.aiData);
        this.update3DayForecastUI(state.climateData);
        
        // Update header HUD telemetry readouts
        this.telemetry.updateHUD(state.lat, state.lon, state.activeBand, state.secondsTick);
      }
    });
  }

  // Binds static dashboard controls (clicks, changes, speeds)
  bindStaticUI() {
    // Coordinate Inputs Form Submission
    document.getElementById('coords-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const latVal = parseFloat(document.getElementById('input-lat').value);
      const lonVal = parseFloat(document.getElementById('input-lon').value);
      
      if (!isNaN(latVal) && !isNaN(lonVal) && latVal >= -90 && latVal <= 90 && lonVal >= -180 && lonVal <= 180) {
        // Publish coordinate changes to store (which syncs maps and re-triggers scans)
        store.updateState({ lat: latVal, lon: lonVal });
      } else {
        this.telemetry.log("Input error: Coordinates outside boundaries (Lat [-90,90], Lon [-180,180])", "danger");
      }
    });

    // Spectral Band Buttons
    const bandButtons = document.querySelectorAll('.btn-band');
    bandButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        bandButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const band = e.target.dataset.band;
        store.updateState({ activeBand: band });
        this.telemetry.log(`Spectral receiver toggled to ${band} sensor band`, 'info');
      });
    });

    // Loop Play/Pause button
    const playPauseBtn = document.getElementById('btn-play-pause');
    playPauseBtn.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      store.updateState({ isPlaying: this.isPlaying });
      
      if (this.isPlaying) {
        playPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i> PAUSE';
        playPauseBtn.classList.replace('btn-warning', 'btn-primary');
        this.telemetry.log("Scanner live-feed RESUMED", "success");
        this.startLoop();
      } else {
        playPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i> PLAY';
        playPauseBtn.classList.replace('btn-primary', 'btn-warning');
        this.telemetry.log("Scanner live-feed PAUSED", "warn");
        this.stopLoop();
      }
    });

    // Speed Control Selector
    const speedSelect = document.getElementById('speed-select');
    speedSelect.addEventListener('change', (e) => {
      this.tickSpeedMs = parseInt(e.target.value, 10);
      store.updateState({ tickSpeedMs: this.tickSpeedMs });
      this.telemetry.log(`Interval cycle rate set to: ${this.tickSpeedMs}ms`, 'info');
      if (this.isPlaying) {
        this.stopLoop();
        this.startLoop();
      }
    });

    // Generate Report button trigger
    const genReportBtn = document.getElementById('btn-generate-report');
    if (genReportBtn) {
      genReportBtn.addEventListener('click', () => {
        this.telemetry.log("Compiling climatological database report...", "system");
        
        // Find matching city name if current coordinates are near a known city
        let locationName = this.selectedCity;
        if (!locationName) {
          // Find if coords are within ~0.2 degrees of any seeded city
          const nearCity = this.cities.find(c => Math.abs(c.lat - this.lat) < 0.2 && Math.abs(c.lon - this.lon) < 0.2);
          if (nearCity) {
            locationName = `${nearCity.name}, ${nearCity.country}`;
          } else {
            locationName = `Site [${this.lat.toFixed(2)}°N, ${this.lon.toFixed(2)}°E]`;
          }
        }
        
        this.reports.showReport(this.lat, this.lon, locationName);
        this.telemetry.log("Report generated successfully (100% computed).", "success");
      });
    }

    // Modal Close Button handlers
    const closeModal = () => {
      const reportModal = document.getElementById('report-modal-overlay');
      if (reportModal) reportModal.style.display = 'none';
      this.telemetry.log("Climatological report console closed.", "system");
    };

    const closeBtn1 = document.getElementById('btn-close-report');
    if (closeBtn1) closeBtn1.addEventListener('click', closeModal);

    const closeBtn2 = document.getElementById('btn-modal-close');
    if (closeBtn2) closeBtn2.addEventListener('click', closeModal);

    // Modal Print Button handler
    const printBtn = document.getElementById('btn-print-report');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        this.telemetry.log("Redirecting document stream to system printer spool...", "info");
        window.print();
      });
    }
  }

  // Mobile Tabs HUD Navigation
  initMobileTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-btn');
        if (!button) return;
        
        const targetId = button.dataset.target;

        // Toggle active button state
        tabButtons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');

        // Toggle active column panels visibility
        const panels = document.querySelectorAll('.panel');
        panels.forEach(p => p.classList.remove('active-tab'));
        
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
          targetPanel.classList.add('active-tab');
          this.telemetry.log(`HUD view switched: ${button.innerText.trim()}`, 'system');
          
          // Trigger Leaflet map refresh when returning to map tab to prevent grey container anomalies
          if (targetId === 'panel-map' && this.map && this.map.map) {
            setTimeout(() => {
              this.map.map.invalidateSize();
            }, 100);
          }
        }
      });
    });
  }

  // Recalculates metrics when coordinate/year modifications happen
  handleCoordinateOrYearChange(publish10YearGraphTrigger = true) {
    const month = (Math.floor(this.secondsTick / 30) % 12) + 1;
    const dayOfYear = (this.secondsTick % 365);

    const climate = this.climateEngine.generateTelemetry(this.lat, this.lon, this.activeYear, month, dayOfYear);
    if (!climate) return;

    const aiData = this.predictor.predict(climate, this.activeBand, this.secondsTick);

    // Update central store state (forces all modules to draw and recalculate via Pub-Sub)
    store.updateState({
      climateData: climate,
      aiData: aiData
    });

    if (publish10YearGraphTrigger) {
      // Force initial map and chart refreshes
      store.publish('coordinate:changed', { lat: this.lat, lon: this.lon });
    }
  }

  // Updates layout panels with the current variables
  updateDashboardMetrics(climate, ai) {
    document.getElementById('metric-rain-class').textContent = ai.rainIntensity.toUpperCase();
    document.getElementById('metric-rain-class').style.color = ai.rainColor;
    document.getElementById('metric-rain-val').textContent = `${ai.precipitationMmHr.toFixed(2)} mm/h`;
    document.getElementById('metric-rain-prob').textContent = `${ai.rainProbability}%`;
    document.getElementById('metric-model-conf').textContent = `${ai.confidenceScore}%`;
    
    document.getElementById('metric-temp').textContent = `${KtoC(climate.temperatureK)} °C (${climate.temperatureK} K)`;
    document.getElementById('metric-humidity').textContent = `${climate.humidity}%`;
    document.getElementById('metric-pressure').textContent = `${climate.pressure} hPa`;
    document.getElementById('metric-wind').textContent = `${climate.windSpeed} m/s`;
    document.getElementById('metric-zone').textContent = climate.climateZone;
    document.getElementById('metric-clouds').textContent = `${climate.cloudCover}%`;

    document.getElementById('feat-optical').textContent = `${ai.features.opticalThickness} g/m²`;
    document.getElementById('feat-toptemp').textContent = `${ai.features.cloudTopTemp} K`;
    document.getElementById('feat-vapor').textContent = ai.features.waterVaporIndex;
    
    document.getElementById('feat-latency').textContent = `${ai.diagnostics.inferenceDurationMs} ms`;
    document.getElementById('feat-tensor').textContent = ai.diagnostics.inputTensor;
    document.getElementById('feat-weights').textContent = `[${ai.diagnostics.latentVectors.join(', ')}]`;

    document.getElementById('summary-text').textContent = ai.forecastSummary;
  }

  // Single step loop execution
  tick() {
    this.secondsTick++;
    store.updateState({ secondsTick: this.secondsTick });
    
    const month = (Math.floor(this.secondsTick / 30) % 12) + 1;
    const dayOfYear = (this.secondsTick % 365);

    const climate = this.climateEngine.generateTelemetry(this.lat, this.lon, this.activeYear, month, dayOfYear);
    if (!climate) return;

    const aiData = this.predictor.predict(climate, this.activeBand, this.secondsTick);

    // Update central store data triggers
    store.updateState({
      climateData: climate,
      aiData: aiData
    });

    // Logging console cycles (throttled check pings)
    if (this.secondsTick % 3 === 0) {
      const logs = [
        `Running convolution kernels on ${this.activeBand} channels...`,
        `Feature maps extracted in ${aiData.diagnostics.inferenceDurationMs}ms`,
        `Predictive precipitation simulator class lock: [${aiData.rainIntensity}]`,
        `Satellite link locked. Signal margin: ${(98.8 + Math.sin(this.secondsTick * 0.2) * 0.8).toFixed(1)}%`,
      ];
      const logIdx = Math.floor((this.secondsTick / 3) % logs.length);
      this.telemetry.log(logs[logIdx], 'info');
    }
  }

  // Autocomplete City Search Bar with 150ms Performance Debounce
  initCitySearch() {
    const searchInput = document.getElementById('city-search');
    const suggestionsBox = document.getElementById('search-suggestions');
    if (!searchInput || !suggestionsBox) return;

    let debounceTimer = null;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length < 2) {
        suggestionsBox.style.display = 'none';
        return;
      }

      // Performance Guardrail: Debounce Nominatim API queries to 300ms to respect fair use limits
      if (debounceTimer) clearTimeout(debounceTimer);
      
      debounceTimer = setTimeout(async () => {
        // 1. Get matches from local pre-seeded database
        const localMatches = this.cities.filter(c => 
          c.name.toLowerCase().includes(query) || 
          c.country.toLowerCase().includes(query)
        ).slice(0, 5);

        let matches = [...localMatches];

        // 2. Query OSM Nominatim Geocoding API if online to find any global city / town
        if (navigator.onLine && query.length >= 3) {
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6`);
            if (response.ok) {
              const onlineData = await response.json();
              const onlineMatches = onlineData
                .filter(item => item.lat && item.lon)
                .map(item => {
                  const parts = item.display_name.split(',');
                  const name = parts[0].trim();
                  // Extract country name from last part
                  const country = parts[parts.length - 1].trim();
                  return {
                    name,
                    country,
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    isOnline: true
                  };
                });

              // Merge unique online results (avoid near-identical lat/lon overlaps)
              onlineMatches.forEach(om => {
                if (matches.length < 8 && !matches.some(m => Math.abs(m.lat - om.lat) < 0.05 && Math.abs(m.lon - om.lon) < 0.05)) {
                  matches.push(om);
                }
              });
            }
          } catch (e) {
            console.warn("[AetherSenseApp] Nominatim geosearch fallback failed.", e);
          }
        }

        if (matches.length === 0) {
          suggestionsBox.innerHTML = '<div class="suggestion-item text-muted" style="font-style: italic;">No matching locations found</div>';
          suggestionsBox.style.display = 'block';
          return;
        }

        suggestionsBox.innerHTML = matches.map(c => `
          <div class="suggestion-item" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${c.name}, ${c.country}">
            <span class="city-country">${c.name}, ${c.country} ${c.isOnline ? '<span style="font-size:0.6rem; color:var(--secondary); border:1px solid var(--secondary); padding:0px 3px; border-radius:2px; margin-left:5px; font-family:var(--font-tech);">GLOBAL</span>' : ''}</span>
            <span class="city-coords">${c.lat.toFixed(2)}°, ${c.lon.toFixed(2)}°</span>
          </div>
        `).join('');
        suggestionsBox.style.display = 'block';
      }, 300);
    });

    // Handle suggestion selections
    suggestionsBox.addEventListener('click', (e) => {
      const item = e.target.closest('.suggestion-item');
      if (!item || !item.dataset.lat) return;

      const latVal = parseFloat(item.dataset.lat);
      const lonVal = parseFloat(item.dataset.lon);
      const nameVal = item.dataset.name;

      searchInput.value = nameVal;
      suggestionsBox.style.display = 'none';

      // Update central state (map, AI parameters, charts update automatically)
      store.updateState({ 
        lat: latVal, 
        lon: lonVal,
        selectedCity: nameVal
      });
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = 'none';
      }
    });
  }

  // Inject 3-Day Forecast outlook data into cards
  update3DayForecastUI(climateData) {
    const month = (Math.floor(this.secondsTick / 30) % 12) + 1;
    const dayOfYear = (this.secondsTick % 365);

    const forecast = this.climateEngine.generate3DayForecast(this.lat, this.lon, this.activeYear, month, dayOfYear);
    const container = document.getElementById('forecast-container');
    if (!container || !forecast) return;

    container.innerHTML = forecast.map(fc => {
      let rainClass = "NONE";
      let rainColor = "var(--text-muted)";
      if (fc.precipitationMmHr > 0.05) {
        if (fc.precipitationMmHr <= 2.5) {
          rainClass = "LIGHT";
          rainColor = "var(--primary)";
        } else if (fc.precipitationMmHr <= 10.0) {
          rainClass = "MODERATE";
          rainColor = "var(--warning)";
        } else {
          rainClass = "HEAVY";
          rainColor = "var(--danger)";
        }
      }

      return `
        <div class="forecast-day-box" style="background: rgba(5,8,20,0.4); border: 1px solid rgba(0,245,255,0.08); border-radius: 4px; padding: 6px; text-align: center; transition: all 0.2s ease;">
          <div class="fc-day" style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Day +${fc.dayOffset}</div>
          <div class="fc-temp" style="font-family: var(--font-tech); font-weight: 700; font-size: 1.1rem; color: var(--text-main); margin: 2px 0;">${(fc.temperatureK - 273.15).toFixed(1)}°C</div>
          <div class="fc-rain-class" style="font-family: var(--font-tech); font-weight: 700; font-size: 0.8rem; color: ${rainColor};">${rainClass}</div>
          <div class="fc-rain-prob" style="font-size: 0.65rem; color: var(--text-muted);">${fc.rainProbability}% Rain</div>
        </div>
      `;
    }).join('');
  }

  startLoop() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.tick();
    }, this.tickSpeedMs);
  }

  stopLoop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

// Instantiate AetherSense App on page load
window.addEventListener('DOMContentLoaded', () => {
  const app = new AetherSenseApp();
  app.run();
});

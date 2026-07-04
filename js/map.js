/**
 * AetherSense AI - Map Module
 * Configures the Leaflet map with a dark theme and state synchronization controls.
 */

import { store } from './state.js';
import { MAP_CONFIG } from './utils.js';

export class MapManager {
  constructor(mapDivId, initialLat = 15.0, initialLon = 45.0) {
    this.mapId = mapDivId;
    this.lat = initialLat;
    this.lon = initialLon;
    this.map = null;
    this.marker = null;
  }

  initialize() {
    // Leaflet must be loaded via CDN/script first in index.html
    if (typeof L === 'undefined') {
      console.error("[MapManager] Leaflet.js not loaded. Retrying map instantiation shortly.");
      return;
    }

    // Instantiate map with dark thematic rules
    this.map = L.map(this.mapId, {
      center: [this.lat, this.lon],
      zoom: 3,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: false, // hide default zoom to style a custom one
      attributionControl: false
    });

    // Configure Dual-Mode Map Tile Layers (Production-safe Fallback)
    const provider = MAP_CONFIG.MAP_PROVIDER;
    const apiKey = MAP_CONFIG.MAPTILER_API_KEY;

    let satelliteLayer, roadmapLayer;

    // Use MapTiler if configured with a valid API key
    if (provider === 'maptiler' && apiKey && apiKey !== 'YOUR_MAPTILER_API_KEY') {
      satelliteLayer = L.tileLayer(`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${apiKey}`, {
        maxZoom: 20,
        attribution: '© MapTiler'
      });
      roadmapLayer = L.tileLayer(`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`, {
        maxZoom: 20,
        attribution: '© MapTiler'
      });
    } else {
      // Dev-only fallback: Google Map Tile URLs (unofficial, rate-limited)
      satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '© Google Map (Dev-only, rate-limited)'
      });
      roadmapLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '© Google Map (Dev-only, rate-limited)'
      });
    }

    const darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '© CartoDB'
    });

    // Default layer: Satellite Hybrid
    satelliteLayer.addTo(this.map);

    // Layer control configuration
    const baseLayers = {
      "Google/MapTiler Satellite": satelliteLayer,
      "Google/MapTiler Roadmap": roadmapLayer,
      "Dark Tech Map": darkMatter
    };
    L.control.layers(baseLayers, null, { position: 'topright' }).addTo(this.map);

    // Custom CSS pulsing reticle marker
    const customReticleIcon = L.divIcon({
      className: 'custom-map-reticle',
      html: `
        <div class="reticle-core"></div>
        <div class="reticle-pulse"></div>
        <div class="reticle-crosshair-v"></div>
        <div class="reticle-crosshair-h"></div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // Place initial reticle marker
    this.marker = L.marker([this.lat, this.lon], { icon: customReticleIcon }).addTo(this.map);

    // Click handler for coordinates lock
    this.map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      // Clamp longitude to [-180, 180] and latitude to [-90, 90]
      const clampedLat = Math.max(-90, Math.min(90, lat));
      const clampedLon = ((lng + 180) % 360 + 360) % 360 - 180;
      
      // Publish update through store
      store.updateState({ lat: clampedLat, lon: clampedLon });
    });

    // Subscribe to state change coordinate updates (sync views across search/form entries)
    store.subscribe('coordinate:changed', (coords) => {
      if (coords.lat !== this.lat || coords.lon !== this.lon) {
        this.updateCoordinates(coords.lat, coords.lon, false);
        this.map.panTo([coords.lat, coords.lon], { animate: true, duration: 1 });
      }
    });
  }

  // Update marker position and optionally publish state changes
  updateCoordinates(lat, lon, publishToStore = true) {
    this.lat = lat;
    this.lon = lon;

    if (this.marker) {
      this.marker.setLatLng([lat, lon]);
    }

    if (publishToStore) {
      store.updateState({ lat, lon });
    }
  }

  // Pan map view to location
  panTo(lat, lon) {
    if (this.map) {
      this.map.panTo([lat, lon], { animate: true, duration: 1 });
      this.updateCoordinates(lat, lon, false);
    }
  }
}

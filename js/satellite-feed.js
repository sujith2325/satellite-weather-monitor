/**
 * AetherSense AI - Satellite Feed Module
 * Animates multi-spectral weather scans using procedural Perlin noise.
 * Subscribes to the central state store for updates.
 */

import { store } from './state.js';
import { PerlinNoise, mapValue } from './utils.js';

export class SatelliteFeed {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Virtual grid size for satellite pixels (gives a high-tech digitized scan look)
    this.gridWidth = 160;
    this.gridHeight = 120;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.gridWidth;
    this.offscreenCanvas.height = this.gridHeight;
    this.offCtx = this.offscreenCanvas.getContext('2d');
    
    this.noise = new PerlinNoise();
    this.currentBand = 'VIS';
    this.isScanning = true;
    this.scanLineY = 0;

    this.initSubscriptions();
  }

  initSubscriptions() {
    // Listen for updates from the central store
    store.subscribe('state:changed', (state) => {
      this.currentBand = state.activeBand;
      
      // Performance Guardrail: Render only if the canvas container is currently visible in the viewport
      // (offsetParent is null if the element or any ancestor has display: none, e.g. inactive mobile tabs)
      const containerCard = this.canvas.closest('.card');
      const isVisible = containerCard ? containerCard.offsetParent !== null : this.canvas.offsetParent !== null;

      if (isVisible && state.climateData) {
        this.render(state.lat, state.lon, state.climateData, state.secondsTick);
      }
    });
  }

  setBand(band) {
    this.currentBand = band;
  }

  // Draw a frame for the satellite feed
  render(lat, lon, climateData, secondsTick) {
    if (!this.canvas || !climateData) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 1. Draw Simulated Sensor Frame to Offscreen Canvas
    this.drawSpectralGrid(lat, lon, climateData, secondsTick);

    // 2. Clear main canvas and draw scaled offscreen grid
    this.ctx.fillStyle = '#02040a';
    this.ctx.fillRect(0, 0, width, height);
    
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);
    this.ctx.imageSmoothingEnabled = true;

    // 3. Draw Vector Tech Overlays on top of the image
    this.drawHUDOverlays(lat, lon, secondsTick);
  }

  // Generate procedural pixels using FBM noise based on climate data
  drawSpectralGrid(lat, lon, climateData, secondsTick) {
    const imgData = this.offCtx.createImageData(this.gridWidth, this.gridHeight);
    const data = imgData.data;
    
    const zoneId = climateData.zoneId;
    const cloudCover = climateData.cloudCover / 100.0;
    const precipitation = climateData.precipitationMmHr;
    
    // Cloud drift parameters
    const driftX = secondsTick * 0.04;
    const driftY = secondsTick * 0.01;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        // Spatial coordinates in noise space
        const nx = (x / this.gridWidth) * 4.5 + (lon * 0.1) + driftX;
        const ny = (y / this.gridHeight) * 3.5 + (lat * 0.1) + driftY;

        // Base land/ocean geometry
        const continentFactor = Math.sin(nx * 0.8) * Math.cos(ny * 0.8);
        const pixelIsOcean = continentFactor < -0.1;

        // Generate cloud noise (fractal octaves)
        let cloudNoise = this.noise.fbm2D(nx, ny, 4, 2.1, 0.48);
        
        // Scale cloud noise by local humidity / cloud cover factor
        cloudNoise = Math.max(0, cloudNoise - (1.0 - cloudCover * 1.3));
        cloudNoise = Math.min(1.0, cloudNoise * 1.5);

        // Pixel index
        const idx = (y * this.gridWidth + x) * 4;
        
        let r = 0, g = 0, b = 0;

        if (this.currentBand === 'VIS') {
          // Visible Spectrum: Gray clouds, dark ocean, olive land
          if (pixelIsOcean) {
            r = 10; g = 18; b = 35;
          } else {
            r = 25; g = 38; b = 20;
          }
          
          if (cloudNoise > 0.05) {
            const shadow = 1.0 - (cloudNoise * 0.15);
            r = Math.floor(r * shadow + cloudNoise * 210);
            g = Math.floor(g * shadow + cloudNoise * 215);
            b = Math.floor(b * shadow + cloudNoise * 225);
          }
        } 
        else if (this.currentBand === 'IR') {
          // Infrared Spectrum: Thermal heat emissions
          if (cloudNoise > 0.1) {
            const cloudTopHeight = cloudNoise;
            if (cloudTopHeight > 0.7) {
              r = 255; g = 255; b = 255;
            } else if (cloudTopHeight > 0.4) {
              r = 180; g = 50; b = 220;
            } else {
              r = 0; g = 180; b = 240;
            }
          } else {
            const surfaceTemp = climateData.temperatureK - (pixelIsOcean ? 2 : 12);
            const tempFactor = mapValue(surfaceTemp, 250, 310, 0.0, 1.0);
            r = Math.floor(tempFactor * 130);
            g = Math.floor(tempFactor * 40);
            b = Math.floor((1.0 - tempFactor) * 40);
          }
        } 
        else if (this.currentBand === 'WV') {
          // Water Vapor: Mid-to-high tropospheric moisture (cyan/purple flows)
          const wx = nx * 0.6;
          const wy = ny * 0.6;
          const moistureNoise = this.noise.fbm2D(wx, wy, 3, 2.0, 0.5);
          
          r = Math.floor(moistureNoise * 30);
          g = Math.floor(moistureNoise * 180 + 30);
          b = Math.floor(moistureNoise * 240 + 70);
        } 
        else if (this.currentBand === 'RADAR') {
          // Synthetic weather radar: Renders reflectivity cells only where precipitation is active
          if (precipitation > 0 && cloudNoise > 0.3) {
            const rainCoreNoise = this.noise.fbm2D(nx * 2, ny * 2, 2) * cloudNoise;
            const compositeRain = precipitation * rainCoreNoise;

            if (compositeRain > 8.0) {
              r = 255; g = 40; b = 60; // Heavy (Red)
            } else if (compositeRain > 3.0) {
              r = 255; g = 210; b = 40; // Moderate (Yellow)
            } else if (compositeRain > 0.05) {
              r = 0; g = 230; b = 120; // Light (Green)
            } else {
              r = 2; g = 10; b = 25;
            }
          } else {
            r = 2; g = 10; b = 20;
          }
        }

        // Apply sensor noise grain
        const sensorGrain = (Math.sin(x * 12.3 + y * 9.7) * 4) | 0;
        data[idx] = Math.max(0, Math.min(255, r + sensorGrain));
        data[idx + 1] = Math.max(0, Math.min(255, g + sensorGrain));
        data[idx + 2] = Math.max(0, Math.min(255, b + sensorGrain));
        data[idx + 3] = 255;
      }
    }

    this.offCtx.putImageData(imgData, 0, 0);
  }

  // Draw scientific overlay details
  drawHUDOverlays(lat, lon, secondsTick) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Draw scanning bar line
    if (this.isScanning) {
      this.scanLineY = (this.scanLineY + 2) % h;
      
      const grad = ctx.createLinearGradient(0, this.scanLineY - 30, 0, this.scanLineY);
      grad.addColorStop(0, 'rgba(0, 245, 255, 0.0)');
      grad.addColorStop(0.8, 'rgba(0, 245, 255, 0.05)');
      grad.addColorStop(1, 'rgba(0, 245, 255, 0.45)');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, this.scanLineY - 30, w, 30);
      
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, this.scanLineY);
      ctx.lineTo(w, this.scanLineY);
      ctx.stroke();
    }

    // Outer framing reticles (corners)
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.4)';
    ctx.lineWidth = 2;
    const cornerSize = 15;
    
    ctx.beginPath();
    ctx.moveTo(20, 20 + cornerSize); ctx.lineTo(20, 20); ctx.lineTo(20 + cornerSize, 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w - 20 - cornerSize, 20); ctx.lineTo(w - 20, 20); ctx.lineTo(w - 20, 20 + cornerSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, h - 20 - cornerSize); ctx.lineTo(20, h - 20); ctx.lineTo(20 + cornerSize, h - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w - 20 - cornerSize, h - 20); ctx.lineTo(w - 20, h - 20); ctx.lineTo(w - 20, h - 20 - cornerSize);
    ctx.stroke();

    // Center Crosshair
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 25, h / 2); ctx.lineTo(w / 2 + 25, h / 2);
    ctx.moveTo(w / 2, h / 2 - 25); ctx.lineTo(w / 2, h / 2 + 25);
    ctx.stroke();
    
    // Pulsing target circle
    const pulseRadius = 15 + Math.sin(secondsTick * 3) * 3;
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // HUD Text overlays
    ctx.fillStyle = 'rgba(0, 245, 255, 0.85)';
    ctx.font = '10px "Orbitron", monospace';
    
    ctx.fillText(`REC: ${this.currentBand} BAND`, 30, 35);
    ctx.fillText(`SAT: METEOSCAN-09`, 30, 48);

    const today = new Date();
    ctx.fillText(today.toISOString().slice(0, 10), w - 120, 35);
    ctx.fillText(`T+${Math.floor(secondsTick)}s SCAN`, w - 120, 48);

    const latStr = lat >= 0 ? `${lat.toFixed(2)}N` : `${Math.abs(lat).toFixed(2)}S`;
    const lonStr = lon >= 0 ? `${lon.toFixed(2)}E` : `${Math.abs(lon).toFixed(2)}W`;
    ctx.fillText(`SSP: ${latStr} / ${lonStr}`, 30, h - 35);
    ctx.fillText(`S/N: ${(54.2 + Math.sin(secondsTick) * 0.3).toFixed(1)} dB`, 30, h - 22);

    ctx.fillText(`RESOL: 1.25 KM/PX`, w - 140, h - 35);
    ctx.fillText("SIGNAL: LOCK ESTABLISHED", w - 140, h - 22);
  }
}

/**
 * AetherSense AI - Telemetry & Command Console Log Module
 * Handles UI logging, terminal logs, and satellite HUD readouts.
 */

export class TelemetryManager {
  constructor(consoleElementId) {
    this.consoleEl = document.getElementById(consoleElementId);
    this.maxLogs = 60;
    this.logHistory = [];
  }

  // Write a command line message with a timestamp
  log(message, level = 'info') {
    if (!this.consoleEl) return;

    const time = new Date().toISOString().slice(11, 19);
    
    // Determine color based on warning level
    let colorClass = 'log-info';
    let prefix = '[INFO]';
    if (level === 'success') {
      colorClass = 'log-success';
      prefix = '[ OK ]';
    } else if (level === 'warn') {
      colorClass = 'log-warn';
      prefix = '[WARN]';
    } else if (level === 'danger') {
      colorClass = 'log-danger';
      prefix = '[FAIL]';
    } else if (level === 'system') {
      colorClass = 'log-system';
      prefix = '[SYS ]';
    }

    const logLine = document.createElement('div');
    logLine.className = `console-line ${colorClass}`;
    logLine.innerHTML = `<span class="log-time">${time}</span> <span class="log-prefix">${prefix}</span> ${message}`;
    
    this.consoleEl.appendChild(logLine);
    this.consoleEl.scrollTop = this.consoleEl.scrollHeight;

    // Maintain max limit
    while (this.consoleEl.children.length > this.maxLogs) {
      this.consoleEl.removeChild(this.consoleEl.firstChild);
    }
  }

  clear() {
    if (this.consoleEl) this.consoleEl.innerHTML = '';
  }

  // Update physical HUD readouts on top of the dashboard
  updateHUD(lat, lon, activeBand, secondsTick) {
    // Generate simulated orbital telemetry
    const altitude = (35786 + Math.sin(secondsTick * 0.05) * 5.2).toFixed(1); // Geostationary orbit ~35,786 km
    const tempSensor = (268.4 + Math.cos(secondsTick * 0.08) * 1.5).toFixed(1); // satellite solar panel temp (Kelvin)
    const orbitalSpeed = (3.074 + Math.sin(secondsTick * 0.02) * 0.001).toFixed(4); // ~3.07 km/s
    const signalQuality = (98.8 + Math.sin(secondsTick * 0.2) * 0.8).toFixed(1);

    document.getElementById('hud-lat').textContent = lat >= 0 ? `${lat.toFixed(4)}° N` : `${Math.abs(lat).toFixed(4)}° S`;
    document.getElementById('hud-lon').textContent = lon >= 0 ? `${lon.toFixed(4)}° E` : `${Math.abs(lon).toFixed(4)}° W`;
    document.getElementById('hud-band').textContent = activeBand;
    document.getElementById('hud-altitude').textContent = `${altitude} km`;
    document.getElementById('hud-temp').textContent = `${tempSensor} K`;
    document.getElementById('hud-speed').textContent = `${orbitalSpeed} km/s`;
    document.getElementById('hud-signal').textContent = `${signalQuality}%`;
  }
}

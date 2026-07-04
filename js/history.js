/**
 * AetherSense AI - History & Timeline Module
 * Manages timeline state, anomaly notifications, and slider updates.
 * Subscribes to and publishes through the central state store.
 */

import { store } from './state.js';

export class HistoryManager {
  constructor(sliderId, yearLabelId, infoContainerId) {
    this.slider = document.getElementById(sliderId);
    this.yearLabel = document.getElementById(yearLabelId);
    this.infoContainer = document.getElementById(infoContainerId);
    this.activeYear = 2026;
  }

  initialize() {
    if (!this.slider) return;

    this.activeYear = parseInt(this.slider.value, 10);
    
    // Attach listener to push timeline changes to the central state store
    this.slider.addEventListener('input', (e) => {
      const year = parseInt(e.target.value, 10);
      this.activeYear = year;
      if (this.yearLabel) {
        this.yearLabel.textContent = year;
      }
      
      // Publish update to store
      store.updateState({ activeYear: year });
    });

    this.initSubscriptions();
  }

  initSubscriptions() {
    // Subscribe to state changes to update the year label and anomaly card UI
    store.subscribe('state:changed', (state) => {
      if (state.activeYear !== this.activeYear) {
        this.activeYear = state.activeYear;
        if (this.slider) this.slider.value = state.activeYear;
        if (this.yearLabel) this.yearLabel.textContent = state.activeYear;
      }

      if (state.climateData) {
        this.updateAnomalyUI(state.climateData.historicalAnomaly);
      }
    });
  }

  // Update details card in the timeline side column
  updateAnomalyUI(anomalyData) {
    if (!this.infoContainer) return;

    if (!anomalyData) {
      this.infoContainer.innerHTML = `
        <div class="anomaly-empty">
          <p>SYSTEM LOCKED: STANDARD CLIMATOLOGY PROFILE ACTIVE</p>
        </div>
      `;
      return;
    }

    const { index, tempAnomaly, description, notableEvents } = anomalyData;
    const isWarm = tempAnomaly >= 0;
    const sign = isWarm ? '+' : '';
    const colorClass = isWarm ? 'text-danger' : 'text-primary';

    let eventsHtml = '';
    if (notableEvents && notableEvents.length > 0) {
      eventsHtml = `
        <div class="anomaly-events mt-2">
          <strong>Key Global Events:</strong>
          <ul>
            ${notableEvents.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    this.infoContainer.innerHTML = `
      <div class="anomaly-card">
        <div class="anomaly-header d-flex justify-content-between align-items-center">
          <span class="anomaly-title">${index}</span>
          <span class="anomaly-badge ${colorClass}">${sign}${tempAnomaly}°C Anomaly</span>
        </div>
        <p class="anomaly-desc text-muted mt-1">${description}</p>
        ${eventsHtml}
      </div>
    `;
  }
}

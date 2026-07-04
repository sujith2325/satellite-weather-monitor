/**
 * AetherSense AI - Charting Module
 * Wraps Chart.js to display live telemetry and 10-year climate trends.
 * Subscribes to the central state store for updates.
 */

import { store } from './state.js';

export class ChartManager {
  constructor(liveChartId, trendChartId) {
    this.liveChartId = liveChartId;
    this.trendChartId = trendChartId;
    
    this.liveChart = null;
    this.trendChart = null;
    
    this.liveDataMaxPoints = 15;
    this.liveLabels = Array.from({ length: this.liveDataMaxPoints }, (_, i) => `T-${this.liveDataMaxPoints - 1 - i}s`);
    this.liveDataBuffer = Array(this.liveDataMaxPoints).fill(0);
    this.climateEngine = null;
  }

  initialize(climateEngine) {
    this.climateEngine = climateEngine;

    if (typeof Chart === 'undefined') {
      console.error("[ChartManager] Chart.js not loaded. Visualizations disabled.");
      return;
    }

    // Configure Chart.js global defaults for neon aesthetics
    Chart.defaults.color = 'rgba(0, 245, 255, 0.7)';
    Chart.defaults.font.family = '"Rajdhani", "Segoe UI", sans-serif';
    Chart.defaults.borderColor = 'rgba(0, 245, 255, 0.15)';

    this.initLiveChart();
    this.initTrendChart();
    this.initSubscriptions();
  }

  initSubscriptions() {
    let lastSecondsTick = -1;

    // 1. Subscribe to state ticks to update the live chart (throttled to 1 tick/second max)
    store.subscribe('state:changed', (state) => {
      if (state.secondsTick !== lastSecondsTick) {
        lastSecondsTick = state.secondsTick;
        if (state.aiData) {
          this.updateLiveFeed(state.aiData.precipitationMmHr);
        }
      }
    });

    // 2. Subscribe to coordinate changes to recalculate the 10-year trend line
    store.subscribe('coordinate:changed', (coords) => {
      if (this.climateEngine) {
        const trends = this.calculate10YearTrend(coords.lat, coords.lon);
        this.updateHistoricalTrends(trends);
      }
    });
  }

  // Live Chart showing second-by-second precipitation
  initLiveChart() {
    const ctx = document.getElementById(this.liveChartId).getContext('2d');
    
    // Create neon gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 100);
    gradient.addColorStop(0, 'rgba(0, 245, 255, 0.45)');
    gradient.addColorStop(1, 'rgba(0, 245, 255, 0.0)');

    this.liveChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.liveLabels,
        datasets: [{
          label: 'Precipitation Intensity (mm/h)',
          data: this.liveDataBuffer,
          borderColor: '#00f5ff',
          borderWidth: 2,
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointBackgroundColor: '#00f5ff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 20,
            grid: { color: 'rgba(0, 245, 255, 0.08)' }
          },
          x: {
            grid: { display: false }
          }
        },
        animation: { duration: 250 }
      }
    });
  }

  // 10-Year Climatology Trend Chart (Bar/Line composite)
  initTrendChart() {
    const ctx = document.getElementById(this.trendChartId).getContext('2d');
    
    this.trendChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 11 }, (_, i) => String(2016 + i)), // 2016 to 2026
        datasets: [
          {
            label: 'Annual Rainfall (mm)',
            type: 'bar',
            data: Array(11).fill(0),
            backgroundColor: 'rgba(0, 245, 255, 0.25)',
            borderColor: '#00f5ff',
            borderWidth: 1,
            yAxisID: 'yRain'
          },
          {
            label: 'Mean Temp (°C)',
            type: 'line',
            data: Array(11).fill(0),
            borderColor: '#ff4b5c',
            borderWidth: 2.5,
            pointBackgroundColor: '#ff4b5c',
            fill: false,
            tension: 0.15,
            yAxisID: 'yTemp'
          },
          {
            label: 'Humidity (%)',
            type: 'line',
            data: Array(11).fill(0),
            borderColor: '#00ff9f',
            borderWidth: 1.5,
            pointBackgroundColor: '#00ff9f',
            fill: false,
            tension: 0.15,
            yAxisID: 'yHumidity',
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, padding: 8 }
          }
        },
        scales: {
          yRain: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Rainfall (mm)' },
            min: 0,
            grid: { color: 'rgba(0, 245, 255, 0.08)' }
          },
          yTemp: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Temp (°C)' },
            grid: { display: false }
          },
          yHumidity: {
            type: 'linear',
            position: 'right',
            title: { display: false },
            min: 0,
            max: 100,
            display: false
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // Push new reading to live telemetry buffer
  updateLiveFeed(newPrecipVal) {
    if (!this.liveChart) return;

    this.liveDataBuffer.shift();
    this.liveDataBuffer.push(newPrecipVal);

    const maxVal = Math.max(...this.liveDataBuffer);
    this.liveChart.options.scales.y.max = maxVal > 15 ? Math.ceil(maxVal * 1.2) : 20;

    this.liveChart.update();
  }

  // Update decadal chart data points
  updateHistoricalTrends(trendDataArray) {
    if (!this.trendChart || !trendDataArray) return;

    const rains = trendDataArray.map(d => d.annualRain);
    const temps = trendDataArray.map(d => d.meanTemp);
    const humids = trendDataArray.map(d => d.meanHumid);

    this.trendChart.data.datasets[0].data = rains;
    this.trendChart.data.datasets[1].data = temps;
    this.trendChart.data.datasets[2].data = humids;

    const maxRain = Math.max(...rains);
    this.trendChart.options.scales.yRain.max = Math.ceil(maxRain * 1.15 / 100) * 100 + 50;

    this.trendChart.update();
  }

  // Decadal trend logic helper
  calculate10YearTrend(lat, lon) {
    const trendData = [];
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    for (let yr = 2016; yr <= 2026; yr++) {
      let totalPrecipMm = 0;
      let tempSumK = 0;
      let humidSum = 0;

      months.forEach(m => {
        const telemetry = this.climateEngine.generateTelemetry(lat, lon, yr, m, m * 30);
        if (telemetry) {
          const monthlyRainRate = telemetry.precipitationMmHr;
          const monthlyProbFactor = telemetry.rainProbability / 100.0;
          totalPrecipMm += (monthlyRainRate * 730 * monthlyProbFactor);
          
          tempSumK += telemetry.temperatureK;
          humidSum += telemetry.humidity;
        }
      });

      trendData.push({
        year: yr,
        annualRain: Math.round(totalPrecipMm),
        meanTemp: parseFloat((tempSumK / 12 - 273.15).toFixed(1)),
        meanHumid: Math.round(humidSum / 12)
      });
    }

    return trendData;
  }
}

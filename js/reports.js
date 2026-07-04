/**
 * AetherSense AI - Climatological Synoptic Report Module
 * Aggregates 5-year historical and 1-year predictive weather data for print/PDF export.
 */

import { KtoC, getRainDescription } from './utils.js';

export class ReportGenerator {
  constructor(climateEngine) {
    this.climateEngine = climateEngine;
  }

  // Generate synoptic database and show report modal
  showReport(lat, lon, cityName = 'Unknown Location') {
    const reportModal = document.getElementById('report-modal-overlay');
    if (!reportModal) return;

    // 1. Gather 5-Year Historical Metrics (2021-2025)
    const historyData = this.compileHistoricalData(lat, lon);

    // 2. Gather 1-Year Future Prediction Metrics (2027)
    const forecastData = this.compileFutureData(lat, lon);

    // 3. Generate Diagnostic Summary & Agricultural Advisory
    const geography = this.climateEngine.getGeography(lat, lon);
    const climate = this.climateEngine.generateTelemetry(lat, lon, 2026, 6, 180);
    const summary = this.generateSummary(geography, climate, historyData, forecastData);
    const agriAdvisory = this.generateAgriculturalAdvisory(geography, climate, historyData, forecastData);

    // 4. Inject into HTML Containers
    document.getElementById('report-meta-city').textContent = cityName;
    document.getElementById('report-meta-coords').textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
    document.getElementById('report-meta-zone').textContent = climate.climateZone;
    document.getElementById('report-meta-elev').textContent = `${geography.elevation} m`;
    document.getElementById('report-meta-terrain').textContent = geography.isOcean ? "Oceanic (High Moisture)" : `Inland (Distance to Sea: ${geography.oceanDistance})`;

    // Inject Tables
    this.renderHistoryTable(historyData);
    this.renderForecastTable(forecastData);
    document.getElementById('report-summary-text').innerHTML = summary;
    document.getElementById('report-agri-text').innerHTML = agriAdvisory;

    // Show modal
    reportModal.style.display = 'flex';
  }

  // Compile years 2021 to 2025
  compileHistoricalData(lat, lon) {
    const history = [];
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    for (let yr = 2021; yr <= 2025; yr++) {
      let tempSumK = 0;
      let humidSum = 0;
      let pressSum = 0;
      let windSum = 0;
      let totalPrecipMm = 0;

      months.forEach(m => {
        const tel = this.climateEngine.generateTelemetry(lat, lon, yr, m, m * 30);
        if (tel) {
          tempSumK += tel.temperatureK;
          humidSum += tel.humidity;
          pressSum += tel.pressure;
          windSum += tel.windSpeed;
          // Annual precipitation rate formula: avg mm/hr * hours/month * probability factor
          totalPrecipMm += (tel.precipitationMmHr * 730 * (tel.rainProbability / 100.0));
        }
      });

      const anomalyRecord = this.climateEngine.historicalData ? this.climateEngine.historicalData[String(yr)] : null;
      let rawIndex = anomalyRecord ? anomalyRecord.climateIndex : "Neutral Phase";
      
      // Explain Spanish climatology terms (El Niño / La Niña) in plain English
      let englishIndex = rawIndex;
      if (englishIndex.includes("El Niño")) {
        englishIndex = englishIndex.replace("El Niño", "El Niño (Warm Ocean Phase)");
      }
      if (englishIndex.includes("La Niña")) {
        englishIndex = englishIndex.replace("La Niña", "La Niña (Cool Ocean Phase)");
      }

      history.push({
        year: yr,
        avgTempC: parseFloat(KtoC(tempSumK / 12)),
        avgHumidity: Math.round(humidSum / 12),
        avgPressure: Math.round(pressSum / 12),
        avgWindSpeed: parseFloat((windSum / 12).toFixed(1)),
        annualPrecip: Math.round(totalPrecipMm),
        anomalyName: englishIndex
      });
    }

    return history;
  }

  // Compile monthly predictions for 2027
  compileFutureData(lat, lon) {
    const forecast = [];
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const yr = 2027; // Future target year

    months.forEach(m => {
      // Simulate mid-month day
      const day = m * 30;
      const tel = this.climateEngine.generateTelemetry(lat, lon, yr, m, day);
      
      // Inject minor climate shift noise representational of future trend variance
      const noise = Math.sin(m * 1.5) * 0.4;
      const tempC = parseFloat(KtoC(tel.temperatureK + noise * 1.2));
      const rainProb = Math.max(0, Math.min(99, tel.rainProbability + noise * 8));
      
      let precipMmHr = 0.0;
      if (rainProb > 30) {
        precipMmHr = parseFloat(Math.max(0, tel.precipitationMmHr + noise * 0.3).toFixed(2));
      }
      
      const rainDesc = getRainDescription(precipMmHr);

      forecast.push({
        monthName: new Date(2027, m - 1).toLocaleString('default', { month: 'long' }),
        tempC,
        humidity: Math.round(tel.humidity),
        pressure: Math.round(tel.pressure),
        windSpeed: tel.windSpeed,
        rainProb,
        rainClass: rainDesc.class
      });
    });

    return forecast;
  }

  // Generate automated descriptive prognosis summary text
  generateSummary(geo, climate, history, forecast) {
    const isOcean = geo.isOcean;
    const zone = climate.climateZone.toLowerCase();
    
    // Estimate rain profile based on 5-year averages
    const avgRain = history.reduce((sum, item) => sum + item.annualPrecip, 0) / history.length;
    const avgTemp = history.reduce((sum, item) => sum + item.avgTempC, 0) / history.length;

    let soilPrognosis = "Stable terrain parameters.";
    let rainPrognosis = "Precipitation distributions follow standard seasonal peaks.";
    
    if (zone.includes("arid") || avgRain < 250) {
      soilPrognosis = "WARNING: Prolonged desertification profile active. High evaporative moisture loss, low groundwater recharge cycles.";
      rainPrognosis = "Hyper-sparse, isolated convective storm cores predicted for summer slots.";
    } else if (zone.includes("tropical") || avgRain > 2200) {
      soilPrognosis = "Saturated soil profile. High runoff potential with structural landslide hazard risk during monsoon peaks.";
      rainPrognosis = "Intense, continuous tropical convective systems active. Monthly rainfall totals remain high.";
    } else {
      soilPrognosis = "Agricultural soil profile nominal. Solid soil moisture levels for seasonal crop rotations.";
    }

    // Predict upcoming anomalies (simulated)
    const futureHeavyRainMonths = forecast.filter(f => f.rainClass === "Moderate" || f.rainClass === "Heavy").map(f => f.monthName);
    let alertMsg = "No severe anomalies forecasted for 2027.";
    if (futureHeavyRainMonths.length > 0) {
      alertMsg = `Alert: Moderate to heavy precipitation peaks expected in ${futureHeavyRainMonths.slice(0, 3).join(', ')}.`;
    }

    return `
      <div style="line-height: 1.6;">
        <p><strong>Geographical Context:</strong> Locked coordinates represent a <strong>${climate.climateZone}</strong> zone at an elevation of ${geo.elevation} meters. Proximity parameters indicate a ${isOcean ? 'maritime sub-satellite cell' : 'continental land mass'}.</p>
        <p class="mt-1" style="color: var(--primary);"><strong>5-Year Trend Analysis (2021-2025):</strong> Average temperature registered at <strong>${avgTemp.toFixed(1)}°C</strong> with an annual mean rainfall aggregate of <strong>${Math.round(avgRain)} mm</strong>. Anomaly trends indicate transitions through consecutive ENSO oscillations.</p>
        <p class="mt-1"><strong>Soil & Moisture Prognosis:</strong> ${soilPrognosis}</p>
        <p class="mt-1"><strong>Precipitation Forecast Outlook:</strong> ${rainPrognosis} ${alertMsg}</p>
        <p class="mt-2 text-muted" style="font-size: 0.75rem; border-top: 1px dashed rgba(0,245,255,0.15); padding-top: 8px;">
          <em>Prognosis computed using local state parameters. Diagnostic weights: Solar-Index=1.2, lapse-rate=-6.5K/1km. Valid for target sub-satellite cell scanning.</em>
        </p>
      </div>
    `;
  }

  // Generate agricultural advisory advice based on climate zones and predicted rain profiles
  generateAgriculturalAdvisory(geo, climate, history, forecast) {
    const zone = climate.climateZone.toLowerCase();
    const avgRain = history.reduce((sum, item) => sum + item.annualPrecip, 0) / history.length;
    const avgTemp = history.reduce((sum, item) => sum + item.avgTempC, 0) / history.length;

    let cropRecommendations = "";
    let soilStatus = "";
    let waterManagement = "";
    let sowingHarvestWindow = "";

    // Classification mapping
    if (zone.includes("tropical") || avgRain >= 2000) {
      cropRecommendations = "Rice (Paddy), Sugarcane, Bananas, Tea, Coconut, Rubber, Cassava.";
      soilStatus = "Saturated / Hydromorphic. High risk of waterlogging, nutrient leaching, and soil erosion.";
      waterManagement = "High drainage reliance. Build clear contour bunds and drainage channels. Supplementary irrigation rarely needed.";
      sowingHarvestWindow = "Kharif sowing: June-July (Onset of Southwest Monsoon). Harvesting: November-December.";
    } else if (zone.includes("arid") || avgRain < 350) {
      cropRecommendations = "Pearl Millet (Bajra), Sorghum (Jowar), Chickpea, Cluster Bean (Guar), Cotton, Sunflower.";
      soilStatus = "Arid / Sandy / Low Organic Matter. High soil temperature and fast evaporative depletion.";
      waterManagement = "Critical conservation needed. Use drip irrigation, micro-sprinklers, and implement heavy organic mulching to conserve moisture.";
      sowingHarvestWindow = "Sow immediately after first summer monsoon showers (early July). Early harvesting before winter dryness sets in.";
    } else if (zone.includes("temperate") || (avgRain >= 350 && avgRain < 1200)) {
      cropRecommendations = "Wheat, Maize (Corn), Soybean, Barley, Chickpea, Mustard, Potatoes, Rapeseed.";
      soilStatus = "Loamy / Balanced Moisture. Nominal nitrogen retention, steady transpiration conditions.";
      waterManagement = "Seasonal sprinkler irrigation. Implement conservation tillage to retain organic ground cover.";
      sowingHarvestWindow = "Rabi crop cycle: Sow in mid-October to November. Harvest in April-May (spring dry period).";
    } else if (zone.includes("continental")) {
      cropRecommendations = "Spring Wheat, Oats, Rye, Flax, Rapeseed, Potatoes, Sugar Beets.";
      soilStatus = "Moist / Humus Rich. Slow organic breakdown due to winter temperatures. High spring moisture from snowmelt.";
      waterManagement = "Balanced water management. Watch for spring soil compaction. Tile drainage useful in early spring.";
      sowingHarvestWindow = "Spring sowing: May (after frost clearance). Harvest: September (before autumn freeze).";
    } else { // Polar / Tundra
      cropRecommendations = "No open-field crops viable. CEA (Controlled Environment Agriculture) like hydroponics/greenhouse needed.";
      soilStatus = "Permafrost / Frozen.";
      waterManagement = "Closed-loop recirculating hydroponic water systems only.";
      sowingHarvestWindow = "Year-round cultivation via controlled artificial lighting and heating systems.";
    }

    // Dynamic warnings based on 2027 forecast profile
    const hotDryMonths = forecast.filter(f => f.tempC > 32 && (f.rainClass === "NONE" || f.rainClass === "LIGHT")).map(f => f.monthName);
    const heavyRainMonths = forecast.filter(f => f.rainClass === "HEAVY" || f.rainClass === "MODERATE").map(f => f.monthName);
    
    let warningNotes = "";
    if (hotDryMonths.length > 0) {
      warningNotes += `<li style="margin-bottom: 5px;"><strong style="color: var(--warning);">Dry Spell Warning:</strong> Elevated evapotranspiration risk in <strong>${hotDryMonths.slice(0, 3).join(', ')}</strong> due to high temperatures (>32°C) and sparse rains. Supplementary irrigation is vital for critical crop vegetative phases.</li>`;
    }
    if (heavyRainMonths.length > 0) {
      warningNotes += `<li style="margin-bottom: 5px;"><strong style="color: var(--danger);">Waterlogging Alert:</strong> Significant rain peaks predicted in <strong>${heavyRainMonths.slice(0, 3).join(', ')}</strong>. High threat of crop lodging (falling over) and root rot. Clear soil runoffs in advance.</li>`;
    }
    if (warningNotes === "") {
      warningNotes = `<li>Stable weather indices predicted throughout the 2027 crop growth cycle. Follow standard agricultural practices.</li>`;
    }

    return `
      <div style="line-height: 1.5; color: var(--text-main);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <div>
            <strong style="color: var(--secondary); font-size: 0.72rem; text-transform: uppercase;">🌾 RECOMMENDED CROP MATRIX:</strong>
            <p style="margin: 2px 0 6px 0; font-weight: bold; color: var(--primary);">${cropRecommendations}</p>
          </div>
          <div>
            <strong style="color: var(--secondary); font-size: 0.72rem; text-transform: uppercase;">⏳ SOWING & HARVEST WINDOWS:</strong>
            <p style="margin: 2px 0 6px 0; font-weight: bold;">${sowingHarvestWindow}</p>
          </div>
          <div>
            <strong style="color: var(--secondary); font-size: 0.72rem; text-transform: uppercase;">💧 SOIL MOISTURE PROFILE:</strong>
            <p style="margin: 2px 0 6px 0;">${soilStatus}</p>
          </div>
          <div>
            <strong style="color: var(--secondary); font-size: 0.72rem; text-transform: uppercase;">🌊 IRRIGATION MANAGEMENT:</strong>
            <p style="margin: 2px 0 6px 0;">${waterManagement}</p>
          </div>
        </div>
        
        <div style="border-top: 1px dashed rgba(0,255,159,0.2); padding-top: 8px;">
          <strong style="color: var(--secondary); font-size: 0.72rem; text-transform: uppercase;">⚠️ REAL-TIME CROP MANAGEMENT ALERTS (2027):</strong>
          <ul style="margin: 4px 0 0 0; padding-left: 15px;">
            ${warningNotes}
          </ul>
        </div>
      </div>
    `;
  }

  // Draw 5-year Table
  renderHistoryTable(data) {
    const tbody = document.getElementById('report-history-table-body');
    if (!tbody) return;

    tbody.innerHTML = data.map(row => `
      <tr>
        <td style="color: var(--primary); font-weight: bold; padding: 6px 12px; border-bottom: 1px solid rgba(0,245,255,0.1);">${row.year}</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid rgba(0,245,255,0.1);">${row.avgTempC}°C</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid rgba(0,245,255,0.1); font-weight: 500;">${row.annualPrecip} mm</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid rgba(0,245,255,0.1);">${row.avgHumidity}%</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid rgba(0,245,255,0.1); font-family: monospace;">${row.avgPressure} hPa</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid rgba(0,245,255,0.1);">${row.avgWindSpeed} m/s</td>
        <td style="padding: 6px 12px; border-bottom: 1px solid rgba(0,245,255,0.1); color: var(--warning); font-size: 0.8rem;">${row.anomalyName}</td>
      </tr>
    `).join('');
  }

  // Draw 2027 monthly predictions Table
  renderForecastTable(data) {
    const tbody = document.getElementById('report-forecast-table-body');
    if (!tbody) return;

    tbody.innerHTML = data.map(row => {
      let rainColor = "var(--text-muted)";
      if (row.rainClass === "LIGHT") rainColor = "var(--primary)";
      else if (row.rainClass === "MODERATE") rainColor = "var(--warning)";
      else if (row.rainClass === "HEAVY") rainColor = "var(--danger)";

      return `
        <tr>
          <td style="color: var(--primary); padding: 5px 12px; border-bottom: 1px solid rgba(0,245,255,0.06);">${row.monthName}</td>
          <td style="padding: 5px 12px; border-bottom: 1px solid rgba(0,245,255,0.06);">${row.tempC}°C</td>
          <td style="padding: 5px 12px; border-bottom: 1px solid rgba(0,245,255,0.06);">${row.humidity}%</td>
          <td style="padding: 5px 12px; border-bottom: 1px solid rgba(0,245,255,0.06); font-family: monospace;">${row.pressure} hPa</td>
          <td style="padding: 5px 12px; border-bottom: 1px solid rgba(0,245,255,0.06);">${row.windSpeed} m/s</td>
          <td style="padding: 5px 12px; border-bottom: 1px solid rgba(0,245,255,0.06); font-weight: bold; color: ${rainColor};">${row.rainClass.toUpperCase()}</td>
          <td style="padding: 5px 12px; border-bottom: 1px solid rgba(0,245,255,0.06); font-size: 0.8rem; color: var(--text-muted);">${row.rainProb.toFixed(1)}%</td>
        </tr>
      `;
    }).join('');
  }
}

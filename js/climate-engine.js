/**
 * AetherSense AI - Climate Engine
 * Generates procedural weather parameters based on earth geography and timeline state.
 */

import { mapValue } from './utils.js';

export class ClimateEngine {
  constructor() {
    this.zones = [];
    this.monthlyPatterns = null;
    this.historicalData = null;
    this.isLoaded = false;
  }

  async initialize() {
    try {
      const [zonesRes, patternsRes, historyRes] = await Promise.all([
        fetch('./data/climate-zones.json').then(res => res.json()),
        fetch('./data/monthly-patterns.json').then(res => res.json()),
        fetch('./data/historical-simulation.json').then(res => res.json())
      ]);

      this.zones = zonesRes.zones;
      this.monthlyPatterns = patternsRes.hemispheres;
      this.historicalData = historyRes.years;
      this.isLoaded = true;
      console.log("[ClimateEngine] Procedural databases loaded successfully.");
    } catch (e) {
      console.error("[ClimateEngine] Error loading datasets. Falling back to local defaults.", e);
      this.loadDefaults();
      this.isLoaded = true;
    }
  }

  loadDefaults() {
    // Basic fallback if fetch fails
    this.zones = [
      { id: "tropical", name: "Tropical Zone", latMin: -23.5, latMax: 23.5, baseTempK: 300.15, tempRange: 3.0, baseHumidity: 80.0, basePressure: 1010.0, basePrecipitationMmHr: 3.5, rainProbability: 70.0, windSpeedRange: [5.0, 15.0] },
      { id: "arid", name: "Arid / Desert Zone", latMin: -35.0, latMax: 35.0, baseTempK: 305.15, tempRange: 15.0, baseHumidity: 20.0, basePressure: 1015.0, basePrecipitationMmHr: 0.05, rainProbability: 5.0, windSpeedRange: [10.0, 30.0] },
      { id: "temperate", name: "Temperate Zone", latMin: -50.0, latMax: 50.0, baseTempK: 288.15, tempRange: 10.0, baseHumidity: 65.0, basePressure: 1013.25, basePrecipitationMmHr: 1.2, rainProbability: 45.0, windSpeedRange: [8.0, 22.0] },
      { id: "continental", name: "Continental Zone", latMin: -70.0, latMax: 70.0, baseTempK: 278.15, tempRange: 20.0, baseHumidity: 60.0, basePressure: 1011.0, basePrecipitationMmHr: 0.8, rainProbability: 35.0, windSpeedRange: [10.0, 25.0] },
      { id: "polar", name: "Polar Zone", latMin: -90.0, latMax: 90.0, baseTempK: 253.15, tempRange: 12.0, baseHumidity: 40.0, basePressure: 1008.0, basePrecipitationMmHr: 0.1, rainProbability: 15.0, windSpeedRange: [12.0, 35.0] }
    ];
  }

  // Get geographic characteristics of coordinates (simulated land, ocean, mountains)
  getGeography(lat, lon) {
    // Estimate ocean vs land. Simple sine/cosine grid representing continents
    // with coordinate constraints for famous geographical structures.
    const lonRad = (lon * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;

    // Procedural continents approximation
    const continentFactor = Math.sin(lonRad * 3) * Math.cos(latRad * 2.5) +
                            Math.cos(lonRad * 1.5) * Math.sin(latRad * 1.8) +
                            Math.sin(lonRad * 0.5) * Math.cos(latRad * 0.8);

    const isOcean = continentFactor < -0.25;

    // Estimate elevation (mountains are positive land noise spikes)
    let elevation = 0; // meters
    if (!isOcean) {
      const mountainNoise = Math.sin(lonRad * 8) * Math.sin(latRad * 8);
      if (mountainNoise > 0.4) {
        elevation = mapValue(mountainNoise, 0.4, 1.0, 500, 4800);
      } else {
        elevation = mapValue(Math.max(-0.2, mountainNoise), -0.2, 0.4, 0, 500);
      }
    }

    // Distance to ocean indicator (0.0 coastal/ocean, 1.0 deep inland)
    const oceanDistance = isOcean ? 0.0 : mapValue(continentFactor, -0.25, 1.5, 0.1, 1.0);

    return {
      isOcean,
      elevation: Math.round(elevation),
      oceanDistance: parseFloat(oceanDistance.toFixed(2))
    };
  }

  // Select the appropriate climate zone based on latitude and geographical properties
  determineClimateZone(lat, geography) {
    const absLat = Math.abs(lat);

    // Desert regions typically align around 15 to 35 degrees latitude (subtropical highs)
    // unless they are oceans.
    if (absLat >= 15 && absLat <= 35 && geography.oceanDistance > 0.4) {
      return this.zones.find(z => z.id === "arid") || this.zones[1];
    }

    if (absLat <= 23.5) {
      return this.zones.find(z => z.id === "tropical") || this.zones[0];
    } else if (absLat <= 50) {
      return this.zones.find(z => z.id === "temperate") || this.zones[2];
    } else if (absLat <= 70) {
      return this.zones.find(z => z.id === "continental") || this.zones[3];
    } else {
      return this.zones.find(z => z.id === "polar") || this.zones[4];
    }
  }

  // Generate the core weather parameters
  generateTelemetry(lat, lon, year, month, dayOfYear = 150) {
    if (!this.isLoaded) return null;

    const geography = this.getGeography(lat, lon);
    const zone = this.determineClimateZone(lat, geography);
    
    // 1. Get Monthly Seasonal Offsets
    const hemi = lat >= 0 ? "northern" : "southern";
    const patternList = this.monthlyPatterns ? this.monthlyPatterns[hemi] : [];
    const pattern = patternList.find(p => p.month === month) || { tempOffset: 0, precipMult: 1.0, humidOffset: 0 };

    // 2. Get 10-Year Historical Anomaly
    const history = this.historicalData ? this.historicalData[String(year)] : null;
    const tempAnomaly = history ? history.tempAnomaly - 1.0 : 0.0; // center around 0
    const precipAnomalyMult = history ? history.precipAnomaly : 1.0;

    // 3. Temperature Calculation (Kelvin)
    // Base temperature decreases with latitude (cosine factor) and elevation (-6.5K per 1000m lapse rate)
    const latCos = Math.cos((lat * Math.PI) / 180);
    let temp = zone.baseTempK + (latCos * 8) + pattern.tempOffset + (tempAnomaly * 2.5);
    
    // Altitude lapse rate
    temp -= (geography.elevation / 1000) * 6.5;

    // Ocean damping: oceans have smaller seasonal temperature swings
    if (geography.isOcean) {
      temp = zone.baseTempK + (latCos * 3) + (pattern.tempOffset * 0.3) + (tempAnomaly * 1.5);
    }

    // 4. Humidity Calculation (%)
    let humidity = zone.baseHumidity + pattern.humidOffset;
    if (geography.isOcean) {
      humidity = Math.max(humidity, 82.0); // high humidity over oceans
    } else {
      // dry out inland, especially in deserts
      humidity -= geography.oceanDistance * 25;
    }
    
    // Adjust humidity based on temperature (hot desert air holds more moisture but relative humidity is lower)
    if (zone.id === "arid") {
      humidity = Math.max(8.0, Math.min(35.0, humidity));
    } else {
      humidity = Math.max(10.0, Math.min(100.0, humidity));
    }

    // 5. Air Pressure Calculation (hPa)
    // Decreases exponentially with elevation
    const pressureScale = Math.exp(-geography.elevation / 8400);
    let pressure = zone.basePressure * pressureScale;
    
    // Small pressure changes due to temperature / storms
    const pressureFluctuation = Math.sin((dayOfYear / 365) * Math.PI * 4) * 8;
    pressure += pressureFluctuation;

    // 6. Cloud Cover Calculation (%)
    // Heavily tied to humidity levels
    let cloudCover = Math.max(0, mapValue(humidity, 30.0, 95.0, 0.0, 100.0));
    if (geography.isOcean) {
      cloudCover = Math.max(15, cloudCover);
    }

    // 7. Base Precipitation Probability (%)
    let baseProb = zone.rainProbability * (humidity / 100.0) * pattern.precipMult * precipAnomalyMult;
    if (cloudCover < 30) baseProb *= 0.1; // low clouds, low rain
    else if (cloudCover > 85) baseProb = Math.max(baseProb, 80.0);
    const rainProbability = Math.max(0, Math.min(99.0, baseProb));

    // 8. Base Precipitation quantity (mm/hr)
    let precipitation = 0.0;
    if (rainProbability > 30.0) {
      // Calculate based on zone rates and humidity density
      const rateFactor = mapValue(humidity, 60.0, 100.0, 0.1, 2.5);
      precipitation = zone.basePrecipitationMmHr * rateFactor * pattern.precipMult * precipAnomalyMult;
      
      // Mountains cause orographic precipitation enhancement
      if (geography.elevation > 1500) {
        precipitation *= 1.4;
      }
      // Oceans have milder, continuous rain, tropical land has massive convective downpours
      if (!geography.isOcean && zone.id === "tropical") {
        precipitation *= 1.8;
      }
    }

    // 9. Wind Speed (m/s)
    const baseWind = mapValue(zone.windSpeedRange[0] + zone.windSpeedRange[1] / 2, 5, 30, 3.0, 15.0);
    const windSpeed = baseWind + Math.abs(pressureFluctuation) * 0.5 + (geography.isOcean ? 4.0 : 0.0);

    return {
      climateZone: zone.name,
      zoneId: zone.id,
      geography,
      temperatureK: parseFloat(temp.toFixed(2)),
      humidity: parseFloat(humidity.toFixed(1)),
      pressure: parseFloat(pressure.toFixed(1)),
      cloudCover: parseFloat(cloudCover.toFixed(1)),
      rainProbability: parseFloat(rainProbability.toFixed(1)),
      precipitationMmHr: precipitation > 0.05 ? parseFloat(precipitation.toFixed(2)) : 0.0,
      windSpeed: parseFloat(windSpeed.toFixed(1)),
      historicalAnomaly: history ? {
        index: history.climateIndex,
        description: history.description,
        notableEvents: history.notableEvents
      } : null
    };
  }

  // Generate a 3-day forecast outlook relative to current simulation step
  generate3DayForecast(lat, lon, year, month, dayOfYear) {
    const forecast = [];
    for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
      const forecastDayOfYear = (dayOfYear + dayOffset) % 365;
      
      // Calculate a shifted month if the day of year overflows monthly blocks (approx 30 days)
      let forecastMonth = month;
      if (dayOfYear + dayOffset > 30 * month) {
        forecastMonth = (month % 12) + 1;
      }
      
      // Generate base weather telemetry for that day
      const telemetry = this.generateTelemetry(lat, lon, year, forecastMonth, forecastDayOfYear);
      if (!telemetry) continue;
      
      // Add day-to-day weather fluctuation noise representing passing weather fronts
      const noiseVal = Math.sin(dayOfYear * 0.7 + dayOffset * 1.9) * Math.cos(lat * 0.05);
      const tempK = telemetry.temperatureK + (noiseVal * 2.2);
      const rainProb = Math.max(0, Math.min(99.0, telemetry.rainProbability + (noiseVal * 15.0)));
      
      let precip = 0.0;
      if (rainProb > 32.0) {
        precip = Math.max(0, telemetry.precipitationMmHr + (noiseVal * 0.6));
      }
      
      forecast.push({
        dayOffset,
        temperatureK: parseFloat(tempK.toFixed(2)),
        rainProbability: parseFloat(rainProb.toFixed(1)),
        precipitationMmHr: parseFloat(precip.toFixed(2)),
        cloudCover: Math.max(0, Math.min(100.0, parseFloat((telemetry.cloudCover + noiseVal * 12.0).toFixed(1))))
      });
    }
    return forecast;
  }
}

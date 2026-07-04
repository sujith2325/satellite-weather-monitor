/**
 * AetherSense AI - AI Predictor
 * Simulates neural network feature extraction and precipitation classification.
 */

import { getRainDescription } from './utils.js';

export class AIPredictor {
  constructor() {
    // Mock neural network weights to display in diagnostics
    this.weights = {
      layer1: "Conv2d(3, 16, kernel_size=3, padding=1)",
      layer2: "MaxPool2d(2, 2)",
      layer3: "Conv2d(16, 32, kernel_size=3)",
      dense: "Linear(512, 4) -> Softmax"
    };
  }

  // Simulates feeding weather parameters and image statistics to the AI Model
  predict(climateData, activeBand, secondsTick) {
    if (!climateData) return null;

    // Simulate image features based on climate state
    const cloudCover = climateData.cloudCover;
    const humidity = climateData.humidity;
    const tempK = climateData.temperatureK;
    
    // Add micro-fluctuations (representing cloud drift and scanning noise)
    const noiseFactor = Math.sin(secondsTick * 0.5) * 0.05 + 0.975;
    
    // Cloud Optical Thickness (g/m²)
    const opticalThickness = cloudCover > 10 
      ? parseFloat((cloudCover * 1.5 * noiseFactor).toFixed(1)) 
      : 0.0;
      
    // Cloud Top Temperature (K)
    // Deeper clouds have higher cloud tops, which are colder
    const cloudTopTemp = cloudCover > 20
      ? parseFloat((tempK - (cloudCover * 0.45) * noiseFactor).toFixed(1))
      : parseFloat((tempK - 2.0).toFixed(1)); // near-surface boundary layer temp

    // Water Vapor index
    const waterVaporIndex = parseFloat((humidity * 1.25 * noiseFactor).toFixed(1));

    // Determine prediction confidence based on the current spectral band
    // Radar (RADAR) is active sensor, highly accurate for precipitation (95-99% confidence)
    // Infrared (IR) and Visible (VIS) are passive, moderate confidence (75-88%)
    // Water Vapor (WV) is upper-level, poor for surface rainfall (50-65% confidence)
    let baseConfidence = 85.0;
    if (activeBand === 'RADAR') baseConfidence = 96.5;
    else if (activeBand === 'IR') baseConfidence = 88.0;
    else if (activeBand === 'WV') baseConfidence = 58.0;
    else if (activeBand === 'VIS') baseConfidence = 76.0;

    // Apply minor fluctuation to confidence
    const confidence = parseFloat((baseConfidence + Math.sin(secondsTick) * 1.5).toFixed(1));

    // Calculate prediction metrics
    let rainProb = climateData.rainProbability;
    let rainRate = climateData.precipitationMmHr;

    // Spectral band adjustments to prediction (simulating sensor limitations)
    if (activeBand === 'WV') {
      // Water Vapor overestimates probability but cannot measure ground truth rate well
      rainProb = Math.min(99.0, rainProb * 1.1);
      rainRate = parseFloat((rainRate * 0.8).toFixed(2));
    } else if (activeBand === 'VIS' && cloudCover < 15) {
      // VIS can miss light warm-cloud rain
      rainProb = Math.max(0.0, rainProb - 5);
    } else if (activeBand === 'RADAR') {
      // Radar gets direct reflection, yielding more precise values
      rainRate = parseFloat((rainRate * (1.0 + Math.cos(secondsTick) * 0.03)).toFixed(2));
    }

    const rainDesc = getRainDescription(rainRate);

    // Generate model forecast summary
    let forecastSummary = "";
    if (rainDesc.class === "None") {
      forecastSummary = "Clear to overcast sky. No significant precipitation detected within target cell.";
    } else if (rainDesc.class === "Light") {
      forecastSummary = `Drizzle or light precipitation active. Cloud structure is stable. Rain rate: ${rainRate} mm/hr.`;
    } else if (rainDesc.class === "Moderate") {
      forecastSummary = `Steady rain cores verified. Convective cloud growth detected. Rain rate: ${rainRate} mm/hr.`;
    } else if (rainDesc.class === "Heavy") {
      forecastSummary = `ALERT: Torrential rain bands scan locked. Highly unstable convective system active. Rain rate: ${rainRate} mm/hr.`;
    }

    return {
      rainProbability: parseFloat(rainProb.toFixed(1)),
      rainIntensity: rainDesc.class,
      rainColor: rainDesc.color,
      precipitationMmHr: rainRate,
      confidenceScore: Math.min(99.9, Math.max(10.0, confidence)),
      forecastSummary,
      features: {
        opticalThickness,
        cloudTopTemp,
        waterVaporIndex
      },
      diagnostics: {
        inputTensor: `[Lat=${climateData.geography.isOcean ? 'Ocean' : 'Land'}, CC=${cloudCover}%, H=${humidity}%, T=${tempK}K]`,
        activeBands: activeBand,
        latentVectors: [
          (opticalThickness * 0.12).toFixed(3),
          ((300 - cloudTopTemp) * 0.05).toFixed(3),
          (waterVaporIndex * 0.08).toFixed(3)
        ],
        inferenceDurationMs: parseFloat((12.4 + Math.sin(secondsTick) * 4.2).toFixed(1))
      }
    };
  }
}

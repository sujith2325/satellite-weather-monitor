/**
 * AetherSense AI - Utility Module
 * Seeded random number generators, 2D Perlin noise, and color math.
 */

// Seeded random number generator
export function createSeededRandom(seedString) {
  let h = 0;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(31, h) + seedString.charCodeAt(i) | 0;
  }
  
  return function() {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D Perlin Noise generator
export class PerlinNoise {
  constructor(seed = 'aethersense') {
    const rng = createSeededRandom(seed);
    this.p = new Uint8Array(512);
    const permutation = Array.from({ length: 256 }, (_, i) => i);
    
    // Shuffle permutation
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = permutation[i];
      permutation[i] = permutation[j];
      permutation[j] = tmp;
    }
    
    // Fill double permutation table
    for (let i = 0; i < 512; i++) {
      this.p[i] = permutation[i & 255];
    }
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    // Convert low 4 bits of hash code into 8 gradient directions
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.p[this.p[X] + Y];
    const ab = this.p[this.p[X] + Y + 1];
    const ba = this.p[this.p[X + 1] + Y];
    const bb = this.p[this.p[X + 1] + Y + 1];

    return this.lerp(v, 
      this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf)),
      this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1))
    );
  }

  // Fractal Brownian Motion (FBM) - sums octaves of noise
  fbm2D(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
    let total = 0.0;
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0.0; // Used for normalizing

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    // Map from [-1, 1] range to [0, 1] range
    return (total / maxValue + 1.0) / 2.0;
  }
}

// Map value from one range to another
export function mapValue(value, inMin, inMax, outMin, outMax) {
  const mapped = (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  return Math.max(outMin, Math.min(outMax, mapped)); // clamp
}

// Convert Kelvin to Celsius
export function KtoC(k) {
  return (k - 273.15).toFixed(1);
}

// Convert mm/hr to rainfall description
export function getRainDescription(quantity) {
  if (quantity <= 0.01) return { class: "None", color: "#8b9bb4" };
  if (quantity <= 2.5) return { class: "Light", color: "#00f5ff" };
  if (quantity <= 10.0) return { class: "Moderate", color: "#ffb347" };
  return { class: "Heavy", color: "#ff4b5c" };
}

// Production-ready Map Provider Configuration
export const MAP_CONFIG = {
  // Option: 'google-dev' (dev-only, rate-limited), 'maptiler' (production, requires API key), 'dark-matter' (offline fallback)
  MAP_PROVIDER: 'google-dev', 
  MAPTILER_API_KEY: 'YOUR_MAPTILER_API_KEY' // Insert MapTiler key here for production deployment
};

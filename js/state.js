/**
 * AetherSense AI - State Management Module
 * Implements a central Pub-Sub store for decoupled module communication.
 */

class StateStore {
  constructor() {
    this.state = {
      lat: 15.0,
      lon: 45.0,
      activeYear: 2026,
      activeBand: 'VIS',
      isPlaying: true,
      tickSpeedMs: 1000,
      secondsTick: 0,
      selectedCity: null
    };
    
    this.listeners = {};
  }

  // Subscribe a callback function to a state event
  subscribe(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  // Publish state updates to all subscribed listeners
  publish(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`[StateStore] Error in listener callback for event "${event}":`, e);
      }
    });
  }

  // Update one or more keys in the state and publish events
  updateState(updates) {
    const changedKeys = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (this.state[key] !== value) {
        this.state[key] = value;
        changedKeys.push(key);
      }
    }

    if (changedKeys.length === 0) return;

    // Publish specific events for changed state variables
    if (changedKeys.includes('lat') || changedKeys.includes('lon')) {
      this.publish('coordinate:changed', { lat: this.state.lat, lon: this.state.lon });
    }
    if (changedKeys.includes('activeBand')) {
      this.publish('band:changed', this.state.activeBand);
    }
    if (changedKeys.includes('activeYear')) {
      this.publish('year:changed', this.state.activeYear);
    }
    if (changedKeys.includes('secondsTick')) {
      this.publish('tick:updated', { 
        secondsTick: this.state.secondsTick,
        activeYear: this.state.activeYear
      });
    }
    if (changedKeys.includes('isPlaying')) {
      this.publish('playstate:changed', this.state.isPlaying);
    }
    if (changedKeys.includes('selectedCity')) {
      this.publish('city:selected', this.state.selectedCity);
    }

    // Always publish a generic state change event
    this.publish('state:changed', { ...this.state });
  }

  // Get a read-only snapshot of the current state
  getState() {
    return { ...this.state };
  }
}

export const store = new StateStore();
export default store;

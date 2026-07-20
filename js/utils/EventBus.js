/**
 * AETHER — Event Bus
 * 
 * A lightweight pub/sub system for decoupled module communication.
 * Modules emit events; other modules subscribe to them.
 * No direct references between unrelated modules.
 */

export class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event once.
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  once(event, callback) {
    const onceWrapper = (data) => {
      this.off(event, onceWrapper);
      callback(data);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event - Event name
   * @param {*} data - Data to pass to subscribers
   */
  emit(event, data) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in "${event}" handler:`, error);
        }
      });
    }
  }

  /**
   * Check if an event has subscribers.
   * @param {string} event - Event name
   */
  hasListeners(event) {
    const callbacks = this.events.get(event);
    return callbacks ? callbacks.size > 0 : false;
  }

  /**
   * Remove all event listeners.
   */
  clear() {
    this.events.clear();
  }
}

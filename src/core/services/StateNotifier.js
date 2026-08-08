// core/services/StateNotifier.js

export default class StateNotifier {
  #listeners = new Map();

  /**
   * S’abonner à un composant
   * @param {string} component
   * @param {(state: object) => void} callback
   * @returns {() => void} fonction pour se désabonner
   */
  subscribe (component, callback) {
    if (!this.#listeners.has(component)) {
      this.#listeners.set(component, []);
    }
    const listeners = this.#listeners.get(component);
    listeners.push(callback);

    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
      // Clean map si vide (optionnel)
      if (listeners.length === 0) {
        this.#listeners.delete(component);
      }
    };
  }

  /**
   * Notifier tous les listeners d’un composant
   * @param {string} component
   * @param {object} newState
   */
  notify (component, newState) {
    if (!this.#listeners.has(component)) return;

    const listeners = [...this.#listeners.get(component)];
    for (const listener of listeners) {
      try {
        listener(newState);
      } catch {
        // Erreur ignorée volontairement
      }
    }
  }

  reset () {
    this.#listeners.clear();
  }
}


import { toast } from "sonner";

class CdeAppClient {
  constructor() {
    this.baseUrl = "https://cdeapp.es"; // Default, can be overridden if needed
    // Prioridad: 1. Variable de Entorno (Secrets), 2. LocalStorage
    this.apiKey = import.meta.env.VITE_CDEAPP_API_KEY || (typeof localStorage !== 'undefined' ? localStorage.getItem('cdeapp_api_key') : '');
  }

  setApiKey(key) {
    this.apiKey = key;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cdeapp_api_key', key);
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  async fetch(endpoint, params = {}) {
    if (!this.apiKey) {
      throw new Error("API Key no configurada");
    }

    const url = new URL(`${this.baseUrl}/api/v1/${endpoint}`);
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            url.searchParams.append(key, params[key]);
        }
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`CDEApp API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async syncRooms() {
    return this.fetch('sync-rooms');
  }

  async syncMachines() {
    return this.fetch('sync-machines');
  }

  /**
   * @param {Object} options
   * @param {string} options.search
   * @param {string} options.state_production_id_filter
   * @param {string} options.machine_id_filter
   * @param {string} options.material_filter
   * @param {string} options.date_delivery_from Y-m-d
   * @param {string} options.date_delivery_to Y-m-d
   * @param {string} options.direction asc | desc
   */
  async syncProductions(options = {}) {
    return this.fetch('sync-productions', options);
  }

  async syncArticles() {
    return this.fetch('sync-articles');
  }
}

export const cdeApp = new CdeAppClient();

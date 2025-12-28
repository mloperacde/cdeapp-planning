// src/api/base44Client.js
import { Base44Client } from '@base44/sdk';

// Crear cliente de Base44
export const base44 = new Base44Client({
  // Base44 automáticamente detecta el contexto
  // No necesitas configuración adicional aquí
});

// Helper para obtener entidades de forma segura
export async function getEntity(entityName, options = {}) {
  try {
    // Verificar si la entidad existe en el SDK
    if (base44.entities && base44.entities[entityName]) {
      if (options.id) {
        return await base44.entities[entityName].get(options.id);
      } else if (options.filter) {
        return await base44.entities[entityName].filter(options.filter);
      } else {
        return await base44.entities[entityName].list();
      }
    }
    console.warn(`Entity "${entityName}" not found in Base44 SDK`);
    return null;
  } catch (error) {
    console.error(`Error fetching ${entityName}:`, error);
    return null;
  }
}

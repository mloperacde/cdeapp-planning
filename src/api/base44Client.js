// api/base44Client.js
import { Base44Client } from '@base44/sdk';

export const base44 = new Base44Client({
  // Base44 inyecta automáticamente la configuración
  // No necesitas appId aquí si ya está configurado en el Dashboard
});

// Función helper para entidades seguras
export async function getEntities(entityType) {
  try {
    // Verificar si la entidad existe
    if (base44.entities[entityType]) {
      return await base44.entities[entityType].list();
    }
    console.warn(`Entity "${entityType}" not found in Base44 Dashboard`);
    return [];
  } catch (error) {
    console.error(`Error fetching ${entityType}:`, error);
    return [];
  }
}

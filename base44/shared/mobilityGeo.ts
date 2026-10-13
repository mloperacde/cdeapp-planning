// Apoyo geográfico para el diagnóstico de movilidad del PMST.
// Tabla de municipios del entorno de los centros de trabajo con coordenadas
// aproximadas (núcleo urbano) y utilidades para clasificar los domicilios de la
// plantilla. El domicilio se usa únicamente para deducir el municipio de origen:
// nunca se conserva ni se publica la dirección completa.

export type Municipio = {
  nombre: string;
  alias: string[];
  lat: number;
  lon: number;
  cps: string[];
};

// Orden relevante: las coincidencias más específicas primero.
export const MUNICIPIOS: Municipio[] = [
  { nombre: 'Alcalá de Henares', alias: ['ALCALA DE HENARES', 'ALCALA HENARES', 'ALCALA H', 'ALCALA'], lat: 40.4818, lon: -3.3644, cps: ['28801', '28802', '28803', '28804', '28805', '28806', '28807'] },
  { nombre: 'Torrejón del Rey', alias: ['TORREJON DEL REY'], lat: 40.6500, lon: -3.3400, cps: ['19174'] },
  { nombre: 'Torrejón de Ardoz', alias: ['TORREJON DE ARDOZ', 'TORREJON ARDOZ', 'TORREJON'], lat: 40.4592, lon: -3.4795, cps: ['28850'] },
  { nombre: 'Villanueva de la Torre', alias: ['VILLANUEVA DE LA TORRE'], lat: 40.5869, lon: -3.2982, cps: ['19209'] },
  { nombre: 'Torres de la Alameda', alias: ['TORRES DE LA ALAMEDA'], lat: 40.4044, lon: -3.3611, cps: ['28813'] },
  { nombre: 'Villalbilla', alias: ['VILLALBILLA', 'LOS HUEROS'], lat: 40.5397, lon: -3.3006, cps: ['28810'] },
  { nombre: 'Camarma de Esteruelas', alias: ['CAMARMA DE ESTERUELAS', 'CAMARMA', 'ESTERUELAS'], lat: 40.5486, lon: -3.3828, cps: ['28816'] },
  { nombre: 'Daganzo de Arriba', alias: ['DAGANZO DE ARRIBA', 'DAGANZO'], lat: 40.5439, lon: -3.4569, cps: ['28814'] },
  { nombre: 'Ajalvir', alias: ['AJALVIR'], lat: 40.5339, lon: -3.4781, cps: [] },
  { nombre: 'Anchuelo', alias: ['ANCHUELO'], lat: 40.5408, lon: -3.2875, cps: ['28818'] },
  { nombre: 'Los Santos de la Humosa', alias: ['SANTOS DE LA HUMOSA'], lat: 40.4833, lon: -3.2500, cps: ['28817'] },
  { nombre: 'Meco', alias: ['MECO'], lat: 40.5543, lon: -3.3289, cps: ['28880'] },
  { nombre: 'Valdeavero', alias: ['VALDEAVERO'], lat: 40.6167, lon: -3.3667, cps: [] },
  { nombre: 'Paracuellos de Jarama', alias: ['PARACUELLOS DE JARAMA', 'PARACUELLOS'], lat: 40.5564, lon: -3.5314, cps: ['28860'] },
  { nombre: 'San Fernando de Henares', alias: ['SAN FERNANDO DE HENARES'], lat: 40.4242, lon: -3.5326, cps: ['28830'] },
  { nombre: 'Coslada', alias: ['COSLADA'], lat: 40.4237, lon: -3.5601, cps: ['28821', '28822', '28823'] },
  { nombre: 'Mejorada del Campo', alias: ['MEJORADA DEL CAMPO', 'MEJORADA'], lat: 40.3969, lon: -3.4853, cps: ['28840'] },
  { nombre: 'Velilla de San Antonio', alias: ['VELILLA DE SAN ANTONIO', 'VELILLA'], lat: 40.3675, lon: -3.4897, cps: ['28891'] },
  { nombre: 'Loeches', alias: ['LOECHES'], lat: 40.3839, lon: -3.4117, cps: ['28890'] },
  { nombre: 'Pozuelo del Rey', alias: ['POZUELO DEL REY'], lat: 40.3833, lon: -3.3100, cps: [] },
  { nombre: 'Valdilecha', alias: ['VALDILECHA', 'MORERAS'], lat: 40.3408, lon: -3.3167, cps: ['28511'] },
  { nombre: 'Nuevo Baztán', alias: ['NUEVO BAZTAN'], lat: 40.3567, lon: -3.2514, cps: ['28514'] },
  { nombre: 'Villar del Olmo', alias: ['VILLAR DEL OLMO'], lat: 40.3300, lon: -3.2400, cps: ['28512'] },
  { nombre: 'Arganda del Rey', alias: ['ARGANDA DEL REY', 'ARGANDA'], lat: 40.3009, lon: -3.4380, cps: ['28500'] },
  { nombre: 'Azuqueca de Henares', alias: ['AZUQUECA DE HENARES', 'AZUQUECA H', 'AZUQUECA'], lat: 40.5653, lon: -3.2683, cps: ['19200'] },
  { nombre: 'Chiloeches', alias: ['CHILOECHES'], lat: 40.5700, lon: -3.2600, cps: [] },
  { nombre: 'Yunquera de Henares', alias: ['YUNQUERA DE HENARES', 'YUNQUERA'], lat: 40.6475, lon: -3.1583, cps: [] },
  { nombre: 'Humanes', alias: ['HUMANES'], lat: 40.6500, lon: -3.1700, cps: [] },
  { nombre: 'Galápagos', alias: ['GALAPAGOS'], lat: 40.6903, lon: -3.3408, cps: ['19160'] },
  { nombre: 'El Casar', alias: ['EL CASAR'], lat: 40.7028, lon: -3.4286, cps: ['19170'] },
  { nombre: 'Guadalajara', alias: ['GUADALAJARA'], lat: 40.6294, lon: -3.1666, cps: ['19000', '19001', '19002', '19003', '19004', '19005'] },
  { nombre: 'San Sebastián de los Reyes', alias: ['SAN SEBASTIAN DE LOS REYES'], lat: 40.5476, lon: -3.6276, cps: ['28703'] },
  { nombre: 'Alcobendas', alias: ['ALCOBENDAS'], lat: 40.5406, lon: -3.6415, cps: [] },
  { nombre: 'Las Rozas de Madrid', alias: ['LAS ROZAS DE MADRID', 'LAS ROZAS', 'ROZAS DE MADRID'], lat: 40.4920, lon: -3.8740, cps: ['28231', '28232'] },
  { nombre: 'Arroyomolinos', alias: ['ARROYOMOLINOS'], lat: 40.2650, lon: -3.9180, cps: [] },
  { nombre: 'Aranjuez', alias: ['ARANJUEZ'], lat: 40.0310, lon: -3.6025, cps: ['28300'] },
  { nombre: 'Madrid', alias: ['MADRID'], lat: 40.4168, lon: -3.7038, cps: ['28001', '28007', '28031', '28032'] }
];

/** Distancia intramunicipal aplicada cuando el domicilio está en el mismo municipio que el centro. */
export const DISTANCIA_INTRAMUNICIPAL_KM = 3;
/** Factor de corrección para aproximar la distancia por carretera a partir de la distancia en línea recta. */
export const FACTOR_CARRETERA = 1.25;

export function normaliza(texto: unknown): string {
  return String(texto ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extraeCodigoPostal(direccion: unknown): string {
  const coincidencia = normaliza(direccion).match(/\b(\d{5})\b/);
  return coincidencia ? coincidencia[1] : '';
}

export function municipioPorNombre(direccion: unknown): Municipio | null {
  const texto = ` ${normaliza(direccion)}`;
  if (texto.trim().length === 0) return null;
  for (const municipio of MUNICIPIOS) {
    for (const alias of municipio.alias) {
      if (texto.includes(` ${normaliza(alias)}`)) return municipio;
    }
  }
  return null;
}

export function buscarMunicipio(nombre: string): Municipio | null {
  const buscado = normaliza(nombre);
  if (!buscado) return null;
  return MUNICIPIOS.find((m) => normaliza(m.nombre) === buscado) || null;
}

/** Distancia en línea recta (km) entre dos puntos. */
export function distanciaLineaRecta(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const rad = (grados: number) => (grados * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}
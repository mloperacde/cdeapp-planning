/**
 * ============================================================
 * UTILIDADES CENTRALES DE ROLES
 * Fuente única de verdad para normalización y comprobación de roles.
 *
 * PROBLEMA RESUELTO: Base44 almacena el rol nativo como "Admin" (capital A)
 * pero internamente la app y las entidades usan "admin" (minúscula).
 * Esta utilidad normaliza SIEMPRE antes de comparar.
 * ============================================================
 */

/**
 * Normaliza un valor de rol a minúsculas y sin espacios extra.
 * @param {string|null|undefined} role
 * @returns {string} rol normalizado en minúsculas
 */
export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return '';
  return role.trim().toLowerCase();
}

/**
 * Comprueba si un usuario es administrador.
 * Acepta tanto el rol nativo de Base44 ("Admin" / "admin")
 * como el rol interno de la aplicación.
 * @param {object|null} user  - objeto usuario de base44.auth.me()
 * @returns {boolean}
 */
export function isAdminUser(user) {
  if (!user) return false;
  return normalizeRole(user.role) === 'admin';
}

/**
 * Comprueba si un usuario tiene un rol específico (comparación case-insensitive).
 * @param {object|null} user
 * @param {string} role
 * @returns {boolean}
 */
export function hasRole(user, role) {
  if (!user) return false;
  return normalizeRole(user.role) === normalizeRole(role);
}

/**
 * Lógica de autorización estándar para backend functions.
 * - Si NO hay usuario autenticado (llamada automática del scheduler) → PERMITIR
 * - Si hay usuario autenticado y es admin → PERMITIR
 * - Si hay usuario autenticado y NO es admin → DENEGAR (403)
 *
 * @param {object|null} user  - resultado de base44.auth.me() (puede ser null)
 * @returns {{ allowed: boolean, errorResponse: Response|null }}
 */
export function checkAdminOrScheduled(user) {
  // Llamada automática (scheduler / webhook sin token de usuario)
  if (!user || !user.email) {
    return { allowed: true, errorResponse: null };
  }
  // Llamada manual con usuario autenticado
  if (isAdminUser(user)) {
    return { allowed: true, errorResponse: null };
  }
  return {
    allowed: false,
    errorResponse: Response.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    )
  };
}
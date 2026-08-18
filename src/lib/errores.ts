/**
 * Traduce los errores de Postgres a mensajes que un humano entiende.
 *
 * Las reglas de negocio viven en la base (constraints + RLS). El frontend
 * NO las reimplementa: solo las explica cuando la base las hace valer.
 */

type ErrorLike = { message?: string; code?: string; details?: string } | null | undefined

const PORCONSTRAINT: Record<string, string> = {
  agendado_requiere_anticipo:
    'No se puede agendar la sesión sin anticipo cobrado. Registra el anticipo primero.',
  anticipo_no_excede: 'El anticipo no puede ser mayor que el precio total.',
  mano_requiere_retoque:
    'Un diseño de mano se guarda siempre con retoque incluido: la zona retiene mal la tinta y el retoque tiene que ir en el precio, declarado por adelantado.',
  catalogo_precio_base_check: 'El precio base tiene que ser mayor que cero.',
  trabajos_precio_total_check: 'El precio total tiene que ser mayor que cero.',
  trabajos_anticipo_check: 'El anticipo no puede ser negativo.',
  trabajos_tiempo_diseno_min_check: 'El tiempo de diseño no puede ser negativo.',
  trabajos_tiempo_aplicacion_min_check: 'El tiempo de aplicación no puede ser negativo.',
  contenido_formato_check: 'El formato tiene que ser un número del 1 al 7.',
  contenido_vistas_4h_check: 'Las vistas no pueden ser negativas.',
  contenido_guardados_4h_check: 'Los guardados no pueden ser negativos.',
  ads_conversaciones_check: 'Las conversaciones no pueden ser negativas.',
}

const PORCODIGO: Record<string, string> = {
  '23505': 'Ya existe un registro con ese identificador.',
  '23503': 'Ese registro apunta a algo que no existe (o que ya se borró).',
  PGRST301: 'Tu sesión expiró. Vuelve a entrar.',
}

export function mensajeDeError(error: ErrorLike): string {
  if (!error) return 'Algo salió mal.'
  const texto = `${error.message ?? ''} ${error.details ?? ''}`

  for (const [constraint, mensaje] of Object.entries(PORCONSTRAINT)) {
    if (texto.includes(constraint)) return mensaje
  }

  // RLS rechaza el INSERT/UPDATE sin decir por qué: hay que explicarlo.
  if (
    error.code === '42501' ||
    texto.includes('row-level security') ||
    texto.includes('violates row-level security policy')
  ) {
    return 'Tu rol no tiene permiso de escribir aquí. Si crees que sí debería, pídele al admin que lo revise.'
  }

  if (error.code && PORCODIGO[error.code]) return PORCODIGO[error.code]

  if (texto.includes('Failed to fetch') || texto.includes('NetworkError')) {
    return 'Sin conexión. El cambio no se guardó — vuelve a intentar cuando tengas señal.'
  }

  if (texto.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }

  return error.message || 'Algo salió mal.'
}

/** true si el error viene de que la base bloqueó una regla de negocio, no de un bug. */
export function esReglaDeNegocio(error: ErrorLike): boolean {
  if (!error) return false
  const texto = `${error.message ?? ''} ${error.details ?? ''}`
  return Object.keys(PORCONSTRAINT).some((c) => texto.includes(c))
}

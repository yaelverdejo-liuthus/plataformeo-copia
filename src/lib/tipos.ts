/**
 * Tipos de la base. Espejo de supabase/migrations/0001_schema.sql.
 * Si cambias el schema, regenera con:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/tipos.ts
 */

export type Rol = 'admin' | 'tatuador' | 'contenido'
export type Nivel = '1' | '2' | '3'
export type Autoria = 'propio' | 'referencia' | 'hibrido'
export type Origen = 'tiktok' | 'meta' | 'organico' | 'referido' | 'conocido'
/**
 * Etapas reales de venta. El trazado es una cita del trabajo y el anticipo
 * es un dato de la cita: ninguno de los dos era una etapa del embudo.
 */
export type LeadEstatus = 'nuevo' | 'cotizado' | 'agendado' | 'perdido'
export type TrabajoEstatus =
  | 'trazado_agendado'
  | 'trazado_hecho'
  | 'agendado'
  | 'terminado'
  | 'cancelado'
export type Plataforma = 'tiktok' | 'instagram' | 'facebook'
export type Veredicto = 'sin_datos' | 'escalar' | 'observar' | 'matar'

export type Perfil = {
  id: string
  nombre: string
  rol: Rol
  created_at: string
}

export type Catalogo = {
  id: string
  nombre: string
  nivel: Nivel
  tipografia: string | null
  tamano_cm: string | null
  zona_recomendada: string | null
  precio_base: number
  autoria: Autoria
  retoque_incluido: boolean
  tiempo_diseno_estimado_min: number | null
  publicado: boolean
  imagen_url: string | null
  notas: string | null
  created_at: string
}

export type Lead = {
  id: string
  fecha: string
  nombre: string
  whatsapp: string
  origen: Origen
  que_pidio: string | null
  nivel_estimado: Nivel | null
  estatus: LeadEstatus
  siguiente_accion: string | null
  fecha_seguimiento: string | null

  // ── Etapa "cotizado" ──
  monto_cotizado: number | null
  zona: string | null
  catalogo_id: string | null
  cotizado_en: string | null

  // ── Etapa "agendado" ──
  fecha_trazado: string | null
  fecha_tatuaje: string | null
  hora: string | null
  anticipo: number

  // ── Etapa "perdido" ──
  motivo_perdida: string | null

  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Un movimiento de cita. Quien reagenda seguido es quien se va a caer, y
 * eso solo se ve con el historial completo, no con un contador.
 */
export type Reprogramacion = {
  id: string
  lead_id: string | null
  trabajo_id: string | null
  fecha_anterior: string | null
  hora_anterior: string | null
  fecha_nueva: string
  hora_nueva: string | null
  motivo: string
  created_by: string | null
  created_at: string
}

export type Trabajo = {
  id: string
  lead_id: string | null
  cliente: string
  whatsapp: string
  diseno: string
  catalogo_id: string | null
  nivel: Nivel
  zona: string
  fecha_trazado: string | null
  fecha_tatuaje: string | null
  hora: string | null
  precio_total: number
  /** Lo que dejó para reservar. Es lo que sostiene "sin anticipo no hay cita". */
  anticipo: number
  /** Todo lo cobrado después del anticipo, incluido el pago final. */
  abonos: number
  tiempo_diseno_min: number | null
  tiempo_aplicacion_min: number | null
  estatus: TrabajoEstatus
  origen: Origen
  retoque_pendiente: boolean
  foto_zona_url: string | null
  /**
   * columna generada en Postgres — nunca la calcules en el cliente.
   * precio_total - anticipo - abonos. En cero significa pagado.
   */
  saldo: number
  /** columna generada en Postgres */
  minutos_totales: number
  created_at: string
  updated_at: string
}

export type Contenido = {
  id: string
  fecha: string
  titulo: string
  plataforma: Plataforma
  formato: number
  trabajo_id: string | null
  precio_en_pantalla: boolean
  vistas_4h: number | null
  guardados_4h: number | null
  comentarios: number | null
  promocionado: boolean
  gasto_promocion: number
  created_by: string | null
  created_at: string
}

/** Fila de v_contenido_filtro: contenido + el veredicto del filtro */
export type ContenidoConFiltro = Contenido & {
  pasa_filtro: boolean | null
}

export type Ad = {
  id: string
  fecha: string
  plataforma: Plataforma
  creativo: string
  objetivo: string
  presupuesto: number
  gasto_real: number
  conversaciones: number
  created_at: string
}

/** Fila de v_ads_veredicto: ads + costo y veredicto calculados en la base */
export type AdConVeredicto = Ad & {
  costo_por_conversacion: number | null
  veredicto: Veredicto
}

export type Preferencias = {
  id: string
  mostrar_tutorial: boolean
  tutorial_visto_en: string | null
  updated_at: string
}

export type ConfigFila = {
  clave: string
  valor: number
  descripcion: string | null
}

export type DashboardFila = {
  ingreso_cobrado: number
  costo_insumos: number
  /** Solo `ads.gasto_real`. Lo de contenido va aparte, para que Pauta cuadre. */
  gasto_pauta: number
  /** Suma de `contenido.gasto_promocion`: impulsar videos ya publicados. */
  gasto_promocion_contenido: number
  conversaciones: number
  agendados: number
  terminados: number
  nivel_1: number
  nivel_2: number
  nivel_3: number
  horas_invertidas: number
  min_diseno: number
  min_aplicacion: number
  videos_publicados: number
  vistas_totales: number
  videos_aptos: number
}

type TrabajoEscritura = Omit<Partial<Trabajo>, 'saldo' | 'minutos_totales'>

/**
 * supabase-js exige `Relationships` en cada tabla y vista. Si falta, el
 * cliente resuelve Insert/Update a `never` y todo deja de compilar sin
 * decir por qué.
 */
type Tabla<Fila, Insert = Partial<Fila>, Update = Partial<Fila>> = {
  Row: Fila
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Tabla<Perfil>
      catalogo: Tabla<Catalogo>
      leads: Tabla<Lead>
      trabajos: Tabla<Trabajo, TrabajoEscritura, TrabajoEscritura>
      contenido: Tabla<Contenido>
      ads: Tabla<Ad>
      config: Tabla<ConfigFila>
      preferencias: Tabla<Preferencias>
      reprogramaciones: Tabla<Reprogramacion>
    }
    Views: {
      v_contenido_filtro: { Row: ContenidoConFiltro; Relationships: [] }
      v_ads_veredicto: { Row: AdConVeredicto; Relationships: [] }
      v_dashboard: { Row: DashboardFila; Relationships: [] }
    }
    Functions: { mi_rol: { Args: Record<string, never>; Returns: Rol } }
    Enums: {
      user_role: Rol
      nivel_diseno: Nivel
      autoria_tipo: Autoria
      lead_estatus: LeadEstatus
      origen_tipo: Origen
      trabajo_estatus: TrabajoEstatus
      plataforma_tipo: Plataforma
    }
  }
}

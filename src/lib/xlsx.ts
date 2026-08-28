/**
 * ══ ESCRIBIR UN .XLSX A MANO ══════════════════════════════════════════
 *
 * Un CSV es texto plano: no puede llevar negritas, anchos de columna,
 * encabezado fijo ni formato de fecha. Por eso la exportacion "funcionaba"
 * y aun asi no parecia una tabla. Para eso hace falta un .xlsx de verdad.
 *
 * ── Por que a mano y no con una libreria ─────────────────────────────
 *
 * Es la misma regla que el resto del proyecto: no se anade una
 * dependencia por algo que el stack puede expresar. SheetJS son ~800 kB
 * para escribir una hoja de una tabla plana.
 *
 * Un .xlsx es un ZIP con seis XML dentro. El ZIP va SIN COMPRIMIR
 * (metodo 0, "store"), que es lo que hace viable escribirlo a mano: no
 * hace falta implementar deflate, solo las cabeceras y un CRC32. Los
 * archivos salen mas grandes que comprimidos, y para unas decenas de
 * filas eso no le importa a nadie.
 *
 * ── Que le da aspecto de tabla ───────────────────────────────────────
 *
 *  · Encabezado en negrita, con fondo y una linea inferior.
 *  · Ancho de cada columna calculado con su contenido real.
 *  · Primera fila congelada, para que no se pierda al bajar.
 *  · Autofiltro, que es lo que pone los desplegables en el encabezado.
 *  · Fechas y horas como fecha y hora de verdad, no como texto: se
 *    ordenan y se restan.
 */

// ── CRC32 ────────────────────────────────────────────────────────────
// El ZIP exige el CRC32 de cada archivo. La tabla se calcula una vez.

const TABLA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(datos: Uint8Array<ArrayBuffer>): number {
  let c = 0xffffffff
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ── ZIP sin comprimir ────────────────────────────────────────────────

interface Entrada {
  nombre: string
  datos: Uint8Array<ArrayBuffer>
}

function zip(entradas: Entrada[]): Blob {
  const codificador = new TextEncoder()
  const locales: Uint8Array<ArrayBuffer>[] = []
  const central: Uint8Array<ArrayBuffer>[] = []
  let desplazamiento = 0

  const u16 = (v: number) => [v & 0xff, (v >>> 8) & 0xff]
  const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]

  for (const e of entradas) {
    const nombre = codificador.encode(e.nombre)
    const crc = crc32(e.datos)
    const tam = e.datos.length

    /* Cabecera local: firma, version, flags, metodo 0 (store), hora y
       fecha en cero -a nadie le importa la marca de tiempo aqui-, crc,
       tamano comprimido y sin comprimir (iguales, porque no se comprime),
       y las longitudes de nombre y extra. */
    const cabecera = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04,
      ...u16(20), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0),
      ...u32(crc), ...u32(tam), ...u32(tam),
      ...u16(nombre.length), ...u16(0),
    ])
    locales.push(cabecera, nombre, e.datos)

    central.push(
      new Uint8Array([
        0x50, 0x4b, 0x01, 0x02,
        ...u16(20), ...u16(20), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0),
        ...u32(crc), ...u32(tam), ...u32(tam),
        ...u16(nombre.length), ...u16(0), ...u16(0),
        ...u16(0), ...u16(0), ...u32(0),
        ...u32(desplazamiento),
      ]),
      nombre,
    )

    desplazamiento += cabecera.length + nombre.length + tam
  }

  const tamCentral = central.reduce((s, p) => s + p.length, 0)
  const fin = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06,
    ...u16(0), ...u16(0),
    ...u16(entradas.length), ...u16(entradas.length),
    ...u32(tamCentral), ...u32(desplazamiento),
    ...u16(0),
  ])

  return new Blob([...locales, ...central, fin], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ── Utilidades de hoja ───────────────────────────────────────────────

const xml = (v: string) =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** 0 → A, 25 → Z, 26 → AA. Hace falta en cuanto hay mas de 26 columnas. */
function columna(i: number): string {
  let s = ''
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) {
    s = String.fromCharCode(65 + (n % 26)) + s
  }
  return s
}

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/
const ES_HORA = /^\d{2}:\d{2}(:\d{2})?$/

/*
 * Excel cuenta los dias desde el 30/12/1899. No es un error de calculo
 * heredado sino el sistema de fechas de 1900 con el bug del ano bisiesto
 * de Lotus 1-2-3 incluido; usar el 30 y no el 31 es lo que lo compensa.
 */
const serieFecha = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000
}

/** Una hora es la fraccion del dia que ha transcurrido. */
const serieHora = (hhmm: string) => {
  const [h, m, s = 0] = hhmm.split(':').map(Number)
  return (h * 3600 + m * 60 + s) / 86400
}

/** Indices de `cellXfs` en styles.xml. */
const ESTILO = { normal: 0, encabezado: 1, fecha: 2, hora: 3 } as const

function celda(ref: string, valor: unknown): string {
  if (valor == null || valor === '') return ''

  // Solo los numeros de verdad van como numero. Un WhatsApp es una cadena
  // de digitos, no una cantidad: convertirlo lo dejaria en notacion
  // cientifica y le comeria un cero a la izquierda.
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"><v>${valor}</v></c>`
  }

  const s = String(valor)
  if (ES_FECHA.test(s)) {
    return `<c r="${ref}" s="${ESTILO.fecha}"><v>${serieFecha(s)}</v></c>`
  }
  if (ES_HORA.test(s)) {
    return `<c r="${ref}" s="${ESTILO.hora}"><v>${serieHora(s)}</v></c>`
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(s)}</t></is></c>`
}

// ── Las seis partes de un .xlsx ──────────────────────────────────────

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

/*
 * Los indices de `fills` 0 y 1 son obligatorios y en ese orden: Excel
 * espera "none" y "gray125" ahi, y si no estan, ignora TODOS los rellenos
 * y el encabezado sale sin fondo. Es el fallo clasico al escribir un
 * styles.xml a mano.
 */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>
<numFmt numFmtId="165" formatCode="hh:mm"/>
</numFmts>
<fonts count="2">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF2E1A5C"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEDE9FE"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFB9A9E8"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

const WORKBOOK = (hoja: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xml(hoja)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

/**
 * Descarga las filas como .xlsx con aspecto de tabla.
 *
 * Los encabezados salen de las claves del primer objeto, igual que antes.
 */
export function descargarXLSX(nombre: string, filas: Record<string, unknown>[]) {
  if (filas.length === 0) return

  const columnas = Object.keys(filas[0])
  const ultima = columna(columnas.length - 1)
  const total = filas.length + 1

  /* El ancho se mide en "caracteres" aproximados, no en pixeles. Se toma
     el contenido mas largo de la columna con un poco de holgura, acotado
     para que una nota larga no genere una columna de medio metro. */
  const anchos = columnas.map((c, i) => {
    const largo = Math.max(
      columnas[i].length,
      ...filas.map((f) => (f[c] == null ? 0 : String(f[c]).length)),
    )
    return Math.min(Math.max(largo + 3, 10), 42)
  })

  const encabezado =
    `<row r="1" ht="20" customHeight="1">` +
    columnas
      .map(
        (c, i) =>
          `<c r="${columna(i)}1" s="${ESTILO.encabezado}" t="inlineStr"><is><t>${xml(c)}</t></is></c>`,
      )
      .join('') +
    `</row>`

  const cuerpo = filas
    .map(
      (f, r) =>
        `<row r="${r + 2}">` +
        columnas.map((c, i) => celda(`${columna(i)}${r + 2}`, f[c])).join('') +
        `</row>`,
    )
    .join('')

  /* El orden de los elementos dentro de <worksheet> lo fija el esquema:
     dimension, sheetViews, cols, sheetData y autoFilter DESPUES de los
     datos. Cambiarlo hace que Excel declare el archivo danado. */
  const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${ultima}${total}"/>
<sheetViews><sheetView tabSelected="1" workbookViewId="0">
<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${anchos.map((a, i) => `<col min="${i + 1}" max="${i + 1}" width="${a}" customWidth="1"/>`).join('')}</cols>
<sheetData>${encabezado}${cuerpo}</sheetData>
<autoFilter ref="A1:${ultima}${total}"/>
</worksheet>`

  const cod = new TextEncoder()
  const blob = zip([
    { nombre: '[Content_Types].xml', datos: cod.encode(CONTENT_TYPES) },
    { nombre: '_rels/.rels', datos: cod.encode(RELS) },
    { nombre: 'xl/workbook.xml', datos: cod.encode(WORKBOOK(nombre)) },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: cod.encode(WORKBOOK_RELS) },
    { nombre: 'xl/styles.xml', datos: cod.encode(STYLES) },
    { nombre: 'xl/worksheets/sheet1.xml', datos: cod.encode(hoja) },
  ])

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

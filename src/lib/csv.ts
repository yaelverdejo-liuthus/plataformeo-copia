/**
 * Exportar a CSV que Excel abra bien SIN preguntar nada.
 *
 * Dos cosas hacen falta y las dos son especificas de Excel:
 *
 *  1. `sep=;` en la primera linea. Excel no detecta el separador leyendo
 *     el archivo: usa el "separador de listas" de la configuracion
 *     regional de Windows. En un equipo configurado en ingles ese
 *     separador es la coma, asi que un archivo con `;` se abre entero en
 *     la columna A — que es justo lo que pasaba. Esta linea se lo dice
 *     explicitamente y funciona sea cual sea el idioma del sistema.
 *
 *  2. El BOM. Sin el, Excel abre los acentos como caracteres raros.
 *
 * Se mantiene `;` y no `,` porque los datos llevan comas dentro (una zona
 * como "Anaconda, Espalda"), y con `sep=;` el idioma del sistema deja de
 * importar.
 */

function escapar(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function descargarCSV(nombre: string, filas: Record<string, unknown>[]) {
  if (filas.length === 0) return

  const columnas = Object.keys(filas[0])
  const lineas = [
    // Tiene que ir en la PRIMERA linea, antes de los encabezados.
    'sep=;',
    columnas.join(';'),
    ...filas.map((f) => columnas.map((c) => escapar(f[c])).join(';')),
  ]

  // BOM: sin esto Excel abre los acentos como caracteres raros.
  const blob = new Blob(['﻿' + lineas.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

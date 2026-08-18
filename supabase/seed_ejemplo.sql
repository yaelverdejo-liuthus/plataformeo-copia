-- ═══════════════════════════════════════════════════════════════════════
--  Datos de ejemplo del Excel — SOLO para validar que los cálculos cuadran.
--
--  Son exactamente las filas azules de Tablero_Tatuajes_v2.xlsx. Sirven para
--  comprobar contra el Excel que el filtro de contenido, el veredicto de ads
--  y el dashboard dan lo mismo (criterio de aceptación §10 de la spec).
--
--  NO correr esto en producción. Para borrarlos:
--     delete from contenido where titulo like 'Cuanto cuesta%';
--     delete from ads where creativo like 'Creativo A%';
--     delete from trabajos where id = 'T-001';
--     delete from leads where nombre like 'Ejemplo:%';
-- ═══════════════════════════════════════════════════════════════════════

insert into leads (fecha, nombre, whatsapp, origen, que_pidio, nivel_estimado,
                   estatus, siguiente_accion, fecha_seguimiento)
values ('2026-08-20', 'Ejemplo: Luis M.', '3149876543', 'meta',
        'Nombre de su hija, antebrazo', '2', 'cotizado',
        'Mandar 2 horarios + pedir foto de zona', '2026-08-21');

insert into trabajos (id, cliente, whatsapp, diseno, catalogo_id, nivel, zona,
                      fecha_trazado, fecha_tatuaje, hora, precio_total, anticipo,
                      tiempo_diseno_min, tiempo_aplicacion_min, estatus, origen,
                      retoque_pendiente)
values ('T-001', 'Ejemplo: Ana López', '3141234567', 'Lettering ''Emilia''',
        'N2-01', '2', 'Antebrazo', '2026-08-20', '2026-08-22', '16:00',
        1500, 200, 60, 90, 'agendado', 'tiktok', false);

insert into contenido (fecha, titulo, plataforma, formato, trabajo_id,
                       precio_en_pantalla, vistas_4h, guardados_4h, comentarios,
                       promocionado, gasto_promocion)
values ('2026-08-20', 'Cuanto cuesta el nombre de tu hija', 'tiktok', 1, 'T-001',
        true, 1400, 32, 9, true, 150);

-- OJO: el Excel pone "Meta" como plataforma del anuncio, pero el enum
-- plataforma_tipo de la spec solo admite tiktok/instagram/facebook.
-- Meta se captura como 'facebook' (o 'instagram' según dónde corra).
insert into ads (fecha, plataforma, creativo, objetivo, presupuesto,
                 gasto_real, conversaciones)
values ('2026-08-20', 'facebook', 'Creativo A - gotico mano',
        'Mensajes a WhatsApp', 120, 118, 4);

-- ── Comprobación contra el Excel ──────────────────────────────────────
--
--   select pasa_filtro from v_contenido_filtro;
--     → true   (1400 >= 800 y 32 >= 15)          Excel: "SI"
--
--   select costo_por_conversacion, veredicto from v_ads_veredicto;
--     → 29.5, 'escalar'  (118/4 = 29.5 <= 40)    Excel: 29.5, "ESCALAR"
--
--   select ingreso_cobrado, conversaciones, agendados, terminados
--   from v_dashboard;
--     → 200, 1, 1, 0
--       El trabajo está 'agendado', no 'terminado', así que aporta solo el
--       anticipo de 200. Igual que la fórmula B5 del TABLERO.
--
--   OJO con "tarifa real por hora": el Excel la calcula sobre TODOS los
--   trabajos (1500 / 2.5 h = 600). La spec solo cuenta los terminados, y
--   aquí no hay ninguno, así que la app muestra "—". No es un bug: es la
--   spec siendo más estricta que el Sheet.

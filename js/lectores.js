/* Lectores de los archivos de Excel de Conagro.
 * Cada lector devuelve {tipo, titulo, resumen: [textos], avisos: [textos], errores: [textos], datos}.
 * No dependen de posiciones fijas: buscan pestañas por nombre, columnas por encabezado
 * y secciones por título. Funciona en el navegador (window.Lectores) y en Node (pruebas).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.Lectores = factory(root.XLSX, root.fflate);
})(typeof self !== 'undefined' ? self : this, function (XLSX, fflate) {
  'use strict';
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const fmt = (n) => Number(n).toLocaleString('es-MX', {maximumFractionDigits: 2});

  // ---- utilidades ----
  const CP1252 = {'€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E,
    '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F};
  // repara textos como "MUÃ‘OZ" (UTF-8 leído como Windows-1252)
  function arreglaAcentos(s) {
    if (typeof s !== 'string' || !/[ÃÂ]/.test(s)) return s;
    try {
      const bytes = [...s].map(ch => { const c = ch.codePointAt(0); if (c <= 0xFF) return c; if (ch in CP1252) return CP1252[ch]; throw 0; });
      return new TextDecoder('utf-8', {fatal: true}).decode(new Uint8Array(bytes));
    } catch (e) { return s; }
  }
  const txt = (v) => v == null ? null : arreglaAcentos(String(v).trim());
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string') { const s = v.replace(/[$,%\s]/g, ''); if (s === '' || isNaN(+s)) return null; return +s; }
    return null;
  }
  function fecha(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null; }
    if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
    const m = String(v).match(/(\d{4})-(\d{2})-(\d{2})/) || String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return null;
    return m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const filas = (ws) => XLSX.utils.sheet_to_json(ws, {header: 1, raw: true, defval: null, blankrows: true});
  const hoja = (wb, nombre) => { const k = wb.SheetNames.find(n => norm(n) === norm(nombre)); return k ? wb.Sheets[k] : null; };
  function indiceColumnas(hdr, requeridas, opcionales = []) {
    const ix = {}, faltan = [];
    const h = hdr.map(norm);
    for (const c of [...requeridas, ...opcionales]) { const i = h.indexOf(norm(c)); if (i >= 0) ix[c] = i; else if (requeridas.includes(c)) faltan.push(c); }
    return {ix, faltan};
  }
  const resultado = (tipo, titulo) => ({tipo, titulo, resumen: [], avisos: [], errores: [], datos: null});

  // ---- detección del tipo de archivo por sus pestañas ----
  function detectar(nombres, archivo) {
    const n = nombres.map(norm);
    if (n.includes('datos_macro_ventas')) return 'ventas';
    if (n.includes('trabajado')) return 'resultados';
    if (n.includes('resumen ejecutivo') && n.includes('alertas de reorden')) return 'inventario';
    if (nombres.some(x => /^\s*al\s+\d{1,2}-\d{1,2}-\d{2,4}\s*$/i.test(x))) return 'finanzas';
    if (n.includes('base de datos')) return 'cartera';
    return null;
  }
  // qué pestañas hay que leer de cada tipo (los archivos grandes no se leen completos)
  const HOJAS = {ventas: ['datos_macro_ventas'], resultados: ['Trabajado'], cartera: ['BASE DE DATOS'],
    inventario: ['Resumen ejecutivo', 'Alertas de reorden', 'Detalle por almacen', 'CEDIS parados'], finanzas: null};
  HOJAS.cartera.push('DASHBOARD SUCURSALES');

  // ================= 1. Cartera de clientes =================
  const BUCKETS = ['Por vencer / al corriente', '0 a 30 dias', '30 a 60 dias', '60 a 90 dias', '3 a 6 meses', 'Mas de 6 meses'];
  function leerCartera(wb, archivo) {
    const r = resultado('cartera', 'Cartera de clientes');
    const ws = hoja(wb, 'BASE DE DATOS');
    if (!ws) { r.errores.push('No encontré la pestaña "BASE DE DATOS".'); return r; }
    const F = filas(ws);
    const hi = F.findIndex(row => row && row.some(c => norm(c) === 'saldo factura'));
    if (hi < 0) { r.errores.push('No encontré el encabezado "Saldo factura" en BASE DE DATOS.'); return r; }
    const COLS = ['Fecha de informe', 'Empresa', 'Folio', 'Sucursal', 'Fecha factura', 'Cve_cte', 'Nombre cliente', 'Saldo factura', 'Vencimiento'];
    const {ix, faltan} = indiceColumnas(F[hi], COLS, ['Limite de credito', 'Fecha de vencimiento', 'Total factura']);
    if (faltan.length) { r.errores.push('Faltan columnas en BASE DE DATOS: ' + faltan.join(', ')); return r; }
    const BN = BUCKETS.map(norm);
    const out = [], desconocidos = new Set(); let excl = {consagri: 0, campo: 0, sinSuc: 0, internas: 0};
    for (const row of F.slice(hi + 1)) {
      if (!row || row[ix['Fecha de informe']] == null) continue;
      const empresa = txt(row[ix['Empresa']]), cliente = txt(row[ix['Nombre cliente']]) || '';
      let suc = txt(row[ix['Sucursal']]);
      if (!suc || suc === 'NA') { excl.sinSuc++; continue; }
      if (empresa === 'CONSAGRI') { excl.consagri++; continue; }
      if (/CAMPO ACTIVACION/i.test(norm(cliente))) { excl.campo++; continue; }
      if (/^SUCURSAL /i.test(cliente)) { excl.internas++; continue; }
      const b = BN.indexOf(norm(row[ix['Vencimiento']]));
      if (b < 0) { desconocidos.add(String(row[ix['Vencimiento']])); continue; }
      out.push({fecha_informe: fecha(row[ix['Fecha de informe']]), empresa, folio: txt(row[ix['Folio']]), sucursal: suc,
        fecha_factura: fecha(row[ix['Fecha factura']]), cve: num(row[ix['Cve_cte']]), cliente, saldo: num(row[ix['Saldo factura']]) ?? 0, bucket: b,
        fecha_venc: ix['Fecha de vencimiento'] != null ? fecha(row[ix['Fecha de vencimiento']]) : null,
        total: ix['Total factura'] != null ? num(row[ix['Total factura']]) : null, limite: ix['Limite de credito'] != null ? num(row[ix['Limite de credito']]) : null});
    }
    if (desconocidos.size) r.errores.push('Rangos de vencimiento que no reconozco: ' + [...desconocidos].join(', ') + '. Deben ser: ' + BUCKETS.join(' · '));
    const cortes = [...new Set(out.map(o => o.fecha_informe))].sort();
    const ult = cortes[cortes.length - 1], enUlt = out.filter(o => o.fecha_informe === ult);
    r.resumen.push(`${fmt(out.length)} facturas en ${cortes.length} cortes (${cortes[0]} a ${ult}).`);
    r.resumen.push(`Último corte: ${fmt(enUlt.length)} facturas, saldo $${fmt(enUlt.reduce((s, o) => s + o.saldo, 0))}.`);
    r.resumen.push(`Excluidas según tus reglas: ${excl.consagri} de CONSAGRI, ${excl.campo} de Campo Activación, ${excl.internas} de cuentas "SUCURSAL", ${excl.sinSuc} sin sucursal.`);
    r.sucursales = [...new Set(out.map(o => o.sucursal))];
    // marcas de "incobrable" de la pestaña DASHBOARD SUCURSALES (columna junto al total): solo se usan como estatus inicial
    const dash = hoja(wb, 'DASHBOARD SUCURSALES'); r.estatusInicial = [];
    if (dash) for (const row of filas(dash)) { if (!row || typeof row[0] !== 'string') continue;
      const nota = row.slice(1).find(c => typeof c === 'string' && /incobrable/i.test(c)); if (nota) r.estatusInicial.push({cliente: arreglaAcentos(row[0].trim()), estatus: 'Incobrable'}); }
    if (r.estatusInicial.length) r.resumen.push(`${r.estatusInicial.length} clientes marcados como incobrables en DASHBOARD SUCURSALES; se cargan como estatus inicial si aún no tienen uno en la app.`);
    r.datos = out;
    return r;
  }

  // ================= 2. Ventas (datos_macro_ventas) =================
  function leerVentas(wb, archivo) {
    const r = resultado('ventas', 'Ventas, metas y gastos');
    const ws = hoja(wb, 'datos_macro_ventas');
    if (!ws) { r.errores.push('No encontré la pestaña "datos_macro_ventas".'); return r; }
    const F = filas(ws);
    const hi = F.findIndex(row => row && row.some(c => norm(c) === 'venta_total'));
    if (hi < 0) { r.errores.push('No encontré el encabezado "Venta_total".'); return r; }
    const {ix, faltan} = indiceColumnas(F[hi], ['Fecha', 'sucursal', 'Venta_total', 'Meta'], ['Gasto Operativo', 'Gasto por Comisiones', 'Gasto total', 'Objetivo gasto']);
    if (faltan.length) { r.errores.push('Faltan columnas en datos_macro_ventas: ' + faltan.join(', ')); return r; }
    const get = (row, c) => ix[c] != null ? num(row[ix[c]]) : null;
    const out = []; let ferre = 0;
    for (const row of F.slice(hi + 1)) {
      if (!row || row[ix['Fecha']] == null || !row[ix['sucursal']]) continue;
      const f = fecha(row[ix['Fecha']]); if (!f) continue;
      const s = String(row[ix['sucursal']]).trim();
      if (/^ferredel/i.test(s)) { ferre++; continue; }
      const v = get(row, 'Venta_total'), m = get(row, 'Meta');
      if (v == null && m == null) continue;
      out.push({anio: +f.slice(0, 4), mes: +f.slice(5, 7), suc_clave: s, venta: v, meta: m, gasto_op: get(row, 'Gasto Operativo'),
        comisiones: get(row, 'Gasto por Comisiones'), gasto_total: get(row, 'Gasto total'), objetivo: get(row, 'Objetivo gasto')});
    }
    const conVenta = out.filter(o => o.venta);
    const ult = conVenta.reduce((a, o) => Math.max(a, o.anio * 100 + o.mes), 0);
    const ua = Math.floor(ult / 100), um = ult % 100;
    const vUlt = conVenta.filter(o => o.anio === ua && o.mes === um).reduce((s, o) => s + o.venta, 0);
    r.resumen.push(`${fmt(out.length)} registros de ${Math.min(...out.map(o => o.anio))} a ${Math.max(...out.map(o => o.anio))}, ${new Set(out.map(o => o.suc_clave)).size} sucursales.`);
    r.resumen.push(`Último mes con venta: ${MESES[um - 1]} ${ua}, venta total $${fmt(vUlt)}.`);
    if (ferre) r.resumen.push(`Excluidos ${ferre} registros de Ferredel (CONSAGRI).`);
    r.sucursales = [...new Set(out.map(o => o.suc_clave))];
    r.datos = out;
    return r;
  }

  // ================= 3. Estado de situación financiera =================
  function leerFinanzas(wb, archivo) {
    const r = resultado('finanzas', 'Estado de situación financiera');
    const secL = (l) => { const n = norm(l); if (n.includes('total activos')) return 'total_activos'; if (l.startsWith('📦') && n.includes('inventario')) return 'inventario';
      if (l.startsWith('🏦') && n.includes('bancos')) return 'bancos'; if (l.startsWith('👥') && n.includes('clientes')) return 'clientes'; return null; };
    const secR = (l) => { const n = norm(l); if (n.includes('capital contable')) return 'capital'; if (n.includes('total pasivos')) return 'total_pasivos';
      if (l.startsWith('🧾')) return 'proveedores'; if (l.startsWith('📉')) return 'deuda'; return null; };
    const cortes = [];
    for (const name of wb.SheetNames) {
      const m = name.match(/^\s*Al\s+(\d{1,2})-(\d{1,2})-(\d{2,4})\s*$/i); if (!m) continue;
      let y = +m[3]; if (y < 100) y += 2000;
      const c = {fecha: `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, hoja: name.trim(), tc: null, tot: {}, det: {inventario: [], bancos: [], clientes: [], proveedores: [], deuda: []}};
      let curL = null, curR = null;
      for (const row of filas(wb.Sheets[name]).slice(0, 60)) {
        const [a, b, cc, dd] = [row[0], row[1], row[2], row[3]];
        if (typeof a === 'number' && typeof b === 'string' && norm(b).includes('tipo de cambio')) { c.tc = a; continue; }
        if (typeof a === 'string' && typeof b === 'number') { const l = a.trim(), s = secL(l);
          if (s) { c.tot[s] = b; curL = s === 'total_activos' ? null : s; } else if (curL) c.det[curL].push([l, b]); }
        if (typeof cc === 'string' && typeof dd === 'number') { const l = cc.trim(), s = secR(l);
          if (s) { c.tot[s] = dd; curR = (s === 'proveedores' || s === 'deuda') ? s : null; } else if (curR) c.det[curR].push([l, dd]); }
      }
      const t = c.tot, falt = ['inventario', 'bancos', 'clientes', 'total_activos', 'total_pasivos', 'capital'].filter(k => !(k in t));
      if (falt.length) { r.avisos.push(`${name.trim()}: no encontré ${falt.join(', ')}; la omití.`); continue; }
      if (Math.abs(t.inventario + t.bancos + t.clientes - t.total_activos) > 1) r.avisos.push(`${name.trim()}: inventario + bancos + clientes no suma el total de activos.`);
      if (Math.abs(t.total_activos - t.total_pasivos - t.capital) > 1) r.avisos.push(`${name.trim()}: activos ≠ pasivos + capital contable.`);
      for (const k of ['inventario', 'bancos', 'proveedores', 'deuda']) { const s = c.det[k].reduce((a, [, v]) => a + v, 0);
        if (k in t && c.det[k].length && Math.abs(s - t[k]) > 1) r.avisos.push(`${name.trim()}: el detalle de ${k} suma $${fmt(s)} y el total dice $${fmt(t[k])}.`); }
      c.det.clientes = c.det.clientes.map(([n, v]) => [n, /incobrable/i.test(n) ? Math.abs(v) : v]);
      cortes.push(c);
    }
    if (!cortes.length) { r.errores.push('No encontré pestañas con el nombre "Al dd-mm-aa".'); return r; }
    cortes.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const u = cortes[cortes.length - 1];
    r.resumen.push(`${cortes.length} cortes, del ${cortes[0].fecha} al ${u.fecha}.`);
    r.resumen.push(`Último corte: activos $${fmt(u.tot.total_activos)}, pasivos $${fmt(u.tot.total_pasivos)}, capital $${fmt(u.tot.capital)}.`);
    if (!r.avisos.length) r.resumen.push('✓ Todos los cortes cuadran.');
    r.datos = {cortes, avisos: r.avisos};
    return r;
  }

  // ================= 4. Estado de resultados (pestaña Trabajado) =================
  // La jerarquía sale de la sangría de la columna A y los renglones de resultado de las negritas;
  // como SheetJS no lee esos formatos, se leen directo del XML del archivo.
  function estilosColumnaA(buf, nombreHoja) {
    const files = fflate.unzipSync(new Uint8Array(buf), {filter: (f) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|styles\.xml|worksheets\/sheet\d+\.xml)$/.test(f.name)});
    const dec = (k) => files[k] ? fflate.strFromU8(files[k]) : '';
    const wbx = dec('xl/workbook.xml'), rels = dec('xl/_rels/workbook.xml.rels'), sty = dec('xl/styles.xml');
    const esc = nombreHoja.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sm = wbx.match(new RegExp(`<sheet[^>]*name="${esc}"[^>]*r:id="([^"]+)"`)) || wbx.match(new RegExp(`<sheet[^>]*r:id="([^"]+)"[^>]*name="${esc}"`));
    if (!sm) return null;
    const rm = rels.match(new RegExp(`<Relationship[^>]*Id="${sm[1]}"[^>]*Target="([^"]+)"`)) || rels.match(new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${sm[1]}"`));
    if (!rm) return null;
    const path = 'xl/' + rm[1].replace(/^\/?xl\//, '').replace(/^\//, '');
    const shx = dec(path);
    const fontsXml = (sty.match(/<fonts[^>]*>([\s\S]*?)<\/fonts>/) || [, ''])[1];
    const bold = [...fontsXml.matchAll(/<font>([\s\S]*?)<\/font>|<font\/>|<font [^>]*>([\s\S]*?)<\/font>/g)].map(m => /<b\/>|<b val="(1|true)"\/>/.test(m[0]));
    const xfsXml = (sty.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/) || [, ''])[1];
    const xfs = [...xfsXml.matchAll(/<xf\b([^>]*?)(\/>|>([\s\S]*?)<\/xf>)/g)].map(m => ({font: +((m[1].match(/fontId="(\d+)"/) || [, 0])[1]), indent: +(((m[3] || '').match(/indent="(\d+)"/) || [, 0])[1])}));
    const out = {};
    for (const m of shx.matchAll(/<c r="A(\d+)"([^>]*?)(\/>|>)/g)) { const s = +((m[2].match(/\bs="(\d+)"/) || [, 0])[1]); const x = xfs[s] || {font: 0, indent: 0}; out[+m[1]] = {indent: x.indent, bold: !!bold[x.font]}; }
    return out;
  }
  function leerResultados(wb, archivo, buf) {
    const r = resultado('resultados', 'Estado de resultados');
    const name = wb.SheetNames.find(n => norm(n) === 'trabajado');
    if (!name) { r.errores.push('No encontré la pestaña "Trabajado".'); return r; }
    const F = filas(wb.Sheets[name]);
    let anio = null;
    for (const row of F.slice(0, 4)) for (const c of row || []) { const m = typeof c === 'string' && c.match(/(20\d\d)/); if (m) anio = +m[1]; }
    const nombreArch = String(archivo || '').match(/(20\d\d)/);
    if (!anio && nombreArch) anio = +nombreArch[1];
    if (!anio) { r.errores.push('No encontré el año (debe venir en el título o en el nombre del archivo).'); return r; }
    const hi = F.findIndex(row => row && norm(row[0]) === 'mes');
    if (hi < 0) { r.errores.push('No encontré la fila "Mes" con los nombres de los meses.'); return r; }
    const cols = {};
    F[hi].forEach((c, i) => { const m = MESES.indexOf(norm(c)); if (i > 0 && m >= 0 && !(m + 1 in cols)) cols[m + 1] = i; });
    if (!Object.keys(cols).length) { r.errores.push('La fila "Mes" no tiene nombres de meses.'); return r; }
    const est = estilosColumnaA(buf, name) || {};
    if (!Object.keys(est).length) r.avisos.push('No pude leer la sangría de la columna A; todos los conceptos quedarán al mismo nivel.');
    const lineas = [];
    F.slice(hi + 2).forEach((row, k) => {
      const a = row && row[0]; if (typeof a !== 'string' || !a.trim()) return;
      const fila = hi + 2 + k + 1; const e = est[fila] || {indent: 0, bold: false};
      const v = []; for (let m = 1; m <= 12; m++) { const x = cols[m] != null ? row[cols[m]] : null; v.push(typeof x === 'number' ? Math.round(x * 100) / 100 : null); }
      lineas.push({n: a.trim(), nivel: e.indent, res: e.bold, v});
    });
    // cada renglón con detalle debe ser la suma de su detalle
    lineas.forEach((l, i) => {
      if (l.res) return; const hijos = [];
      for (const h of lineas.slice(i + 1)) { if (h.nivel <= l.nivel) break; if (h.nivel === l.nivel + 1) hijos.push(h); }
      if (!hijos.length) return;
      for (let m = 0; m < 12; m++) { if (l.v[m] == null) continue; const s = hijos.reduce((a, h) => a + (h.v[m] || 0), 0);
        if (Math.abs(s - l.v[m]) > 1) r.avisos.push(`${MESES[m]}: "${l.n}" dice $${fmt(l.v[m])} y su detalle suma $${fmt(s)}.`); }
    });
    const ventas = lineas.find(l => norm(l.n).startsWith('ventas'));
    if (!ventas) { r.errores.push('No encontré el renglón "Ventas netas".'); return r; }
    for (const k of ['utilidad bruta', 'utilidad de operacion', 'utilidad neta', 'costo de ventas'])
      if (!lineas.some(l => norm(l.n).startsWith(k))) r.errores.push(`No encontré el renglón "${k}".`);
    const meses = []; for (let m = 1; m <= 12; m++) if (ventas.v[m - 1] != null) meses.push(m);
    r.resumen.push(`Año ${anio}: ${lineas.length} conceptos, meses con ventas: ${meses.map(m => MESES[m - 1].slice(0, 3)).join(', ') || 'ninguno'}.`);
    if (meses.length) { const un = lineas.find(l => norm(l.n).startsWith('utilidad neta')); const s = (l) => meses.reduce((a, m) => a + (l.v[m - 1] || 0), 0);
      if (un) r.resumen.push(`Acumulado: ventas $${fmt(s(ventas))}, utilidad neta $${fmt(s(un))}.`); }
    if (!r.avisos.length) r.resumen.push('✓ Cada renglón coincide con la suma de su detalle.');
    r.datos = {anio, meses, lineas, avisos: r.avisos};
    return r;
  }

  // ================= 5. Análisis de inventario =================
  function tabla(ws, primera, alFinal) {
    const F = filas(ws); const hi = F.findIndex(row => row && norm(row[0]) === norm(primera));
    if (hi < 0) return null;
    const h = F[hi].map(x => x == null ? '' : String(x).trim()); const out = [];
    for (const row of F.slice(hi + 1)) {
      if (!row || row[0] == null || (typeof row[0] === 'string' && row[0].trim().startsWith('>>'))) { if (alFinal && (!row || row.every(x => x == null))) break; continue; }
      if (row[1] == null) { if (alFinal) break; continue; }
      const o = {}; h.forEach((k, i) => { if (k) o[k] = row[i]; }); out.push(o);
    }
    return out;
  }
  function leerInventario(wb, archivo) {
    const r = resultado('inventario', 'Análisis de inventario');
    const m = String(archivo || '').match(/(20\d\d)(\d\d)(\d\d)/);
    if (!m) { r.errores.push('El nombre del archivo debe llevar la fecha como AAAAMMDD (por ejemplo 20261028_inventario_conagro.xlsx).'); return r; }
    const f = `${m[1]}-${m[2]}-${m[3]}`;
    const need = ['Resumen ejecutivo', 'Alertas de reorden', 'Detalle por almacen', 'CEDIS parados'];
    const falt = need.filter(n => !hoja(wb, n)); if (falt.length) { r.errores.push('Faltan pestañas: ' + falt.join(', ')); return r; }
    const rs = filas(hoja(wb, 'Resumen ejecutivo'));
    const ki = rs.findIndex(row => row && norm(row[0]) === 'valor total inventario');
    const kpis = {}; if (ki >= 0) rs[ki].forEach((h, i) => { if (h) kpis[String(h).trim()] = num(rs[ki + 1][i]); });
    const cl = tabla(hoja(wb, 'Resumen ejecutivo'), 'Clasificacion', true) || [];
    const clasif = cl.filter(x => x.Criterio).map(x => [x.Clasificacion, x.Criterio, num(x.SKUs), num(x['Valor inventario']), x['Desc. liquidacion']]);
    const tl = tabla(hoja(wb, 'Resumen ejecutivo'), 'Linea', true) || [];
    const top = tl.map(x => [x.Linea, num(x['SKUs muertos']), num(x['SKUs criticos']), num(x['SKUs lentos']), num(x['Valor problematico'])]);
    const ft = (v) => v == null ? null : (typeof v === 'number' ? fecha(v) : String(v));
    const al = (tabla(hoja(wb, 'Alertas de reorden'), 'Linea') || []).map(x => ({linea: x.Linea, clave: x.Clave, descripcion: txt(x.Descripcion), existencia: num(x['Existencia actual']),
      ventas_mes: num(x['Ventas/mes']), cobertura: num(x['Meses cobertura']), rop: num(x['Punto reorden (ROP)']), eoq: num(x['EOQ sugerido']), urgencia: x.Urgencia,
      precio: num(x['Precio Lista 1']), almacenes: String(x.Almacenes || '').split(',').map(a => a.trim()).filter(Boolean)}));
    const de = (tabla(hoja(wb, 'Detalle por almacen'), 'Almacen') || []).map(x => ({almacen: x.Almacen, linea: x.Linea, clave: x.Clave, descripcion: txt(x.Descripcion), clasif: x.Clasificacion,
      existencia: num(x.Existencia), costo: num(x['Costo unit.']), valor: num(x['Valor inventario']), cobertura: num(x['Meses cobertura']), ultima_venta: ft(x['Ultima venta']),
      precio: num(x['Precio Lista 1']), precio_liq: num(x['Precio liquidacion'])}));
    const ce = (tabla(hoja(wb, 'CEDIS parados'), 'CEDIS') || []).map(x => ({cedis: x.CEDIS, linea: x.Linea, clave: x.Clave, descripcion: txt(x.Descripcion), existencia: num(x.Existencia),
      valor: num(x['Valor inventario']), dias: num(x['Dias sin traspaso']), ultimo_traspaso: ft(x['Ultimo traspaso']), destino: x['Destino sugerido'], precio: num(x['Precio Lista 1'])}));
    if (!clasif.length) r.avisos.push('No encontré la tabla de clasificación en el resumen ejecutivo.');
    const sumCl = clasif.reduce((s, c) => s + (c[3] || 0), 0);
    if (kpis['Valor total inventario'] && Math.abs(sumCl - kpis['Valor total inventario']) > 5) r.avisos.push(`La clasificación suma $${fmt(sumCl)} y el valor total dice $${fmt(kpis['Valor total inventario'])}.`);
    r.resumen.push(`Informe del ${f}: valor total $${fmt(kpis['Valor total inventario'] || sumCl)}, ${kpis['% parado'] ?? '—'}% parado.`);
    r.resumen.push(`${al.length} alertas de reorden, ${de.length} renglones de detalle por almacén, ${ce.length} productos parados en CEDIS.`);
    r.datos = {fecha: f, resumen: {kpis, clasif, top}, alertas: al, detalle: de, cedis: ce};
    return r;
  }

  // ---- punto de entrada: recibe ArrayBuffer y nombre de archivo ----
  function leer(buf, archivo) {
    let tipo;
    try { tipo = detectar(XLSX.read(buf, {type: 'array', bookSheets: true}).SheetNames, archivo); }
    catch (e) { const r = resultado(null, archivo); r.errores.push('No pude abrir el archivo como Excel: ' + e.message); return r; }
    if (!tipo) { const r = resultado(null, archivo); r.errores.push('No reconozco este archivo: no tiene ninguna de las pestañas esperadas (BASE DE DATOS, datos_macro_ventas, Al dd-mm-aa, Trabajado o Resumen ejecutivo).'); return r; }
    const opts = {type: 'array', cellDates: false, cellFormula: false, cellHTML: false, cellText: false};
    if (HOJAS[tipo]) opts.sheets = HOJAS[tipo];
    const wb = XLSX.read(buf, opts);
    const fn = {cartera: leerCartera, ventas: leerVentas, finanzas: leerFinanzas, resultados: leerResultados, inventario: leerInventario}[tipo];
    const r = fn(wb, archivo, buf); r.archivo = archivo; return r;
  }
  return {leer, detectar, arreglaAcentos, BUCKETS};
});

/* Tableros Conagro: sesión, carga de datos desde Supabase y páginas de administración. */
(function () {
  'use strict';
  const esRecuperacion = /type=recovery/.test(location.hash);
  const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
  const $ = (s) => document.querySelector(s);
  const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k.startsWith('aria')) e.setAttribute('aria-' + k.slice(4).toLowerCase(), v); else e[k] = v; } kids.forEach(k => e.append(k)); return e; };
  const MODS_JEFE = ['resumen', 'ventas', 'cartera', 'resultados', 'finanzas', 'inventarios', 'carga', 'usuarios'];
  const MODS_VEND = ['meta', 'cartera', 'productos'];
  const TIPO_NOM = {cartera: 'Cartera de clientes', ventas: 'Ventas, metas y gastos', finanzas: 'Situación financiera', resultados: 'Estado de resultados', inventario: 'Análisis de inventario'};
  let SES = null, PERFIL = null, CAT = [], CTX = null;

  // ---------- pantallas ----------
  const cargando = (msg) => { $('#cargando').style.display = 'flex'; $('#cargando-msg').textContent = msg; };
  const listo = () => { $('#cargando').style.display = 'none'; };
  function pantallaLogin(form) {
    listo(); $('#login').style.display = 'flex';
    ['#f-login', '#f-nueva', '#sin-acceso'].forEach(s => $(s).style.display = 'none');
    $(form).style.display = form === '#sin-acceso' ? 'block' : 'flex';
  }
  const ocultaLogin = () => { $('#login').style.display = 'none'; };

  // ---------- autenticación ----------
  $('#f-login').addEventListener('submit', async (ev) => {
    ev.preventDefault(); $('#l-err').textContent = '';
    const {data, error} = await sb.auth.signInWithPassword({email: $('#l-email').value.trim(), password: $('#l-pass').value});
    if (error) { $('#l-err').textContent = /invalid/i.test(error.message) ? 'Correo o contraseña incorrectos.' : error.message; return; }
    entrar(data.session);
  });
  $('#l-olvide').addEventListener('click', async () => {
    const email = $('#l-email').value.trim();
    if (!email) { $('#l-err').textContent = 'Escribe tu correo arriba y vuelve a dar clic.'; return; }
    const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.origin + location.pathname});
    $('#l-err').textContent = error ? error.message : 'Si el correo está registrado, te llegará un enlace para crear una nueva contraseña.';
  });
  $('#f-nueva').addEventListener('submit', async (ev) => {
    ev.preventDefault(); $('#n-err').textContent = '';
    const p1 = $('#n-pass').value, p2 = $('#n-pass2').value;
    if (p1 !== p2) { $('#n-err').textContent = 'Las contraseñas no coinciden.'; return; }
    const {error} = await sb.auth.updateUser({password: p1});
    if (error) { $('#n-err').textContent = error.message; return; }
    $('#n-pass').value = $('#n-pass2').value = '';
    if (CTX) { ocultaLogin(); alert('Listo, tu contraseña se cambió.'); }
    else { const {data} = await sb.auth.getSession(); entrar(data.session); }
  });
  $('#n-cancel').addEventListener('click', () => { if (CTX) ocultaLogin(); else pantallaLogin('#f-login'); });
  $('#cambiar-pass').addEventListener('click', () => pantallaLogin('#f-nueva'));
  const salir = async () => { await sb.auth.signOut(); try { history.replaceState(null, '', location.pathname); } catch (e) {} location.reload(); };
  ['#logout', '#logout-m', '#sa-salir'].forEach(s => $(s).addEventListener('click', salir));

  // ---------- lectura de datos ----------
  async function todo(factory) {
    let out = [], desde = 0; const paso = 1000;
    for (;;) { const {data, error} = await factory().range(desde, desde + paso - 1); if (error) throw error; out = out.concat(data || []); if (!data || data.length < paso) break; desde += paso; }
    return out;
  }
  const n = (v) => v == null ? null : Number(v);
  function armarCartera(fact, est) {
    fact.sort((a, b) => a.fecha_informe.localeCompare(b.fecha_informe));
    const fechas = [...new Set(fact.map(f => f.fecha_informe))].sort();
    const empresas = [...new Set(fact.map(f => f.empresa || ''))].sort();
    const sucursales = [...new Set(fact.map(f => f.sucursal || ''))].sort();
    const fi = new Map(fechas.map((f, i) => [f, i])), ei = new Map(empresas.map((e, i) => [e, i])), si = new Map(sucursales.map((s, i) => [s, i]));
    const clientes = [], ci = new Map(), rows = [];
    for (const f of fact) {
      let k = ci.get(f.cliente);
      if (k == null) { k = clientes.length; ci.set(f.cliente, k); clientes.push([f.cve, f.cliente, 0]); }
      if (f.limite != null) clientes[k][2] = n(f.limite);
      rows.push([fi.get(f.fecha_informe), ei.get(f.empresa || ''), f.folio, si.get(f.sucursal || ''), f.fecha_factura || '', k, n(f.saldo) || 0, f.bucket, f.fecha_venc, n(f.total)]);
    }
    const estatus = {}; est.forEach(e => { if (e.estatus) estatus[e.cliente] = e.estatus; });
    return {fechas, empresas, sucursales, clientes, estatus, rows};
  }
  function armarVentas(filas) {
    const orden = CAT.map(c => c.clave);
    const claves = [...new Set(filas.map(f => f.suc_clave))].sort((a, b) => (orden.indexOf(a) + 1 || 99) - (orden.indexOf(b) + 1 || 99) || a.localeCompare(b));
    const ix = new Map(claves.map((c, i) => [c, i]));
    const nombre = (c) => (CAT.find(x => x.clave === c) || {}).nombre || c.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    return {suc: claves, sucName: claves.map(nombre), rows: filas.map(f => [f.anio, f.mes, ix.get(f.suc_clave), n(f.venta), n(f.meta), n(f.gasto_op), n(f.comisiones), n(f.gasto_total), n(f.objetivo)])};
  }
  const invVacio = () => ({fecha: null, kpis: {}, clasif: [], top: [], alertas: [], detalle: [], cedis: [], resp: {}});
  const respuestas = (filas) => { const r = {}; filas.forEach(x => { r[x.fecha + '|' + x.cedis + '|' + x.clave] = x.respuesta; }); return r; };
  const alertaArr = (a) => [a.linea, a.clave, a.descripcion, n(a.existencia), n(a.ventas_mes), n(a.cobertura), n(a.rop), n(a.eoq), a.urgencia, n(a.precio), a.almacenes || []];
  const detArr = (d) => [d.almacen, d.linea, d.clave, d.descripcion, d.clasif, n(d.existencia), n(d.costo), n(d.valor), n(d.cobertura), d.ultima_venta, n(d.precio), n(d.precio_liq)];
  const cedArr = (c) => [c.cedis, c.linea, c.clave, c.descripcion, n(c.existencia), n(c.valor), n(c.dias), c.ultimo_traspaso, c.destino, n(c.precio)];

  async function datosDireccion() {
    const [fact, est, ven, docs, infs] = await Promise.all([
      todo(() => sb.from('cartera_facturas').select('fecha_informe,empresa,folio,sucursal,fecha_factura,cve,cliente,saldo,bucket,fecha_venc,total,limite').order('id')),
      todo(() => sb.from('cartera_estatus').select('cliente,estatus')),
      todo(() => sb.from('ventas_mensual').select('*').order('anio').order('mes')),
      sb.from('documentos').select('tipo,datos').then(r => { if (r.error) throw r.error; return r.data; }),
      sb.from('inv_informes').select('fecha,resumen').order('fecha', {ascending: false}).limit(1).then(r => { if (r.error) throw r.error; return r.data; })]);
    const doc = (t) => (docs.find(d => d.tipo === t) || {}).datos;
    let I = invVacio();
    if (infs.length) {
      const f = infs[0].fecha, R = infs[0].resumen || {};
      const [al, de, ce, re] = await Promise.all([
        todo(() => sb.from('inv_alertas').select('*').eq('fecha', f)), todo(() => sb.from('inv_detalle').select('*').eq('fecha', f)),
        todo(() => sb.from('inv_cedis').select('*').eq('fecha', f)), todo(() => sb.from('inv_respuestas').select('fecha,cedis,clave,respuesta').eq('fecha', f))]);
      I = {fecha: f, kpis: R.kpis || {}, clasif: R.clasif || [], top: R.top || [], alertas: al.map(alertaArr), detalle: de.map(detArr), cedis: ce.map(cedArr), resp: respuestas(re)};
    }
    return {D: armarCartera(fact, est), V: armarVentas(ven), F: doc('finanzas') || {cortes: [], avisos: []},
      ER: doc('resultados') || {anio: null, meses: [], lineas: [], avisos: []}, I, MM: []};
  }
  async function datosVendedor() {
    const [fact, est, mm, fecha] = await Promise.all([
      todo(() => sb.from('cartera_facturas').select('fecha_informe,empresa,folio,sucursal,fecha_factura,cve,cliente,saldo,bucket,fecha_venc,total,limite').order('id')),
      todo(() => sb.from('cartera_estatus').select('cliente,estatus')),
      todo(() => sb.rpc('mi_meta')),
      sb.rpc('ultimo_informe_inv').then(r => { if (r.error) throw r.error; return r.data; })]);
    let I = invVacio();
    if (fecha) {
      const [al, de, ce, re] = await Promise.all([
        todo(() => sb.from('inv_alertas').select('*').eq('fecha', fecha)), todo(() => sb.rpc('mi_inv_detalle')),
        todo(() => sb.rpc('mis_sugerencias')), todo(() => sb.from('inv_respuestas').select('fecha,cedis,clave,respuesta').eq('fecha', fecha))]);
      I = {fecha, kpis: {}, clasif: [], top: [], alertas: al.map(alertaArr), detalle: de.map(d => detArr({...d, costo: null, valor: null})), cedis: ce.map(c => cedArr({...c, valor: null})), resp: respuestas(re)};
    }
    return {D: armarCartera(fact, est), V: {suc: [], sucName: [], rows: []}, F: {cortes: [], avisos: []}, ER: {anio: null, meses: [], lineas: [], avisos: []}, I,
      MM: mm.map(x => ({anio: x.anio, mes: x.mes, cerrado: x.cerrado, r: n(x.r), w: n(x.w), g: n(x.g)}))};
  }

  // ---------- escritura ----------
  const db = {
    async guardarEstatus(cliente, estatus) {
      const {error} = await sb.from('cartera_estatus').upsert({cliente, estatus, actualizado: new Date().toISOString()}, {onConflict: 'cliente'});
      return error && error.message;
    },
    async guardarRespuesta(c, respuesta) {
      const suc = (CAT.find(s => s.destino === c[8]) || {}).clave;
      if (!suc) return 'No encontré la sucursal del destino ' + c[8];
      const llave = {fecha: CTX.I.fecha, cedis: c[0], clave: c[2], suc_clave: suc};
      const {error} = respuesta ? await sb.from('inv_respuestas').upsert({...llave, respuesta, actualizado: new Date().toISOString()}, {onConflict: 'fecha,cedis,clave,suc_clave'})
        : await sb.from('inv_respuestas').delete().match(llave);
      return error && error.message;
    },
  };

  // ---------- administración: carga de archivos ----------
  let cargaLista = false;
  async function drawCarga() {
    if (!cargaLista) {
      cargaLista = true;
      const drop = $('#drop'), inp = $('#archivos');
      inp.addEventListener('change', () => { procesar([...inp.files]); inp.value = ''; });
      ['dragenter', 'dragover'].forEach(e => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('on'); }));
      ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('on'); }));
      drop.addEventListener('drop', (ev) => procesar([...ev.dataTransfer.files]));
    }
    const tb = el('tbody'), th = (t) => el('th', {textContent: t});
    const fila = (a, b, c) => tb.append(el('tr', {}, el('td', {textContent: a, style: 'text-align:left'}), el('td', {textContent: b, style: 'text-align:left'}), el('td', {textContent: c, style: 'text-align:left'})));
    const D = CTX.D, V = CTX.V;
    fila('Cartera de clientes', D.fechas.length ? `${D.fechas.length} cortes, el último al ${D.fechas[D.fechas.length - 1]}` : 'sin datos', '');
    const ult = V.rows.filter(r => r[3]).reduce((a, r) => Math.max(a, r[0] * 100 + r[1]), 0);
    fila('Ventas, metas y gastos', ult ? `hasta ${String(ult % 100).padStart(2, '0')}/${Math.floor(ult / 100)}` : 'sin datos', '');
    try {
      const [docs, infs] = await Promise.all([sb.from('documentos').select('tipo,archivo,actualizado'), sb.from('inv_informes').select('fecha,archivo,actualizado').order('fecha', {ascending: false})]);
      for (const t of ['finanzas', 'resultados']) { const d = (docs.data || []).find(x => x.tipo === t); fila(TIPO_NOM[t], d ? d.archivo : 'sin datos', d ? 'publicado ' + new Date(d.actualizado).toLocaleString('es-MX') : ''); }
      (infs.data || []).forEach((x, i) => fila(i ? '' : 'Análisis de inventario', `informe del ${x.fecha}`, 'publicado ' + new Date(x.actualizado).toLocaleString('es-MX')));
      if (!(infs.data || []).length) fila('Análisis de inventario', 'sin datos', '');
    } catch (e) { /* solo informativo */ }
    $('#estado-cargas').replaceChildren(el('thead', {}, el('tr', {}, th('Archivo'), th('Contenido'), th('Última publicación'))), tb);
  }
  function revisarSucursales(r) {
    if (r.tipo === 'cartera') { const ok = new Set(CAT.map(c => c.cartera)); const sin = (r.sucursales || []).filter(s => !ok.has(s));
      if (sin.length) r.avisos.push(`Sucursales sin equivalencia en el catálogo (solo las verá Dirección): ${sin.join(', ')}. Agrégalas en Supabase → Table Editor → sucursales, columna "cartera".`); }
    if (r.tipo === 'ventas') { const ok = new Set(CAT.map(c => c.clave)); const sin = (r.sucursales || []).filter(s => !ok.has(s));
      if (sin.length) r.avisos.push(`Sucursales nuevas en ventas (solo las verá Dirección): ${sin.join(', ')}. Agrégalas en Supabase → Table Editor → sucursales.`); }
  }
  async function procesar(files) {
    for (const f of files) {
      const card = el('div', {className: 'card carga'}, el('h2', {textContent: f.name}), el('p', {className: 'note', textContent: 'Leyendo…'}));
      $('#cargas').prepend(card);
      await new Promise(res => setTimeout(res, 30));
      let r;
      try { r = Lectores.leer(await f.arrayBuffer(), f.name); } catch (e) { r = {tipo: null, resumen: [], avisos: [], errores: ['Error al leer: ' + e.message]}; }
      revisarSucursales(r);
      const lista = (arr, cls) => arr.length ? el('ul', {className: cls}, ...arr.map(t => el('li', {textContent: t}))) : '';
      const estado = el('span'), btn = el('button', {className: 'btn prim', textContent: 'Publicar', disabled: !!r.errores.length || !r.datos});
      card.replaceChildren(el('h2', {textContent: (TIPO_NOM[r.tipo] || 'Archivo no reconocido') + ' · ' + f.name}),
        lista(r.resumen, ''), r.avisos.length ? el('p', {className: 'note', textContent: 'Para revisar:', style: 'margin:8px 0 0'}) : '', lista(r.avisos, 'av'),
        r.errores.length ? el('p', {className: 'note', textContent: 'No se puede publicar:', style: 'margin:8px 0 0;color:var(--bad)'}) : '', lista(r.errores, 'er'),
        el('div', {className: 'acc'}, btn, estado,
          r.tipo === 'inventario' && r.datos ? el('span', {className: 'note', textContent: 'Se agrega como informe nuevo; las respuestas de las sucursales empiezan desde cero.', style: 'margin:0'})
            : r.datos ? el('span', {className: 'note', textContent: 'Reemplaza lo que hay cargado de este archivo.', style: 'margin:0'}) : ''));
      btn.addEventListener('click', async () => {
        btn.disabled = true; estado.className = ''; estado.textContent = 'Publicando…';
        const err = await publicar(r);
        if (err) { estado.className = 'estado-err'; estado.textContent = 'No se pudo publicar: ' + err; btn.disabled = false; return; }
        estado.className = 'estado-ok'; estado.textContent = '✓ Publicado. ';
        estado.append(el('button', {className: 'btn', textContent: 'Ver tableros actualizados', onclick: () => location.reload()}));
      });
    }
  }
  async function publicar(r) {
    let q;
    if (r.tipo === 'cartera') {
      const {error} = await sb.rpc('cargar_cartera', {filas: r.datos}); if (error) return error.message;
      if (r.estatusInicial && r.estatusInicial.length) { const e2 = await sb.from('cartera_estatus').upsert(r.estatusInicial, {onConflict: 'cliente', ignoreDuplicates: true}); if (e2.error) return 'facturas cargadas, pero no los estatus iniciales: ' + e2.error.message; }
      return null;
    }
    else if (r.tipo === 'ventas') q = sb.rpc('cargar_ventas', {filas: r.datos});
    else if (r.tipo === 'finanzas' || r.tipo === 'resultados') q = sb.rpc('cargar_documento', {p_tipo: r.tipo, p_datos: r.datos, p_archivo: r.archivo});
    else if (r.tipo === 'inventario') { const d = r.datos; q = sb.rpc('cargar_inventario', {p_fecha: d.fecha, p_resumen: d.resumen, p_alertas: d.alertas, p_detalle: d.detalle, p_cedis: d.cedis, p_archivo: r.archivo}); }
    else return 'tipo de archivo desconocido';
    const {error} = await q; return error && error.message;
  }

  // ---------- administración: usuarios ----------
  async function drawUsuarios() {
    const {data, error} = await sb.from('perfiles').select('*').order('creado');
    if (error) { $('#usr-nota').textContent = 'No pude leer los usuarios: ' + error.message; return; }
    data.sort((x, y) => (x.rol !== 'pendiente') - (y.rol !== 'pendiente') || String(x.email).localeCompare(String(y.email)));
    const pend = data.filter(u => u.rol === 'pendiente').length;
    $('#usr-nota').textContent = `${data.length} usuarios` + (pend ? ` · ${pend} pendiente(s) de asignar` : '');
    const th = (t) => el('th', {textContent: t}), tb = el('tbody');
    data.forEach(u => {
      const nom = el('input', {type: 'text', value: u.nombre || '', placeholder: 'Nombre'});
      const rol = el('select'); [['pendiente', 'Pendiente (sin acceso)'], ['vendedor', 'Vendedor'], ['direccion', 'Dirección']].forEach(([v, t]) => rol.append(new Option(t, v))); rol.value = u.rol;
      const checks = CAT.map(c => { const cb = el('input', {type: 'checkbox', value: c.clave, checked: (u.sucursales || []).includes(c.clave)}); return [cb, el('label', {}, cb, c.nombre)]; });
      const sucs = el('div', {className: 'sucs'}, ...checks.map(x => x[1]));
      const act = el('input', {type: 'checkbox', checked: u.activo});
      const est = el('span', {className: 'note', style: 'margin:0'});
      const sync = () => { const v = rol.value === 'vendedor'; checks.forEach(([cb]) => cb.disabled = !v); sucs.style.opacity = v ? 1 : 0.4; };
      rol.addEventListener('change', sync); sync();
      const btn = el('button', {className: 'btn', textContent: 'Guardar', onclick: async () => {
        const cambio = {nombre: nom.value.trim() || null, rol: rol.value, sucursales: rol.value === 'vendedor' ? checks.filter(([cb]) => cb.checked).map(([cb]) => cb.value) : [], activo: act.checked};
        if (u.user_id === SES.user.id && (cambio.rol !== 'direccion' || !cambio.activo)) { est.textContent = 'No puedes quitarte a ti mismo el acceso de Dirección.'; return; }
        if (cambio.rol === 'vendedor' && !cambio.sucursales.length) { est.textContent = 'Elige al menos una sucursal.'; return; }
        btn.disabled = true; est.textContent = 'Guardando…';
        const {error} = await sb.from('perfiles').update(cambio).eq('user_id', u.user_id);
        btn.disabled = false; est.textContent = error ? 'Error: ' + error.message : '✓ Guardado';
      }});
      tb.append(el('tr', {}, el('td', {textContent: u.email || '—'}), el('td', {}, nom), el('td', {}, rol), el('td', {}, sucs), el('td', {}, el('label', {}, act, ' Activo')), el('td', {}, btn, el('br'), est)));
    });
    $('#usuarios').replaceChildren(el('thead', {}, el('tr', {}, th('Correo'), th('Nombre'), th('Rol'), th('Sucursales'), th('Acceso'), th(''))), tb);
  }

  // ---------- arranque ----------
  async function entrar(session) {
    SES = session; ocultaLogin(); cargando('Cargando tus tableros…');
    try {
      const {data: p, error} = await sb.from('perfiles').select('*').eq('user_id', session.user.id).maybeSingle();
      if (error) throw error;
      PERFIL = p;
      if (!p || p.rol === 'pendiente' || !p.activo) {
        $('#sin-acceso-msg').textContent = !p || p.rol === 'pendiente' ? 'Tu usuario todavía no tiene acceso. Pide a Dirección que te asigne tu sucursal.' : 'Tu acceso está desactivado. Si crees que es un error, habla con Dirección.';
        pantallaLogin('#sin-acceso'); return;
      }
      const cat = await sb.from('sucursales').select('*'); if (cat.error) throw cat.error; CAT = cat.data || [];
      const dir = p.rol === 'direccion';
      const datos = dir ? await datosDireccion() : await datosVendedor();
      const mis = CAT.filter(c => (p.sucursales || []).includes(c.clave));
      const user = dir ? {nombre: p.nombre || 'Dirección', sucursales: null, ventas: null, inv: null, mods: MODS_JEFE, reporte: 'Reporte de Dirección'}
        : {nombre: p.nombre || p.email, sucursales: mis.map(c => c.cartera).filter(Boolean), ventas: mis.map(c => c.clave), inv: mis.map(c => c.inventario).filter(Boolean), mods: MODS_VEND, reporte: 'Mi tablero · ' + mis.map(c => c.nombre).join(', ')};
      CTX = {...datos, user, db, admin: {drawCarga, drawUsuarios}};
      window.iniciarTableros(CTX);
      listo();
    } catch (e) {
      cargando('No se pudieron cargar los datos: ' + (e.message || e) + '. Recarga la página; si sigue, avisa a Dirección.');
    }
  }
  (async () => {
    if (!CONFIG.SUPABASE_URL || /TU-PROYECTO/.test(CONFIG.SUPABASE_URL)) { cargando('Falta configurar la dirección de Supabase en js/config.js.'); return; }
    if (esRecuperacion) { await new Promise(r => setTimeout(r, 300)); pantallaLogin('#f-nueva'); return; }
    const {data} = await sb.auth.getSession();
    if (data.session) entrar(data.session); else pantallaLogin('#f-login');
  })();
})();

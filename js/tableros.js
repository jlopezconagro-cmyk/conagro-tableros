/* Tableros Conagro: vistas (generado a partir del prototipo). */

window.iniciarTableros = function (CTX) {
'use strict';
const D = CTX.D;
const R = D.rows; // [fecha_informe, empresa, folio, sucursal, fecha_factura, cliente, saldo, bucket, fecha_venc, total_factura]
const NAME = D.clientes.map(c => c[1]);
const LIM = D.clientes.map(c => c[2]);
const BK = ['Por vencer', '0–30 días', '30–60 días', '60–90 días', '3–6 meses', 'Más de 6 meses'];
const BK_SHORT = ['Por vencer', '0–30 d', '30–60 d', '60–90 d', '3–6 m', '+6 m'];
const BCOL = ['var(--b0)', 'var(--b1)', 'var(--b2)', 'var(--b3)', 'var(--b4)', 'var(--b5)'];
const MODS_JEFE = ['resumen', 'ventas', 'cartera', 'resultados', 'finanzas', 'inventarios', 'carga', 'usuarios'];
const MODS_VEND = ['meta', 'cartera', 'productos'];
const USERS = {yo: CTX.user};
const ICON = {
  resumen: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  ventas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cartera: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/>',
  resultados: '<path d="M4 4h16v16H4z"/><path d="M8 15l3-3 2 2 3-4"/>',
  finanzas: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  inventarios: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  meta: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  carga: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.7 2.5 3 5.2"/>',
  productos: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
};
const MOD = {
  resumen: {t: 'Resumen'},
  ventas: {t: 'Ventas', archivo: 'tu archivo de ventas', items: ['Venta neta y margen contra el año anterior', 'Avance contra meta por sucursal', 'Tendencia mensual']},
  cartera: {t: 'Cartera', tv: 'Mi cartera'},
  resultados: {t: 'Estado de resultados', corto: 'Resultados'},
  finanzas: {t: 'Situación financiera', corto: 'Finanzas'},
  inventarios: {t: 'Inventarios'},
  meta: {t: 'Mi meta', archivo: 'tu archivo de ventas y metas', items: ['Porcentaje de avance contra tu meta del mes y del año', 'Cuánto te falta y cuántos días quedan', 'Tus ventas por semana']},
  productos: {t: 'Mi inventario', corto: 'Inventario'},
  carga: {t: 'Cargar datos', corto: 'Cargar', admin: true},
  usuarios: {t: 'Usuarios', admin: true},
};
const svgIcon = (k) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICON[k]; return s; };
const EST_ADMIN = ['', 'Cobrar', 'Buscar', 'Convenio', 'Propuesto incobrable', 'Incobrable'];
const EST_VEND = ['', 'Cobrar', 'Buscar', 'Convenio', 'Propuesto incobrable'];

const S = {mod: null, user: null, fi: D.fechas.length - 1, sucs: new Set(), emps: new Set(), anios: new Set(), q: '', sort: {k: 'total', dir: -1}, open: new Set(), est: Object.assign({}, D.estatus)};

const mxn0 = new Intl.NumberFormat('es-MX', {style: 'currency', currency: 'MXN', maximumFractionDigits: 0});
const mxn2 = new Intl.NumberFormat('es-MX', {style: 'currency', currency: 'MXN', minimumFractionDigits: 2});
const comp = {format: (v) => v < 0 ? '−' + comp.format(-v) : compPos(v)};
const compPos = (v) => { const a = Math.abs(v); return a >= 1e6 ? '$' + (v / 1e6).toLocaleString('es-MX', {maximumFractionDigits: 2}) + ' M' : a >= 1e3 ? '$' + (v / 1e3).toLocaleString('es-MX', {maximumFractionDigits: 0}) + ' mil' : '$' + v.toLocaleString('es-MX', {maximumFractionDigits: 0}); };
const pct = (x) => isFinite(x) ? (x * 100).toLocaleString('es-MX', {maximumFractionDigits: 1}) + '%' : '—';
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fdate = (s) => { const [y, m, d] = s.split('-'); return `${+d} ${MESES[m - 1]} ${y}`; };
const fshort = (s) => { const [y, m, d] = s.split('-'); return `${+d} ${MESES[m - 1]} ${y.slice(2)}`; };
const $ = (s) => document.querySelector(s);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k.startsWith('aria')) e.setAttribute('aria-' + k.slice(4).toLowerCase(), v); else e[k] = v; } kids.forEach(k => e.append(k)); return e; };

// --- permisos y filtros ---
const allowedSuc = (si) => { const u = USERS[S.user]; return !u.sucursales || u.sucursales.includes(D.sucursales[si]); };
const pass = (r, ignoreSuc) => allowedSuc(r[3])
  && (ignoreSuc || !S.sucs.size || S.sucs.has(r[3]))
  && (!S.emps.size || S.emps.has(r[1]))
  && (!S.anios.size || S.anios.has(r[4].slice(0, 4)));

// --- controles ---
const fSel = $('#f-fecha');
D.fechas.forEach((f, i) => fSel.append(new Option(fdate(f), i)));
fSel.addEventListener('change', () => { S.fi = +fSel.value; render(); });
const years = [...new Set(R.map(r => r[4].slice(0, 4)))].sort();
$('#q').addEventListener('input', (e) => { S.q = e.target.value.trim().toUpperCase(); drawMatrix(); });

function drawChips() {
  const box = $('#f-suc'); box.replaceChildren();
  const u = USERS[S.user];
  if (u.sucursales) { u.sucursales.forEach(s => box.append(el('span', {className: 'lock', textContent: s + ' 🔒'}))); }
  else {
    const present = [...new Set(R.filter(r => r[0] === S.fi).map(r => r[3]))].sort((a, b) => D.sucursales[a].localeCompare(D.sucursales[b]));
    box.append(el('button', {textContent: 'Todas', ariaPressed: String(!S.sucs.size), onclick: () => { S.sucs.clear(); render(); }}));
    present.forEach(si => box.append(el('button', {textContent: D.sucursales[si], ariaPressed: String(S.sucs.has(si)), onclick: () => { S.sucs.has(si) ? S.sucs.delete(si) : S.sucs.add(si); render(); }})));
  }
  const eb = $('#f-emp'); eb.replaceChildren();
  eb.append(el('button', {textContent: 'Todas', ariaPressed: String(!S.emps.size), onclick: () => { S.emps.clear(); render(); }}));
  D.empresas.forEach((e, ei) => eb.append(el('button', {textContent: e, ariaPressed: String(S.emps.has(ei)), onclick: () => { S.emps.has(ei) ? S.emps.delete(ei) : S.emps.add(ei); render(); }})));
  const ab = $('#f-anio'); ab.replaceChildren();
  ab.append(el('button', {textContent: 'Todos', ariaPressed: String(!S.anios.size), onclick: () => { S.anios.clear(); render(); }}));
  years.forEach(y => ab.append(el('button', {textContent: y, ariaPressed: String(S.anios.has(y)), onclick: () => { S.anios.has(y) ? S.anios.delete(y) : S.anios.add(y); render(); }})));
}

// --- cálculo ---
let CUR = [];
function render() {
  fSel.value = S.fi;
  drawChips();
  filterSummary();
  CUR = R.filter(r => r[0] === S.fi && pass(r));
  const tot = CUR.reduce((a, r) => a + r[6], 0);
  const b = [0, 0, 0, 0, 0, 0]; CUR.forEach(r => { b[r[7]] += r[6]; });
  const venc = tot - b[0];
  const clientes = new Set(CUR.map(r => NAME[r[5]]));
  const cliVenc = new Set(CUR.filter(r => r[7] > 0).map(r => NAME[r[5]]));
  let inc = 0; const incCli = new Set();
  CUR.forEach(r => { if ((S.est[NAME[r[5]]] || '') === 'Incobrable') { inc += r[6]; incCli.add(NAME[r[5]]); } });

  $('#k-saldo').textContent = comp.format(tot);
  $('#k-saldo-s').innerHTML = ''; $('#k-saldo-s').append(el('b', {textContent: clientes.size}), ' clientes · corte ' + fdate(D.fechas[S.fi]));
  $('#k-venc').textContent = comp.format(venc);
  $('#k-venc-s').replaceChildren(el('b', {textContent: pct(venc / tot)}), ' del saldo · ' + cliVenc.size + ' clientes');
  $('#k-6m').textContent = comp.format(b[5]);
  $('#k-6m-s').replaceChildren(el('b', {textContent: pct(b[5] / tot)}), ' del saldo');
  $('#k-inc').textContent = comp.format(inc);
  $('#k-inc-s').replaceChildren(el('b', {textContent: incCli.size}), ' clientes · ' + pct(inc / tot) + ' del saldo');

  // antigüedad
  const ag = $('#aging'); ag.replaceChildren();
  const mx = Math.max(...b, 1);
  b.forEach((v, i) => {
    const bar = el('div', {className: 'bar'}); bar.style.width = (v / mx * 100) + '%'; bar.style.background = BCOL[i];
    const val = el('div', {className: 'v num', textContent: mxn0.format(v)}); val.append(el('span', {textContent: pct(v / tot)}));
    ag.append(el('div', {className: 'ag'}, el('div', {textContent: BK[i]}), el('div', {className: 'track'}, bar), val));
  });

  drawTrend();
  drawSuc();
  drawMatrix();
}

// --- tendencia ---
function drawTrend() {
  const box = $('#trend'); box.querySelector('svg')?.remove();
  const n = D.fechas.length, tot = new Array(n).fill(0), ven = new Array(n).fill(0);
  R.forEach(r => { if (pass(r)) { tot[r[0]] += r[6]; if (r[7] > 0) ven[r[0]] += r[6]; } });
  const W = Math.max(box.clientWidth, 280), H = 210, ml = 58, mr = 12, mt = 10, mb = 26;
  const ymax = Math.max(...tot, 1) * 1.08;
  const x = (i) => ml + (n === 1 ? 0 : i * (W - ml - mr) / (n - 1));
  const y = (v) => mt + (1 - v / ymax) * (H - mt - mb);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', '100%');
  const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); svg.append(e); return e; };
  for (let k = 0; k <= 4; k++) {
    const v = ymax * k / 4, yy = y(v);
    mk('line', {x1: ml, x2: W - mr, y1: yy, y2: yy, stroke: 'var(--line)'});
    const t = mk('text', {x: ml - 6, y: yy + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted)'}); t.textContent = comp.format(v);
  }
  const step = Math.ceil(n / Math.max(2, Math.floor((W - ml) / 70)));
  D.fechas.forEach((f, i) => { if ((i % step === 0 && n - 1 - i >= step * 0.6) || i === n - 1) { const t = mk('text', {x: x(i), y: H - 6, 'text-anchor': i === n - 1 ? 'end' : 'middle', 'font-size': 11, fill: 'var(--muted)'}); t.textContent = MESES[+f.slice(5, 7) - 1] + ' ' + f.slice(2, 4); } });
  mk('line', {x1: x(S.fi), x2: x(S.fi), y1: mt, y2: H - mb, stroke: 'var(--oro)', 'stroke-dasharray': '3 3'});
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  mk('path', {d: path(tot), fill: 'none', stroke: 'var(--verde-2)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'});
  mk('path', {d: path(ven), fill: 'none', stroke: 'var(--b4)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'});
  const d1 = mk('circle', {r: 4, fill: 'var(--verde-2)', cx: x(S.fi), cy: y(tot[S.fi])});
  const d2 = mk('circle', {r: 4, fill: 'var(--b4)', cx: x(S.fi), cy: y(ven[S.fi])});
  const hit = mk('rect', {x: ml, y: mt, width: W - ml - mr, height: H - mt - mb, fill: 'transparent', style: 'cursor:pointer'});
  const tip = $('#tip');
  const near = (ev) => { const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) * W / r.width; return Math.max(0, Math.min(n - 1, Math.round((px - ml) / ((W - ml - mr) / Math.max(1, n - 1))))); };
  hit.addEventListener('mousemove', (ev) => {
    const i = near(ev);
    d1.setAttribute('cx', x(i)); d1.setAttribute('cy', y(tot[i])); d2.setAttribute('cx', x(i)); d2.setAttribute('cy', y(ven[i]));
    tip.replaceChildren(el('div', {textContent: fdate(D.fechas[i]), style: 'color:var(--muted)'}), el('div', {textContent: 'Saldo ' + mxn0.format(tot[i])}), el('div', {textContent: 'Vencido ' + mxn0.format(ven[i]) + ' (' + pct(ven[i] / tot[i]) + ')'}));
    tip.style.display = 'block';
    const r = svg.getBoundingClientRect(), bx = box.getBoundingClientRect();
    let left = x(i) * r.width / W + (r.left - bx.left) + 10; if (left + tip.offsetWidth > bx.width) left -= tip.offsetWidth + 20;
    tip.style.left = left + 'px'; tip.style.top = (y(tot[i]) * r.height / H + (r.top - bx.top) - 10) + 'px';
  });
  hit.addEventListener('mouseleave', () => { tip.style.display = 'none'; d1.setAttribute('cx', x(S.fi)); d1.setAttribute('cy', y(tot[S.fi])); d2.setAttribute('cx', x(S.fi)); d2.setAttribute('cy', y(ven[S.fi])); });
  hit.addEventListener('click', (ev) => { S.fi = near(ev); render(); });
  box.prepend(svg);
}

// --- por sucursal (solo dirección) ---
function drawSuc() {
  const tb = $('#suc-table tbody'); tb.replaceChildren();
  if (USERS[S.user].sucursales) return;
  const g = new Map();
  R.forEach(r => { if (r[0] !== S.fi || !pass(r, true)) return;
    const o = g.get(r[3]) || {s: 0, v: 0, m6: 0, c: new Set()}; o.s += r[6]; if (r[7] > 0) o.v += r[6]; if (r[7] === 5) o.m6 += r[6]; o.c.add(NAME[r[5]]); g.set(r[3], o); });
  const rows = [...g.entries()].sort((a, b) => b[1].s - a[1].s);
  const T = {s: 0, v: 0, m6: 0, c: 0};
  rows.forEach(([si, o]) => {
    T.s += o.s; T.v += o.v; T.m6 += o.m6; T.c += o.c.size;
    const tr = el('tr', {className: S.sucs.has(si) ? 'sel' : ''},
      el('td', {textContent: D.sucursales[si]}), el('td', {className: 'num', textContent: mxn0.format(o.s)}), el('td', {className: 'num', textContent: mxn0.format(o.v)}),
      el('td', {className: 'num', textContent: pct(o.v / o.s)}), el('td', {className: 'num', textContent: mxn0.format(o.m6)}), el('td', {className: 'num', textContent: o.c.size}));
    tr.addEventListener('click', () => { S.sucs = S.sucs.size === 1 && S.sucs.has(si) ? new Set() : new Set([si]); render(); });
    tb.append(tr);
  });
  tb.append(el('tr', {className: 'tot'}, el('td', {textContent: 'Total'}), el('td', {className: 'num', textContent: mxn0.format(T.s)}), el('td', {className: 'num', textContent: mxn0.format(T.v)}), el('td', {className: 'num', textContent: pct(T.v / T.s)}), el('td', {className: 'num', textContent: mxn0.format(T.m6)}), el('td', {textContent: ''})));
}

// --- matriz cliente x antigüedad ---
function groupClients() {
  const g = new Map();
  CUR.forEach(r => { const n = NAME[r[5]]; let o = g.get(n);
    if (!o) { o = {name: n, b: [0, 0, 0, 0, 0, 0], total: 0, lim: 0, inv: []}; g.set(n, o); }
    o.b[r[7]] += r[6]; o.total += r[6]; o.lim = Math.max(o.lim, LIM[r[5]] || 0); o.inv.push(r); });
  return [...g.values()].map(o => Object.assign(o, {uso: o.lim ? o.total / o.lim : null, est: S.est[o.name] || ''}));
}
const COLS = [
  {k: 'name', t: 'Cliente'}, {k: 'est', t: 'Estatus'},
  ...BK_SHORT.map((t, i) => ({k: 'b' + i, t, i})), {k: 'total', t: 'Total'}, {k: 'lim', t: 'Límite'}, {k: 'uso', t: '% uso'}];
function estSelect(o) {
  const sel = el('select', {className: 'est ' + (o.est || '').toLowerCase().replace(/ /g, '-'), ariaLabel: 'Estatus de ' + o.name});
  const opts = USERS[S.user].sucursales ? EST_VEND : EST_ADMIN;
  opts.forEach(e => sel.append(new Option(e || '—', e)));
  if (o.est && !opts.includes(o.est)) { sel.append(new Option(o.est, o.est)); sel.disabled = true; sel.title = 'Solo Dirección puede cambiar este estatus'; }
  sel.value = o.est;
  sel.addEventListener('click', ev => ev.stopPropagation());
  sel.addEventListener('change', async () => { const antes = S.est[o.name] || ''; S.est[o.name] = sel.value; render();
    const err = await CTX.db.guardarEstatus(o.name, sel.value); if (err) { S.est[o.name] = antes; render(); alert('No se pudo guardar el estatus: ' + err); } });
  return sel;
}
function drawCards(rows) {
  const box = $('#mx-cards'); box.replaceChildren();
  let TT = 0, TV = 0;
  rows.forEach(o => {
    TT += o.total; const ven = o.total - o.b[0]; TV += ven;
    const open = S.open.has(o.name);
    const st = el('div', {className: 'mc-stack'});
    o.b.forEach((v, i) => { if (v > 0) { const s = el('div'); s.style.width = (v / o.total * 100) + '%'; s.style.background = BCOL[i]; st.append(s); } });
    const worst = o.b.reduce((w, v, i) => v > 0.5 ? i : w, 0);
    const card = el('div', {className: 'mc'},
      el('div', {className: 'mc-top'}, el('span', {className: 'mc-name', textContent: (open ? '▾ ' : '▸ ') + o.name}), el('span', {className: 'mc-tot num', textContent: mxn0.format(o.total)})),
      st,
      el('div', {className: 'mc-meta'}, el('span', {textContent: ven > 0.5 ? `Vencido ${mxn0.format(ven)} · hasta ${BK[worst].toLowerCase()}` : 'Al corriente'}), estSelect(o)));
    if (open) {
      const inv = el('div', {className: 'mc-inv'});
      o.inv.slice().sort((a, b) => a[4].localeCompare(b[4])).forEach(r => inv.append(el('div', {}, el('span', {textContent: `${r[2]} · ${fshort(r[4])} · ${BK[r[7]]}`}), el('span', {className: 'num', textContent: mxn2.format(r[6])}))));
      card.append(inv);
    }
    card.addEventListener('click', () => { open ? S.open.delete(o.name) : S.open.add(o.name); drawMatrix(); });
    box.append(card);
  });
  box.append(el('div', {className: 'mc-tot-row'}, el('span', {textContent: `${rows.length} clientes · vencido ${mxn0.format(TV)}`}), el('span', {className: 'num', textContent: mxn0.format(TT)})));
}
function drawMatrix() {
  const thead = $('#mx thead'), tb = $('#mx tbody');
  thead.replaceChildren(el('tr', {}, ...COLS.map(c => {
    const th = el('th', {}, el('button', {textContent: c.t, onclick: () => { S.sort = {k: c.k, dir: S.sort.k === c.k ? -S.sort.dir : (c.k === 'name' || c.k === 'est' ? 1 : -1)}; drawMatrix(); }}));
    th.setAttribute('aria-sort', S.sort.k === c.k ? (S.sort.dir < 0 ? 'descending' : 'ascending') : 'none'); return th; })));
  let rows = groupClients();
  if (S.q) rows = rows.filter(o => o.name.toUpperCase().includes(S.q));
  const val = (o, k) => k[0] === 'b' && k.length === 2 ? o.b[+k[1]] : o[k];
  rows.sort((a, b) => { const x = val(a, S.sort.k), y = val(b, S.sort.k);
    if (typeof x === 'string' || typeof y === 'string') return S.sort.dir * String(x || '~').localeCompare(String(y || '~'));
    return S.sort.dir * ((x ?? -1) - (y ?? -1)); });
  tb.replaceChildren();
  drawCards(rows);
  const T = [0, 0, 0, 0, 0, 0]; let TT = 0;
  rows.forEach(o => {
    o.b.forEach((v, i) => T[i] += v); TT += o.total;
    const open = S.open.has(o.name);
    const sel = estSelect(o);
    const tr = el('tr', {className: 'cli'},
      el('td', {className: 'name', title: o.name}, el('span', {className: 'car', textContent: open ? '▾' : '▸'}), o.name),
      el('td', {}, sel),
      ...o.b.map((v, i) => { const td = el('td', {className: 'num' + (v ? '' : ' z'), textContent: v ? mxn0.format(v) : '—'}); if (v && i > 0) td.style.boxShadow = `inset 3px 0 0 ${BCOL[i]}`; return td; }),
      el('td', {className: 'num', textContent: mxn0.format(o.total), style: 'font-weight:600'}),
      el('td', {className: 'num' + (o.lim ? '' : ' z'), textContent: o.lim ? mxn0.format(o.lim) : '—'}),
      el('td', {className: 'num'}, el('span', {className: 'uso' + (o.uso > 1 ? ' alto' : ''), textContent: o.uso == null ? '—' : pct(o.uso)})));
    tr.addEventListener('click', () => { open ? S.open.delete(o.name) : S.open.add(o.name); drawMatrix(); });
    tb.append(tr);
    if (open) {
      const inv = el('table', {className: 'inv'}, el('thead', {}, el('tr', {}, ...['Folio', 'Empresa', 'Sucursal', 'Fecha factura', 'Vence', 'Antigüedad', 'Total factura', 'Saldo'].map(t => el('th', {textContent: t})))));
      const ib = el('tbody');
      o.inv.slice().sort((a, b) => a[4].localeCompare(b[4])).forEach(r => ib.append(el('tr', {},
        el('td', {textContent: r[2]}), el('td', {textContent: D.empresas[r[1]]}), el('td', {textContent: D.sucursales[r[3]]}),
        el('td', {textContent: fshort(r[4])}), el('td', {textContent: r[8] ? fshort(r[8]) : '—'}), el('td', {textContent: BK[r[7]]}),
        el('td', {className: 'num', textContent: r[9] != null ? mxn2.format(r[9]) : '—'}), el('td', {className: 'num', textContent: mxn2.format(r[6])}))));
      inv.append(ib);
      tb.append(el('tr', {className: 'det'}, el('td', {colSpan: COLS.length, style: 'padding:6px 10px 12px 26px'}, inv)));
    }
  });
  tb.append(el('tr', {className: 'tot'}, el('td', {textContent: `Total · ${rows.length} clientes`}), el('td'), ...T.map(v => el('td', {className: 'num', textContent: mxn0.format(v)})), el('td', {className: 'num', textContent: mxn0.format(TT)}), el('td'), el('td')));
}

$('#csv').addEventListener('click', () => {
  const rows = groupClients().sort((a, b) => b.total - a.total);
  const esc = (s) => '"' + String(s).replace(/"/g, '""') + '"';
  const lines = [['Cliente', 'Estatus', ...BK, 'Total', 'Limite de credito'].map(esc).join(',')];
  rows.forEach(o => lines.push([esc(o.name), esc(o.est), ...o.b.map(v => v.toFixed(2)), o.total.toFixed(2), o.lim].join(',')));
  const blob = new Blob(['﻿' + lines.join('\n')], {type: 'text/csv'});
  const a = el('a', {href: URL.createObjectURL(blob), download: `cartera_${D.fechas[S.fi]}.csv`}); a.click();
});

// --- sesión ---

// ================= VENTAS =================
const V = CTX.V;
const VR = V.rows; // [anio, mes, sucursal, venta, meta, gasto_operativo, comisiones, gasto_total, objetivo_gasto]
const MESL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const CLOSED = new Set(VR.filter(r => r[3]).map(r => r[0] * 100 + r[1]));
const LASTY = Math.max(...VR.filter(r => r[3]).map(r => r[0]));
const VYEARS = [...new Set(VR.map(r => r[0]))].sort((a, b) => a - b);
const lastClosed = (y) => { let m = 0; for (let i = 1; i <= 12; i++) if (CLOSED.has(y * 100 + i)) m = i; return m; };
const SV = {anios: new Set([LASTY]), meses: new Set(), sucs: new Set(), manio: LASTY};
const sgn = (x) => isFinite(x) ? (x >= 0 ? '+' : '') + pct(x) : '—';
const vAllowed = (si) => { const u = USERS[S.user]; return !u.ventas || u.ventas.includes(V.suc[si]); };
const vPass = (r, o = {}) => vAllowed(r[2]) && (o.ignoreSuc || !SV.sucs.size || SV.sucs.has(r[2])) && (o.ignoreMes || !SV.meses.size || SV.meses.has(r[1]));
const add = (a, r) => { if (r[3]) a.v += r[3]; if (r[4]) { a.m += r[4]; if (CLOSED.has(r[0] * 100 + r[1])) a.mc += r[4]; } if (r[7]) a.g += r[7]; if (r[5]) a.gop += r[5]; if (r[6]) a.com += r[6]; if (r[8]) a.obj += r[8]; return a; };
const vAgg = (f) => VR.filter(r => vAllowed(r[2]) && f(r)).reduce(add, {v: 0, m: 0, mc: 0, g: 0, gop: 0, com: 0, obj: 0});
const semCls = (p) => !isFinite(p) ? '' : p >= 1 ? 's4' : p >= 0.9 ? 's3' : p >= 0.7 ? 's2' : 's1';
const semCol = (p) => p >= 1 ? 'var(--b0)' : p >= 0.9 ? 'var(--b1)' : p >= 0.7 ? 'var(--b2)' : 'var(--b4)';

// proyección de cierre del último año con datos, con la estacionalidad del año anterior
function proyeccion(sucOk) {
  const y = LASTY; let ytd = 0, ytdP = 0, restP = 0, metaA = 0, metaR = 0, mesesR = 0;
  for (let i = 1; i <= 12; i++) if (!CLOSED.has(y * 100 + i)) mesesR++;
  VR.forEach(r => { if (!vAllowed(r[2]) || !sucOk(r[2])) return; const closed = CLOSED.has(y * 100 + r[1]);
    if (r[0] === y) { ytd += r[3] || 0; if (r[4]) { metaA += r[4]; if (!closed) metaR += r[4]; } }
    if (r[0] === y - 1) { if (closed) ytdP += r[3] || 0; else restP += r[3] || 0; } });
  const proj = ytd + restP * (ytdP ? ytd / ytdP : 1);
  return {ytd, proj, metaA, projPct: proj / metaA, needed: metaR ? (metaA - ytd) / metaR : null, mesesR};
}

// ---- gráfica genérica (barras, línea, línea punteada) ----
function niceStep(x) { const e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; }
function vchart(box, c) {
  box.replaceChildren();
  const tip = el('div', {className: 'tip'}); box.append(tip);
  const n = c.labels.length, W = Math.max(box.clientWidth, 280), H = c.h || 230, mt = 12, mb = 24, mr = 10;
  const stackTot = c.stack ? c.stack[0].values.map((_, i) => c.stack.reduce((s, sr) => s + (sr.values[i] || 0), 0)) : [];
  const vals = [...stackTot, ...(c.bars ? c.bars.values : []), ...(c.line ? c.line.values : []), ...(c.dash ? c.dash.values : []), c.ref ?? 0, 0].filter(v => v != null && isFinite(v));
  let lo = Math.min(...vals), hi = Math.max(...vals); if (hi === lo) hi = lo + 1;
  const step = niceStep((hi - lo) / 4); lo = Math.floor(lo / step) * step; hi = Math.ceil(hi * 1.04 / step) * step;
  const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  const ml = 10 + Math.max(...ticks.map(v => c.fmt(v).length)) * 6.6;
  const cw = (W - ml - mr) / n, x = (i) => ml + cw * (i + 0.5), y = (v) => mt + (hi - v) / (hi - lo) * (H - mt - mb);
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', '100%');
  const mk = (t, a, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.append(e); return e; };
  ticks.forEach(v => { mk('line', {x1: ml, x2: W - mr, y1: y(v), y2: y(v), stroke: v === 0 ? 'var(--muted)' : 'var(--line)'}); mk('text', {x: ml - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted)'}, c.fmt(v)); });
  const every = cw < 24 ? 2 : 1;
  c.labels.forEach((l, i) => { if (i % every === 0) mk('text', {x: x(i), y: H - 6, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted)'}, l); });
  if (c.ref != null) mk('line', {x1: ml, x2: W - mr, y1: y(c.ref), y2: y(c.ref), stroke: 'var(--oro)', 'stroke-dasharray': '4 4', 'stroke-width': 1.5});
  if (c.bars) { const bw = Math.min(cw * 0.62, 32); c.bars.values.forEach((v, i) => { if (v == null || !isFinite(v)) return; const y0 = y(0), y1 = y(v);
    mk('rect', {x: x(i) - bw / 2, y: Math.min(y0, y1), width: bw, height: Math.max(1, Math.abs(y1 - y0)), rx: 3, fill: c.bars.color(i, v), opacity: c.faded && c.faded(i) ? 0.3 : 1}); }); }
  if (c.stack) { const bw = Math.min(cw * 0.62, 32); stackTot.forEach((_, i) => { let base = 0; c.stack.forEach(sr => { const v = sr.values[i] || 0; if (!v) return;
    mk('rect', {x: x(i) - bw / 2, y: y(base + v), width: bw, height: Math.max(1, y(base) - y(base + v)), fill: sr.color}); base += v; }); }); }
  const path = (vs) => { let d = '', pen = false; vs.forEach((v, i) => { if (v == null || !isFinite(v)) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); pen = true; }); return d; };
  if (c.line) mk('path', {d: path(c.line.values), fill: 'none', stroke: c.line.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'});
  if (c.dash) mk('path', {d: path(c.dash.values), fill: 'none', stroke: c.dash.color, 'stroke-width': 1.5, 'stroke-dasharray': '5 4'});
  const hl = mk('rect', {x: 0, y: mt, width: cw, height: H - mt - mb, fill: 'var(--verde)', opacity: 0, 'pointer-events': 'none'});
  const hit = mk('rect', {x: ml, y: mt, width: W - ml - mr, height: H - mt - mb, fill: 'transparent'});
  const near = (ev) => { const r = svg.getBoundingClientRect(); return Math.max(0, Math.min(n - 1, Math.floor(((ev.clientX - r.left) * W / r.width - ml) / cw))); };
  hit.addEventListener('mousemove', (ev) => { const i = near(ev); hl.setAttribute('x', ml + cw * i); hl.setAttribute('opacity', 0.06);
    tip.replaceChildren(...c.tip(i).map(([t, col]) => { const d = el('div', {textContent: t}); if (col) d.style.color = col; return d; })); tip.style.display = 'block';
    const r = svg.getBoundingClientRect(), bx = box.getBoundingClientRect(); let left = x(i) * r.width / W + 12; if (left + tip.offsetWidth > bx.width) left = x(i) * r.width / W - tip.offsetWidth - 12;
    tip.style.left = Math.max(0, left) + 'px'; tip.style.top = '8px'; });
  hit.addEventListener('mouseleave', () => { tip.style.display = 'none'; hl.setAttribute('opacity', 0); });
  box.prepend(svg);
}

// ---- filtros ----
function chipRow(box, items, set, label, onAll) {
  box.replaceChildren(el('button', {textContent: label, ariaPressed: String(!set.size), onclick: () => { set.clear(); onAll(); }}));
  items.forEach(([val, txt]) => box.append(el('button', {textContent: txt, ariaPressed: String(set.has(val)), onclick: () => { set.has(val) ? set.delete(val) : set.add(val); onAll(); }})));
}
$('#vtoggle').addEventListener('click', () => { const o = $('#vfilters').classList.toggle('open'); $('#vtoggle').setAttribute('aria-expanded', String(o)); });
function drawVFilters() {
  const yrs = VYEARS.filter(y => VR.some(r => r[0] === y && r[3]) || y === LASTY).reverse();
  chipRow($('#vf-anio'), yrs.map(y => [y, String(y)]), SV.anios, 'Todos', drawVentas);
  chipRow($('#vf-mes'), MESES.map((m, i) => [i + 1, m]), SV.meses, 'Todos', drawVentas);
  const u = USERS[S.user];
  if (u.ventas) $('#vf-suc').replaceChildren(...u.ventas.map(s => el('span', {className: 'lock', textContent: V.sucName[V.suc.indexOf(s)] + ' 🔒'})));
  else chipRow($('#vf-suc'), V.suc.map((s, i) => [i, V.sucName[i]]).filter(([i]) => VR.some(r => r[2] === i && SV.anios.has(r[0]) && (r[3] || r[4]))).sort((a, b) => a[1].localeCompare(b[1])), SV.sucs, 'Todas', drawVentas);
  const parts = [SV.anios.size ? [...SV.anios].sort().join(', ') : 'Todos los años', SV.meses.size ? [...SV.meses].sort((a, b) => a - b).map(m => MESES[m - 1]).join(', ') : 'todos los meses', SV.sucs.size ? [...SV.sucs].map(i => V.sucName[i]).join(', ') : 'todas las sucursales'];
  $('#vsum').textContent = parts.join(' · ');
}
const yearsSel = () => SV.anios.size ? SV.anios : new Set(VYEARS);
const inYears = (r) => yearsSel().has(r[0]);
const inPrev = (r) => yearsSel().has(r[0] + 1) && CLOSED.has((r[0] + 1) * 100 + r[1]);

// ---- vista de Dirección ----
function drawVentas() {
  drawVFilters();
  const cur = vAgg(r => inYears(r) && vPass(r)), prev = vAgg(r => inPrev(r) && vPass(r));
  const crec = cur.v / prev.v - 1;
  const kp = (label, val, subNodes, bad) => el('div', {className: 'card' + (bad ? ' k-bad' : '')}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val}), el('div', {className: 'k-sub'}, ...subNodes));
  const s = (txt, cls) => el('span', {className: cls || '', textContent: txt});
  const cards = [
    kp('Venta', comp.format(cur.v), [s(sgn(crec), crec >= 0 ? 'pos' : 'neg'), ' vs mismo periodo año anterior']),
    kp('Cumplimiento de meta', pct(cur.v / cur.mc), ['meses cerrados · avance anual ', el('b', {textContent: pct(cur.v / cur.m)})], cur.v / cur.mc < 0.9),
    kp('Gasto total', comp.format(cur.g), [el('b', {textContent: pct(cur.g / cur.v)}), ' de la venta · objetivo ' + (cur.obj ? pct(cur.obj / cur.v) : '—')]),
    kp('Desviación vs objetivo de gasto', cur.obj ? comp.format(cur.obj - cur.g) : '—', [cur.obj ? s((cur.g >= cur.obj ? 'gastó ' + pct(cur.g / cur.obj - 1) + ' más' : 'gastó ' + pct(1 - cur.g / cur.obj) + ' menos') + ' que el objetivo', cur.g > cur.obj ? 'neg' : 'pos') : 'sin objetivo de gasto en el periodo'], cur.obj && cur.g > cur.obj)];
  if (yearsSel().has(LASTY)) {
    const p = proyeccion(si => !SV.sucs.size || SV.sucs.has(si));
    cards.push(kp('Proyección de cierre ' + LASTY, pct(p.projPct), ['de la meta anual (' + comp.format(p.proj) + ') · para llegar al 100% hace falta ', el('b', {textContent: pct(p.needed)}), ` de cumplimiento en los ${p.mesesR} meses que faltan`], p.projPct < 0.9));
  }
  $('#v-kpis').replaceChildren(...cards);

  // gráfica mes a mes
  const y = Math.max(...yearsSel());
  const byM = (yy, idx) => { const a = new Array(12).fill(null); VR.forEach(r => { if (r[0] === yy && vPass(r, {ignoreMes: true}) && r[idx] != null) a[r[1] - 1] = (a[r[1] - 1] || 0) + r[idx]; }); return a; };
  const vy = byM(y, 3).map((v, i) => CLOSED.has(y * 100 + i + 1) ? v : null), vp = byM(y - 1, 3), my = byM(y, 4);
  $('#vchart-t').textContent = `Venta mes a mes ${y} contra ${y - 1}`;
  $('#vchart-n').textContent = SV.anios.size > 1 ? `Con varios años seleccionados la gráfica muestra ${y}` : 'Los meses fuera del filtro se ven tenues';
  $('#vchart-l').replaceChildren(el('span', {}, el('i', {style: 'background:var(--verde-2);height:8px;width:10px'}), String(y)), el('span', {}, el('i', {style: 'background:var(--oro)'}), String(y - 1)), el('span', {}, el('i', {style: 'background:var(--muted)'}), 'Meta ' + y));
  vchart($('#vchart'), {labels: MESES, fmt: (v) => comp.format(v), bars: {values: vy, color: () => 'var(--verde-2)'}, line: {values: vp, color: 'var(--oro)'}, dash: {values: my, color: 'var(--muted)'},
    faded: (i) => SV.meses.size && !SV.meses.has(i + 1),
    tip: (i) => [[MESL[i]], [`${y}: ${vy[i] != null ? mxn0.format(vy[i]) : '—'}`, 'var(--verde-2)'], [`${y - 1}: ${vp[i] != null ? mxn0.format(vp[i]) : '—'}` + (vy[i] && vp[i] ? ` (${sgn(vy[i] / vp[i] - 1)})` : ''), 'var(--oro)'], [`Meta: ${my[i] != null ? mxn0.format(my[i]) : '—'}` + (vy[i] && my[i] ? ` (${pct(vy[i] / my[i])})` : '')]]});

  // tabla por mes
  const multi = yearsSel().size > 1;
  const th = (txt) => el('th', {textContent: txt});
  const td = (txt, cls) => el('td', {className: 'num ' + (cls || ''), textContent: txt});
  const tm = $('#v-mes'); tm.replaceChildren(el('thead', {}, el('tr', {}, ...['Mes', 'Venta', 'Año anterior', 'Crec.', 'Meta', '% avance', 'Gasto', 'Gasto/venta', 'Obj. gasto', 'Desviación'].map(th))));
  const tb = el('tbody');
  [...yearsSel()].sort((a, b) => b - a).forEach(yy => { for (let m = 1; m <= 12; m++) { if (SV.meses.size && !SV.meses.has(m)) continue;
    const a = vAgg(r => r[0] === yy && r[1] === m && vPass(r)), p = vAgg(r => r[0] === yy - 1 && r[1] === m && vPass(r)), closed = CLOSED.has(yy * 100 + m);
    if (!a.v && !a.m) continue;
    const cr = closed && p.v ? a.v / p.v - 1 : NaN, av = closed && a.m ? a.v / a.m : NaN;
    tb.append(el('tr', {}, el('td', {textContent: multi ? MESES[m - 1] + ' ' + yy : MESL[m - 1]}), td(closed ? mxn0.format(a.v) : '—'), td(p.v ? mxn0.format(p.v) : '—'), td(sgn(cr), cr < 0 ? 'neg' : 'pos'), td(a.m ? mxn0.format(a.m) : '—'),
      el('td', {className: 'num sem ' + semCls(av), textContent: isFinite(av) ? pct(av) : '—'}), td(closed ? mxn0.format(a.g) : '—'), td(closed && a.v ? pct(a.g / a.v) : '—', a.obj && a.g > a.obj ? 'neg' : ''),
      td(a.obj ? mxn0.format(a.obj) : '—'), td(a.obj ? mxn0.format(a.obj - a.g) : '—', a.obj ? (a.obj - a.g < 0 ? 'neg' : 'pos') : ''))); } });
  tb.append(el('tr', {className: 'tot'}, el('td', {textContent: 'Total'}), td(mxn0.format(cur.v)), td(mxn0.format(prev.v)), td(sgn(crec)), td(mxn0.format(cur.m)), td(pct(cur.v / cur.mc) + ' · anual ' + pct(cur.v / cur.m)), td(mxn0.format(cur.g)), td(pct(cur.g / cur.v)), td(cur.obj ? mxn0.format(cur.obj) : '—'), td(cur.obj ? mxn0.format(cur.obj - cur.g) : '—')));
  tm.append(tb);

  // por sucursal
  const sucRows = V.suc.map((k, i) => i).filter(i => vAllowed(i)).map(i => {
    const a = vAgg(r => r[2] === i && inYears(r) && vPass(r, {ignoreSuc: true})), p = vAgg(r => r[2] === i && inPrev(r) && vPass(r, {ignoreSuc: true}));
    const anual = vAgg(r => r[2] === i && inYears(r));
    // crecimiento comparable: solo meses con venta en ambos años
    let cm = 0, pm = 0, partial = false;
    VR.forEach(r => { if (r[2] !== i || !inYears(r) || !vPass(r, {ignoreSuc: true}) || !r[3] || !CLOSED.has(r[0] * 100 + r[1])) return;
      const pr = VR.find(q => q[2] === i && q[0] === r[0] - 1 && q[1] === r[1]);
      if (pr && pr[3]) { cm += r[3]; pm += pr[3]; } else partial = true; });
    return {i, a, p, anualM: anual.m, lfl: pm ? cm / pm - 1 : NaN, partial};
  }).filter(o => o.a.v || o.a.m);
  const clickRow = (tr, i) => { tr.className = 'clk' + (SV.sucs.has(i) ? ' sel' : ''); tr.addEventListener('click', () => { SV.sucs = SV.sucs.size === 1 && SV.sucs.has(i) ? new Set() : new Set([i]); drawVentas(); }); return tr; };
  const ts = $('#v-suc'); ts.replaceChildren(el('thead', {}, el('tr', {}, ...['Sucursal', 'Venta', 'Meta (cerrada)', 'Cumplimiento', 'Avance anual', 'Año anterior', 'Diferencia', 'Crec.'].map(th))));
  const tsb = el('tbody');
  sucRows.slice().sort((x, z) => (z.a.v / z.a.mc || 0) - (x.a.v / x.a.mc || 0)).forEach(o => { const c1 = o.a.v / o.a.mc, c2 = o.a.v / o.anualM, d = o.a.v - o.p.v, cr = o.lfl;
    tsb.append(clickRow(el('tr', {}, el('td', {textContent: V.sucName[o.i]}), td(mxn0.format(o.a.v)), td(mxn0.format(o.a.mc)), el('td', {className: 'num sem ' + semCls(c1), textContent: pct(c1)}), el('td', {className: 'num sem ' + semCls(c2 / (o.a.mc / o.anualM)), textContent: pct(c2)}),
      td(o.p.v ? mxn0.format(o.p.v) : '—'), td(o.p.v ? mxn0.format(d) : '—', d < 0 ? 'neg' : 'pos'), td(sgn(cr) + (o.partial && isFinite(cr) ? ' *' : ''), cr < 0 ? 'neg' : 'pos')), o.i)); });
  const all = sucRows.reduce((s, o) => ({v: s.v + o.a.v, mc: s.mc + o.a.mc, am: s.am + o.anualM, p: s.p + o.p.v}), {v: 0, mc: 0, am: 0, p: 0});
  tsb.append(el('tr', {className: 'tot'}, el('td', {textContent: 'Total'}), td(mxn0.format(all.v)), td(mxn0.format(all.mc)), td(pct(all.v / all.mc)), td(pct(all.v / all.am)), td(mxn0.format(all.p)), td(mxn0.format(all.v - all.p)), td(sgn(all.v / all.p - 1))));
  ts.append(tsb);

  // gasto por sucursal
  const tg = $('#v-gasto'); tg.replaceChildren(el('thead', {}, el('tr', {}, ...['Sucursal', 'Gasto total', 'Operativo', 'Comisiones', '% de la venta', 'Objetivo', 'Objetivo % venta', 'Desviación', 'vs año anterior'].map(th))));
  const tgb = el('tbody');
  sucRows.slice().sort((x, z) => (z.a.g / z.a.v || 0) - (x.a.g / x.a.v || 0)).forEach(o => { const a = o.a, d = a.obj - a.g, dp = a.g - o.p.g;
    tgb.append(clickRow(el('tr', {}, el('td', {textContent: V.sucName[o.i]}), td(mxn0.format(a.g)), td(mxn0.format(a.gop)), td(mxn0.format(a.com)), td(a.v ? pct(a.g / a.v) : '—', a.obj && a.g > a.obj ? 'neg' : ''), td(a.obj ? mxn0.format(a.obj) : '—'), td(a.obj && a.v ? pct(a.obj / a.v) : '—'),
      td(a.obj ? mxn0.format(d) : '—', a.obj ? (d < 0 ? 'neg' : 'pos') : ''), td(o.p.g ? (dp >= 0 ? '+' : '') + mxn0.format(dp) : '—', o.p.g ? (dp > 0 ? 'neg' : 'pos') : '')), o.i)); });
  tgb.append(el('tr', {className: 'tot'}, el('td', {textContent: 'Total'}), td(mxn0.format(cur.g)), td(mxn0.format(cur.gop)), td(mxn0.format(cur.com)), td(pct(cur.g / cur.v)), td(cur.obj ? mxn0.format(cur.obj) : '—'), td(cur.obj ? pct(cur.obj / cur.v) : '—'), td(cur.obj ? mxn0.format(cur.obj - cur.g) : '—'), td(prev.g ? (cur.g - prev.g >= 0 ? '+' : '') + mxn0.format(cur.g - prev.g) : '—')));
  tg.append(tgb);

  // semáforo
  $('#vheat-t').textContent = 'Semáforo de cumplimiento ' + y;
  const th2 = $('#v-heat'); th2.replaceChildren(el('thead', {}, el('tr', {}, th('Sucursal'), ...MESES.map(th), th('Acum.'))));
  const thb = el('tbody');
  sucRows.forEach(o => { const cells = MESES.map((_, mi) => { const a = vAgg(r => r[2] === o.i && r[0] === y && r[1] === mi + 1); const c = CLOSED.has(y * 100 + mi + 1) && a.m ? a.v / a.m : NaN;
      return el('td', {className: 'sem ' + semCls(c), textContent: isFinite(c) ? Math.round(c * 100) + '%' : ''}); });
    const ac = vAgg(r => r[2] === o.i && r[0] === y), acc = ac.v / ac.mc;
    thb.append(clickRow(el('tr', {}, el('td', {textContent: V.sucName[o.i]}), ...cells, el('td', {className: 'sem ' + semCls(acc), style: 'font-weight:600', textContent: isFinite(acc) ? Math.round(acc * 100) + '%' : ''})), o.i)); });
  th2.append(thb);
}

// ---- vista del vendedor: solo porcentajes ----
function drawMeta() {
  const MM = CTX.MM || [];
  const yrs = [...new Set(MM.filter(x => x.cerrado && x.r != null).map(x => x.anio))].sort((p, q) => q - p);
  if (!yrs.includes(SV.manio)) SV.manio = yrs[0];
  const yb = $('#mf-anio'); yb.replaceChildren(...yrs.map(y => el('button', {textContent: String(y), ariaPressed: String(y === SV.manio), onclick: () => { SV.manio = y; drawMeta(); }})));
  const y = SV.manio, row = (m) => MM.find(x => x.anio === y && x.mes === m);
  const cum = [], acc = [], gro = []; let srw = 0, sw = 0, srwG = 0, prevG = 0, lc = 0, restW = 0, mesesR = 0;
  for (let m = 1; m <= 12; m++) { const x = row(m), closed = !!(x && x.cerrado && x.r != null);
    if (closed) { lc = m; srw += x.r * x.w; sw += x.w; if (x.g) { srwG += x.r * x.w; prevG += x.r * x.w / x.g; } }
    else if (x && x.w) { restW += x.w; mesesR++; }
    cum.push(closed ? x.r : null); acc.push(closed && sw ? srw / sw : null); gro.push(closed && x.g != null ? x.g - 1 : null); }
  const g = prevG ? srwG / prevG - 1 : NaN;
  const kp = (label, val, sub, bad) => el('div', {className: 'card' + (bad ? ' k-bad' : '')}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val}), el('div', {className: 'k-sub', textContent: sub}));
  const cards = [
    kp('Cumplimiento de ' + MESL[lc - 1].toLowerCase(), pct(cum[lc - 1]), 'de tu meta del mes', cum[lc - 1] < 0.9),
    kp('Acumulado del año', pct(srw / sw), 'de la meta de enero a ' + MESL[lc - 1].toLowerCase(), srw / sw < 0.9),
    kp('Avance de la meta anual', pct(srw), 'llevas este porcentaje de la meta de todo ' + y),
    kp('Contra el año pasado', sgn(g), 'mismo periodo de ' + (y - 1), g < 0)];
  if (y === yrs[0] && restW > 0) { const needed = (1 - srw) / restW;
    cards.push(kp('Lo que necesitas', pct(needed), `de cumplimiento en cada uno de los ${mesesR} meses que faltan para llegar al 100% anual`, needed > 1.2)); }
  $('#m-kpis').replaceChildren(...cards);
  const pf = (v) => Math.round(v * 100) + '%';
  vchart($('#mchart1'), {labels: MESES, fmt: pf, ref: 1, bars: {values: cum, color: (i, v) => semCol(v)}, line: {values: acc, color: 'var(--fg)'},
    tip: (i) => [[MESL[i] + ' ' + y], ['Mes: ' + (cum[i] != null ? pct(cum[i]) : '—')], ['Acumulado: ' + (acc[i] != null ? pct(acc[i]) : '—')]]});
  vchart($('#mchart2'), {labels: MESES, fmt: (v) => (v > 0 ? '+' : '') + pf(v), bars: {values: gro, color: (i, v) => v >= 0 ? 'var(--b0)' : 'var(--b4)'},
    tip: (i) => [[MESL[i] + ' ' + y + ' vs ' + (y - 1)], [gro[i] != null ? sgn(gro[i]) : 'sin dato']]});
  const tm = $('#m-mes'); tm.replaceChildren(el('thead', {}, el('tr', {}, ...['Mes', 'Cumplimiento del mes', 'Acumulado', 'vs año pasado'].map(t => el('th', {textContent: t})))));
  const tb = el('tbody');
  for (let m = 1; m <= 12; m++) { const c = cum[m - 1];
    tb.append(el('tr', {}, el('td', {textContent: MESL[m - 1]}), el('td', {className: 'num sem ' + semCls(c ?? NaN), textContent: c != null ? pct(c) : '—'}), el('td', {className: 'num', textContent: acc[m - 1] != null ? pct(acc[m - 1]) : '—'}),
      el('td', {className: 'num ' + (gro[m - 1] < 0 ? 'neg' : 'pos'), textContent: gro[m - 1] != null ? sgn(gro[m - 1]) : '—'}))); }
  tm.append(tb);
}


// ================= SITUACIÓN FINANCIERA =================
const F = CTX.F;
const FC = F.cortes;
const SF = {i: FC.length - 1, j: FC.length - 2};
const fLabel = (c) => { const [y, m, d] = c.fecha.split('-'); const last = new Date(+y, +m, 0).getDate(); return (+d === last ? '' : +d + ' ') + MESES[m - 1] + ' ' + y.slice(2); };
const fSelC = $('#ff-corte'), fSelP = $('#ff-comp');
FC.forEach((c, i) => { fSelC.append(new Option(fdate(c.fecha), i)); fSelP.append(new Option(fdate(c.fecha), i)); });
fSelC.addEventListener('change', () => { SF.i = +fSelC.value; SF.j = Math.max(0, SF.i - 1); drawFin(); });
fSelP.addEventListener('change', () => { SF.j = +fSelP.value; drawFin(); });
const NOMBRE = {inventario: '📦 Inventario', bancos: '🏦 Bancos', clientes: '👥 Clientes', proveedores: '🧾 Proveedores', deuda: '📉 Deuda bancaria'};
function drawFin() {
  fSelC.value = SF.i; fSelP.value = SF.j;
  const C = FC[SF.i], P = FC[SF.j], c = C.tot, p = P.tot;
  const dTxt = (a, b) => b == null ? '—' : (a - b >= 0 ? '+' : '−') + mxn0.format(Math.abs(a - b)).replace('-', '');
  const dCls = (a, b, goodUp) => b == null || Math.abs(a - b) < 1 ? '' : ((a > b) === goodUp ? 'pos' : 'neg');
  const ratio = (t) => ({end: t.total_pasivos / t.total_activos, liq: (t.bancos + t.clientes) / t.total_pasivos, inv: t.inventario / t.total_activos});
  const rc = ratio(c), rp = ratio(p);
  const pts = (a, b) => { const v = (a - b) * 100; return (v >= 0 ? '+' : '−') + Math.abs(v).toLocaleString('es-MX', {maximumFractionDigits: 1}) + ' pts'; };
  const kp = (label, val, sub, cls, bad) => el('div', {className: 'card' + (bad ? ' k-bad' : '')}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val}), el('div', {className: 'k-sub'}, el('span', {className: cls, textContent: sub}), ' vs ' + fdate(P.fecha)));
  $('#f-kpis').replaceChildren(
    kp('Total activos', comp.format(c.total_activos), dTxt(c.total_activos, p.total_activos), dCls(c.total_activos, p.total_activos, true)),
    kp('Total pasivos', comp.format(c.total_pasivos), dTxt(c.total_pasivos, p.total_pasivos), dCls(c.total_pasivos, p.total_pasivos, false)),
    kp('Capital contable', comp.format(c.capital), dTxt(c.capital, p.capital), dCls(c.capital, p.capital, true)),
    kp('Endeudamiento', pct(rc.end), pts(rc.end, rp.end), dCls(rc.end, rp.end, false)),
    kp('Liquidez inmediata', rc.liq.toLocaleString('es-MX', {maximumFractionDigits: 2}) + ' veces', (rc.liq - rp.liq >= 0 ? '+' : '−') + Math.abs(rc.liq - rp.liq).toFixed(2), dCls(rc.liq, rp.liq, true), rc.liq < 1));
  $('#f-kpis').lastChild.append(el('div', {className: 'k-sub', textContent: '(bancos + clientes) entre pasivos'}));
  // estado en dos columnas
  const th = (txt) => el('th', {textContent: txt});
  const hdr = () => el('thead', {}, el('tr', {}, th('Concepto'), th(fLabel(C)), th('vs ' + fLabel(P))));
  const row = (cls, name, a, b, goodUp) => el('tr', {className: cls}, el('td', {textContent: name}), el('td', {className: 'num', textContent: mxn0.format(a)}), el('td', {className: 'num dl ' + dCls(a, b, goodUp), textContent: dTxt(a, b)}));
  const detPrev = (k, name) => { const f = P.det[k].find(d => d[0].toUpperCase() === name.toUpperCase()); return f ? f[1] : 0; };
  const block = (tb, k, goodUp) => { tb.append(row('h', NOMBRE[k], c[k], p[k], goodUp));
    C.det[k].forEach(([n, v]) => { const inc = /incobrable/i.test(n); tb.append(row('d', inc ? '(−) ' + n : n, v, detPrev(k, n), inc ? false : goodUp)); }); };
  const ta = el('tbody'); ['inventario', 'bancos', 'clientes'].forEach(k => block(ta, k, true)); ta.append(row('t', 'Total activos', c.total_activos, p.total_activos, true));
  $('#f-act').replaceChildren(hdr(), ta);
  const tp = el('tbody'); ['proveedores', 'deuda'].forEach(k => block(tp, k, false)); tp.append(row('t', 'Total pasivos', c.total_pasivos, p.total_pasivos, false), row('t', '🧮 Capital contable', c.capital, p.capital, true));
  $('#f-pas').replaceChildren(hdr(), tp);
  $('#f-na').textContent = 'Al ' + fdate(C.fecha) + (C.tc ? ' · tipo de cambio DOF ' + C.tc.toFixed(4) : '');
  $('#f-np').textContent = 'Capital contable = total activos − total pasivos';
  // gráfica
  const S3 = [['inventario', 'var(--b0)', 'Inventario'], ['bancos', 'var(--b1)', 'Bancos'], ['clientes', 'var(--b2)', 'Clientes']];
  $('#f-leg').replaceChildren(...S3.map(([, col, n]) => el('span', {}, el('i', {style: `background:${col};height:8px;width:10px`}), n)), el('span', {}, el('i', {style: 'background:var(--b5)'}), 'Pasivos'), el('span', {}, el('i', {style: 'background:var(--fg)'}), 'Capital contable'));
  vchart($('#fchart'), {labels: FC.map(fLabel), h: 250, fmt: (v) => comp.format(v),
    stack: S3.map(([k, col]) => ({values: FC.map(f => f.tot[k]), color: col})),
    line: {values: FC.map(f => f.tot.total_pasivos), color: 'var(--b5)'}, dash: {values: FC.map(f => f.tot.capital), color: 'var(--fg)'},
    tip: (i) => { const t = FC[i].tot; return [[fdate(FC[i].fecha)], ['Activos ' + mxn0.format(t.total_activos)], ['  Inventario ' + comp.format(t.inventario) + ' · Bancos ' + comp.format(t.bancos) + ' · Clientes ' + comp.format(t.clientes)], ['Pasivos ' + mxn0.format(t.total_pasivos), 'var(--b5)'], ['Capital ' + mxn0.format(t.capital)]]; }});
  // todos los cortes
  const H = [['Inventario', 'inventario'], ['Bancos', 'bancos'], ['Clientes', 'clientes'], ['Total activos', 'total_activos'], ['Proveedores', 'proveedores'], ['Deuda bancaria', 'deuda'], ['Total pasivos', 'total_pasivos'], ['Capital contable', 'capital']];
  const order = FC.map((_, i) => i).reverse();
  const hist = $('#f-hist'); hist.replaceChildren(el('thead', {}, el('tr', {}, th(''), ...order.map(i => { const h = th(fLabel(FC[i])); if (i === SF.i) h.style.color = 'var(--verde)'; return h; }))));
  const hb = el('tbody');
  H.forEach(([n, k]) => hb.append(el('tr', {className: /total|capital/i.test(n) ? 'tot-soft' : ''}, el('td', {textContent: n, style: /Total|Capital/.test(n) ? 'font-weight:600' : ''}), ...order.map(i => el('td', {className: 'num', textContent: comp.format(FC[i].tot[k]), style: i === SF.i ? 'background:var(--verde-claro)' : ''})))));
  hb.append(el('tr', {}, el('td', {textContent: 'Endeudamiento', style: 'font-weight:600'}), ...order.map(i => el('td', {className: 'num', textContent: pct(FC[i].tot.total_pasivos / FC[i].tot.total_activos)}))));
  hist.append(hb);
  const chk = $('#f-check'); chk.className = F.avisos.length ? 'warn-line' : 'ok-line';
  chk.textContent = F.avisos.length ? '⚠ Revisar: ' + F.avisos.join(' · ') : `✓ Los ${FC.length} cortes cuadran: activos = inventario + bancos + clientes, y activos = pasivos + capital contable.`;
}


// ================= ESTADO DE RESULTADOS =================
const ER = CTX.ER;
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const findL = (p) => ER.lineas.find(l => norm(l.n).startsWith(p));
const L = {ventas: findL('ventas netas'), costo: findL('costo de ventas'), bruta: findL('utilidad bruta'), oper: findL('utilidad de operacion'), neta: findL('utilidad neta')};
const SR = {meses: new Set(), modo: 'pesos'};
const rMeses = () => SR.meses.size ? ER.meses.filter(m => SR.meses.has(m)) : ER.meses;
const rSum = (l, ms) => ms.reduce((s, m) => s + (l.v[m - 1] || 0), 0);
// alertas: márgenes fuera de lo normal y ventas que no coinciden con datos_macro_ventas
function rAlertas() {
  const out = [...ER.avisos];
  const mb = ER.meses.map(m => ({m, p: L.bruta.v[m - 1] / L.ventas.v[m - 1]}));
  const med = mb.map(x => x.p).sort((a, b) => a - b)[Math.floor(mb.length / 2)];
  const raros = mb.filter(x => Math.abs(x.p - med) > 0.15);
  if (raros.length) {
    const txt = raros.map(x => `${MESL[x.m - 1].toLowerCase()} ${pct(x.p)}`).join(', ');
    const ms = raros.map(x => x.m), jun = rSum(L.bruta, ms) / rSum(L.ventas, ms);
    out.push(`Margen bruto fuera de lo normal en ${txt} (lo usual es cerca de ${pct(med)}).` + (raros.length > 1 ? ` Juntos dan ${pct(jun)}: parece un desfase de inventario o costo entre esos meses.` : ''));
  }
  // margen bruto por línea (renglones con el mismo nombre en ventas y en costo)
  const kids = (l) => { const i = ER.lineas.indexOf(l), out = []; for (const h of ER.lineas.slice(i + 1)) { if (h.nivel <= l.nivel) break; out.push(h); } return out; };
  kids(L.ventas).forEach(v => { const c = kids(L.costo).find(x => norm(x.n) === norm(v.n)); if (!c) return;
    const sv = rSum(v, ER.meses), sc = rSum(c, ER.meses);
    if (sv && (sv - sc) / sv < 0.05) out.push(`${v.n}: en lo que va del año vendió ${mxn0.format(sv)} con un costo de ${mxn0.format(sc)}; margen bruto ${pct((sv - sc) / sv)}. Revisar si es pérdida real o cómo se asigna el costo a esta línea.`); });
  ER.meses.forEach(m => { let mv = 0, any = false; VR.forEach(r => { if (r[0] === ER.anio && r[1] === m && r[3]) { mv += r[3]; any = true; } });
    const d = L.ventas.v[m - 1] - mv;
    if (any && Math.abs(d) > 1000) out.push(`Ventas netas de ${MESL[m - 1].toLowerCase()}: ${mxn0.format(L.ventas.v[m - 1])} aquí y ${mxn0.format(mv)} en datos_macro_ventas (diferencia ${d > 0 ? '+' : '−'}${mxn0.format(Math.abs(d))}).`); });
  return out;
}
let R_ALERTAS = null;
function drawRes() {
  const ms = rMeses();
  chipRow($('#rf-mes'), ER.meses.map(m => [m, MESES[m - 1]]), SR.meses, 'Todos', drawRes);
  const vt = rSum(L.ventas, ms), ub = rSum(L.bruta, ms), uo = rSum(L.oper, ms), un = rSum(L.neta, ms);
  const gastos = ER.lineas.filter(l => l.nivel === 1 && /^gastos de (distribucion|operacion|administracion)/.test(norm(l.n)));
  const gt = gastos.reduce((s, l) => s + rSum(l, ms), 0);
  const per = ms.length === ER.meses.length && !SR.meses.size ? 'ene–' + MESES[ms[ms.length - 1] - 1] + ' ' + ER.anio : ms.map(m => MESES[m - 1]).join(', ');
  const kp = (label, val, sub, bad) => el('div', {className: 'card' + (bad ? ' k-bad' : '')}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val}), el('div', {className: 'k-sub'}, ...sub));
  $('#r-kpis').replaceChildren(
    kp('Ventas netas', comp.format(vt), [per]),
    kp('Utilidad bruta', comp.format(ub), ['margen bruto ', el('b', {textContent: pct(ub / vt)})], ub < 0),
    kp('Gastos generales', comp.format(gt), [el('b', {textContent: pct(gt / vt)}), ' de las ventas · distribución, operación y administración']),
    kp('Utilidad de operación', comp.format(uo), ['margen operativo ', el('b', {textContent: pct(uo / vt)})], uo < 0),
    kp('Utilidad neta', comp.format(un), ['margen neto ', el('b', {textContent: pct(un / vt)})], un < 0));
  if (!R_ALERTAS) R_ALERTAS = rAlertas();
  const ab = $('#r-alert-box'); ab.hidden = !R_ALERTAS.length; $('#r-alert').replaceChildren(...R_ALERTAS.map(t => el('li', {textContent: t})));
  // estado acumulado
  $('#r-st-t').textContent = 'Estado de resultados · ' + per;
  $('#r-st-n').textContent = ms.length > 1 ? 'Suma de los meses seleccionados · % sobre ventas netas' : '% sobre ventas netas';
  const th = (x) => el('th', {textContent: x});
  const tb = el('tbody');
  ER.lineas.forEach(l => { const v = rSum(l, ms); if (l.v.every(x => x == null)) return;
    const cls = l.res ? 't' : l.nivel === 0 ? 'h' : l.nivel === 2 ? 'd' : '';
    const tr = el('tr', {className: cls}, el('td', {textContent: l.n, style: l.nivel === 1 ? 'padding-left:10px' : l.nivel === 2 ? 'padding-left:26px' : ''}),
      el('td', {className: 'num' + (l.res && v < 0 ? ' neg' : ''), textContent: mxn0.format(v)}), el('td', {className: 'num dl', textContent: vt ? pct(v / vt) : '—'}));
    if (l.res) tr.querySelectorAll('td').forEach(td => { td.style.borderTop = '1px solid var(--fg)'; td.style.borderBottom = '0'; });
    tb.append(tr); });
  $('#r-st').replaceChildren(el('thead', {}, el('tr', {}, th('Concepto'), th('Monto'), th('% ventas'))), tb);
  // gráficas
  const lab = MESES, inSel = (i) => ms.includes(i + 1);
  const val = (l) => lab.map((_, i) => ER.meses.includes(i + 1) ? l.v[i] : null);
  vchart($('#rchart'), {labels: lab, fmt: (v) => comp.format(v), bars: {values: val(L.neta), color: (i, v) => v >= 0 ? 'var(--b0)' : 'var(--b4)'}, line: {values: val(L.oper), color: 'var(--oro)'},
    faded: (i) => !inSel(i), tip: (i) => [[MESL[i]], ['Utilidad neta ' + (L.neta.v[i] != null ? mxn0.format(L.neta.v[i]) : '—')], ['Utilidad de operación ' + (L.oper.v[i] != null ? mxn0.format(L.oper.v[i]) : '—'), 'var(--oro)'], ['Ventas ' + (L.ventas.v[i] != null ? mxn0.format(L.ventas.v[i]) : '—')]]});
  const mg = (l) => lab.map((_, i) => ER.meses.includes(i + 1) ? l.v[i] / L.ventas.v[i] : null);
  vchart($('#rchart2'), {labels: lab, h: 200, fmt: (v) => Math.round(v * 100) + '%', ref: 0, bars: {values: mg(L.neta), color: (i, v) => v >= 0 ? 'var(--b0)' : 'var(--b4)'}, line: {values: mg(L.bruta), color: 'var(--fg)'},
    faded: (i) => !inSel(i), tip: (i) => [[MESL[i]], ['Margen bruto ' + (L.bruta.v[i] != null ? pct(L.bruta.v[i] / L.ventas.v[i]) : '—')], ['Margen neto ' + (L.neta.v[i] != null ? pct(L.neta.v[i] / L.ventas.v[i]) : '—')]]});
  // mes por mes
  const mbox = $('#rf-modo'); mbox.replaceChildren(...[['pesos', 'Pesos'], ['pct', '% de ventas']].map(([k, tx]) => el('button', {textContent: tx, ariaPressed: String(SR.modo === k), onclick: () => { SR.modo = k; drawRes(); }})));
  $('#r-mes-n').textContent = SR.modo === 'pesos' ? 'Montos por mes y acumulado' : 'Cada concepto como % de las ventas netas del mes';
  const f = (v, base) => v == null ? '—' : SR.modo === 'pesos' ? comp.format(v) : pct(v / base);
  const tm = $('#r-mes'); tm.replaceChildren(el('thead', {}, el('tr', {}, th(''), ...ms.map(m => th(MESES[m - 1])), th('Acum.'))));
  const tbm = el('tbody');
  ER.lineas.filter(l => l.nivel <= 1 && !l.v.every(x => x == null)).forEach(l => tbm.append(el('tr', {}, el('td', {textContent: l.n, style: (l.res ? 'font-weight:600;' : '') + (l.nivel ? 'padding-left:18px' : '')}),
    ...ms.map(m => el('td', {className: 'num' + (l.res && l.v[m - 1] < 0 ? ' neg' : ''), textContent: f(l.v[m - 1], L.ventas.v[m - 1]), style: l.res ? 'font-weight:600' : ''})),
    el('td', {className: 'num', style: 'font-weight:600;background:var(--bg)', textContent: f(rSum(l, ms), vt)}))));
  tm.append(tbm);
}


// ================= INVENTARIOS =================
const I = CTX.I;
// alertas [linea, clave, desc, existencia, ventas_mes, cobertura, rop, eoq, urgencia, precio, almacenes[]]
// detalle [almacen, linea, clave, desc, clasif, existencia, costo, valor, cobertura, ultima_venta, precio, precio_liq]
// cedis   [cedis, linea, clave, desc, existencia, valor, dias, ultimo_traspaso, destino, precio]
const ALM_EXCL = new Set(['CONSIGNACIONES', 'CEDIS', 'CEDIS COMITAN', 'CADUCADOS']);
const ALM_NOM = {'COMITAN': 'Matriz Comitán', 'TUXTLA GUTIERREZ': 'Tuxtla', 'SUC PANTEON': 'Central de Abastos (Panteón)', 'RUTA COMITAN': 'Ruta Comitán', 'RUTA TUXTLA': 'Ruta Tuxtla', 'TAPACHULA': 'Tapachula', 'VILLAFLORES': 'Villaflores', 'CINTALAPA': 'Cintalapa', 'MERIDA': 'Mérida', 'TRIUNFO': 'Triunfo', 'CEDIS COMITAN': 'CEDIS Comitán', 'CADUCADOS': 'Caducados', 'CONSIGNACIONES': 'Consignaciones', 'PROYECTOS ESPECIALES': 'Proyectos Especiales', 'CONFECCIONES': 'Confecciones'};
const almN = (a) => ALM_NOM[a] || a;
const DEST2ALM = {'TUXTLA': 'TUXTLA GUTIERREZ'};
const destAlm = (d) => DEST2ALM[d] || d;
const SI = {urg: new Set(), alm: null, q: '', dest: '', pclas: new Set(), pq: '', resp: Object.assign({}, I.resp || {})};
const respKey = (c) => I.fecha + '|' + c[0] + '|' + c[2];
const pill = (txt) => el('span', {className: 'pill p-' + String(txt).toUpperCase(), textContent: txt});
const cob = (v, cls) => v == null ? (cls === 'MUERTO' ? 'sin venta' : '∞') : v.toLocaleString('es-MX', {maximumFractionDigits: 1}) + ' m';
const n0 = (v) => v == null ? '—' : v.toLocaleString('es-MX', {maximumFractionDigits: 0});
const th = (x) => el('th', {textContent: x});
const tdn = (x, cls) => el('td', {className: 'num ' + (cls || ''), textContent: x});
const CLS_ORD = {'MUERTO': 0, 'CRÍTICO': 1, 'CRITICO': 1, 'LENTO': 2};
['#i-det-q', '#p-q'].forEach(s => $(s).addEventListener('input', (e) => { if (s === '#i-det-q') { SI.q = e.target.value.trim().toUpperCase(); drawInvDet(); } else { SI.pq = e.target.value.trim().toUpperCase(); drawMiDet(); } }));

function respButtons(c, onChange) {
  const k = respKey(c), v = SI.resp[k];
  const mkb = (val, txt) => el('button', {className: val, textContent: txt, ariaPressed: String(v === val), onclick: async (ev) => { ev.stopPropagation(); const nuevo = v === val ? undefined : val; SI.resp[k] = nuevo; onChange();
    const err = await CTX.db.guardarRespuesta(c, nuevo); if (err) { SI.resp[k] = v; onChange(); alert('No se pudo guardar la respuesta: ' + err); } }});
  return el('div', {className: 'resp'}, mkb('si', 'Lo tomo'), mkb('no', 'No por ahora'));
}
const respTxt = (c) => ({si: 'Lo toma', no: 'No lo toma'})[SI.resp[respKey(c)]] || 'Pendiente';

// ---- Dirección ----
function drawInv() {
  const K = I.kpis;
  $('#i-fecha').textContent = 'Análisis de inventario al ' + fdate(I.fecha);
  const kp = (label, val, sub, bad) => el('div', {className: 'card' + (bad ? ' k-bad' : '')}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val}), el('div', {className: 'k-sub', textContent: sub}));
  $('#i-kpis').replaceChildren(
    kp('Valor total del inventario', comp.format(K['Valor total inventario']), n0(I.clasif.reduce((s, c) => s + c[2], 0)) + ' SKUs con existencia'),
    kp('Inventario problemático', comp.format(K['Inventario problematico']), K['% parado'] + '% del valor está parado', true),
    kp('SKUs problemáticos', n0(K['SKUs problematicos']), n0(K['SKUs muertos']) + ' muertos (sin ventas)', true),
    kp('SKUs sanos', n0(K['SKUs normales']), n0(K['SKUs nuevos']) + ' nuevos'),
    kp('Alertas de reorden', String(I.alertas.length), I.alertas.filter(x => x[8] === 'CRITICO').length + ' críticas · ' + I.alertas.filter(x => x[8] === 'URGENTE').length + ' urgentes', I.alertas.some(x => x[8] === 'CRITICO')));
  // clasificación
  const COLS = {'MUERTO': 'var(--b5)', 'CRÍTICO': 'var(--b4)', 'LENTO': 'var(--b2)', 'NUEVO': 'var(--b1)', 'NORMAL': 'var(--b0)'};
  const tot = I.clasif.reduce((s, c) => s + c[3], 0);
  $('#i-bar').replaceChildren(...I.clasif.map(c => { const d = el('div', {title: c[0] + ' ' + pct(c[3] / tot)}); d.style.width = (c[3] / tot * 100) + '%'; d.style.background = COLS[c[0]] || 'var(--muted)'; return d; }));
  $('#i-clas').replaceChildren(el('thead', {}, el('tr', {}, ...['Clasificación', 'Criterio', 'SKUs', 'Valor', '%', 'Desc. liq.'].map(th))),
    el('tbody', {}, ...I.clasif.map(c => el('tr', {}, el('td', {}, pill(c[0])), el('td', {className: 'wrap', textContent: c[1], style: 'text-align:left;font-size:12px;color:var(--muted)'}), tdn(n0(c[2])), tdn(comp.format(c[3])), tdn(pct(c[3] / tot)), tdn(c[4])))));
  // top líneas
  const mx = Math.max(...I.top.map(x => x[4]));
  $('#i-top').replaceChildren(...I.top.slice(0, 12).map(x => { const tr = el('div', {className: 'track'}); const b = el('div'); b.style.width = (x[4] / mx * 100) + '%'; b.style.background = 'var(--b4)'; tr.append(b);
    return el('div', {className: 'hb', title: `${x[1]} muertos · ${x[2]} críticos · ${x[3]} lentos`}, el('span', {textContent: x[0]}), tr, el('span', {className: 'num', textContent: comp.format(x[4]) + ' · ' + (x[1] + x[2] + x[3]) + ' SKUs'})); }));
  // por almacén
  const g = new Map(); I.detalle.forEach(d => { const o = g.get(d[0]) || {v: 0, n: 0, m: 0, c: 0, l: 0}; o.v += d[7] || 0; o.n++; if (d[4] === 'MUERTO') o.m++; else if (d[4] === 'LENTO') o.l++; else o.c++; g.set(d[0], o); });
  const alms = [...g.entries()].sort((a, b) => b[1].v - a[1].v);
  if (!SI.alm) SI.alm = alms[0][0];
  const ta = el('tbody');
  alms.forEach(([a, o]) => { const tr = el('tr', {className: 'clk' + (a === SI.alm ? ' sel' : '')}, el('td', {}, almN(a), ALM_EXCL.has(a) ? el('span', {className: 'soon', style: 'margin-left:8px', textContent: 'solo Dirección'}) : ''), tdn(comp.format(o.v)), tdn(n0(o.n)), tdn(n0(o.m)), tdn(n0(o.c)), tdn(n0(o.l)));
    tr.addEventListener('click', () => { SI.alm = a; drawInv(); document.getElementById('i-det-t').scrollIntoView({block: 'nearest'}); }); ta.append(tr); });
  $('#i-alm').replaceChildren(el('thead', {}, el('tr', {}, ...['Almacén', 'Valor problemático', 'SKUs', 'Muertos', 'Críticos', 'Lentos'].map(th))), ta);
  const sel = $('#i-det-alm'); sel.replaceChildren(...alms.map(([a]) => new Option(almN(a), a))); sel.value = SI.alm; sel.onchange = () => { SI.alm = sel.value; drawInv(); };
  drawInvDet();
  // alertas
  const urgs = ['CRITICO', 'URGENTE', 'PRONTO'];
  chipRow($('#i-al-urg'), urgs.map(u => [u, u[0] + u.slice(1).toLowerCase()]), SI.urg, 'Todas', drawInv);
  const al = I.alertas.filter(x => !SI.urg.size || SI.urg.has(x[8])).sort((a, b) => urgs.indexOf(a[8]) - urgs.indexOf(b[8]) || a[5] - b[5]);
  $('#i-al').replaceChildren(el('thead', {}, el('tr', {}, ...['Urgencia', 'Producto', 'Línea', 'Existencia', 'Venta/mes', 'Cobertura', 'Punto de reorden', 'Pedido sugerido', 'Almacenes'].map(th))),
    el('tbody', {}, ...al.map(x => el('tr', {}, el('td', {}, pill(x[8])), el('td', {className: 'wrap', textContent: x[2] + ' · ' + x[1], style: 'text-align:left'}), el('td', {textContent: x[0], style: 'text-align:left'}), tdn(n0(x[3])), tdn(n0(x[4])), tdn(cob(x[5])), tdn(n0(x[6])), tdn(n0(x[7])), el('td', {className: 'wrap', textContent: x[10].map(almN).join(', '), style: 'text-align:left;font-size:12px'})))));
  // CEDIS
  const cg = new Map(); I.cedis.forEach(c => { const d = c[8]; const o = cg.get(d) || {n: 0, v: 0, si: 0, no: 0}; o.n++; o.v += c[5] || 0; const r = SI.resp[respKey(c)]; if (r === 'si') o.si++; if (r === 'no') o.no++; cg.set(d, o); });
  const dests = [...cg.entries()].sort((a, b) => (a[0] === 'Sin destino sugerido') - (b[0] === 'Sin destino sugerido') || b[1].v - a[1].v);
  if (!SI.dest) SI.dest = dests[0][0];
  const tcs = el('tbody');
  dests.forEach(([d, o]) => { const tr = el('tr', {className: 'clk' + (d === SI.dest ? ' sel' : '')}, el('td', {textContent: d === 'Sin destino sugerido' ? d : almN(destAlm(d))}), tdn(n0(o.n)), tdn(comp.format(o.v)), tdn(n0(o.si), o.si ? 'pos' : ''), tdn(n0(o.no), o.no ? 'neg' : ''), tdn(n0(o.n - o.si - o.no)));
    tr.addEventListener('click', () => { SI.dest = d; drawInv(); }); tcs.append(tr); });
  $('#i-ced-sum').replaceChildren(el('thead', {}, el('tr', {}, ...['Destino sugerido', 'SKUs', 'Valor', 'Los toma', 'No los toma', 'Pendientes'].map(th))), tcs);
  const ds = $('#i-ced-dest'); ds.replaceChildren(...dests.map(([d]) => new Option(d === 'Sin destino sugerido' ? d : almN(destAlm(d)), d))); ds.value = SI.dest; ds.onchange = () => { SI.dest = ds.value; drawInv(); };
  $('#i-ced-t').textContent = 'Detalle: ' + (SI.dest === 'Sin destino sugerido' ? SI.dest : almN(destAlm(SI.dest)));
  const cl = I.cedis.filter(c => c[8] === SI.dest).sort((a, b) => (b[5] || 0) - (a[5] || 0));
  $('#i-ced').replaceChildren(el('thead', {}, el('tr', {}, ...['Producto', 'Línea', 'Origen', 'Existencia', 'Valor', 'Días sin traspaso', 'Respuesta'].map(th))),
    el('tbody', {}, ...cl.map(c => el('tr', {}, el('td', {className: 'wrap', textContent: c[3] + ' · ' + c[2], style: 'text-align:left'}), el('td', {textContent: c[1], style: 'text-align:left'}), el('td', {textContent: almN(c[0]) === 'CEDIS' ? 'CEDIS' : almN(c[0]), style: 'text-align:left'}), tdn(n0(c[4])), tdn(mxn0.format(c[5] || 0)), tdn(n0(c[6])),
      el('td', {className: SI.resp[respKey(c)] === 'si' ? 'pos' : SI.resp[respKey(c)] === 'no' ? 'neg' : '', textContent: respTxt(c)})))));
}
function drawInvDet() {
  $('#i-det-t').textContent = 'Detalle: ' + almN(SI.alm);
  const rows = I.detalle.filter(d => d[0] === SI.alm && (!SI.q || (d[3] + ' ' + d[2] + ' ' + d[1]).toUpperCase().includes(SI.q))).sort((a, b) => (b[7] || 0) - (a[7] || 0));
  $('#i-det').replaceChildren(el('thead', {}, el('tr', {}, ...['Producto', 'Línea', 'Clasificación', 'Existencia', 'Costo unit.', 'Valor', 'Cobertura', 'Última venta', 'Precio lista 1', 'Precio liq.'].map(th))),
    el('tbody', {}, ...rows.map(d => el('tr', {}, el('td', {className: 'wrap', textContent: d[3] + ' · ' + d[2], style: 'text-align:left'}), el('td', {textContent: d[1], style: 'text-align:left'}), el('td', {}, pill(d[4])), tdn(n0(d[5])), tdn(d[6] != null ? mxn2.format(d[6]) : '—'), tdn(mxn0.format(d[7] || 0)), tdn(cob(d[8], d[4])), tdn(d[9]), tdn(d[10] != null ? mxn2.format(d[10]) : '—'), tdn(d[11] != null ? mxn2.format(d[11]) : '—')))));
}

// ---- vendedor: sin costos ni valor de inventario ----
const myAlms = () => USERS[S.user].inv || [];
function drawMiInv() {
  const mine = new Set(myAlms());
  $('#p-fecha').textContent = 'Informe de inventario al ' + fdate(I.fecha) + ' · almacén ' + [...mine].map(almN).join(', ');
  const al = I.alertas.filter(x => x[10].some(a => mine.has(a)));
  const det = I.detalle.filter(d => mine.has(d[0]));
  const ced = I.cedis.filter(c => mine.has(destAlm(c[8])));
  const pend = ced.filter(c => !SI.resp[respKey(c)]).length;
  const kp = (label, val, sub, bad) => el('div', {className: 'card' + (bad ? ' k-bad' : '')}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val}), el('div', {className: 'k-sub', textContent: sub}));
  $('#p-kpis').replaceChildren(
    kp('Sugerencias del CEDIS', String(ced.length), pend + ' sin responder', pend > 0),
    kp('Productos por promover', String(det.length), det.filter(d => d[4] === 'MUERTO').length + ' sin ventas · ' + det.filter(d => d[4] !== 'MUERTO' && d[4] !== 'LENTO').length + ' críticos'),
    kp('Alertas de reorden', String(al.length), al.filter(x => x[8] === 'CRITICO').length + ' críticas', al.some(x => x[8] === 'CRITICO')));
  // CEDIS
  $('#p-ced').replaceChildren(el('thead', {}, el('tr', {}, ...['Producto', 'Línea', 'Desde', 'Existencia', 'Días parado', 'Precio lista 1', '¿Lo tomas?'].map(th))),
    el('tbody', {}, ...(ced.length ? ced.sort((a, b) => (b[5] || 0) - (a[5] || 0)).map(c => el('tr', {}, el('td', {className: 'wrap', textContent: c[3] + ' · ' + c[2], style: 'text-align:left'}), el('td', {textContent: c[1], style: 'text-align:left'}), el('td', {textContent: c[0] === 'CEDIS' ? 'CEDIS' : almN(c[0]), style: 'text-align:left'}), tdn(n0(c[4])), tdn(n0(c[6])), tdn(c[9] != null ? mxn2.format(c[9]) : '—'), el('td', {}, respButtons(c, drawMiInv))))
      : [el('tr', {}, el('td', {colSpan: 7, textContent: 'No hay sugerencias para tu sucursal en este informe.'}))])));
  drawMiDet();
  // alertas
  const urgs = ['CRITICO', 'URGENTE', 'PRONTO'];
  $('#p-al').replaceChildren(el('thead', {}, el('tr', {}, ...['Urgencia', 'Producto', 'Línea', 'Existencia total', 'Venta/mes', 'Cobertura', 'Precio lista 1'].map(th))),
    el('tbody', {}, ...(al.length ? al.sort((a, b) => urgs.indexOf(a[8]) - urgs.indexOf(b[8]) || a[5] - b[5]).map(x => el('tr', {}, el('td', {}, pill(x[8])), el('td', {className: 'wrap', textContent: x[2] + ' · ' + x[1], style: 'text-align:left'}), el('td', {textContent: x[0], style: 'text-align:left'}), tdn(n0(x[3])), tdn(n0(x[4])), tdn(cob(x[5])), tdn(x[9] != null ? mxn2.format(x[9]) : '—')))
      : [el('tr', {}, el('td', {colSpan: 7, textContent: 'Sin alertas para tu sucursal.'}))])));
}
function drawMiDet() {
  const mine = new Set(myAlms());
  const all = I.detalle.filter(d => mine.has(d[0]));
  chipRow($('#p-clas'), ['MUERTO', 'CRÍTICO', 'LENTO'].map(c => [c, c[0] + c.slice(1).toLowerCase() + ' (' + all.filter(d => d[4] === c).length + ')']), SI.pclas, 'Todos', drawMiDet);
  const rows = all.filter(d => (!SI.pclas.size || SI.pclas.has(d[4])) && (!SI.pq || (d[3] + ' ' + d[2] + ' ' + d[1]).toUpperCase().includes(SI.pq)))
    .sort((a, b) => (CLS_ORD[a[4]] ?? 3) - (CLS_ORD[b[4]] ?? 3) || (b[5] * (b[10] || 0)) - (a[5] * (a[10] || 0)));
  const desc = (d) => d[10] && d[11] ? Math.round((1 - d[11] / d[10]) * 100) + '%' : '—';
  $('#p-det').replaceChildren(el('thead', {}, el('tr', {}, ...['Producto', 'Línea', 'Estado', 'Existencia', 'Cobertura', 'Última venta', 'Precio lista 1', 'Precio liquidación', 'Desc.'].map(th))),
    el('tbody', {}, ...rows.map(d => el('tr', {}, el('td', {className: 'wrap', textContent: d[3] + ' · ' + d[2], style: 'text-align:left'}), el('td', {textContent: d[1], style: 'text-align:left'}), el('td', {}, pill(d[4])), tdn(n0(d[5])), tdn(cob(d[8], d[4])), tdn(d[9]), tdn(d[10] != null ? mxn2.format(d[10]) : '—'), tdn(d[11] != null ? mxn2.format(d[11]) : '—'), tdn(desc(d))))));
}

// --- navegación ---
const modTitle = (k) => (USERS[S.user].sucursales && MOD[k].tv) || MOD[k].t;
function drawNav() {
  const u = USERS[S.user];
  $('#rep-name').textContent = u.reporte; $('#crumb').textContent = u.reporte;
  const side = $('#nav'), bot = $('#bnav'); side.replaceChildren(); bot.replaceChildren();
  u.mods.forEach(k => {
    const a = el('a', {href: '#' + k}, svgIcon(k), el('span', {textContent: modTitle(k)}));
    if (MOD[k].pend) a.append(el('span', {className: 'soon', textContent: 'pendiente'}));
    if (k === S.mod) a.setAttribute('aria-current', 'page');
    side.append(a);
    if (MOD[k].admin) return;
    const b = el('a', {href: '#' + k}, svgIcon(k), el('span', {textContent: MOD[k].corto || modTitle(k)}));
    if (k === S.mod) b.setAttribute('aria-current', 'page');
    bot.append(b);
  });
}
function go(k) {
  const u = USERS[S.user];
  if (!u.mods.includes(k)) k = u.mods[0];
  S.mod = k;
  try { if (location.hash.slice(1) !== k) history.replaceState(null, '', '#' + k); } catch (e) { /* vista previa sin historial */ }
  $('#page-title').textContent = modTitle(k);
  document.title = modTitle(k) + ' · Conagro';
  drawNav();
  $('#v-resumen').hidden = k !== 'resumen';
  $('#v-cartera').hidden = k !== 'cartera';
  $('#v-ventas').hidden = k !== 'ventas';
  $('#v-meta').hidden = k !== 'meta';
  $('#v-finanzas').hidden = k !== 'finanzas';
  $('#v-resultados').hidden = k !== 'resultados';
  $('#v-inventarios').hidden = k !== 'inventarios';
  $('#v-productos').hidden = k !== 'productos';
  $('#v-carga').hidden = k !== 'carga';
  $('#v-usuarios').hidden = k !== 'usuarios';
  $('#v-pendiente').hidden = !MOD[k].pend;
  if (!hayDatos(k)) { ['#v-cartera', '#v-ventas', '#v-meta', '#v-finanzas', '#v-resultados', '#v-inventarios', '#v-productos'].forEach(s => $(s).hidden = true); $('#v-pendiente').hidden = false; drawVacio(k); window.scrollTo(0, 0); return; }
  if (k === 'carga') CTX.admin.drawCarga();
  else if (k === 'usuarios') CTX.admin.drawUsuarios();
  else if (k === 'cartera') render();
  else if (k === 'resumen') drawResumen();
  else if (k === 'ventas') drawVentas();
  else if (k === 'meta') drawMeta();
  else if (k === 'finanzas') drawFin();
  else if (k === 'resultados') drawRes();
  else if (k === 'inventarios') drawInv();
  else if (k === 'productos') drawMiInv();
  else drawPendiente(k);
  window.scrollTo(0, 0);
}
// los enlaces internos navegan sin depender del historial del navegador
document.addEventListener('click', (ev) => { const a = ev.target.closest('a[href^="#"]'); if (!a || !S.user) return; ev.preventDefault(); go(a.getAttribute('href').slice(1)); });
const initialHash = () => { try { return location.hash.slice(1); } catch (e) { return ''; } };

function hayDatos(k) {
  if (k === 'cartera') return D.rows.length > 0;
  if (k === 'ventas') return VR.length > 0;
  if (k === 'meta') return (CTX.MM || []).some(x => x.cerrado && x.r != null);
  if (k === 'finanzas') return FC.length > 0;
  if (k === 'resultados') return !!(L.ventas && L.bruta && L.oper && L.neta && ER.meses.length);
  if (k === 'inventarios' || k === 'productos') return !!I.fecha;
  return true;
}
function drawVacio(k) {
  const box = $('#ph'); box.replaceChildren(svgIcon(k), el('h2', {textContent: modTitle(k)}),
    el('p', {textContent: USERS[S.user].sucursales ? 'Todavía no hay información para tu sucursal en este módulo.' : 'Todavía no se ha cargado el archivo de este módulo. Súbelo en "Cargar datos".'}));
}
function drawPendiente(k) {
  const m = MOD[k], box = $('#ph'); box.replaceChildren();
  const ul = el('ul'); m.items.forEach(x => ul.append(el('li', {textContent: x})));
  box.append(svgIcon(k), el('h2', {textContent: m.t}), el('p', {textContent: `Este módulo se arma con ${m.archivo}. Cuando me lo mandes, aparecerá aquí con:`}), ul);
}

// --- resumen de Dirección ---
function cartSummary(fi) {
  let tot = 0, ven = 0, m6 = 0;
  R.forEach(r => { if (r[0] === fi && allowedSuc(r[3])) { tot += r[6]; if (r[7] > 0) ven += r[6]; if (r[7] === 5) m6 += r[6]; } });
  return {tot, ven, m6};
}
function drawResumen() {
  const box = $('#mods'); box.replaceChildren();
  USERS[S.user].mods.filter(k => k !== 'resumen' && !MOD[k].admin).forEach(k => {
    const a = el('a', {className: 'card mod', href: '#' + k});
    const h = el('h3', {}, svgIcon(k), el('span', {textContent: MOD[k].t}));
    a.append(h);
    if (!hayDatos(k)) { h.append(el('span', {className: 'soon', textContent: 'sin datos'})); a.append(el('p', {className: 'pend', textContent: 'Todavía no se ha cargado este archivo.'})); box.append(a); return; }
    if (k === 'cartera') {
      const n = D.fechas.length - 1, c = cartSummary(n), p = cartSummary(Math.max(0, n - 1));
      const kp = (label, val, sub, bad) => el('div', {}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val, style: bad ? 'color:var(--bad)' : ''}), el('div', {className: 'k-sub', textContent: sub}));
      const dv = c.ven / c.tot - p.ven / p.tot;
      a.append(el('div', {className: 'row'},
        kp('Saldo total', comp.format(c.tot), 'corte ' + fdate(D.fechas[n])),
        kp('Vencido', pct(c.ven / c.tot), (dv >= 0 ? '+' : '') + (dv * 100).toLocaleString('es-MX', {maximumFractionDigits: 1}) + ' pts vs corte anterior', true),
        kp('Más de 6 meses', comp.format(c.m6), pct(c.m6 / c.tot) + ' del saldo', true)));
      const st = el('div', {className: 'mc-stack', style: 'margin-top:14px'});
      const b = [0, 0, 0, 0, 0, 0]; R.forEach(r => { if (r[0] === n && allowedSuc(r[3])) b[r[7]] += r[6]; });
      b.forEach((v, i) => { const s = el('div'); s.style.width = (v / c.tot * 100) + '%'; s.style.background = BCOL[i]; s.title = BK[i] + ': ' + mxn0.format(v); st.append(s); });
      a.append(st, el('span', {className: 'go', textContent: 'Ver cartera →'}));
    } else if (k === 'inventarios') {
      const K = I.kpis, crit = I.alertas.filter(x => x[8] === 'CRITICO').length;
      const kp = (label, val, sub, bad) => el('div', {}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val, style: bad ? 'color:var(--bad)' : ''}), el('div', {className: 'k-sub', textContent: sub}));
      a.append(el('div', {className: 'row'},
        kp('Valor del inventario', comp.format(K['Valor total inventario']), 'informe ' + fdate(I.fecha)),
        kp('Parado', K['% parado'] + '%', comp.format(K['Inventario problematico']) + ' problemático', true),
        kp('Por reordenar', String(I.alertas.length), crit + ' críticos', crit > 0)));
      a.append(el('span', {className: 'go', textContent: 'Ver inventarios →'}));
    } else if (k === 'resultados') {
      const ms = ER.meses, sum = (l) => ms.reduce((s, m) => s + (l.v[m - 1] || 0), 0);
      const vt = sum(L.ventas), un = sum(L.neta), ub = sum(L.bruta), uo = sum(L.oper);
      const kp = (label, val, sub, bad) => el('div', {}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val, style: bad ? 'color:var(--bad)' : ''}), el('div', {className: 'k-sub', textContent: sub}));
      a.append(el('div', {className: 'row'},
        kp('Utilidad neta ' + ER.anio, comp.format(un), 'margen neto ' + pct(un / vt), un < 0),
        kp('Margen bruto', pct(ub / vt), 'ene–' + MESES[ms[ms.length - 1] - 1]),
        kp('Utilidad de operación', comp.format(uo), 'margen ' + pct(uo / vt), uo < 0)));
      a.append(el('span', {className: 'go', textContent: 'Ver estado de resultados →'}));
    } else if (k === 'finanzas') {
      const n = FC.length - 1, c = FC[n].tot, p = FC[Math.max(0, n - 1)].tot;
      const kp = (label, val, sub, cls) => el('div', {}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val}), el('div', {className: 'k-sub', textContent: sub}));
      const dl = (a, b) => (a - b >= 0 ? '+' : '−') + comp.format(Math.abs(a - b)).replace('$', '$');
      a.append(el('div', {className: 'row'},
        kp('Capital contable', comp.format(c.capital), dl(c.capital, p.capital) + ' vs corte anterior'),
        kp('Total activos', comp.format(c.total_activos), dl(c.total_activos, p.total_activos)),
        kp('Endeudamiento', pct(c.total_pasivos / c.total_activos), 'pasivos entre activos')));
      a.append(el('span', {className: 'go', textContent: 'Ver situación financiera al ' + fdate(FC[n].fecha) + ' →'}));
    } else if (k === 'ventas') {
      const y = LASTY, cur = vAgg(r => r[0] === y), prev = vAgg(r => r[0] === y - 1 && CLOSED.has(y * 100 + r[1]));
      const kp = (label, val, sub, cls) => el('div', {}, el('div', {className: 'k-label', textContent: label}), el('div', {className: 'k-val num', textContent: val, style: cls === 'neg' ? 'color:var(--bad)' : ''}), el('div', {className: 'k-sub', textContent: sub}));
      const cr = cur.v / prev.v - 1;
      a.append(el('div', {className: 'row'},
        kp('Venta ' + y, comp.format(cur.v), 'ene–' + MESES[lastClosed(y) - 1] + ' · ' + sgn(cr) + ' vs ' + (y - 1)),
        kp('Cumplimiento', pct(cur.v / cur.mc), 'avance anual ' + pct(cur.v / cur.m), cur.v / cur.mc < 0.9 ? 'neg' : ''),
        kp('Gasto / venta', pct(cur.g / cur.v), 'objetivo ' + pct(cur.obj / cur.v), cur.g > cur.obj ? 'neg' : '')));
      a.append(el('span', {className: 'go', textContent: 'Ver ventas →'}));
    } else {
      h.append(el('span', {className: 'soon', textContent: 'pendiente'}));
      a.append(el('p', {className: 'pend', textContent: `Se arma con ${MOD[k].archivo}: ${MOD[k].items[0][0].toLowerCase() + MOD[k].items[0].slice(1)}, y más.`}));
    }
    box.append(a);
  });
}

// --- filtros plegables en celular ---
$('#ftoggle').addEventListener('click', () => { const f = $('#filters'); const o = f.classList.toggle('open'); $('#ftoggle').setAttribute('aria-expanded', String(o)); });
function filterSummary() {
  const u = USERS[S.user];
  const suc = u.sucursales ? u.sucursales.join(', ') : (S.sucs.size ? [...S.sucs].map(i => D.sucursales[i]).join(', ') : 'Todas las sucursales');
  const parts = [fdate(D.fechas[S.fi]), suc];
  if (S.emps.size) parts.push([...S.emps].map(i => D.empresas[i]).join(', '));
  if (S.anios.size) parts.push('Facturas ' + [...S.anios].sort().join(', '));
  $('#fsum').textContent = parts.join(' · ');
}

// --- sesión ---
S.user = 'yo'; S.fi = D.fechas.length - 1;
$('#who').textContent = CTX.user.nombre;
document.body.classList.toggle('vendedor', !!CTX.user.sucursales);
$('#est-help').textContent = CTX.user.sucursales ? 'puedes marcar seguimiento o proponer incobrable; solo Dirección lo confirma' : 'tú confirmas o rechazas los incobrables propuestos por vendedores';
go(initialHash());
let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!S.user) return; if (S.mod === 'cartera') drawTrend(); if (S.mod === 'ventas') drawVentas(); if (S.mod === 'meta') drawMeta(); if (S.mod === 'finanzas') drawFin(); if (S.mod === 'resultados') drawRes(); }, 150); });
};

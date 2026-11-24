/* =========================================================
   utils.js — Utilidades compartidas (namespace global LL)
   ========================================================= */
(function () {
  'use strict';

  const LL = (window.LL = window.LL || {});

  /* ---------- Configuración ---------- */
  // Remuneración Mínima Vital. Valor por defecto: S/ 1 130 (D.S. N.° 006-2024-TR, vigente desde 01/01/2025).
  // Editable desde la calculadora, porque puede variar.
  LL.CONFIG = { RMV: 1130 };
  try {
    const guardada = parseFloat(localStorage.getItem('ll_rmv'));
    if (guardada > 0) LL.CONFIG.RMV = guardada;
  } catch (e) { /* almacenamiento no disponible */ }

  LL.setRMV = function (valor) {
    if (!(valor > 0)) return;
    LL.CONFIG.RMV = valor;
    try { localStorage.setItem('ll_rmv', String(valor)); } catch (e) { /* ignorar */ }
  };

  /* ---------- DOM ---------- */
  LL.$ = (sel, root = document) => root.querySelector(sel);
  LL.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  LL.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /** Lee un formulario a un objeto plano (checkbox → boolean). */
  LL.leerFormulario = function (form) {
    const datos = {};
    LL.$$('input, select, textarea', form).forEach((el) => {
      if (!el.name) return;
      if (el.type === 'checkbox') datos[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) datos[el.name] = el.value; }
      else datos[el.name] = el.value.trim();
    });
    return datos;
  };

  /** Rellena un formulario desde un objeto. */
  LL.llenarFormulario = function (form, datos) {
    LL.$$('input, select, textarea', form).forEach((el) => {
      if (!el.name || !(el.name in datos)) return;
      if (el.type === 'checkbox') el.checked = !!datos[el.name];
      else if (el.type === 'radio') el.checked = el.value === datos[el.name];
      else el.value = datos[el.name];
    });
  };

  let toastTimer;
  LL.toast = function (msg) {
    const t = LL.$('#toast');
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2600);
  };

  /* ---------- Números y moneda ---------- */
  LL.round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  LL.num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  LL.money = (n) => 'S/ ' + LL.round2(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- Número a letras (para "S/ 1 130.00 (mil ciento treinta y 00/100 Soles)") ---------- */
  const U = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
    'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis',
    'veintisiete', 'veintiocho', 'veintinueve'];
  const D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
    'setecientos', 'ochocientos', 'novecientos'];

  function menorMil(n) {
    if (n < 30) return U[n];
    if (n < 100) { const d = Math.floor(n / 10), u = n % 10; return D[d] + (u ? ' y ' + U[u] : ''); }
    if (n === 100) return 'cien';
    const c = Math.floor(n / 100), r = n % 100;
    return C[c] + (r ? ' ' + menorMil(r) : '');
  }
  const apocope = (s) => s.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');

  LL.enteroALetras = function (n) {
    n = Math.floor(n);
    if (n < 1000) return menorMil(n);
    if (n < 1e6) {
      const miles = Math.floor(n / 1000), r = n % 1000;
      const pre = miles === 1 ? 'mil' : apocope(menorMil(miles)) + ' mil';
      return pre + (r ? ' ' + menorMil(r) : '');
    }
    const mill = Math.floor(n / 1e6), r = n % 1e6;
    const pre = mill === 1 ? 'un millón' : apocope(LL.enteroALetras(mill)) + ' millones';
    return pre + (r ? ' ' + LL.enteroALetras(r) : '');
  };

  LL.montoALetras = function (monto) {
    const m = LL.round2(monto);
    const entero = Math.floor(m);
    const cent = Math.round((m - entero) * 100);
    return `${LL.enteroALetras(entero)} y ${String(cent).padStart(2, '0')}/100 Soles`;
  };

  /* ---------- Fechas ---------- */
  LL.MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'setiembre', 'octubre', 'noviembre', 'diciembre'];

  /** 'YYYY-MM-DD' → Date local (evita el desfase por zona horaria). */
  LL.parseFecha = function (s) {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  LL.fechaLarga = function (s) {
    const f = typeof s === 'string' ? LL.parseFecha(s) : s;
    return f ? `${f.getDate()} de ${LL.MESES[f.getMonth()]} de ${f.getFullYear()}` : '';
  };
  LL.fechaCorta = function (s) {
    const f = typeof s === 'string' ? LL.parseFecha(s) : s;
    if (!f) return '';
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
  };
  LL.isoHoy = function () {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
  };
  LL.diasDelMes = (y, m) => new Date(y, m + 1, 0).getDate();
  LL.sumarMeses = function (fecha, n) {
    const t = new Date(fecha.getFullYear(), fecha.getMonth() + n, 1);
    t.setDate(Math.min(fecha.getDate(), LL.diasDelMes(t.getFullYear(), t.getMonth())));
    return t;
  };
  LL.sumarDias = (fecha, n) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + n);
  LL.difDias = (a, b) => Math.round((b - a) / 86400000);
  /** Suma días hábiles (lunes a viernes; no considera feriados). */
  LL.sumarDiasHabiles = function (fecha, n) {
    let f = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    while (n > 0) { f = LL.sumarDias(f, 1); if (f.getDay() !== 0 && f.getDay() !== 6) n--; }
    return f;
  };
  LL.hoy = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); };
  LL.iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  LL.max = (a, b) => (a > b ? a : b);
  LL.min = (a, b) => (a < b ? a : b);

  /** Meses completos y días restantes entre dos fechas (ambas inclusive). */
  LL.mesesYDias = function (desde, hasta) {
    if (!desde || !hasta || hasta < desde) return { meses: 0, dias: 0 };
    let meses = 0;
    while (LL.sumarDias(LL.sumarMeses(desde, meses + 1), -1) <= hasta) meses++;
    const inicioResto = LL.sumarMeses(desde, meses);
    const dias = LL.difDias(inicioResto, hasta) + 1;
    return { meses, dias: Math.max(0, dias) };
  };

  LL.edad = function (nacimiento, referencia = new Date()) {
    let e = referencia.getFullYear() - nacimiento.getFullYear();
    const m = referencia.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && referencia.getDate() < nacimiento.getDate())) e--;
    return e;
  };

  /* ---------- Texto ---------- */
  LL.normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /** Markdown mínimo y seguro: negritas, cursivas, listas y párrafos. */
  LL.md = function (texto) {
    const lineas = LL.esc(texto).split(/\r?\n/);
    let html = '', enLista = false, tipo = '';
    const inline = (s) => s
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
    const cerrar = () => { if (enLista) { html += `</${tipo}>`; enLista = false; } };
    for (const l of lineas) {
      const ul = l.match(/^\s*[-•*]\s+(.*)/), ol = l.match(/^\s*\d+[.)]\s+(.*)/), h = l.match(/^#{1,4}\s+(.*)/);
      if (ul || ol) {
        const t = ul ? 'ul' : 'ol';
        if (!enLista || tipo !== t) { cerrar(); html += `<${t}>`; enLista = true; tipo = t; }
        html += `<li>${inline((ul || ol)[1])}</li>`;
      } else if (h) { cerrar(); html += `<p><b>${inline(h[1])}</b></p>`; }
      else if (l.trim() === '') { cerrar(); }
      else { cerrar(); html += `<p>${inline(l)}</p>`; }
    }
    cerrar();
    return html;
  };

  /** Descarga un archivo generado en el navegador. */
  LL.descargar = function (nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
})();

/* =========================================================
   recordatorios.js — Avisos al contratar y antes de gratificaciones, CTS y vacaciones
   Los envíos por WhatsApp/SMS/correo se simulan; el calendario (.ics) es real.
   ========================================================= */
(function () {
  'use strict';
  const LL = window.LL;
  const Rec = (LL.Recordatorios = {});
  let form, sel;

  const PREF_DEFECTO = { canal: 'whatsapp', contacto: '', alContratar: true, gratiJul: true, gratiDic: true, cts: true, vacaciones: true };

  /** Calcula los próximos eventos (12 meses) según las preferencias. */
  function eventos(r, p) {
    const hoy = LL.hoy();
    const limite = LL.sumarMeses(hoy, 13);
    const ev = [];
    const parcial = r.modalidad === 'horas';
    const avisar = (fechaLimite, titulo, detalle) => {
      const aviso = LL.sumarDias(fechaLimite, -7);
      if (fechaLimite >= hoy && aviso <= limite) ev.push({ fecha: aviso < hoy ? hoy : aviso, limite: fechaLimite, titulo, detalle });
    };
    if (p.alContratar) {
      const f = LL.sumarDiasHabiles(new Date(r.creado), 3);
      if (f >= hoy) ev.push({ fecha: hoy, limite: f, titulo: 'Registrar el contrato en el MTPE', detalle: `Plazo: ${LL.fechaLarga(f)}` });
    }
    const y = hoy.getFullYear();
    [y, y + 1].forEach((a) => {
      if (p.gratiJul) avisar(new Date(a, 6, 15), 'Gratificación de julio', 'Pagar hasta el 15 de julio, más 9 % de bonificación');
      if (p.gratiDic) avisar(new Date(a, 11, 15), 'Gratificación de diciembre', 'Pagar hasta el 15 de diciembre, más 9 % de bonificación');
      if (p.cts && !parcial) {
        avisar(new Date(a, 4, 15), 'Depósito de CTS', 'Depositar hasta el 15 de mayo');
        avisar(new Date(a, 10, 15), 'Depósito de CTS', 'Depositar hasta el 15 de noviembre');
      }
    });
    if (p.vacaciones && !parcial) {
      const ini = LL.parseFecha(r.fInicio);
      for (let n = 1; n <= 40; n++) {
        const aniv = LL.sumarMeses(ini, 12 * n);
        if (aniv >= hoy) { avisar(aniv, 'Vacaciones', `Cumple ${n} año(s) de trabajo: le corresponden 30 días de vacaciones`); break; }
      }
    }
    return ev.filter((e) => e.limite >= LL.max(hoy, LL.parseFecha(r.fInicio)) || e.titulo.includes('MTPE'))
      .sort((a, b) => a.fecha - b.fecha);
  }

  function mensaje(r, e) {
    const nombre = (r.hNombre || '').split(' ')[0];
    return `Hola ${LL.esc(nombre)} 👋 Te recuerda <b>Hogar Formal</b>: <b>${e.titulo}</b> (trabajadora: ${LL.esc((r.tNombre || '').split(' ')[0])}). ${e.detalle}. Revisa tu constancia ${r.id}.`;
  }

  function prefs() { return { ...PREF_DEFECTO, ...LL.leerFormulario(form) }; }

  function pintar() {
    const r = LL.Store.obtener(sel.value);
    const lista = LL.$('#recLista'), prev = LL.$('#recPreview');
    if (!r) {
      lista.innerHTML = '<li class="desc">Primero registra a una trabajadora para programar recordatorios.</li>';
      prev.innerHTML = '';
      return;
    }
    const ev = eventos(r, prefs());
    lista.innerHTML = ev.length
      ? ev.slice(0, 6).map((e) => `<li><span class="date"><b>${e.fecha.getDate()}</b><small>${LL.MESES[e.fecha.getMonth()].slice(0, 3)}</small></span>
          <span class="desc"><b>${e.titulo}</b><small>${e.detalle}</small></span></li>`).join('')
      : '<li class="desc">No hay recordatorios activos.</li>';
    const canal = { whatsapp: 'WhatsApp', sms: 'SMS', correo: 'Correo' }[prefs().canal];
    prev.innerHTML = ev.length ? `<div class="bubble">${mensaje(r, ev[0])}<small>${canal} · ${LL.fechaCorta(ev[0].fecha)} 9:00</small></div>` : '';
  }

  function cargarPrefs() {
    const r = LL.Store.obtener(sel.value);
    const p = { ...PREF_DEFECTO, contacto: r ? r.hCelular || '' : '', ...(r && r.recordatorios) };
    LL.llenarFormulario(form, p);
    pintar();
  }

  /* ---------- Calendario .ics ---------- */
  function ics(r, ev) {
    const f = (d) => LL.iso(d).replace(/-/g, '');
    const sello = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const esc = (s) => s.replace(/[,;\\]/g, (c) => '\\' + c);
    const cuerpo = ev.map((e, i) => [
      'BEGIN:VEVENT',
      `UID:${r.id}-${i}-${f(e.limite)}@hogarformal`,
      `DTSTAMP:${sello}`,
      `DTSTART;VALUE=DATE:${f(e.limite)}`,
      `DTEND;VALUE=DATE:${f(LL.sumarDias(e.limite, 1))}`,
      `SUMMARY:${esc('Hogar Formal: ' + e.titulo)}`,
      `DESCRIPTION:${esc(e.detalle + ' (registro ' + r.id + ')')}`,
      'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.titulo)}`, 'END:VALARM',
      'END:VEVENT'].join('\r\n'));
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hogar Formal//ES', 'CALSCALE:GREGORIAN', ...cuerpo, 'END:VCALENDAR'].join('\r\n');
  }

  Rec.cargarRegistros = function () {
    if (!sel) return;
    const actual = sel.value;
    const lista = LL.Store.registros();
    sel.innerHTML = lista.length
      ? lista.map((r) => `<option value="${r.id}">${LL.esc(r.tNombre)} · ${r.id}</option>`).join('')
      : '<option value="">Sin registros</option>';
    if (LL.Store.obtener(actual)) sel.value = actual;
    cargarPrefs();
  };

  Rec.seleccionar = function (id) { sel.value = id; cargarPrefs(); };

  Rec.init = function () {
    form = LL.$('#formRecord');
    sel = LL.$('#recRegistro');
    sel.addEventListener('change', cargarPrefs);
    form.addEventListener('change', (e) => { if (e.target !== sel) pintar(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const r = LL.Store.obtener(sel.value);
      if (!r) { LL.toast('Primero registra a una trabajadora.'); return; }
      const p = prefs();
      if (p.canal === 'correo' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.contacto) : !/^9\d{8}$/.test(p.contacto)) {
        form.elements.contacto.classList.add('is-invalid');
        LL.toast(p.canal === 'correo' ? 'Escribe un correo válido.' : 'Escribe un celular de 9 dígitos.');
        return;
      }
      form.elements.contacto.classList.remove('is-invalid');
      LL.Store.actualizar(r.id, { recordatorios: p });
      LL.toast('Preferencias guardadas. Te avisaremos 7 días antes de cada fecha.');
    });
    LL.$('#btnICS').addEventListener('click', () => {
      const r = LL.Store.obtener(sel.value);
      if (!r) { LL.toast('Primero registra a una trabajadora.'); return; }
      const ev = eventos(r, prefs());
      if (!ev.length) { LL.toast('No hay recordatorios activos.'); return; }
      LL.descargar(`recordatorios_${r.id}.ics`, ics(r, ev), 'text/calendar;charset=utf-8');
      LL.toast('Archivo de calendario descargado. Ábrelo en tu celular para agregar los avisos.');
    });
    Rec.cargarRegistros();
  };
})();

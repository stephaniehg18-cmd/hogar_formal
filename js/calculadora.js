/* =========================================================
   calculadora.js — Gratificación y CTS (Perú)
   - Gratificación: Ley N.° 27735 y D.S. N.° 005-2002-TR
   - Bonificación extraordinaria: Ley N.° 30334 (9 % EsSalud / 6.75 % EPS)
   - CTS: T.U.O. del D. Leg. N.° 650, D.S. N.° 001-97-TR
   - REMYPE: pequeña empresa 50 %; microempresa no percibe
   ========================================================= */
(function () {
  'use strict';
  const LL = window.LL;
  const Calc = (LL.Calc = {});

  const REGIMENES = {
    general: { nombre: 'Régimen general',                        grati: 1,   cts: 1 },
    pequena: { nombre: 'Pequeña empresa',                        grati: 0.5, cts: 0.5 },
    micro:   { nombre: 'Microempresa',                           grati: 0,   cts: 0 }
  };

  /** Remuneración computable base (sin 1/6 de gratificación). */
  function remuneracionBase(d) {
    const af = d.asigFam ? LL.CONFIG.RMV * 0.10 : 0;
    const total = d.sueldo + af + d.variables;
    return { sueldo: d.sueldo, af, variables: d.variables, total };
  }

  /* ---------- Gratificación ---------- */
  Calc.gratificacion = function (d, periodo, anio) {
    const reg = REGIMENES[d.regimen] || REGIMENES.general;
    const mesInicio = periodo === 'julio' ? 0 : 6;
    const semIni = new Date(anio, mesInicio, 1);
    const semFin = new Date(anio, mesInicio + 5, LL.diasDelMes(anio, mesInicio + 5));
    const desde = LL.max(d.ingreso, semIni);
    const hasta = d.cese ? LL.min(d.cese, semFin) : semFin;

    // Solo se computan meses calendario completos (art. 3 D.S. N.° 005-2002-TR)
    const meses = [];
    for (let i = 0; i < 6; i++) {
      const ini = new Date(anio, mesInicio + i, 1);
      const fin = new Date(anio, mesInicio + i, LL.diasDelMes(anio, mesInicio + i));
      if (ini >= desde && fin <= hasta) meses.push(LL.MESES[mesInicio + i]);
    }

    const base = remuneracionBase(d);
    const bruto = LL.round2((base.total / 6) * meses.length);
    const monto = LL.round2(bruto * reg.grati);
    const tasa = d.seguro === 'eps' ? 0.0675 : 0.09;
    const bonif = LL.round2(monto * tasa);
    const trunca = !!d.cese && d.cese < semFin;

    return {
      tipo: 'grati', reg, base, meses, bruto, monto, tasa, bonif, total: LL.round2(monto + bonif), trunca,
      periodoTxt: `${periodo === 'julio' ? 'Julio' : 'Diciembre'} ${anio}`,
      semestreTxt: `${LL.fechaCorta(semIni)} – ${LL.fechaCorta(semFin)}`,
      plazoPago: trunca ? 'Con la liquidación de beneficios sociales (48 horas desde el cese).' : `Hasta el 15 de ${periodo} de ${anio}.`
    };
  };

  /* ---------- CTS ---------- */
  Calc.cts = function (d, deposito, anio) {
    const reg = REGIMENES[d.regimen] || REGIMENES.general;
    const ini = deposito === 'mayo' ? new Date(anio - 1, 10, 1) : new Date(anio, 4, 1);
    const fin = deposito === 'mayo' ? new Date(anio, 3, 30) : new Date(anio, 9, 31);
    const desde = LL.max(d.ingreso, ini);
    const hasta = d.cese ? LL.min(d.cese, fin) : fin;
    const tiempo = LL.mesesYDias(desde, hasta);

    // Gratificación que incide: diciembre anterior (depósito de mayo) o julio (depósito de noviembre)
    let gratiRef = d.gratiRef;
    let gratiAuto = false;
    if (!(gratiRef > 0)) {
      const g = deposito === 'mayo' ? Calc.gratificacion(d, 'diciembre', anio - 1) : Calc.gratificacion(d, 'julio', anio);
      gratiRef = g.monto;
      gratiAuto = true;
    }
    const base = remuneracionBase(d);
    const sexto = LL.round2(gratiRef / 6);
    const rc = LL.round2(base.total + sexto);
    const porMeses = LL.round2((rc / 12) * tiempo.meses);
    const porDias = LL.round2((rc / 360) * tiempo.dias);

    let factor = reg.cts;
    let motivoCero = '';
    if (d.parcial) { factor = 0; motivoCero = 'Con jornada menor a 4 horas diarias no corresponde CTS (art. 4 del D.S. N.° 001-97-TR).'; }
    else if (reg.cts === 0) motivoCero = 'Los trabajadores de la microempresa no perciben CTS.';
    const totalServicio = LL.mesesYDias(d.ingreso, d.cese || fin);
    if (!motivoCero && totalServicio.meses < 1) { factor = 0; motivoCero = 'Se requiere al menos un mes de servicios para generar CTS.'; }

    const monto = LL.round2((porMeses + porDias) * factor);
    return {
      tipo: 'cts', reg, base, gratiRef, gratiAuto, sexto, rc, tiempo, porMeses, porDias, factor, monto, motivoCero,
      periodoTxt: `${deposito === 'mayo' ? 'Mayo' : 'Noviembre'} ${anio}`,
      semestreTxt: `${LL.fechaCorta(ini)} – ${LL.fechaCorta(fin)}`,
      computoTxt: hasta >= desde ? `${LL.fechaCorta(desde)} – ${LL.fechaCorta(hasta)}` : 'Sin tiempo computable',
      plazoPago: d.cese && d.cese < fin ? 'CTS trunca: se paga con la liquidación de beneficios sociales.' : `Depósito hasta el 15 de ${deposito} de ${anio}.`
    };
  };

  /* ---------- Interfaz ---------- */
  let form, out, modo = 'grati';

  function leer() {
    const f = LL.leerFormulario(form);
    return {
      regimen: f.regimen,
      sueldo: LL.num(f.sueldo),
      variables: LL.num(f.variables),
      asigFam: f.asigFam,
      ingreso: LL.parseFecha(f.ingreso),
      cese: LL.parseFecha(f.cese),
      seguro: f.seguro,
      gratiRef: LL.num(f.gratiRef),
      parcial: f.parcial,
      gPeriodo: f.gPeriodo, gAnio: parseInt(f.gAnio, 10),
      cPeriodo: f.cPeriodo, cAnio: parseInt(f.cAnio, 10)
    };
  }

  function filasBase(base) {
    return `
      <tr><td>Remuneración básica</td><td>${LL.money(base.sueldo)}</td></tr>
      <tr><td>Asignación familiar (10 % RMV)</td><td>${LL.money(base.af)}</td></tr>
      <tr><td>Promedio de conceptos variables</td><td>${LL.money(base.variables)}</td></tr>`;
  }

  function pintarGrati(r) {
    const tasaTxt = (r.tasa * 100).toLocaleString('es-PE') + ' %';
    return `
      <div class="amount">
        <div class="amount__label">Total a recibir · Gratificación ${r.periodoTxt}${r.trunca ? ' (trunca)' : ''}</div>
        <div class="amount__value">${LL.money(r.total)}</div>
        <div class="amount__sub">Gratificación ${LL.money(r.monto)} + bonificación extraordinaria ${LL.money(r.bonif)}</div>
      </div>
      <table class="breakdown">
        <tr><th>Concepto</th><th>Monto</th></tr>
        ${filasBase(r.base)}
        <tr class="total"><td>Remuneración computable</td><td>${LL.money(r.base.total)}</td></tr>
      </table>
      <div class="formula">
        <b>Semestre:</b> ${r.semestreTxt}<br>
        <b>Meses calendario completos:</b> ${r.meses.length} ${r.meses.length ? `(${r.meses.join(', ')})` : ''}<br>
        <b>Fórmula:</b> <code>${LL.money(r.base.total)} ÷ 6 × ${r.meses.length} = ${LL.money(r.bruto)}</code>
        ${r.reg.grati !== 1 ? `<br><b>Régimen ${r.reg.nombre}:</b> <code>${LL.money(r.bruto)} × ${r.reg.grati * 100} % = ${LL.money(r.monto)}</code>` : ''}
        <br><b>Bonificación extraordinaria (Ley N.° 30334):</b> <code>${LL.money(r.monto)} × ${tasaTxt} = ${LL.money(r.bonif)}</code>
      </div>
      ${r.meses.length === 0 ? '<div class="alert alert--warn"><span class="alert__icon">⚠</span><span>No hay meses calendario completos en el semestre: no se genera gratificación.</span></div>' : ''}
      ${r.reg.grati === 0 ? '<div class="alert alert--warn"><span class="alert__icon">⚠</span><span>Los trabajadores de la microempresa no perciben gratificaciones legales.</span></div>' : ''}
      <div class="alert alert--info"><span class="alert__icon">ℹ</span><span><b>Plazo de pago:</b> ${r.plazoPago} La gratificación no está afecta a aportes de EsSalud ni a AFP/ONP; sí está afecta al impuesto a la renta de quinta categoría, de corresponder.</span></div>`;
  }

  function pintarCTS(r) {
    return `
      <div class="amount">
        <div class="amount__label">Depósito de CTS · ${r.periodoTxt}</div>
        <div class="amount__value">${LL.money(r.monto)}</div>
        <div class="amount__sub">Tiempo computable: ${r.tiempo.meses} mes(es) y ${r.tiempo.dias} día(s)</div>
      </div>
      <table class="breakdown">
        <tr><th>Concepto</th><th>Monto</th></tr>
        ${filasBase(r.base)}
        <tr><td>1/6 de la gratificación (${LL.money(r.gratiRef)}${r.gratiAuto ? ', calculada' : ''})</td><td>${LL.money(r.sexto)}</td></tr>
        <tr class="total"><td>Remuneración computable (RC)</td><td>${LL.money(r.rc)}</td></tr>
      </table>
      <div class="formula">
        <b>Periodo:</b> ${r.semestreTxt} · <b>Cómputo:</b> ${r.computoTxt}<br>
        <b>Por meses:</b> <code>RC ÷ 12 × ${r.tiempo.meses} = ${LL.money(r.porMeses)}</code><br>
        <b>Por días:</b> <code>RC ÷ 360 × ${r.tiempo.dias} = ${LL.money(r.porDias)}</code>
        ${r.factor !== 1 && !r.motivoCero ? `<br><b>Régimen ${r.reg.nombre}:</b> <code>${LL.money(r.porMeses + r.porDias)} × ${r.factor * 100} % = ${LL.money(r.monto)}</code>` : ''}
      </div>
      ${r.motivoCero ? `<div class="alert alert--warn"><span class="alert__icon">⚠</span><span>${r.motivoCero}</span></div>` : ''}
      <div class="alert alert--info"><span class="alert__icon">ℹ</span><span><b>Plazo:</b> ${r.plazoPago} El empleador deposita en la entidad financiera elegida por la persona trabajadora.</span></div>`;
  }

  function calcular(e) {
    if (e) e.preventDefault();
    const d = leer();
    const faltan = [];
    if (!d.sueldo) faltan.push('remuneración');
    if (!d.ingreso) faltan.push('fecha de ingreso');
    if (faltan.length) {
      out.innerHTML = `<div class="alert alert--error"><span class="alert__icon">✖</span><span>Complete: ${faltan.join(' y ')}.</span></div>`;
      return;
    }
    if (d.cese && d.cese < d.ingreso) {
      out.innerHTML = '<div class="alert alert--error"><span class="alert__icon">✖</span><span>La fecha de cese no puede ser anterior a la de ingreso.</span></div>';
      return;
    }
    if (d.sueldo < LL.CONFIG.RMV && !d.parcial) {
      // Aviso, no bloqueo: puede tratarse de tiempo parcial
      setTimeout(() => out.insertAdjacentHTML('beforeend', `<div class="alert alert--warn"><span class="alert__icon">⚠</span><span>La remuneración es menor a la RMV (${LL.money(LL.CONFIG.RMV)}). Verifique si corresponde a una jornada parcial.</span></div>`), 0);
    }
    out.innerHTML = modo === 'grati'
      ? pintarGrati(Calc.gratificacion(d, d.gPeriodo, d.gAnio))
      : pintarCTS(Calc.cts(d, d.cPeriodo, d.cAnio));
  }

  function setModo(m) {
    modo = m;
    form.classList.toggle('is-cts', m === 'cts');
    if (out.querySelector('.amount')) calcular();
  }

  /** Llena el selector con los registros guardados. */
  Calc.cargarRegistros = function () {
    const sel = LL.$('#calcRegistro');
    const actual = sel.value;
    sel.innerHTML = '<option value="">— Ingresar datos manualmente —</option>' + LL.Store.registros()
      .map((r) => `<option value="${r.id}">${LL.esc(r.tNombre)} · ${r.id}</option>`).join('');
    if (LL.Store.obtener(actual)) sel.value = actual;
  };

  /** Precarga los datos de un registro y calcula. */
  Calc.seleccionar = function (id) {
    const r = LL.Store.obtener(id);
    if (!r) return;
    LL.$('#calcRegistro').value = id;
    form.elements.sueldo.value = r.remun;
    form.elements.ingreso.value = r.fInicio;
    form.elements.cese.value = r.plazoFijo && r.fFin && r.fFin < LL.isoHoy() ? r.fFin : '';
    form.elements.parcial.checked = r.modalidad === 'horas';
    calcular();
  };

  Calc.init = function () {
    form = LL.$('#formCalc');
    out = LL.$('#calcResultado');
    const hoy = new Date();
    form.elements.gAnio.value = hoy.getFullYear() + (hoy.getMonth() === 11 && hoy.getDate() > 15 ? 1 : 0);
    form.elements.gPeriodo.value = hoy.getMonth() < 7 || (hoy.getMonth() === 11 && hoy.getDate() > 15) ? 'julio' : 'diciembre';
    form.elements.cAnio.value = hoy.getMonth() >= 10 ? hoy.getFullYear() + 1 : hoy.getFullYear();
    form.elements.cPeriodo.value = hoy.getMonth() >= 4 && hoy.getMonth() < 10 ? 'noviembre' : 'mayo';

    form.addEventListener('submit', calcular);
    LL.$$('input[name="concepto"]', form).forEach((r) => r.addEventListener('change', () => setModo(r.value)));
    LL.$('#calcRegistro').addEventListener('change', (e) => { if (e.target.value) Calc.seleccionar(e.target.value); });
    Calc.cargarRegistros();
  };
})();

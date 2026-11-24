/* =========================================================
   registro.js — Registro en 3 pasos, constancia con pendientes y "Mis registros"
   ========================================================= */
(function () {
  'use strict';
  const LL = window.LL;
  const R = (LL.Registro = {});
  const C = LL.Contrato;

  const DISTRITOS = ['Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino',
    'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lima (Cercado)', 'Lince', 'Los Olivos', 'Lurigancho-Chosica', 'Lurín',
    'Magdalena del Mar', 'Miraflores', 'Pachacámac', 'Pucusana', 'Pueblo Libre', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac',
    'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis', 'San Martín de Porres',
    'San Miguel', 'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador',
    'Villa María del Triunfo', 'Callao', 'Bellavista', 'La Perla', 'Ventanilla'];

  let form, paso = 1, editId = null, avisosVistos = false;

  /* ---------- Ejemplo para la demostración ---------- */
  function ejemplo() {
    const inicio = LL.sumarDias(LL.hoy(), -150);
    return {
      hNombre: 'Carlos Alberto Rojas Medina', hDni: '10293847', hCelular: '987654321', hDireccion: 'Av. Primavera 1020', hDistrito: 'Santiago de Surco',
      tNombre: 'María Elena Quispe Huamán', tDocTipo: 'DNI', tDni: '45678912', tFnac: '1990-03-15', tCelular: '912345678', tPension: 'ONP',
      modalidad: 'afuera', lLimpieza: true, lCocina: true, lLavado: true, lNinos: false, lMayores: false, lMascotas: false,
      remun: '1500', fInicio: LL.iso(inicio), hEntrada: '08:00', hSalida: '17:00', horasDia: '8', diasSem: '6', descanso: 'domingo', pago: 'mensual-transf', plazoFijo: false
    };
  }

  /* ---------- Asistente de 3 pasos ---------- */
  function mostrarPaso(n) {
    paso = n;
    LL.$$('.paso', form).forEach((f) => { f.hidden = Number(f.dataset.paso) !== n; });
    LL.$$('#progress li').forEach((li, i) => {
      li.classList.toggle('is-active', i + 1 === n);
      li.classList.toggle('is-done', i + 1 < n);
    });
    LL.$('#btnAtras').hidden = n === 1;
    LL.$('#btnSiguiente').textContent = n === 3 ? (editId ? 'Guardar cambios' : 'Registrar y obtener constancia') : 'Continuar';
    LL.$('#mensajes').innerHTML = '';
    avisosVistos = false;
    window.scrollTo(0, 0);
  }

  function pintarMensajes(lista) {
    LL.$$('.is-invalid', form).forEach((el) => el.classList.remove('is-invalid'));
    lista.forEach((r) => { if (r.campo && form.elements[r.campo]) form.elements[r.campo].classList.add('is-invalid'); });
    LL.$('#mensajes').innerHTML = lista.map((r) => `<div class="msg-box msg-box--${r.tipo}">${r.m}</div>`).join('');
  }

  function siguiente() {
    const d = LL.leerFormulario(form);
    const res = C.validarPaso(paso, d);
    const errores = res.filter((r) => r.tipo === 'error');
    const avisos = res.filter((r) => r.tipo !== 'error');
    if (errores.length) {
      pintarMensajes(res);
      LL.$('#mensajes').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (avisos.length && !avisosVistos) {
      pintarMensajes(res);
      avisosVistos = true;
      LL.$('#btnSiguiente').textContent = paso === 3 ? 'Entendido, registrar' : 'Entendido, continuar';
      return;
    }
    if (paso < 3) { mostrarPaso(paso + 1); return; }

    const r = LL.Store.guardar({ ...d, fFirma: d.fFirma || LL.isoHoy() }, editId);
    LL.toast(editId ? 'Cambios guardados.' : `Registro ${r.id} creado.`);
    editId = null;
    R.refrescar();
    R.verConstancia(r.id);
  }

  R.nuevo = function () {
    editId = null;
    form.reset();
    LL.$('#formRegistro').classList.remove('is-fijo');
    mostrarPaso(1);
  };

  R.editar = function (id) {
    const r = LL.Store.obtener(id);
    if (!r) return;
    form.reset();
    LL.llenarFormulario(form, r);
    editId = id;
    form.classList.toggle('is-fijo', !!r.plazoFijo);
    LL.navegar('registrar');
    mostrarPaso(1);
  };

  /* ---------- Obligaciones y montos estimados ---------- */
  function datosCalculo(r) {
    return { regimen: 'general', sueldo: LL.num(r.remun), variables: 0, asigFam: false, ingreso: LL.parseFecha(r.fInicio), cese: null, seguro: 'essalud', gratiRef: 0, parcial: r.modalidad === 'horas' };
  }

  R.proximaGrati = function (r) {
    const ref = LL.max(LL.hoy(), LL.parseFecha(r.fInicio));
    const y = ref.getFullYear();
    const cands = [['julio', y], ['diciembre', y], ['julio', y + 1], ['diciembre', y + 1], ['julio', y + 2]];
    for (const [p, a] of cands) {
      const vence = new Date(a, p === 'julio' ? 6 : 11, 15);
      if (vence < LL.hoy()) continue;
      const g = LL.Calc.gratificacion(datosCalculo(r), p, a);
      if (g.meses.length) return { ...g, vence, periodo: p, anio: a };
    }
    return null;
  };

  R.proximaCTS = function (r) {
    if (r.modalidad === 'horas') return null;
    const ref = LL.max(LL.hoy(), LL.parseFecha(r.fInicio));
    const y = ref.getFullYear();
    const cands = [['mayo', y], ['noviembre', y], ['mayo', y + 1], ['noviembre', y + 1], ['mayo', y + 2]];
    for (const [p, a] of cands) {
      const vence = new Date(a, p === 'mayo' ? 4 : 10, 15);
      if (vence < LL.hoy()) continue;
      const c = LL.Calc.cts(datosCalculo(r), p, a);
      if (c.monto > 0) return { ...c, vence, periodo: p, anio: a };
    }
    return null;
  };

  R.obligaciones = function (r) {
    const remun = LL.num(r.remun);
    const parcial = r.modalidad === 'horas';
    const limiteMTPE = LL.sumarDiasHabiles(new Date(r.creado), 3);
    const g = R.proximaGrati(r);
    const c = R.proximaCTS(r);
    const aniv = LL.sumarMeses(LL.parseFecha(r.fInicio), 12);
    return [
      { k: 'firma', t: 'Firmar el contrato y entregar una copia', s: 'Ambas partes firman; la trabajadora se queda con un ejemplar.' },
      { k: 'mtpe', t: 'Registrar el contrato en el aplicativo del MTPE', s: `Plazo: hasta el ${LL.fechaLarga(limiteMTPE)} (3 días hábiles). Luego entrega la constancia a la trabajadora.` },
      { k: 'essalud', t: 'Afiliar a EsSalud', s: 'Aporte del hogar: 9 % del sueldo. No se descuenta a la trabajadora.', amt: `${LL.money(remun * 0.09)}/mes` },
      { k: 'pension', t: `Afiliar a pensiones${r.tPension ? ` (${r.tPension})` : ''}`, s: r.tPension === 'AFP' ? 'Se descuenta del sueldo (aprox. 11 % – 13 % según la AFP) y el hogar lo paga a la AFP.' : 'Se descuenta 13 % del sueldo para la ONP y el hogar lo paga.', amt: r.tPension === 'AFP' ? '' : `${LL.money(remun * 0.13)}/mes` },
      { k: 'boleta', t: 'Entregar boleta en cada pago', s: 'Con sueldo, descuentos y aportes, firmada por ambas partes.' },
      g
        ? { k: 'grati', t: `Pagar la gratificación de ${g.periodo} ${g.anio}`, s: `Hasta el 15 de ${g.periodo}. Incluye bonificación de 9 %. ${g.meses.length < 6 ? `Proporcional: ${g.meses.length} mes(es) completo(s).` : ''}`, amt: LL.money(g.total) }
        : { k: 'grati', t: 'Gratificaciones de julio y diciembre', s: 'Se calculan por meses calendario completos trabajados.' },
      parcial
        ? { k: 'cts', t: 'CTS', s: 'No corresponde: trabaja menos de 4 horas al día.', na: true }
        : c
          ? { k: 'cts', t: `Depositar la CTS de ${c.periodo} ${c.anio}`, s: `Hasta el 15 de ${c.periodo}, en el banco que elija la trabajadora.`, amt: LL.money(c.monto) }
          : { k: 'cts', t: 'Depósitos de CTS', s: 'En mayo y noviembre, en el banco que elija la trabajadora.' },
      parcial
        ? { k: 'vac', t: 'Vacaciones', s: 'No corresponden con jornada menor a 4 horas al día.', na: true }
        : { k: 'vac', t: '30 días de vacaciones pagadas', s: `Al cumplir un año de trabajo (${LL.fechaLarga(aniv)}).` }
    ];
  };

  /* ---------- Constancia ---------- */
  R.verConstancia = function (id, navegar = true) {
    const r = LL.Store.obtener(id);
    if (!r) { LL.navegar('registros'); return; }
    const x = C.derivados(r);
    const obl = R.obligaciones(r);
    const aplicables = obl.filter((o) => !o.na);
    const hechos = aplicables.filter((o) => r.pendientes && r.pendientes[o.k]).length;
    const pct = Math.round((hechos / aplicables.length) * 100);

    LL.$('#constanciaBox').innerHTML = `
      <div>
        <div class="const-head">
          <small>Constancia de registro</small>
          <span class="code">${r.id}</span>
          <span class="ok">✓ Registrado el ${LL.fechaLarga(new Date(r.creado))}</span>
        </div>
        <div class="card">
          <h3 class="card__title">Resumen del contrato</h3>
          <div class="kv"><span>Hogar</span><b>${LL.esc(r.hNombre)}</b></div>
          <div class="kv"><span>Trabajadora</span><b>${LL.esc(r.tNombre)}</b></div>
          <div class="kv"><span>Modalidad</span><b>${C.MODALIDADES[r.modalidad].corto}</b></div>
          <div class="kv"><span>Labores</span><b>${x.labores.map((k) => C.LABORES_CORTO[k]).join(', ')}</b></div>
          <div class="kv"><span>Remuneración</span><b>${LL.money(LL.num(r.remun))}</b></div>
          <div class="kv"><span>Jornada</span><b>${x.horasSem} h por semana · ${x.horasDia} h/día</b></div>
          <div class="kv"><span>Inicio</span><b>${LL.fechaLarga(r.fInicio)}${r.plazoFijo ? ` al ${LL.fechaLarga(r.fFin)}` : ''}</b></div>
          <div class="kv"><span>Distrito</span><b>${LL.esc(r.hDistrito)}</b></div>
          <div class="form-nav">
            <button class="btn btn--ghost btn--sm" data-acc="ia" data-id="${r.id}">Explicar con IA</button>
            <button class="btn btn--ghost btn--sm" data-acc="word" data-id="${r.id}">Word</button>
            <button class="btn btn--ghost btn--sm" data-acc="pdf" data-id="${r.id}">PDF</button>
            <button class="btn btn--primary btn--sm" data-acc="ver" data-id="${r.id}">Ver contrato</button>
          </div>
        </div>
      </div>
      <div class="card">
        <h3 class="card__title">Lo que debes cumplir</h3>
        <p class="hint">Marca cada obligación cuando la completes. Los montos son estimados.</p>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <p class="hint"><b>${hechos} de ${aplicables.length}</b> obligaciones cumplidas</p>
        <ul class="todo">
          ${obl.map((o) => `<li class="${o.na ? 'na' : ''} ${r.pendientes && r.pendientes[o.k] ? 'is-done' : ''}">
            <input type="checkbox" data-pend="${o.k}" data-id="${r.id}" ${r.pendientes && r.pendientes[o.k] ? 'checked' : ''} ${o.na ? 'disabled' : ''} aria-label="${LL.esc(o.t)}">
            <div><b>${o.t}</b><small>${o.s}</small></div>
            ${o.amt ? `<span class="amt">${o.amt}</span>` : ''}
          </li>`).join('')}
        </ul>
        <div class="form-nav">
          <button class="btn btn--ghost" data-acc="editar" data-id="${r.id}">Editar datos</button>
          <button class="btn btn--primary" data-acc="recordatorios" data-id="${r.id}">Configurar recordatorios</button>
        </div>
      </div>`;
    R.actual = r.id;
    if (navegar) LL.navegar('constancia');
  };

  /* ---------- Mis registros ---------- */
  function pintarLista() {
    const lista = LL.Store.registros();
    const box = LL.$('#listaRegistros');
    if (!lista.length) {
      box.innerHTML = `<div class="card empty" style="grid-column:1/-1">
        <p>Aún no tienes registros.</p>
        <a href="#registrar" data-nav="registrar" data-nuevo="1" class="btn btn--primary">Registrar a mi trabajadora</a></div>`;
      return;
    }
    box.innerHTML = lista.map((r) => {
      const obl = R.obligaciones(r).filter((o) => !o.na);
      const hechos = obl.filter((o) => r.pendientes && r.pendientes[o.k]).length;
      return `<article class="card reg">
        <div class="reg__top"><span class="reg__code">${r.id}</span><span class="pill">${C.MODALIDADES[r.modalidad].corto}</span></div>
        <div class="reg__name">${LL.esc(r.tNombre)}</div>
        <div class="reg__meta">${LL.money(LL.num(r.remun))} · desde ${LL.fechaCorta(r.fInicio)} · ${LL.esc(r.hDistrito)}</div>
        <div class="bar"><i style="width:${Math.round(hechos / obl.length * 100)}%"></i></div>
        <div class="reg__meta">${hechos} de ${obl.length} obligaciones cumplidas</div>
        <div class="row">
          <button class="btn btn--primary btn--sm" data-acc="constancia" data-id="${r.id}">Ver constancia</button>
          <button class="btn btn--ghost btn--sm" data-acc="ver" data-id="${r.id}">Contrato</button>
          <button class="btn btn--ghost btn--sm" data-acc="calc" data-id="${r.id}">Calcular</button>
          <button class="btn btn--danger btn--sm" data-acc="borrar" data-id="${r.id}" aria-label="Eliminar">Eliminar</button>
        </div>
      </article>`;
    }).join('');
  }

  R.refrescar = function () {
    pintarLista();
    if (LL.Calc.cargarRegistros) LL.Calc.cargarRegistros();
    if (LL.Recordatorios) LL.Recordatorios.cargarRegistros();
  };

  /* ---------- Inicio ---------- */
  R.init = function () {
    form = LL.$('#formRegistro');
    LL.$('#distritos').innerHTML = DISTRITOS.map((d) => `<option value="${d}">`).join('');

    LL.$('#btnSiguiente').addEventListener('click', siguiente);
    LL.$('#btnAtras').addEventListener('click', () => mostrarPaso(paso - 1));
    form.addEventListener('change', (e) => {
      if (e.target.name === 'plazoFijo') form.classList.toggle('is-fijo', e.target.checked);
      if (e.target.name === 'modalidad' && e.target.value === 'horas' && LL.num(form.elements.horasDia.value) >= 4) {
        form.elements.horasDia.value = 3;
        form.elements.hSalida.value = '11:00';
      }
    });
    form.addEventListener('input', (e) => { e.target.classList.remove('is-invalid'); avisosVistos = false; });
    form.addEventListener('submit', (e) => e.preventDefault());
    LL.$('#btnEjemplo').addEventListener('click', () => {
      form.reset();
      LL.llenarFormulario(form, ejemplo());
      LL.toast('Datos de ejemplo cargados. Revisa cada paso y continúa.');
    });

    // Acciones en constancia y lista (delegación)
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-acc]');
      if (!b) return;
      const r = LL.Store.obtener(b.dataset.id);
      if (!r) return;
      switch (b.dataset.acc) {
        case 'constancia': R.verConstancia(r.id); break;
        case 'ver': C.ver(r); break;
        case 'pdf': C.imprimir(r); break;
        case 'word': C.descargarWord(r); break;
        case 'editar': R.editar(r.id); break;
        case 'calc': LL.Calc.seleccionar(r.id); LL.navegar('calculadora'); break;
        case 'recordatorios': LL.Recordatorios.seleccionar(r.id); LL.navegar('recordatorios'); break;
        case 'ia': LL.IA.explicarContrato(r); break;
        case 'borrar':
          if (confirm(`¿Eliminar el registro ${r.id}? No se puede deshacer.`)) { LL.Store.eliminar(r.id); R.refrescar(); LL.toast('Registro eliminado.'); }
          break;
      }
    });

    document.addEventListener('change', (e) => {
      const cb = e.target.closest('[data-pend]');
      if (!cb) return;
      const r = LL.Store.obtener(cb.dataset.id);
      LL.Store.actualizar(r.id, { pendientes: { ...(r.pendientes || {}), [cb.dataset.pend]: cb.checked } });
      R.verConstancia(r.id, false);
      pintarLista();
    });

    // Diálogo del contrato
    const dlg = LL.$('#dlgContrato');
    dlg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-doc]');
      if (e.target === dlg || (b && b.dataset.doc === 'cerrar')) { dlg.close(); return; }
      if (!b) return;
      const r = LL.Store.obtener(dlg.dataset.id);
      if (!r) return;
      if (b.dataset.doc === 'pdf') C.imprimir(r);
      if (b.dataset.doc === 'word') C.descargarWord(r);
    });

    mostrarPaso(1);
    pintarLista();
  };
})();

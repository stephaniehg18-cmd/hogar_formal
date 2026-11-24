/* =========================================================
   derechos.js — Derechos en lenguaje claro y canal de consulta de la trabajadora
   ========================================================= */
(function () {
  'use strict';
  const LL = window.LL;
  const D = (LL.Derechos = {});

  const DERECHOS = [
    ['📝', 'Contrato por escrito', 'Tu contrato debe estar <b>por escrito</b>, firmado por ambas partes. Tienes derecho a una copia, y el hogar debe registrarlo en el MTPE dentro de 3 días hábiles.', 'Ley N.° 31047'],
    ['💵', 'Sueldo mínimo', () => `Si trabajas jornada completa, tu sueldo no puede ser menor a la Remuneración Mínima Vital (<b>${LL.money(LL.CONFIG.RMV)}</b>). Si trabajas por horas, se paga en proporción. Debes recibir una <b>boleta</b> en cada pago.`, 'Ley N.° 31047'],
    ['⏰', 'Horario y descanso', 'Máximo <b>8 horas al día o 48 a la semana</b>. Tienes al menos <b>un día completo de descanso</b> a la semana y 45 minutos para cada comida. Si vives en el hogar, 12 horas seguidas de descanso cada día.', 'Ley N.° 31047'],
    ['➕', 'Horas extras y feriados', 'Son <b>voluntarias</b>. Las horas extras se pagan con 25 % más (35 % desde la tercera). Si trabajas un feriado, te dan otro día libre o te pagan el doble.', 'Ley N.° 31047'],
    ['🏥', 'Salud: EsSalud', 'El hogar debe afiliarte a <b>EsSalud</b> y pagar el 9 % de tu sueldo. No se te descuenta. Te cubre consultas, hospitalización, medicinas y maternidad.', 'Ley N.° 31047'],
    ['👵', 'Pensión: ONP o AFP', 'Tú <b>eliges</b> ONP o AFP. El aporte se descuenta de tu sueldo y el hogar lo paga por ti. Así tendrás jubilación y protección por invalidez.', 'Ley N.° 31047'],
    ['🎁', 'Gratificaciones', 'Recibes <b>dos gratificaciones al año</b>: en julio y en diciembre, cada una igual a un sueldo, más un 9 % de bonificación. Si trabajas por horas, es proporcional.', 'Ley N.° 31047 · Ley N.° 27735'],
    ['🏦', 'CTS', 'Es un ahorro para cuando termine tu trabajo. El hogar lo deposita en <b>mayo y noviembre</b> en el banco que elijas. No aplica si trabajas menos de 4 horas al día.', 'D.S. N.° 001-97-TR'],
    ['🌴', 'Vacaciones', '<b>30 días pagados</b> por cada año completo de trabajo. No aplica si trabajas menos de 4 horas al día.', 'Ley N.° 31047'],
    ['🤰', 'Maternidad', 'Tienes derecho al <b>descanso pre y post natal</b> y no pueden despedirte por estar embarazada.', 'Ley N.° 31047'],
    ['🛡️', 'Trato digno', 'Nadie puede discriminarte, maltratarte ni acosarte. No pueden quitarte tus documentos ni revisar tus cosas. Si vives en el hogar, debes tener un cuarto adecuado.', 'Ley N.° 31047'],
    ['🔞', 'Edad mínima', 'Solo pueden contratarse personas de <b>18 años o más</b> para el trabajo del hogar.', 'Ley N.° 31047']
  ];

  function pintarDerechos() {
    LL.$('#listaDerechos').innerHTML = DERECHOS.map(([ico, t, txt, norma]) => `
      <details><summary><span class="ico" aria-hidden="true">${ico}</span>${t}</summary>
      <div>${typeof txt === 'function' ? txt() : txt}<small>Base legal: ${norma}</small></div></details>`).join('');
  }

  function pintarConsultas() {
    const lista = LL.Store.consultas();
    LL.$('#listaConsultas').innerHTML = lista.map((c) => `<li><b>${c.id}</b> · ${LL.esc(c.tema)}<small>${LL.fechaCorta(new Date(c.fecha))} · ${c.estado}</small></li>`).join('');
  }

  D.init = function () {
    pintarDerechos();
    pintarConsultas();
    const form = LL.$('#formConsulta');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = LL.leerFormulario(form);
      if (!d.mensaje || d.mensaje.length < 10) { form.elements.mensaje.classList.add('is-invalid'); LL.toast('Cuéntanos un poco más sobre tu consulta.'); return; }
      if (d.contacto && !/^9\d{8}$/.test(d.contacto)) { form.elements.contacto.classList.add('is-invalid'); LL.toast('El celular debe tener 9 números.'); return; }
      form.elements.mensaje.classList.remove('is-invalid');
      form.elements.contacto.classList.remove('is-invalid');
      const c = LL.Store.agregarConsulta({ tema: d.tema, contacto: d.contacto ? 'sí' : 'no' }); // no se guarda el texto: minimización de datos
      const orientacion = LL.IA.respuestaLocal(d.tema + ' ' + d.mensaje);
      LL.$('#consultaResultado').innerHTML = `
        <div class="msg-box msg-box--ok" style="margin-top:16px">Tu consulta fue recibida. Número de seguimiento: <b>${c.id}</b>.</div>
        <div class="card" style="margin-top:12px;box-shadow:none">
          <h3 class="card__title">Orientación inmediata</h3>
          ${LL.md(orientacion)}
          <p class="hint">Orientación automática. Un orientador revisará tu caso; antes de cualquier sanción, el hogar recibe un plazo para corregir.</p>
          <button type="button" class="btn btn--ghost btn--sm" id="btnSeguirIA">Seguir preguntando al asistente</button>
        </div>`;
      LL.$('#btnSeguirIA').addEventListener('click', () => LL.navegar('asistente'));
      form.reset();
      pintarConsultas();
    });
  };
})();

/* =========================================================
   contrato.js — Reglas jurídicas y plantilla del contrato de trabajo del hogar
   Base: Ley N.° 31047, D.S. N.° 009-2021-TR y modelos referenciales de la
   R.D.G. N.° 0001-2021-MTPE/2/15 (versión simplificada).
   ========================================================= */
(function () {
  'use strict';
  const LL = window.LL;
  const C = (LL.Contrato = {});

  C.MODALIDADES = {
    afuera:  { corto: 'Cama afuera',  titulo: 'Contrato de trabajo del hogar sin residencia' },
    adentro: { corto: 'Cama adentro', titulo: 'Contrato de trabajo del hogar con residencia' },
    horas:   { corto: 'Por horas',    titulo: 'Contrato de trabajo del hogar a tiempo parcial sin residencia' }
  };

  C.LABORES = {
    lLimpieza: 'limpieza, mantenimiento y cuidado del hogar',
    lCocina: 'cocina o ayudante de cocina',
    lLavado: 'lavado y planchado de ropa',
    lNinos: 'cuidado de niñas, niños y adolescentes',
    lMayores: 'cuidado de personas adultas mayores, enfermas o con discapacidad',
    lMascotas: 'cuidado de mascotas domésticas'
  };
  C.LABORES_CORTO = { lLimpieza: 'Limpieza', lCocina: 'Cocina', lLavado: 'Lavado y planchado', lNinos: 'Cuidado de niñas/os', lMayores: 'Cuidado de mayores', lMascotas: 'Mascotas' };

  /** Datos calculados a partir del registro. */
  C.derivados = function (d) {
    const horasDia = LL.num(d.horasDia), diasSem = LL.num(d.diasSem);
    return {
      horasDia, diasSem,
      horasSem: LL.round2(horasDia * diasSem),
      parcial: d.modalidad === 'horas',
      labores: Object.keys(C.LABORES).filter((k) => d[k]),
      minimo: d.modalidad === 'horas' ? LL.round2((LL.CONFIG.RMV / 48) * horasDia * diasSem) : LL.CONFIG.RMV
    };
  };

  /* ---------- Reglas por paso (mensajes en lenguaje simple) ---------- */
  C.validarPaso = function (paso, d) {
    const out = [];
    const err = (m, campo) => out.push({ tipo: 'error', m, campo });
    const warn = (m) => out.push({ tipo: 'warn', m });
    const info = (m) => out.push({ tipo: 'info', m });

    if (paso === 1) {
      if (!d.hNombre) err('Escribe tu nombre y apellidos.', 'hNombre');
      if (!/^\d{8}$/.test(d.hDni)) err('Tu DNI debe tener 8 números.', 'hDni');
      if (d.hCelular && !/^9\d{8}$/.test(d.hCelular)) err('El celular debe tener 9 números y empezar con 9.', 'hCelular');
      if (!d.hDireccion) err('Indica la dirección donde trabajará.', 'hDireccion');
      if (!d.hDistrito) err('Elige tu distrito.', 'hDistrito');
    }

    if (paso === 2) {
      if (!d.tNombre) err('Escribe el nombre de la trabajadora.', 'tNombre');
      if (d.tDocTipo === 'DNI' ? !/^\d{8}$/.test(d.tDni) : !d.tDni) err(d.tDocTipo === 'DNI' ? 'El DNI de la trabajadora debe tener 8 números.' : 'Escribe el número de documento.', 'tDni');
      if (d.tCelular && !/^9\d{8}$/.test(d.tCelular)) err('El celular debe tener 9 números y empezar con 9.', 'tCelular');
      const fn = LL.parseFecha(d.tFnac);
      if (!fn) err('Indica la fecha de nacimiento.', 'tFnac');
      else {
        const edad = LL.edad(fn);
        if (edad < 18) err(`La trabajadora tiene ${edad} años. La ley prohíbe contratar a menores de 18 años para el trabajo del hogar (Ley N.° 31047).`, 'tFnac');
        else if (edad > 100) err('Revisa la fecha de nacimiento.', 'tFnac');
      }
      if (!d.tPension) info('Recuerda: la trabajadora debe elegir ONP o AFP. Si no elige, se le afilia según las reglas del sistema de pensiones.');
    }

    if (paso === 3) {
      const x = C.derivados(d);
      if (!x.labores.length) err('Marca al menos una labor.');
      if (!LL.num(d.remun)) err('Indica el sueldo mensual.', 'remun');
      if (!d.fInicio) err('Indica la fecha de inicio.', 'fInicio');
      if (!x.horasDia || !x.diasSem) err('Indica las horas al día y los días a la semana.', 'horasDia');
      if (x.horasDia > 8) err(`La jornada no puede pasar de 8 horas al día (indicaste ${x.horasDia}).`, 'horasDia');
      if (x.horasSem > 48) err(`La jornada no puede pasar de 48 horas a la semana (suman ${x.horasSem}).`, 'diasSem');
      if (x.diasSem > 6) err('Debe tener al menos un día completo de descanso a la semana.', 'diasSem');
      if (x.parcial && x.horasDia >= 4) err('"Por horas" es solo para menos de 4 horas al día. Elige "Cama afuera" o "Cama adentro".', 'horasDia');
      if (!x.parcial && x.horasDia && x.horasDia < 4) warn('Trabaja menos de 4 horas al día: te conviene la modalidad "Por horas".');

      const remun = LL.num(d.remun);
      if (remun && x.horasDia && remun < x.minimo) {
        err(x.parcial
          ? `Por ${x.horasSem} horas a la semana, el sueldo mínimo es ${LL.money(x.minimo)} (proporcional a la RMV de ${LL.money(LL.CONFIG.RMV)}).`
          : `El sueldo no puede ser menor a la Remuneración Mínima Vital: ${LL.money(LL.CONFIG.RMV)}.`, 'remun');
      }

      if (d.hEntrada && d.hSalida && x.horasDia) {
        const [h1, m1] = d.hEntrada.split(':').map(Number), [h2, m2] = d.hSalida.split(':').map(Number);
        const lapso = (h2 * 60 + m2 - h1 * 60 - m1) / 60;
        if (lapso > 0 && lapso < x.horasDia) err('El horario de entrada y salida no alcanza para las horas indicadas.', 'hSalida');
        if (lapso - x.horasDia > 1.5) warn(`Entre la entrada y la salida hay ${lapso} horas, pero indicaste ${x.horasDia} horas de trabajo. El tiempo de comida es de 45 minutos; el resto cuenta como jornada.`);
      }

      if (d.plazoFijo) {
        const ini = LL.parseFecha(d.fInicio), fin = LL.parseFecha(d.fFin);
        if (!fin) err('Indica la fecha de término.', 'fFin');
        else if (ini && fin <= ini) err('La fecha de término debe ser posterior al inicio.', 'fFin');
        if (!d.causa || d.causa.length < 10) err('Explica el motivo del plazo fijo. Sin un motivo real, el contrato se considera indefinido.', 'causa');
      }
      if (d.modalidad === 'adentro') info('Cama adentro: debe tener un descanso diario de al menos 12 horas seguidas, un cuarto adecuado y sus tres comidas. Nada de esto se descuenta del sueldo.');
    }
    return out;
  };

  C.validarTodo = (d) => [1, 2, 3].flatMap((p) => C.validarPaso(p, d));

  /* ---------- Plantilla del contrato ---------- */
  const B = (v) => (v ? LL.esc(v) : '__________');
  const EMP = '<b>LA PERSONA EMPLEADORA</b>', TRA = '<b>LA PERSONA TRABAJADORA DEL HOGAR</b>';
  const ORD = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA', 'DÉCIMA PRIMERA'];

  C.construir = function (d) {
    const x = C.derivados(d);
    const mod = C.MODALIDADES[d.modalidad] || C.MODALIDADES.afuera;
    const remun = LL.num(d.remun);
    const transf = /transf/.test(d.pago || '');
    const periodicidad = /quincenal/.test(d.pago || '') ? 'quincenal' : 'mensual';
    const cl = [];
    const add = (t, h) => cl.push([t, h]);

    add('LUGAR Y LABORES', `${TRA} prestará servicios en el domicilio de ${EMP}, ubicado en ${B(d.hDireccion)}, distrito de ${B(d.hDistrito)}, realizando las siguientes labores: ${x.labores.map((k) => C.LABORES[k]).join('; ') || '__________'}.`);

    add('PLAZO', d.plazoFijo
      ? `El presente contrato es a plazo fijo, desde el ${B(LL.fechaLarga(d.fInicio))} hasta el ${B(LL.fechaLarga(d.fFin))}, y se justifica en la siguiente causa objetiva: ${B(d.causa)}.`
      : `El presente contrato es por tiempo indeterminado y rige desde el ${B(LL.fechaLarga(d.fInicio))}.`);

    add('REMUNERACIÓN', `${TRA} percibirá una remuneración ${x.parcial ? 'proporcional a las horas trabajadas, con base en la Remuneración Mínima Vital' : 'no menor a la Remuneración Mínima Vital'}, ascendente a <b>S/ ${LL.round2(remun).toLocaleString('es-PE', { minimumFractionDigits: 2 })} (${LL.montoALetras(remun)})</b> mensuales, que se pagará en forma ${periodicidad} ${transf ? 'mediante transferencia bancaria a una cuenta a su nombre' : 'en efectivo'}. En cada pago, ${EMP} entregará una boleta de pago firmada por ambas partes.`);

    add('JORNADA Y DESCANSO', `La jornada es de ${x.horasDia} horas diarias y ${x.horasSem} horas semanales, distribuidas en ${x.diasSem} días, con horario de ${B(d.hEntrada)} a ${B(d.hSalida)} horas.${d.modalidad === 'adentro' ? ` ${TRA} gozará de un descanso diario mínimo de doce (12) horas continuas.` : ''} El descanso semanal obligatorio es de veinticuatro (24) horas continuas y se fija el día ${B(d.descanso)}. Las horas extras son voluntarias y se pagan con una sobretasa de 25 % por las dos primeras horas y 35 % por las siguientes. El trabajo en feriados es voluntario y se compensa con descanso sustitutorio o con el pago del día más una sobretasa del 100 %.`);

    if (d.modalidad === 'adentro') {
      add('RESIDENCIA Y ALIMENTACIÓN', `${EMP} otorgará a ${TRA} alojamiento adecuado que asegure su dignidad, y desayuno, almuerzo y cena, con al menos cuarenta y cinco (45) minutos para cada comida. El alojamiento y la alimentación no forman parte de la remuneración ni pueden descontarse de ella.`);
    } else if (d.modalidad === 'afuera') {
      add('ALIMENTACIÓN', `${EMP} proveerá a ${TRA} la alimentación que corresponda a su horario, con al menos cuarenta y cinco (45) minutos para consumirla. Este tiempo no forma parte de la jornada y la alimentación no forma parte de la remuneración.`);
    }

    add('BENEFICIOS', x.parcial
      ? `${TRA} tiene derecho a las gratificaciones legales de julio y diciembre en forma proporcional, y al descanso pre y post natal conforme al régimen laboral de la actividad privada.`
      : `${TRA} tiene derecho a dos gratificaciones al año (julio y diciembre), cada una equivalente a una remuneración; a la Compensación por Tiempo de Servicios (CTS); a treinta (30) días de vacaciones por cada año completo de servicios; y al descanso pre y post natal, conforme a la Ley N.° 31047 y su Reglamento.`);

    add('SEGURIDAD SOCIAL', `${EMP} afiliará a ${TRA} al Seguro Social de Salud (EsSalud), asumiendo el aporte correspondiente, y al sistema de pensiones de su elección${d.tPension ? `, que es la ${d.tPension === 'ONP' ? 'Oficina de Normalización Previsional (ONP)' : 'Administradora de Fondos de Pensiones (AFP)'}` : ' (ONP o AFP)'}.`);

    add('SEGURIDAD, SALUD Y TRATO DIGNO', `${EMP} proporcionará los implementos necesarios para que ${TRA} realice sus labores en condiciones de seguridad y salud, y garantizará un trato respetuoso, libre de discriminación y de hostigamiento sexual.`);

    add('REGISTRO DEL CONTRATO', `${EMP} entregará a ${TRA} un ejemplar firmado del presente contrato y lo registrará en el aplicativo web del Ministerio de Trabajo y Promoción del Empleo dentro de los tres (3) días hábiles siguientes a su celebración, entregando la constancia respectiva a ${TRA}.`);

    add('NORMAS APLICABLES', 'En lo no previsto, se aplican la Ley N.° 31047, Ley de las trabajadoras y trabajadores del hogar, su Reglamento aprobado por D.S. N.° 009-2021-TR y, supletoriamente, las normas del régimen laboral de la actividad privada.');

    return `
      <h2>${mod.titulo}</h2>
      <div class="code">${d.id ? `Registro ${d.id}` : 'Borrador'}</div>
      <p>Conste por el presente documento el contrato de trabajo del hogar que celebran, de una parte, <b>${B(d.hNombre)}</b>, identificado(a) con DNI N.° ${B(d.hDni)}, con domicilio en ${B(d.hDireccion)}, distrito de ${B(d.hDistrito)}, a quien en adelante se denominará ${EMP}; y, de la otra parte, <b>${B(d.tNombre)}</b>, identificado(a) con ${B(d.tDocTipo)} N.° ${B(d.tDni)}, nacido(a) el ${B(LL.fechaLarga(d.tFnac))}, a quien en adelante se denominará ${TRA}; en los términos siguientes:</p>
      ${cl.map(([t, h], i) => `<p><b>${ORD[i]}.- ${t}.</b> ${h}</p>`).join('')}
      <p>En señal de conformidad, ambas partes firman el presente contrato en dos ejemplares, en ${B(d.hDistrito)}, el ${B(LL.fechaLarga(d.fFirma || d.fInicio))}.</p>
      <div class="signs">
        <div><b>LA PERSONA EMPLEADORA</b><br>${LL.esc(d.hNombre || '')}<br>DNI ${LL.esc(d.hDni || '')}</div>
        <div><b>LA PERSONA TRABAJADORA DEL HOGAR</b><br>${LL.esc(d.tNombre || '')}<br>${LL.esc(d.tDocTipo || 'DNI')} ${LL.esc(d.tDni || '')}</div>
      </div>
      <p class="note">(*) Si alguna de las partes no puede firmar, colocará su huella digital.</p>`;
  };

  C.textoPlano = function (d) {
    const div = document.createElement('div');
    div.innerHTML = C.construir(d);
    return div.innerText.replace(/\n{3,}/g, '\n\n').trim();
  };

  /* ---------- Exportación ---------- */
  function documento(d) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Contrato ${d.id || ''}</title>
      <style>
        @page{size:A4;margin:2.5cm 2.2cm}
        body{font-family:'Times New Roman',Georgia,serif;font-size:12pt;line-height:1.5;margin:0;color:#000;text-align:justify}
        h2{font-size:13pt;text-align:center;text-transform:uppercase;margin:0 0 4px}
        .code{text-align:center;font-size:10pt;margin-bottom:18px}
        p{margin:0 0 10px}
        .signs{display:flex;justify-content:space-between;gap:48px;margin-top:80px;text-align:center;font-size:11pt}
        .signs div{flex:1;border-top:1px solid #000;padding-top:6px}
        .note{font-size:10pt}
      </style></head><body>${C.construir(d)}</body></html>`;
  }

  C.imprimir = function (d) {
    const w = window.open('', '_blank');
    if (!w) { LL.toast('Permite las ventanas emergentes para generar el PDF.'); return; }
    w.document.write(documento(d));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  C.descargarWord = function (d) {
    const nombre = LL.normalizar((d.tNombre || 'trabajadora').split(' ').slice(0, 2).join('-'));
    LL.descargar(`contrato_${d.id || 'borrador'}_${nombre}.doc`, '﻿' + documento(d), 'application/msword');
    LL.toast('Contrato descargado en formato Word.');
  };

  C.ver = function (d) {
    const dlg = LL.$('#dlgContrato');
    LL.$('#contratoDoc').innerHTML = C.construir(d);
    dlg.dataset.id = d.id || '';
    dlg.showModal();
  };
})();

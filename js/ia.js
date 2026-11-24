/* =========================================================
   ia.js — Asistente con inteligencia artificial
   · Base local: base de conocimiento + coincidencia de palabras clave (sin conexión).
   · Claude (API): modelo claude-opus-5-5 de Anthropic, con anonimización previa
     (Ley N.° 29733), confirmación del usuario y bitácora.
   ========================================================= */
(function () {
  'use strict';
  const LL = window.LL;
  const IA = (LL.IA = {});

  const MODELO = 'claude-opus-5-5';
  const SDK_URL = 'https://esm.sh/@anthropic-ai/sdk';

  const SISTEMA = `Eres el asistente de "Hogar Formal", un prototipo académico que orienta a hogares empleadores y a trabajadoras del hogar en el Perú.
Marco: Ley N.° 31047 (Ley de las trabajadoras y trabajadores del hogar) y su Reglamento (D.S. N.° 009-2021-TR); de forma supletoria, el régimen laboral de la actividad privada (gratificaciones: Ley N.° 27735 y Ley N.° 30334; CTS: D.S. N.° 001-97-TR).
Reglas:
- Usa lenguaje sencillo, cálido y breve (máximo 200 palabras), con viñetas cuando ayuden. Muchas usuarias no tienen formación legal.
- Cita la norma cuando corresponda. No inventes normas, artículos ni cifras.
- Si un dato puede haber cambiado (por ejemplo, la Remuneración Mínima Vital), dilo y recomienda verificar en gob.pe.
- Ante posibles abusos, orienta hacia SUNAFIL o el MTPE; en casos de violencia, a la Línea 100.
- Los datos personales fueron reemplazados por etiquetas como [TRABAJADORA], [EMPLEADOR], [DNI]; no intentes reconstruirlos.
- Tu respuesta es orientativa y no reemplaza la asesoría de un abogado.`;

  /* ---------- 1. Base de conocimiento local ---------- */
  const BASE = [
    { claves: ['gratificacion', 'grati', 'julio', 'diciembre', 'navidad', 'fiestas patrias', 'aguinaldo'],
      r: `**Gratificación**
- Son **dos al año**: julio y diciembre, cada una igual a **un sueldo completo** (Ley N.° 31047).
- Se pagan hasta el **15 de julio** y el **15 de diciembre**.
- Si no trabajó todo el semestre, se paga 1/6 por cada **mes completo** trabajado.
- Se suma una **bonificación de 9 %** (Ley N.° 30334).
- Si trabaja por horas, es **proporcional**.
Calcula el monto exacto en la sección **Calculadora**.` },
    { claves: ['cts', 'compensacion', 'deposito'],
      r: `**CTS**
- Es un ahorro que el hogar deposita en **mayo y noviembre** (hasta el día 15) en el banco que elija la trabajadora.
- Fórmula: (sueldo + 1/6 de la gratificación) ÷ 12 × meses trabajados en el periodo.
- **No corresponde** si trabaja menos de 4 horas al día.` },
    { claves: ['registrar', 'registro', 'aplicativo', 'mtpe', 'contrato escrito', 'obligatorio', 'contrato verbal', 'papel'],
      r: `**Contrato y registro**
- El contrato debe ser **por escrito** (Ley N.° 31047). Un acuerdo verbal no basta.
- El hogar lo registra en el **aplicativo web del MTPE** dentro de **3 días hábiles** y entrega la constancia a la trabajadora.
- Con **Hogar Formal** generas el contrato en 3 pasos y recibes la lista de lo que debes cumplir.` },
    { claves: ['horas', 'jornada', 'horario', 'cuantas horas', 'maximo'],
      r: `**Jornada**
- Máximo **8 horas al día o 48 a la semana**.
- 45 minutos para cada comida, que no cuentan como jornada.
- Un **día completo de descanso** a la semana (24 horas seguidas).
- Cama adentro: además, **12 horas seguidas** de descanso cada día.` },
    { claves: ['cama adentro', 'residencia', 'vive', 'cuarto', 'alojamiento', 'comida', 'alimentacion'],
      r: `**Cama adentro (con residencia)**
- El hogar debe dar un **cuarto adecuado** y **desayuno, almuerzo y cena**.
- Eso **no es parte del sueldo** y **no se puede descontar**.
- Descanso diario de **12 horas seguidas** y un día libre a la semana.
- El sueldo no puede ser menor a la RMV.` },
    { claves: ['por horas', 'parcial', 'pocas horas', 'menos de 4', 'medio tiempo'],
      r: `**Trabajo por horas (tiempo parcial)**
- Aplica cuando trabaja **menos de 4 horas al día** en promedio.
- El sueldo es **proporcional** a la RMV según las horas.
- Tiene **gratificaciones proporcionales**, EsSalud y pensión.
- No genera CTS ni vacaciones.` },
    { claves: ['sueldo', 'salario', 'minimo', 'rmv', 'pagar', 'cuanto gana'],
      r: `**Sueldo**
- Jornada completa: no menos de la **Remuneración Mínima Vital** (este prototipo usa S/ {RMV}; verifica el valor vigente en gob.pe).
- Por horas: proporcional a las horas.
- Se paga de forma semanal, quincenal o mensual, siempre con **boleta**.` },
    { claves: ['essalud', 'seguro', 'salud', 'afp', 'onp', 'pension', 'jubilacion'],
      r: `**Salud y pensión**
- **EsSalud**: el hogar paga el **9 %** del sueldo; no se descuenta a la trabajadora.
- **Pensión**: la trabajadora elige **ONP** (13 %) o **AFP**; se descuenta del sueldo y el hogar lo paga.` },
    { claves: ['vacaciones', 'descanso anual'],
      r: `**Vacaciones**
- **30 días pagados** por cada año completo de trabajo.
- Si el trabajo termina antes, se pagan vacaciones **truncas**.
- No corresponden con jornada menor a 4 horas diarias.` },
    { claves: ['horas extra', 'sobretiempo', 'feriado'],
      r: `**Horas extras y feriados**
- Son **voluntarios**.
- Horas extras: **25 %** más las dos primeras y **35 %** desde la tercera.
- Feriado trabajado: otro día de descanso o el pago del día **más 100 %**.` },
    { claves: ['edad', 'menor', 'adolescente', '18'],
      r: `**Edad mínima**
- Solo pueden trabajar en el hogar personas de **18 años o más** (Ley N.° 31047).` },
    { claves: ['despid', 'renuncia', 'terminar', 'cese', 'liquidacion', 'botaron', 'me deben'],
      r: `**Fin del trabajo**
- Al terminar, el hogar debe pagar los **beneficios truncos**: gratificación, CTS y vacaciones proporcionales.
- Si fue un despido sin causa, puede corresponder una **indemnización**.
- Puedes pedir orientación gratuita al **MTPE** o presentar una denuncia ante **SUNAFIL**.` },
    { claves: ['maltrato', 'acoso', 'violencia', 'discrimin', 'grita', 'documentos', 'abuso'],
      r: `**Trato digno**
- La ley prohíbe la discriminación, el maltrato y el hostigamiento sexual.
- No pueden retener tus documentos ni revisar tus pertenencias.
- Busca ayuda en **SUNAFIL** o el **MTPE**. En casos de violencia, llama a la **Línea 100**.` },
    { claves: ['embaraz', 'maternidad', 'pre natal', 'post natal', 'bebe'],
      r: `**Maternidad**
- Tienes derecho al **descanso pre y post natal** pagado por EsSalud (si estás afiliada).
- No pueden despedirte por estar embarazada.` },
    { claves: ['boleta'],
      r: `**Boleta de pago**
- Se entrega en **cada pago**, con el sueldo, los descuentos y aportes, y la firma (o huella) de ambas partes.` }
  ];

  IA.respuestaLocal = function (pregunta) {
    const q = LL.normalizar(pregunta);
    let mejor = null, puntaje = 0;
    for (const item of BASE) {
      const p = item.claves.reduce((acc, k) => acc + (q.includes(LL.normalizar(k)) ? k.length : 0), 0);
      if (p > puntaje) { puntaje = p; mejor = item; }
    }
    if (!mejor) {
      return `No encontré una respuesta exacta. Puedo orientarte sobre: **contrato y registro, sueldo, horario, cama adentro, trabajo por horas, gratificación, CTS, vacaciones, EsSalud y pensión, horas extras, maternidad, trato digno y fin del trabajo**.
Para preguntas abiertas, activa **Claude (API)**.`;
    }
    return mejor.r.replace('{RMV}', LL.CONFIG.RMV.toLocaleString('es-PE', { minimumFractionDigits: 2 }));
  };

  /* ---------- 2. Anonimización (Ley N.° 29733) ---------- */
  IA.anonimizar = function (texto) {
    let t = String(texto);
    const tapar = (valor, etiqueta) => {
      if (!valor || valor.length < 3) return;
      t = t.replace(new RegExp(valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), etiqueta);
    };
    LL.Store.registros().forEach((r) => {
      tapar(r.tNombre, '[TRABAJADORA]');
      tapar(r.hNombre, '[EMPLEADOR]');
      tapar(r.hDireccion, '[DIRECCIÓN]');
    });
    return t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[CORREO]')
      .replace(/\b9\d{8}\b/g, '[CELULAR]')
      .replace(/\b\d{8}\b/g, '[DNI]')
      .replace(/\b\d{9,12}\b/g, '[DOCUMENTO]');
  };

  /* ---------- 3. Llamada a Claude ---------- */
  let cliente = null, claveCliente = '';
  async function obtenerCliente(apiKey) {
    if (cliente && claveCliente === apiKey) return cliente;
    const { default: Anthropic } = await import(SDK_URL);
    cliente = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    claveCliente = apiKey;
    return cliente;
  }

  const historial = [];
  async function preguntarClaude(apiKey, texto) {
    const c = await obtenerCliente(apiKey);
    const resp = await c.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: SISTEMA,
      messages: historial.concat([{ role: 'user', content: texto }])
    });
    if (resp.stop_reason === 'refusal') return { texto: 'No pude responder esta consulta. Intenta reformularla o consulta a un profesional.', modelo: resp.model };
    historial.push({ role: 'user', content: texto }, { role: 'assistant', content: resp.content });
    while (historial.length > 20) historial.splice(0, 2);
    const salida = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return { texto: salida || '(Respuesta vacía)', modelo: resp.model };
  }

  function mensajeError(e) {
    const s = e && e.status;
    if (s === 401) return 'La clave de API no es válida.';
    if (s === 429) return 'Se alcanzó el límite de uso. Intenta en unos minutos.';
    if (s >= 500) return 'El servicio de IA no está disponible. Usa la base local.';
    if (e && /fetch|network|import/i.test(String(e.message))) return 'No hay conexión con el servicio de IA. Usa la base local.';
    return 'No se pudo completar la consulta: ' + (e && e.message ? e.message : 'error desconocido');
  }

  /* ---------- 4. Interfaz ---------- */
  let log, input, bitacora, dlg;
  const modo = () => (LL.$('input[name="iaModo"]:checked') || {}).value || 'local';

  function agregar(clase, html, meta) {
    const div = document.createElement('div');
    div.className = 'msg ' + clase;
    div.innerHTML = html + (meta ? `<span class="msg__meta">${meta}</span>` : '');
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function registrar(texto) {
    const li = document.createElement('li');
    li.textContent = `${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} · ${texto}`;
    bitacora.prepend(li);
  }

  function confirmar(texto) {
    if (!LL.$('#iaVerEnvio').checked || typeof dlg.showModal !== 'function') return Promise.resolve(true);
    LL.$('#dlgEnvioTexto').textContent = texto;
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise((ok) => dlg.addEventListener('close', () => ok(dlg.returnValue === 'ok'), { once: true }));
  }

  async function enviar(pregunta, op = {}) {
    const visible = op.visible || pregunta;
    agregar('msg--user', LL.md(visible));

    if (modo() === 'local') {
      agregar('msg--bot', LL.md(op.local || IA.respuestaLocal(pregunta)), 'Base local Hogar Formal · Orientación referencial: verifica con la norma vigente.');
      registrar('Local · ' + visible.slice(0, 50));
      return;
    }

    const apiKey = LL.$('#iaKey').value.trim();
    if (!apiKey) { agregar('msg--bot', '<p>Ingresa la clave de API para usar Claude, o cambia a <b>Base local</b>.</p>'); return; }
    try { sessionStorage.setItem('hf_key', apiKey); } catch (e) { /* ignorar */ }

    const anonimo = IA.anonimizar(pregunta);
    if (!(await confirmar(anonimo))) {
      agregar('msg--bot', '<p>Envío cancelado. Ningún dato salió de tu navegador.</p>');
      registrar('Envío cancelado por el usuario');
      return;
    }
    const espera = agregar('msg--bot msg--typing', '<p>Pensando…</p>');
    try {
      const r = await preguntarClaude(apiKey, anonimo);
      espera.remove();
      agregar('msg--bot', LL.md(r.texto), `Modelo ${LL.esc(r.modelo)} · datos anonimizados · Respuesta generada por IA: verifica con la norma o un profesional.`);
      registrar('Claude · ' + visible.slice(0, 50) + ' (anonimizado)');
    } catch (e) {
      espera.remove();
      agregar('msg--bot', `<p>${LL.esc(mensajeError(e))}</p>`);
      registrar('Error en la consulta a Claude');
    }
  }

  /** Explica el contrato de un registro en lenguaje simple (botón de la constancia). */
  IA.explicarContrato = function (r) {
    LL.navegar('asistente');
    const x = LL.Contrato.derivados(r);
    const resumenLocal = `**Tu contrato en palabras simples**
- **Modalidad:** ${LL.Contrato.MODALIDADES[r.modalidad].corto}.
- **Sueldo:** ${LL.money(LL.num(r.remun))} al mes, con boleta en cada pago.
- **Horario:** ${x.horasDia} h al día, ${x.diasSem} días a la semana; descansa el ${r.descanso}.
- **Labores:** ${x.labores.map((k) => LL.Contrato.LABORES_CORTO[k].toLowerCase()).join(', ')}.
- **Beneficios:** ${x.parcial ? 'gratificaciones proporcionales, EsSalud y pensión' : 'dos gratificaciones al año, CTS, 30 días de vacaciones, EsSalud y pensión'}.
- **Registro:** el hogar debe registrarlo en el MTPE en 3 días hábiles.
Para un análisis detallado de las cláusulas, usa **Claude (API)**.`;
    const prompt = `Explica en lenguaje sencillo, para la trabajadora y para el hogar, qué dice este contrato de trabajo del hogar, qué derechos y obligaciones crea y si ves algún punto que convenga revisar según la Ley N.° 31047. Responde en viñetas, máximo 200 palabras.

CONTRATO:
"""
${LL.Contrato.textoPlano(r)}
"""`;
    enviar(prompt, { visible: `📄 Explícame el contrato ${r.id}`, local: resumenLocal });
  };

  IA.init = function () {
    log = LL.$('#chatLog');
    input = LL.$('#chatInput');
    bitacora = LL.$('#iaBitacora');
    dlg = LL.$('#dlgEnvio');
    try { const k = sessionStorage.getItem('hf_key'); if (k) LL.$('#iaKey').value = k; } catch (e) { /* ignorar */ }

    agregar('msg--bot', LL.md(`¡Hola! Soy el asistente de **Hogar Formal**. Respondo dudas sobre el trabajo del hogar: contrato, sueldo, horario, gratificación, CTS, salud, pensión y más.
Con **Base local** respondo con información verificada; con **Claude (API)** atiendo preguntas abiertas.`));

    LL.$$('input[name="iaModo"]').forEach((r) => r.addEventListener('change', () => { LL.$('#iaKeyBox').hidden = modo() !== 'claude'; }));
    LL.$('#chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      enviar(q);
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); LL.$('#chatForm').requestSubmit(); } });
    LL.$$('#chatSuggest button').forEach((b) => b.addEventListener('click', () => enviar(b.textContent)));
  };
})();

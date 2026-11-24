/* =========================================================
   store.js — Persistencia local (localStorage)
   Registros de contratos, consultas y preferencias de recordatorio.
   En un piloto real esto sería una API con base de datos del MTPE.
   ========================================================= */
(function () {
  'use strict';
  const LL = window.LL;
  const S = (LL.Store = {});

  const leer = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  /* ---------- Registros ---------- */
  S.registros = () => leer('hf_registros', []);
  S.obtener = (id) => S.registros().find((r) => r.id === id);

  function nuevoCodigo(lista) {
    let id;
    do { id = 'HF-' + String(Math.floor(10000 + Math.random() * 90000)); }
    while (lista.some((r) => r.id === id));
    return id;
  }

  S.guardar = function (datos, id) {
    const lista = S.registros();
    const i = id ? lista.findIndex((r) => r.id === id) : -1;
    let r;
    if (i >= 0) { r = { ...lista[i], ...datos, id, actualizado: new Date().toISOString() }; lista[i] = r; }
    else { r = { ...datos, id: nuevoCodigo(lista), creado: new Date().toISOString(), pendientes: {}, recordatorios: null }; lista.unshift(r); }
    escribir('hf_registros', lista);
    return r;
  };

  S.actualizar = function (id, cambios) {
    const lista = S.registros();
    const i = lista.findIndex((r) => r.id === id);
    if (i < 0) return null;
    lista[i] = { ...lista[i], ...cambios };
    escribir('hf_registros', lista);
    return lista[i];
  };

  S.eliminar = (id) => escribir('hf_registros', S.registros().filter((r) => r.id !== id));

  /* ---------- Consultas de trabajadoras ---------- */
  S.consultas = () => leer('hf_consultas', []);
  S.agregarConsulta = function (c) {
    const lista = S.consultas();
    const item = { ...c, id: 'CQ-' + String(Math.floor(100000 + Math.random() * 900000)), fecha: new Date().toISOString(), estado: 'Recibida · en orientación' };
    lista.unshift(item);
    escribir('hf_consultas', lista);
    return item;
  };
})();

/* =========================================================
   app.js — Arranque y navegación
   ========================================================= */
(function () {
  'use strict';
  const LL = window.LL;
  const VISTAS = ['inicio', 'registrar', 'constancia', 'registros', 'calculadora', 'recordatorios', 'derechos', 'asistente', 'proyecto'];

  function menu(abrir) {
    LL.$('#nav').classList.toggle('is-open', abrir);
    LL.$('#menuBtn').setAttribute('aria-expanded', String(abrir));
  }

  LL.navegar = function (id, push = true) {
    if (!VISTAS.includes(id)) id = 'inicio';
    if (id === 'constancia' && !LL.Registro.actual) id = 'registros';
    LL.$$('.view').forEach((v) => v.classList.toggle('is-visible', v.id === id));
    const activo = id === 'constancia' ? 'registros' : id;
    LL.$$('#nav a').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === activo));
    menu(false);
    if (push && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    window.scrollTo(0, 0);
  };

  document.addEventListener('DOMContentLoaded', () => {
    LL.Calc.init();
    LL.Registro.init();
    LL.Recordatorios.init();
    LL.Derechos.init();
    LL.IA.init();

    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-nav]');
      if (!el) return;
      e.preventDefault();
      if (el.dataset.nuevo) LL.Registro.nuevo();
      LL.navegar(el.dataset.nav);
    });
    LL.$('#menuBtn').addEventListener('click', () => menu(!LL.$('#nav').classList.contains('is-open')));
    window.addEventListener('popstate', () => LL.navegar(location.hash.slice(1), false));
    LL.navegar(location.hash.slice(1) || 'inicio', false);
  });
})();

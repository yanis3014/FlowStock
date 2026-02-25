/**
 * Layout partagé - Barre de navigation + header (titre page + Déconnexion)
 * Inclus sur toutes les pages métier sauf login.html et register.html.
 * Référence: docs/front-end-spec.md §3.2, §6
 */
(function () {
  'use strict';

  var NAV_ID = 'layout-nav';
  var HEADER_ID = 'layout-header';
  var PAGE_TITLE_ATTR = 'data-page-title';

  var navLinks = [
    { href: '/dashboard.html', label: 'Dashboard' },
    { href: '/stats.html', label: 'Stats' },
    { href: '/forecast.html', label: 'Prévisions' },
    { href: '/stock-estimates.html', label: 'Estimations' },
    { href: '/chat.html', label: 'Chat' },
    { href: '/formulas.html', label: 'Formules' },
    { href: '/sales.html', label: 'Ventes' },
    { href: '/import-stocks.html', label: 'Import stocks' },
    { href: '/import-sales.html', label: 'Import ventes' },
    { href: '/movements.html', label: 'Mouvements' },
    { href: '/locations.html', label: 'Emplacements' },
    { href: '/suppliers.html', label: 'Fournisseurs' }
  ];

  function getPageTitle() {
    var main = document.querySelector('main[' + PAGE_TITLE_ATTR + ']') ||
               document.querySelector('[' + PAGE_TITLE_ATTR + ']');
    return main ? main.getAttribute(PAGE_TITLE_ATTR) || document.title : document.title;
  }

  function currentPath() {
    var p = window.location.pathname || '';
    return p.replace(/^\//, '').replace(/\.html$/, '') || 'dashboard';
  }

  function renderNav() {
    var path = currentPath();
    var toggleClasses = 'nav-toggle md:hidden inline-flex items-center justify-center w-11 h-11 p-0 border border-gray-200 rounded-md bg-white cursor-pointer text-xl hover:bg-gray-100';
    var html = '<button type="button" class="' + toggleClasses + '" aria-label="Ouvrir le menu" aria-expanded="false">☰</button>';
    var listClasses = 'hidden md:flex flex-wrap gap-2 items-center list-none m-0 p-0';
    html += '<ul id="layout-nav-list" class="' + listClasses + '">';
    navLinks.forEach(function (item) {
      var page = item.href.replace(/^\//, '').replace(/\.html$/, '');
      var isActive = path === page;
      var linkClasses = isActive
        ? 'bg-primary text-white px-4 py-2 rounded-md font-medium text-sm no-underline'
        : 'text-primary px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-100 no-underline';
      html += '<li><a href="' + item.href + '" class="' + linkClasses + '">' + escapeHtml(item.label) + '</a></li>';
    });
    html += '</ul>';
    return html;
  }

  function renderHeader(title) {
    var logoutUrl = '/login.html';
    var h1Classes = 'text-xl font-semibold text-gray-800 m-0';
    var logoutClasses = 'text-primary text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-100 no-underline';
    return '<h1 class="' + h1Classes + '">' + escapeHtml(title || 'FlowStock') + '</h1>' +
      '<a href="' + logoutUrl + '" class="' + logoutClasses + '" id="layout-logout">Déconnexion</a>';
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /** Charge Tailwind après le rendu du layout pour que la nav et tout le DOM soient stylés (CDN JIT scan). */
  function loadTailwindAfterLayout() {
    if (document.querySelector('script[src*="cdn.tailwindcss.com"]')) return;
    window.tailwind = window.tailwind || {};
    window.tailwind.config = {
      theme: { extend: { colors: { primary: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444' } } }
    };
    var s = document.createElement('script');
    s.src = 'https://cdn.tailwindcss.com';
    s.async = false;
    document.head.appendChild(s);
  }

  function init() {
    var navEl = document.getElementById(NAV_ID);
    var headerEl = document.getElementById(HEADER_ID);
    if (!navEl || !headerEl) return;

    navEl.className = 'bg-white border-b border-gray-200 px-4 py-2';
    navEl.innerHTML = renderNav();
    headerEl.className = 'flex justify-between items-center flex-wrap gap-2 px-4 py-4 border-b border-gray-200 bg-white';
    headerEl.innerHTML = renderHeader(getPageTitle());

    var toggle = navEl.querySelector('.nav-toggle');
    var list = navEl.querySelector('#layout-nav-list');
    if (toggle && list) {
      toggle.addEventListener('click', function () {
        var open = list.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    loadTailwindAfterLayout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

import { closeSidebar } from '../../sidebar.js';
import { resetScrollHeader } from '../../scroll-header.js';

let activeCategoryId = null;

function getSiteRoot() {
  const root = document.body.dataset.siteRoot;
  if (root) return root.endsWith('/') ? root : `${root}/`;
  return './';
}

function navigateToSiteHash(hash) {
  const root = getSiteRoot();
  closeSidebar();
  window.location.href = `${root}#${hash.replace(/^#/, '')}`;
}

export function getActiveCategoryId() {
  return activeCategoryId;
}

export function setActiveCategoryId(categoryId) {
  activeCategoryId = categoryId;
}

export function setDashboardHeroVisible(visible) {
  const banner = document.getElementById('dashboard-banner');
  const welcome = document.querySelector('.dashboard-welcome-container');
  if (banner) banner.classList.toggle('hidden', !visible);
  if (welcome) welcome.classList.toggle('hidden', !visible);
}

export function clearCategoryActive() {
  document.querySelectorAll('[data-category-id].is-active').forEach((link) => {
    link.classList.remove('is-active');
  });
}

export function setCategoryActive(categoryId) {
  clearCategoryActive();
  const link = document.querySelector(`[data-category-id="${categoryId}"]`);
  if (link) link.classList.add('is-active');
}

export function setDashboardPanel(panelId, page = 1) {
  const panels = document.querySelectorAll('[data-dashboard-panel]');
  if (!panels.length) return;

  panels.forEach((el) => {
    const show = el.dataset.dashboardPanel === panelId;
    el.classList.toggle('hidden', !show);
    el.toggleAttribute('hidden', !show);
  });

  setDashboardHeroVisible(panelId !== 'category-posts');

  if (panelId !== 'category-posts') {
    resetScrollHeader();
  }

  document.querySelectorAll('[data-nav-panel]').forEach((link) => {
    const item = link.closest('.sidebar-menu-item');
    const isActive = link.dataset.navPanel === panelId;
    if (item) item.classList.toggle('active', isActive);
    link.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  if (panelId === 'introduce-me' || panelId === 'what-i-do') {
    clearCategoryActive();
    activeCategoryId = null;
  }

  const hash =
    panelId === 'category-posts' && activeCategoryId
      ? `category-${activeCategoryId}${page > 1 ? `-p${page}` : ''}`
      : panelId;

  if (history.replaceState) {
    history.replaceState(null, '', `#${hash}`);
  } else {
    location.hash = hash;
  }
}

export function initDashboardNav(onCategoryHashFound) {
  const panels = document.querySelectorAll('[data-dashboard-panel]');
  const hasDashboardPanels = panels.length > 0;

  document.querySelectorAll('[data-nav-panel]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const panelId = link.dataset.navPanel;
      if (!panelId) return;

      if (!hasDashboardPanels) {
        navigateToSiteHash(panelId);
        return;
      }

      setDashboardPanel(panelId);
      closeSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  if (!hasDashboardPanels) return;

  if (onCategoryHashFound?.()) return;

  const hash = location.hash.replace('#', '');
  const initialPanel = hash === 'what-i-do' ? 'what-i-do' : 'introduce-me';
  setDashboardPanel(initialPanel);
}

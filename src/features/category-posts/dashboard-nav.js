import { closeSidebar } from '../../sidebar.js';
import { resetScrollHeader } from '../../scroll-header.js';
import {
  hasDashboardPanels,
  shouldUseHomeSpaNavigation,
  navigateToHomeSpa,
  buildPanelHash,
  updateDashboardHash,
  isArticlePermalinkPage,
} from './spa-router.js';

export { getSiteRoot } from './spa-router.js';

let activeCategoryId = null;

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

  const hash = buildPanelHash(panelId, { categoryId: activeCategoryId, page });
  updateDashboardHash(hash);
  closeSidebar();
}

export function initDashboardNav() {
  document.querySelectorAll('[data-nav-panel]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const panelId = link.dataset.navPanel;
      if (!panelId) return;

      if (!hasDashboardPanels() || shouldUseHomeSpaNavigation()) {
        navigateToHomeSpa(panelId);
        closeSidebar();
        return;
      }

      setDashboardPanel(panelId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

export function isDashboardNavReady() {
  return hasDashboardPanels() && !isArticlePermalinkPage();
}

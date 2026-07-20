import { escapeHtml } from './utils/escape-html.js';

const TECH_BADGES = [
  { id: 'typescript', category: 'languages', label: 'TypeScript' },
  { id: 'python', category: 'languages', label: 'Python' },
  { id: 'javascript', category: 'languages', label: 'JavaScript' },
  { id: 'c', category: 'languages', label: 'C' },
  { id: 'dart', category: 'languages', label: 'Dart' },
  { id: 'html5', category: 'languages', label: 'HTML5' },
  { id: 'css3', category: 'languages', label: 'CSS3' },
  { id: 'react', category: 'frontend', label: 'React' },
  { id: 'vite', category: 'frontend', label: 'Vite' },
  { id: 'tailwindcss', category: 'frontend', label: 'Tailwind CSS' },
  { id: 'mui', category: 'frontend', label: 'Material UI' },
  { id: 'tanstackquery', category: 'frontend', label: 'TanStack Query' },
  { id: 'zustand', category: 'frontend', label: 'Zustand' },
  { id: 'zod', category: 'frontend', label: 'Zod' },
  { id: 'reacthookform', category: 'frontend', label: 'React Hook Form' },
  { id: 'recharts', category: 'frontend', label: 'Recharts' },
  { id: 'axios', category: 'frontend', label: 'Axios' },
  { id: 'reactrouter', category: 'frontend', label: 'React Router' },
  { id: 'flutter', category: 'frontend', label: 'Flutter' },
  { id: 'springboot', category: 'backend', label: 'Spring Boot' },
  { id: 'springsecurity', category: 'backend', label: 'Spring Security' },
  { id: 'hibernate', category: 'backend', label: 'Hibernate' },
  { id: 'thymeleaf', category: 'backend', label: 'Thymeleaf' },
  { id: 'jwt', category: 'backend', label: 'JWT' },
  { id: 'gradle', category: 'backend', label: 'Gradle' },
  { id: 'maven', category: 'backend', label: 'Maven' },
  { id: 'flyway', category: 'backend', label: 'Flyway' },
  { id: 'sqlalchemy', category: 'backend', label: 'SQLAlchemy' },
  { id: 'fastapi', category: 'backend', label: 'FastAPI' },
  { id: 'openapi', category: 'backend', label: 'OpenAPI' },
  { id: 'postgresql', category: 'database', label: 'PostgreSQL' },
  { id: 'mariadb', category: 'database', label: 'MariaDB' },
  { id: 'redis', category: 'database', label: 'Redis' },
  { id: 'docker', category: 'devops', label: 'Docker' },
  { id: 'nginx', category: 'devops', label: 'Nginx' },
  { id: 'kubernetes', category: 'devops', label: 'Kubernetes' },
  { id: 'terraform', category: 'devops', label: 'Terraform' },
  { id: 'githubactions', category: 'devops', label: 'GitHub Actions' },
  { id: 'argocd', category: 'devops', label: 'Argo CD' },
  { id: 'cloudinary', category: 'devops', label: 'Cloudinary' },
  { id: 'pandas', category: 'data-science', label: 'Pandas' },
  { id: 'plotly', category: 'data-science', label: 'Plotly' },
  { id: 'jupyter', category: 'data-science', label: 'Jupyter' },
  { id: 'streamlit', category: 'tools', label: 'Streamlit' },
  { id: 'selenium', category: 'tools', label: 'Selenium' },
  { id: 'playwright', category: 'tools', label: 'Playwright' },
  { id: 'beautifulsoup', category: 'tools', label: 'BeautifulSoup' },
  { id: 'msw', category: 'tools', label: 'Mock Service Worker' },
  { id: 'vitest', category: 'tools', label: 'Vitest' },
  { id: 'qt', category: 'tools', label: 'Qt' },
  { id: 'opencv', category: 'tools', label: 'OpenCV' },
  { id: 'pyinstaller', category: 'tools', label: 'PyInstaller' },
  { id: 'groq', category: 'ai', label: 'Groq' },
  { id: 'gemini', category: 'ai', label: 'Gemini' },
  { id: 'antigravity', category: 'ai', label: 'Antigravity' },
  { id: 'cursor', category: 'ai', label: 'Cursor AI' },
  { id: 'pytorch', category: 'ai', label: 'PyTorch' },
  { id: 'roberta', category: 'ai', label: 'RoBERTa' },
  { id: 'huggingface', category: 'ai', label: 'Hugging Face' },
];

let badgeUrlMap = null;
let activeTechFilter = 'all';
let techStackFullHeight = 0;

export function setTechBadgeUrlMap(urlMap) {
  badgeUrlMap = urlMap;
}

function resolveBadgeSrc(id, assetBase) {
  return badgeUrlMap?.[id] ?? `${assetBase}${id}.png`;
}

function applyTechStackGridMinHeight() {
  const grid = document.getElementById('tech-stack-grid');
  if (!grid || !techStackFullHeight) return;

  grid.style.minHeight = `${techStackFullHeight}px`;
}

function setTechStackFilter(filterId) {
  const grid = document.getElementById('tech-stack-grid');
  if (!grid) return;

  activeTechFilter = filterId;

  grid.querySelectorAll('[data-tech-category]').forEach((badge) => {
    const show = filterId === 'all' || badge.dataset.techCategory === filterId;
    badge.classList.toggle('hidden', !show);
  });

  document.querySelectorAll('[data-tech-filter]').forEach((tab) => {
    const isActive = tab.dataset.techFilter === filterId;
    tab.classList.toggle('tech-stack-tab--active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  applyTechStackGridMinHeight();
}

function syncTechStackGridMinHeight() {
  const grid = document.getElementById('tech-stack-grid');
  if (!grid) return;

  grid.style.minHeight = 'auto';
  grid.querySelectorAll('[data-tech-category]').forEach((badge) => {
    badge.classList.remove('hidden');
  });

  techStackFullHeight = grid.offsetHeight;
  applyTechStackGridMinHeight();
  setTechStackFilter(activeTechFilter);
}

function initTechStack() {
  const section = document.getElementById('tech-stack-section');
  const grid = document.getElementById('tech-stack-grid');
  if (!section || !grid) return;

  const assetBase = section.dataset.techAssetBase || './images/badges/dark/';

  grid.innerHTML = TECH_BADGES.map(
    (badge) => `
      <img
        src="${escapeHtml(resolveBadgeSrc(badge.id, assetBase))}"
        alt="${escapeHtml(badge.label)}"
        title="${escapeHtml(badge.label)}"
        data-tech-category="${escapeHtml(badge.category)}"
        class="tech-badge-img"
        decoding="async"
        draggable="false"
      />`
  ).join('');

  document.querySelectorAll('[data-tech-filter]').forEach((tab) => {
    tab.addEventListener('click', () => setTechStackFilter(tab.dataset.techFilter));
  });

  setTechStackFilter('all');

  const sync = () => requestAnimationFrame(syncTechStackGridMinHeight);
  const imgs = [...grid.querySelectorAll('img')];
  const pending = imgs.filter((img) => !img.complete);

  if (pending.length === 0) {
    sync();
  } else {
    Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          })
      )
    ).then(sync);
  }

  window.addEventListener('resize', sync);
}

document.addEventListener('DOMContentLoaded', initTechStack);

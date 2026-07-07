function loadStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      if (existing.dataset.loaded === 'true') resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function initPagefindSearch() {
  if (document.body.dataset.pagefind !== 'true') return;

  const host = document.getElementById('pagefind-search');
  if (!host) return;

  const basePath = document.body.dataset.pagefindBase || './pagefind/';

  try {
    loadStylesheet(`${basePath}pagefind-ui.css`);
    await loadScript(`${basePath}pagefind-ui.js`);

    if (!window.PagefindUI) return;

    new window.PagefindUI({
      element: '#pagefind-search',
      showSubResults: true,
      showImages: false,
      basePath,
      resetStyles: false,
    });
  } catch (error) {
    console.warn('[pagefind] Search UI unavailable:', error);
  }
}

document.addEventListener('DOMContentLoaded', initPagefindSearch);

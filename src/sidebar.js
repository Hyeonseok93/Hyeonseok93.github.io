export function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;

  sidebar.classList.remove('active');
  overlay.classList.remove('opacity-100', 'pointer-events-auto');
  overlay.classList.add('pointer-events-none');
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 300);
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;

  sidebar.classList.add('active');
  overlay.classList.remove('hidden');
  overlay.classList.add('pointer-events-auto');
  setTimeout(() => {
    overlay.classList.add('opacity-100');
  }, 10);
}

function initSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggleBtn || !sidebar || !overlay) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!sidebar.classList.contains('active')) {
      openSidebar();
    } else {
      closeSidebar();
    }
  });

  overlay.addEventListener('click', closeSidebar);

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      sidebar.classList.remove('active');
      overlay.classList.add('hidden');
      overlay.classList.remove('opacity-100');
      overlay.classList.add('pointer-events-none');
    }
  });
}

document.addEventListener('DOMContentLoaded', initSidebar);

import { CATEGORY_POSTS_PER_PAGE } from '../../data/category-meta.js';
import { escapeHtml } from '../../utils/escape-html.js';

export function renderPostThumbnail(post) {
  if (!post.thumbnail) {
    return '<div class="category-post-card__thumb category-post-card__thumb--empty" aria-hidden="true"></div>';
  }

  return `
    <div class="category-post-card__thumb">
      <img src="${escapeHtml(post.thumbnail)}" alt="" loading="lazy" />
    </div>
  `;
}

export function renderPostCard(post, label) {
  return `
    <article class="category-post-card">
      <a href="${escapeHtml(post.link)}" class="category-post-card__link">
        <div class="category-post-card__body">
          <h3 class="category-post-card__title">${escapeHtml(post.title)}</h3>
          <p class="category-post-card__meta">${escapeHtml(post.date)} · ${escapeHtml(label)}</p>
          <p class="category-post-card__excerpt">${escapeHtml(post.excerpt || '')}</p>
        </div>
        ${renderPostThumbnail(post)}
      </a>
    </article>
  `;
}

export function renderCategoryPagination(totalPosts, page) {
  const paginationEl = document.getElementById('category-posts-pagination');
  if (!paginationEl) return;

  if (totalPosts === 0) {
    paginationEl.classList.add('hidden');
    paginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalPosts / CATEGORY_POSTS_PER_PAGE));
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  paginationEl.classList.remove('hidden');
  paginationEl.innerHTML = `
    <button type="button" class="category-posts-pagination__btn" data-page-action="prev" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    ${pages
      .map(
        (pageNumber) => `
      <button
        type="button"
        class="category-posts-pagination__btn category-posts-pagination__btn--num ${pageNumber === page ? 'is-active' : ''}"
        data-page="${pageNumber}"
        aria-label="Page ${pageNumber}"
        ${pageNumber === page ? 'aria-current="page"' : ''}
      >${pageNumber}</button>
    `
      )
      .join('')}
    <button type="button" class="category-posts-pagination__btn" data-page-action="next" ${page >= totalPages ? 'disabled' : ''} aria-label="Next page">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;
}

export function renderLoadingState() {
  return `
    <div class="category-posts-loading text-textSecondary text-[0.9rem] italic py-16 text-center border-t border-b border-white/10">
      글을 불러오는 중입니다...
    </div>
  `;
}

export function renderErrorState(message) {
  return `
    <div class="category-posts-empty text-textSecondary text-[0.9rem] italic py-16 text-center border-t border-b border-white/10">
      ${escapeHtml(message)}
    </div>
  `;
}

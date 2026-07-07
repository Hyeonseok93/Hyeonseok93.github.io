import { CATEGORY_POSTS_PER_PAGE } from './category-meta.js';

const categoryCache = new Map();

function getCategoryCache(categoryUrl) {
  if (!categoryCache.has(categoryUrl)) {
    categoryCache.set(categoryUrl, {
      posts: [],
      nextTistoryPage: 1,
      hasMore: true,
      loading: null,
    });
  }
  return categoryCache.get(categoryUrl);
}

function normalizePost(raw) {
  return {
    title: raw.title || '',
    link: raw.link || '#',
    date: raw.date || '',
    excerpt: raw.excerpt || '',
    thumbnail: raw.thumbnail || '',
  };
}

function readListEntryTitle(entry) {
  const titleLink = entry.querySelector('.post-card-title a');
  if (titleLink) return titleLink.textContent?.trim() || '';
  return entry.querySelector('.post-card-title')?.textContent?.trim() || '';
}

function readListEntryLink(entry) {
  return entry.querySelector('.post-card-title a')?.getAttribute('href') || '';
}

function parseTistoryListHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const entries = doc.querySelectorAll('[data-tistory-list-entry]');

  if (entries.length) {
    return Array.from(entries).map((entry) => {
      const thumbHost = entry.querySelector('.tistory-list-entry__thumb');
      const thumbImg = thumbHost?.querySelector('img');

      return normalizePost({
        title: readListEntryTitle(entry),
        link: readListEntryLink(entry),
        date: entry.querySelector('.post-card-meta')?.textContent?.trim(),
        excerpt: '',
        thumbnail: thumbImg?.getAttribute('src') || '',
      });
    });
  }

  return Array.from(doc.querySelectorAll('.post-card-item')).map((entry) =>
    normalizePost({
      title: readListEntryTitle(entry),
      link: readListEntryLink(entry),
      date: entry.querySelector('.post-card-meta')?.textContent?.trim(),
      excerpt: '',
      thumbnail: entry.querySelector('.tistory-list-entry__thumb img')?.getAttribute('src') || '',
    })
  );
}

async function fetchTistoryCategoryPage(categoryUrl, tistoryPage = 1) {
  const url = new URL(categoryUrl, window.location.origin);
  if (tistoryPage > 1) {
    url.searchParams.set('page', String(tistoryPage));
  } else {
    url.searchParams.delete('page');
  }

  const response = await fetch(url.toString(), {
    credentials: 'same-origin',
    headers: { Accept: 'text/html' },
  });

  if (!response.ok) {
    throw new Error(`Failed to load category page (${response.status})`);
  }

  const html = await response.text();
  return parseTistoryListHtml(html);
}

async function ensureTistoryPostsLoaded(categoryUrl, minCount, totalHint = null) {
  const state = getCategoryCache(categoryUrl);

  if (state.posts.length >= minCount) {
    return state.posts;
  }

  if (state.loading) {
    await state.loading;
    return state.posts;
  }

  state.loading = (async () => {
    while (state.hasMore && state.posts.length < minCount) {
      const batch = await fetchTistoryCategoryPage(categoryUrl, state.nextTistoryPage);
      if (!batch.length) {
        state.hasMore = false;
        break;
      }

      state.posts.push(...batch);
      state.nextTistoryPage += 1;

      if (totalHint !== null && state.posts.length >= totalHint) {
        state.hasMore = false;
        break;
      }

      if (batch.length < 3) {
        state.hasMore = false;
      }
    }
  })();

  try {
    await state.loading;
  } finally {
    state.loading = null;
  }

  return state.posts;
}

export async function loadTistoryCategoryPosts(categoryUrl, page = 1, totalHint = null) {
  const safePage = Math.max(page, 1);
  const minCount = safePage * CATEGORY_POSTS_PER_PAGE;
  const allPosts = await ensureTistoryPostsLoaded(categoryUrl, minCount, totalHint);
  const start = (safePage - 1) * CATEGORY_POSTS_PER_PAGE;

  return {
    posts: allPosts.slice(start, start + CATEGORY_POSTS_PER_PAGE),
    total: totalHint ?? allPosts.length,
  };
}

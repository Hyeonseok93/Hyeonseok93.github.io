import { CATEGORY_POSTS_PER_PAGE } from '../../data/category-meta.js';
import { POSTS_BY_CATEGORY } from '../../data/posts-manifest.js';
import { resolvePostAssetPath } from './category-context.js';

function normalizePosts(posts) {
  return posts.map((post) => ({
    ...post,
    thumbnail: resolvePostAssetPath(post.thumbnail),
  }));
}

export function getStaticPosts(categoryId) {
  return normalizePosts(POSTS_BY_CATEGORY[categoryId] || []);
}

export function getStaticPostCount(categoryId) {
  return getStaticPosts(categoryId).length;
}

export async function loadCategoryPosts(categoryId, page = 1) {
  const posts = getStaticPosts(categoryId);
  const totalPages = Math.ceil(posts.length / CATEGORY_POSTS_PER_PAGE) || 1;
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * CATEGORY_POSTS_PER_PAGE;

  return {
    posts: posts.slice(start, start + CATEGORY_POSTS_PER_PAGE),
    total: posts.length,
    safePage,
  };
}

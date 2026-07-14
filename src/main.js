import './style.css';
import './prism-setup.js';
import './sidebar.js';
import './chapters.js';
import './features/category-posts/index.js';
import { setTechBadgeUrlMap } from './tech-stack.js';
import { TECH_BADGE_URLS } from './tech-badge-urls.js';
import './scroll-header.js';
import './article-page.js';
import './category-tree.js';
import './category-label.js';
import './connect-captions.js';

setTechBadgeUrlMap(TECH_BADGE_URLS);

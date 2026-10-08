/**
 * Reads content/site.json and every post under content/posts/{category}/{slug}/index.md,
 * renders the markdown to sanitized HTML and attaches the series data each page needs.
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const { parse } = require('node-html-parser');
const { ROOT } = require('./util');
const { sanitizeRichHtml } = require('./sanitize');
const { fixUnparsedBold } = require('./fix-bold');

const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const CATEGORIES = ['papers', 'personal-web', 'personal-toy', 'rookies-offline', 'rookies-showcase', 'legal'];
const THUMB_NAMES = ['thumbnail.png', 'thumbnail.jpg', 'thumbnail.jpeg', 'thumbnail.webp'];

marked.setOptions({ gfm: true, breaks: false });

const loadSite = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'site.json'), 'utf8'));

const isoDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value || '') : d.toISOString().slice(0, 10);
};

/** First real paragraph of the body as plain text (skips link-only / emoji lines). */
function excerptOf(html, max = 160) {
  const root = parse(html);
  for (const p of root.querySelectorAll('p')) {
    const text = p.text.replace(/\s+/g, ' ').trim().replace(/^["“]+|["”]+$/g, '');
    if (text.length < 30 || /^(📦|🌐)/.test(text)) continue;
    return text.length > max ? `${text.slice(0, max).trim()}…` : text;
  }
  return '';
}

/** Display title per category, without the old "[TOY]" / "SK 쉴더스 루키즈 5기 …" prefixes. */
function displayTitle(cat, raw) {
  let t = raw.replace(/^\[(논문요약|Project|TOY|WEB|Devlog|Legal)\]\s*/, '');
  if (cat === 'rookies-offline' || cat === 'rookies-showcase') t = t.replace(/^SK 쉴더스 루키즈 5기 (오프라인 세션 )?/, '');
  return t;
}

function loadPosts(site) {
  const posts = [];
  for (const cat of CATEGORIES) {
    const catDir = path.join(POSTS_DIR, cat);
    if (!fs.existsSync(catDir)) continue;
    for (const entry of fs.readdirSync(catDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(catDir, entry.name);
      const mdPath = path.join(dir, 'index.md');
      if (!fs.existsSync(mdPath)) {
        console.warn(`skip ${cat}/${entry.name}: no index.md`);
        continue;
      }
      // strip a UTF-8 BOM so the frontmatter fence is found
      const { data, content } = matter(fs.readFileSync(mdPath, 'utf8').replace(/^﻿/, ''));
      const html = sanitizeRichHtml(fixUnparsedBold(marked.parse(content)));
      const slug = data.slug || entry.name;
      const title = displayTitle(cat, String(data.title || slug));
      const day = cat === 'rookies-offline' ? Number((slug.match(/day(\d+)$/) || [])[1]) : null;
      posts.push({
        slug,
        cat,
        dir,
        title: day ? title.replace(/^Day \d+ — /, '') : title,
        date: isoDate(data.date),
        tags: (Array.isArray(data.tags) ? data.tags : []).map((t) => String(t).trim()),
        hidden: data.hidden === true,
        // project links shown in the info card under the title
        repo: data.repo || '',
        store: data.store || '',
        deploy: data.deploy || null,
        thumb: THUMB_NAMES.find((n) => fs.existsSync(path.join(dir, n))) || '',
        html,
        excerpt: excerptOf(html),
        day,
        url: `/posts/${slug}/`,
      });
    }
  }
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return attachSeries(site, posts);
}

/** Group posts into the four series and give each post its series data. */
function attachSeries(site, posts) {
  const visible = posts.filter((p) => !p.hidden);
  const by = (...cats) => visible.filter((p) => cats.includes(p.cat));

  const papers = by('papers').sort((a, b) => a.date.localeCompare(b.date));
  papers.forEach((p, i) => {
    p.series = 'papers';
    p.index = i;
    p.summary = site.papers.summaries[p.slug] || null;
    p.tags = p.tags.filter((t) => t !== '논문요약'); // every paper has it; the series already says so
  });

  const { kinds, defaultKind, kindBySlug } = site.projects;
  const projects = by('personal-web', 'personal-toy');
  projects.forEach((p) => {
    p.series = 'projects';
    p.kind = kindBySlug[p.slug] || defaultKind;
    const [name, ...rest] = p.title.split(' — ');
    p.name = name;
    p.subtitle = rest.join(' — ');
    p.tags = p.tags.filter((t) => t !== p.slug); // some posts tag their own name
  });
  projects.sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || b.date.localeCompare(a.date));
  const projectsByDate = [...projects].sort((a, b) => b.date.localeCompare(a.date));

  const days = by('rookies-offline').sort((a, b) => a.day - b.day);
  const phases = site.rookies.log.phases.map((ph, i) => ({ ...ph, index: i, days: days.filter((d) => d.day >= ph.from && d.day <= ph.to) }));
  days.forEach((p) => {
    p.series = 'rookies-log';
    p.phase = phases.find((ph) => p.day >= ph.from && p.day <= ph.to);
    if (!p.phase) throw new Error(`site.json rookies.log.phases: no phase covers Day ${p.day} (${p.slug})`);
    p.tags = p.tags.filter((t) => !site.rookies.log.hiddenTags.includes(t));
  });

  const track = site.rookies.projects.track.map((info, i) => {
    const p = visible.find((x) => x.slug === info.slug);
    if (!p) throw new Error(`site.json track: no post ${info.slug}`);
    Object.assign(p, { series: 'rookies-projects', index: i, ...info });
    p.stageTitle = p.role ? `최종 프로젝트 · ${site.rookies.projects.finalTopic}` : `미니 프로젝트 ${p.stage.replace('미니 ', '')}`;
    return p;
  });

  // one-line summary used for meta description and search
  for (const p of posts) p.lead = p.summary?.problem || p.description || p.excerpt;

  return { all: posts, visible, papers, projects, projectsByDate, days, phases, track };
}

module.exports = { loadSite, loadPosts };

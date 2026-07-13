const modules = import.meta.glob('./assets/badges/dark/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const TECH_BADGE_URLS = Object.fromEntries(
  Object.entries(modules).map(([filePath, url]) => {
    const id = filePath.split('/').pop().replace(/\.png$/, '');
    return [id, url];
  })
);

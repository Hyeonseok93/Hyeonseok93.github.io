const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

/**
 * Drop legacy .woff font files (keep .woff2 only) and strip matching CSS urls.
 * Modern browsers use woff2; shipping both bloated the Tistory skin zip.
 */
function pruneLegacyWoff(styleCssPath, imagesDir) {
  let removedCss = 0;
  let removedFiles = 0;

  if (styleCssPath && fs.existsSync(styleCssPath)) {
    const css = fs.readFileSync(styleCssPath, 'utf8');
    const next = css
      .replace(/,\s*url\(([^)]+?)\.woff\)\s*format\(\s*['"]woff['"]\s*\)/gi, '')
      .replace(/url\(([^)]+?)\.woff\)\s*format\(\s*['"]woff['"]\s*\)\s*,\s*/gi, '');
    if (next !== css) {
      fs.writeFileSync(styleCssPath, next, 'utf8');
      removedCss = 1;
    }
  }

  if (imagesDir && fs.existsSync(imagesDir)) {
    for (const name of fs.readdirSync(imagesDir)) {
      if (/\.woff$/i.test(name) && !/\.woff2$/i.test(name)) {
        fs.unlinkSync(path.join(imagesDir, name));
        removedFiles += 1;
      }
    }
  }

  return { removedCss, removedFiles };
}

function main() {
  const styleCssPath = path.join(PROJECT_ROOT, 'dist', 'style.css');
  const imagesDir = path.join(PROJECT_ROOT, 'dist', 'images');
  const result = pruneLegacyWoff(styleCssPath, imagesDir);
  console.log(
    `Pruned legacy woff: css=${result.removedCss ? 'updated' : 'unchanged'}, files=${result.removedFiles}`
  );
}

module.exports = { pruneLegacyWoff };

if (require.main === module) {
  main();
}

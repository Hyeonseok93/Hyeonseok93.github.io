const fs = require('fs');

/** Read PNG / JPEG / WebP dimensions from the file header (no deps). */
function readImageSize(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return null;
  }

  try {
    const head = Buffer.alloc(32);
    const n = fs.readSync(fd, head, 0, 32, 0);
    if (n < 24) return null;

    // PNG
    if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
      return {
        width: head.readUInt32BE(16),
        height: head.readUInt32BE(20),
      };
    }

    // GIF
    if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) {
      return {
        width: head.readUInt16LE(6),
        height: head.readUInt16LE(8),
      };
    }

    // WebP (RIFF....WEBP)
    if (
      head[0] === 0x52 &&
      head[1] === 0x49 &&
      head[2] === 0x46 &&
      head[3] === 0x46 &&
      head[8] === 0x57 &&
      head[9] === 0x45 &&
      head[10] === 0x42 &&
      head[11] === 0x50
    ) {
      const chunk = Buffer.alloc(16);
      fs.readSync(fd, chunk, 0, 16, 12);
      // VP8X
      if (chunk[0] === 0x56 && chunk[1] === 0x50 && chunk[2] === 0x38 && chunk[3] === 0x58) {
        return {
          width: 1 + chunk.readUIntLE(8, 3),
          height: 1 + chunk.readUIntLE(11, 3),
        };
      }
      // VP8 (lossy)
      if (chunk[0] === 0x56 && chunk[1] === 0x50 && chunk[2] === 0x38 && chunk[3] === 0x20) {
        const frame = Buffer.alloc(10);
        fs.readSync(fd, frame, 0, 10, 12 + 8);
        return {
          width: frame.readUInt16LE(6) & 0x3fff,
          height: frame.readUInt16LE(8) & 0x3fff,
        };
      }
      return null;
    }

    // JPEG — scan for SOF0/SOF2
    if (head[0] === 0xff && head[1] === 0xd8) {
      let offset = 2;
      const buf = Buffer.alloc(64 * 1024);
      const total = fs.readSync(fd, buf, 0, buf.length, 0);
      while (offset + 9 < total) {
        if (buf[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buf[offset + 1];
        if (marker === 0xd9 || marker === 0xda) break;
        const size = buf.readUInt16BE(offset + 2);
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          return {
            height: buf.readUInt16BE(offset + 5),
            width: buf.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + size;
      }
    }

    return null;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Inject width/height from on-disk assets and eager-load the first few images.
 * Skips remote URLs and imgs that already declare both dimensions.
 */
function enrichArticleImages(html, postDir, { eagerCount = 2 } = {}) {
  let seen = 0;

  return String(html || '').replace(/<img\b([^>]*?)\/?>/gi, (full, rawAttrs) => {
    let attrs = rawAttrs.trim();
    const srcMatch = attrs.match(/\bsrc\s*=\s*(["'])([^"']+)\1/i);
    if (!srcMatch) return full;

    const src = srcMatch[2];
    const isRemote = /^(https?:)?\/\//i.test(src) || src.startsWith('data:');
    const hasWidth = /\bwidth\s*=/i.test(attrs);
    const hasHeight = /\bheight\s*=/i.test(attrs);

    if (!isRemote && (!hasWidth || !hasHeight)) {
      const relative = src.replace(/^\.\//, '').split(/[?#]/)[0];
      const filePath = require('path').join(postDir, relative);
      const size = readImageSize(filePath);
      if (size?.width && size?.height) {
        if (!hasWidth) attrs += ` width="${size.width}"`;
        if (!hasHeight) attrs += ` height="${size.height}"`;
      }
    }

    seen += 1;
    if (seen <= eagerCount) {
      attrs = attrs.replace(/\bloading\s*=\s*(["'])lazy\1/i, 'loading="eager"');
      if (!/\bloading\s*=/i.test(attrs)) attrs += ' loading="eager"';
      if (!/\bfetchpriority\s*=/i.test(attrs)) attrs += ' fetchpriority="high"';
    }

    return `<img ${attrs.trim()} />`;
  });
}

module.exports = { readImageSize, enrichArticleImages };

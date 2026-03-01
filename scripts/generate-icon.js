// Generate a .ico file for the Claude Code Usage Widget
// Creates a 256x256, 48x48, 32x32, and 16x16 icon with Claude's signature colors

const fs = require('fs');
const path = require('path');

// Generate a BMP image (BGRA format for ICO)
function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4); // BGRA
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42;
  const innerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Gradient: Claude's coral/orange (#D97706 to #EA580C)
        const t = dist / radius;
        const r = Math.round(217 + (234 - 217) * t);
        const g = Math.round(119 + (88 - 119) * t);
        const b = Math.round(6 + (12 - 6) * t);

        // Cut out a "C" shape
        const angle = Math.atan2(dy, dx);
        const isGap = angle > -0.6 && angle < 0.6 && dist > innerRadius;
        const isInner = dist < innerRadius;

        if (isGap || isInner) {
          // Transparent or dark background inside the C
          if (isInner) {
            // Dark center
            pixels[idx + 0] = 46;  // B
            pixels[idx + 1] = 42;  // G
            pixels[idx + 2] = 42;  // R
            pixels[idx + 3] = 255; // A
          } else {
            // Gap in C - dark bg
            pixels[idx + 0] = 46;
            pixels[idx + 1] = 42;
            pixels[idx + 2] = 42;
            pixels[idx + 3] = 255;
          }
        } else {
          // The C letter body
          pixels[idx + 0] = b;    // B
          pixels[idx + 1] = g;    // G
          pixels[idx + 2] = r;    // R
          pixels[idx + 3] = 255;  // A
        }
      } else if (dist <= radius + 1.5) {
        // Anti-alias edge
        const alpha = Math.round(255 * Math.max(0, 1 - (dist - radius) / 1.5));
        pixels[idx + 0] = 6;
        pixels[idx + 1] = 119;
        pixels[idx + 2] = 217;
        pixels[idx + 3] = alpha;
      } else {
        // Rounded rect background
        const margin = size * 0.08;
        const cornerR = size * 0.18;
        const inX = Math.max(margin + cornerR, Math.min(x, size - margin - cornerR));
        const inY = Math.max(margin + cornerR, Math.min(y, size - margin - cornerR));
        const cornerDist = Math.sqrt((x - inX) ** 2 + (y - inY) ** 2);

        if (x >= margin && x < size - margin && y >= margin && y < size - margin && cornerDist <= cornerR + 1) {
          // Dark background (#2a2a2e)
          const edgeAlpha = cornerDist <= cornerR ? 255 : Math.round(255 * Math.max(0, 1 - (cornerDist - cornerR)));
          pixels[idx + 0] = 46;  // B
          pixels[idx + 1] = 42;  // G
          pixels[idx + 2] = 42;  // R
          pixels[idx + 3] = edgeAlpha;
        } else {
          // Fully transparent
          pixels[idx + 0] = 0;
          pixels[idx + 1] = 0;
          pixels[idx + 2] = 0;
          pixels[idx + 3] = 0;
        }
      }
    }
  }

  // ICO BMP is stored bottom-up
  const flipped = Buffer.alloc(pixels.length);
  for (let y = 0; y < size; y++) {
    const srcRow = y * size * 4;
    const dstRow = (size - 1 - y) * size * 4;
    pixels.copy(flipped, dstRow, srcRow, srcRow + size * 4);
  }

  return flipped;
}

function buildIco(sizes) {
  const images = sizes.map(size => {
    const pixelData = createIcon(size);
    // BMP info header (BITMAPINFOHEADER) - 40 bytes
    const headerSize = 40;
    const andMaskRowSize = Math.ceil(size / 32) * 4;
    const andMaskSize = andMaskRowSize * size;
    const bmpSize = headerSize + pixelData.length + andMaskSize;

    const header = Buffer.alloc(headerSize);
    header.writeUInt32LE(40, 0);        // biSize
    header.writeInt32LE(size, 4);       // biWidth
    header.writeInt32LE(size * 2, 8);   // biHeight (doubled for AND mask)
    header.writeUInt16LE(1, 12);        // biPlanes
    header.writeUInt16LE(32, 14);       // biBitCount
    header.writeUInt32LE(0, 16);        // biCompression (BI_RGB)
    header.writeUInt32LE(pixelData.length + andMaskSize, 20); // biSizeImage
    // rest are 0

    const andMask = Buffer.alloc(andMaskSize, 0); // all opaque

    return {
      size,
      data: Buffer.concat([header, pixelData, andMask]),
    };
  });

  // ICO header: 6 bytes
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);           // reserved
  icoHeader.writeUInt16LE(1, 2);           // type (1 = ICO)
  icoHeader.writeUInt16LE(images.length, 4); // count

  // Directory entries: 16 bytes each
  let dataOffset = 6 + images.length * 16;
  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0);  // width (0 = 256)
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1);  // height (0 = 256)
    entry.writeUInt8(0, 2);                // color palette
    entry.writeUInt8(0, 3);                // reserved
    entry.writeUInt16LE(1, 4);             // color planes
    entry.writeUInt16LE(32, 6);            // bits per pixel
    entry.writeUInt32LE(img.data.length, 8);  // data size
    entry.writeUInt32LE(dataOffset, 12);      // data offset
    dataOffset += img.data.length;
    entries.push(entry);
  }

  return Buffer.concat([icoHeader, ...entries, ...images.map(i => i.data)]);
}

const ico = buildIco([256, 48, 32, 16]);
const outPath = path.join(__dirname, '..', 'assets', 'icon.ico');
fs.writeFileSync(outPath, ico);
console.log(`Icon written to ${outPath} (${ico.length} bytes)`);

// Also create a PNG for the tray (256x256 raw RGBA -> we'll just use the ico for now)
console.log('Done!');

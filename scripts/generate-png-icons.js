const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard CRC32 table for PNG chunk checksums
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(crcData), 8 + len);
  return chunk;
}

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0
  const ihdrChunk = createPngChunk('IHDR', ihdr);

  // Scanlines with filter byte 0 (None)
  const rowStride = width * 4;
  const rawScanlines = Buffer.alloc(height * (1 + rowStride));
  for (let y = 0; y < height; y++) {
    const rawPos = y * (1 + rowStride);
    rawScanlines[rawPos] = 0; // Filter byte: None
    rgbaBuffer.copy(rawScanlines, rawPos + 1, y * rowStride, (y + 1) * rowStride);
  }

  const compressedData = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createPngChunk('IDAT', compressedData);
  const iendChunk = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Memoir Film Canister & Reel Icon
function renderMemoirIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const cornerRadius = isMaskable ? 0 : size * 0.22;

  // Helper distance
  function dist(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  // Draw pixels
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Base rounded rectangle check for non-maskable
      if (!isMaskable) {
        const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
        const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
        if (Math.hypot(dx, dy) > cornerRadius) {
          buf[idx] = 0;
          buf[idx + 1] = 0;
          buf[idx + 2] = 0;
          buf[idx + 3] = 0;
          continue;
        }
      }

      // Background gradient: radial from #241E1A to #0E0C0A
      const rRatio = dist(x, y, cx, cy) / (size * 0.7);
      const bgR = Math.max(14, Math.round(36 - rRatio * 22));
      const bgG = Math.max(12, Math.round(30 - rRatio * 18));
      const bgB = Math.max(10, Math.round(26 - rRatio * 16));

      let r = bgR;
      let g = bgG;
      let b = bgB;
      let a = 255;

      const dCenter = dist(x, y, cx, cy);
      const scale = size / 512;

      // Outer Film Reel Ring: radius 172
      if (dCenter <= 172 * scale) {
        // Canister Body: #1C1814 with #4A3F35 rim
        if (dCenter >= 166 * scale) {
          r = 74; g = 63; b = 53;
        } else {
          r = 28; g = 24; b = 20;
        }

        // Film Reel Holes (8 radial holes)
        const holeRadius = 20 * scale;
        const holeDist = 130 * scale;
        for (let aIdx = 0; aIdx < 8; aIdx++) {
          const angle = (aIdx * Math.PI) / 4;
          const hx = cx + Math.cos(angle) * holeDist;
          const hy = cy + Math.sin(angle) * holeDist;
          const dHole = dist(x, y, hx, hy);
          if (dHole <= holeRadius) {
            if (dHole >= holeRadius - 2 * scale) {
              r = 56; g = 48; b = 40;
            } else {
              r = 14; g = 12; b = 10;
            }
          }
        }

        // Terracotta Core: radius 106
        if (dCenter <= 106 * scale) {
          if (dCenter >= 102 * scale) {
            // White highlight ring
            r = 244; g = 237; b = 226;
          } else {
            // Terracotta gradient #E27351 to #B24929
            const tRatio = (y - (cy - 100 * scale)) / (200 * scale);
            r = Math.round(226 - tRatio * 48);
            g = Math.round(115 - tRatio * 42);
            b = Math.round(81 - tRatio * 40);
          }
        }

        // Inner Paper Aperture: radius 76
        if (dCenter <= 76 * scale) {
          // Cream paper #F6F0E6
          r = 246; g = 240; b = 230;

          // Camera frame rectangle (center box)
          const rw = 40 * scale;
          const rh = 36 * scale;
          if (Math.abs(x - cx) <= rw && Math.abs(y - cy) <= rh) {
            r = 28; g = 24; b = 20;

            // Lens circle
            const dLens = dist(x, y, cx, cy);
            if (dLens <= 24 * scale) {
              if (dLens >= 21 * scale) {
                r = 246; g = 240; b = 230;
              } else if (dLens <= 10 * scale) {
                r = 28; g = 24; b = 20;
              } else {
                r = 210; g = 86; b = 52;
              }
            }

            // Lens flash dot
            const dFlash = dist(x, y, cx + 24 * scale, cy - 20 * scale);
            if (dFlash <= 5 * scale) {
              r = 229; g = 181; b = 96;
            }
          }
        }
      }

      buf[idx] = Math.min(255, Math.max(0, r));
      buf[idx + 1] = Math.min(255, Math.max(0, g));
      buf[idx + 2] = Math.min(255, Math.max(0, b));
      buf[idx + 3] = a;
    }
  }

  return buf;
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const targets = [
  { file: 'icon-192x192.png', size: 192, maskable: false },
  { file: 'icon-512x512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const t of targets) {
  const buf = renderMemoirIcon(t.size, t.maskable);
  const pngData = encodePng(t.size, t.size, buf);
  const outPath = path.join(iconsDir, t.file);
  fs.writeFileSync(outPath, pngData);
  console.log(`Generated ${t.file} (${t.size}x${t.size})`);
}

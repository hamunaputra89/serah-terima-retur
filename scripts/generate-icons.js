import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function writeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function createPng(width, height, isMaskable = false) {
  // Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = writeChunk('IHDR', ihdrData);

  // Raw image scanlines
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Colors:
      // Background: Dark Slate #0b1329
      let r = 11, g = 19, b = 41, a = 255;

      if (!isMaskable) {
        // Rounded squircle background for standard icons
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist > width * 0.48) {
          // Transparent outside
          rawData[pOffset] = 0;
          rawData[pOffset + 1] = 0;
          rawData[pOffset + 2] = 0;
          rawData[pOffset + 3] = 0;
          continue;
        }
      }

      // Safe zone scaling
      const scale = isMaskable ? 0.72 : 0.85;
      const sx = dx / scale;
      const sy = dy / scale;

      // Draw Box Outline (Package Body)
      const boxW = width * 0.32;
      const boxH = height * 0.28;
      const boxTop = -height * 0.08;
      const boxBottom = boxTop + boxH;

      // Outer glow circle
      if (dist < radius * scale) {
        r = 15; g = 23; b = 42; // #0f172a
      }

      // Barcode lines in the upper / middle section
      const inBoxX = Math.abs(sx) < boxW;
      const inBoxY = sy >= boxTop && sy <= boxBottom;

      if (inBoxX && inBoxY) {
        // Inside package container
        r = 24; g = 34; b = 58;
        // Border of box
        if (Math.abs(sx) >= boxW - 3 || sy <= boxTop + 3 || sy >= boxBottom - 3) {
          r = 245; g = 158; b = 11; // Amber #f59e0b
        } else {
          // Barcode slats inside
          const barX = Math.floor((sx + boxW) / (boxW * 2 / 14));
          if ([1, 2, 4, 6, 7, 9, 11, 12].includes(barX) && sy > boxTop + 10 && sy < boxBottom - 10) {
            r = 254; g = 243; b = 199; // Light amber #fef3c7
          }
        }
      }

      // Laser scanner beam (Horizontal line glowing red/amber across box)
      const beamY = boxTop + boxH * 0.52;
      if (Math.abs(sy - beamY) <= 3 && Math.abs(sx) <= boxW * 1.25) {
        r = 239; g = 68; b = 68; // Laser Red/Orange #ef4444
        a = 255;
      } else if (Math.abs(sy - beamY) <= 7 && Math.abs(sx) <= boxW * 1.2) {
        r = 248; g = 113; b = 113; // Soft glow
      }

      // Return circular arrow at the bottom
      const arrowRadius = width * 0.16;
      const arrowCenterY = height * 0.25;
      const adx = sx;
      const ady = sy - arrowCenterY;
      const aDist = Math.sqrt(adx * adx + ady * ady);

      if (Math.abs(aDist - arrowRadius) <= (width * 0.024)) {
        // Arc of return arrow (approx 270 degrees)
        const angle = Math.atan2(ady, adx);
        if (angle < 1.8 || angle > 2.5) {
          r = 16; g = 185; b = 129; // Emerald #10b981
        }
      }

      rawData[pOffset] = r;
      rawData[pOffset + 1] = g;
      rawData[pOffset + 2] = b;
      rawData[pOffset + 3] = a;
    }
  }

  // Deflate IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = writeChunk('IDAT', compressed);

  // IEND
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Generate files in public
fs.mkdirSync('./public', { recursive: true });

fs.writeFileSync('./public/pwa-192x192.png', createPng(192, 192, false));
console.log('Created pwa-192x192.png');

fs.writeFileSync('./public/pwa-512x512.png', createPng(512, 512, false));
console.log('Created pwa-512x512.png');

fs.writeFileSync('./public/pwa-maskable-512x512.png', createPng(512, 512, true));
console.log('Created pwa-maskable-512x512.png');

fs.writeFileSync('./public/apple-touch-icon.png', createPng(180, 180, false));
console.log('Created apple-touch-icon.png');

// Also create favicon.ico as a copy of 192 or standard
fs.writeFileSync('./public/favicon.ico', createPng(64, 64, false));
console.log('Created favicon.ico');

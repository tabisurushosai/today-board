import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const sizes = [16, 48, 128];

for (const size of sizes) {
  writeFileSync(new URL(`../public/icons/icon${size}.png`, import.meta.url), createIcon(size));
}

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const bg = [11, 95, 115, 255];
  const paper = [255, 253, 247, 255];
  const ink = [16, 24, 32, 255];
  const accent = [255, 191, 71, 255];

  fillRect(pixels, size, 0, 0, size, size, bg);
  const margin = Math.max(2, Math.round(size * 0.16));
  const boardX = margin;
  const boardY = Math.round(size * 0.18);
  const boardW = size - margin * 2;
  const boardH = size - boardY - margin;
  fillRect(pixels, size, boardX, boardY, boardW, boardH, paper);

  const topBarH = Math.max(2, Math.round(size * 0.16));
  fillRect(pixels, size, boardX, boardY, boardW, topBarH, accent);

  const ringW = Math.max(1, Math.round(size * 0.08));
  fillRect(pixels, size, Math.round(size * 0.32), Math.round(size * 0.08), ringW, topBarH, ink);
  fillRect(pixels, size, Math.round(size * 0.62), Math.round(size * 0.08), ringW, topBarH, ink);

  const lineH = Math.max(1, Math.round(size * 0.07));
  fillRect(pixels, size, Math.round(size * 0.28), Math.round(size * 0.5), Math.round(size * 0.44), lineH, ink);
  fillRect(pixels, size, Math.round(size * 0.24), Math.round(size * 0.66), Math.round(size * 0.52), lineH, ink);

  return encodePng(size, size, pixels);
}

function fillRect(pixels, imageSize, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      if (row < 0 || row >= imageSize || column < 0 || column >= imageSize) {
        continue;
      }

      const offset = (row * imageSize + column) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    raw[row * (width * 4 + 1)] = 0;
    rgba.copy(raw, row * (width * 4 + 1) + 1, row * width * 4, (row + 1) * width * 4);
  }

  return Buffer.concat([signature, chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

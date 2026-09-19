// Draws the Should I Apply? icon (a check mark in a rounded square) as PNG files. Run: node scripts/make-icons.mjs
// The 128 px icon keeps 96x96 artwork with 16 px of transparent padding, as the Chrome Web Store asks.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [0x2f, 0x6f, 0x5e];
const FG = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// Signed distance to a rounded square centred at 0.5 (unit coordinates).
function roundedSquare(x, y, half, r) {
  const qx = Math.abs(x - 0.5) - half + r;
  const qy = Math.abs(y - 0.5) - half + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function segment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function draw(size, artwork = size) {
  const scale = artwork / size;
  const SS = 4;
  const stroke = size <= 16 ? 0.075 : 0.06;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // Map the pixel into artwork space; outside the artwork stays transparent.
          const u = ((x + (sx + 0.5) / SS) / size - 0.5) / scale + 0.5;
          const v = ((y + (sy + 0.5) / SS) / size - 0.5) / scale + 0.5;
          if (roundedSquare(u, v, 0.47, 0.2) <= 0) {
            bg++;
            const d = Math.min(segment(u, v, 0.28, 0.52, 0.43, 0.67), segment(u, v, 0.43, 0.67, 0.73, 0.35));
            if (d <= stroke) fg++;
          }
        }
      }
      const n = SS * SS;
      const a = bg / n, f = bg ? fg / bg : 0;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(BG[i] * (1 - f) + FG[i] * f);
      raw[o + 3] = Math.round(a * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const ARTWORK = { 16: 16, 32: 32, 48: 48, 128: 96 };
for (const [size, artwork] of Object.entries(ARTWORK)) {
  writeFileSync(new URL(`../public/icon/${size}.png`, import.meta.url), draw(Number(size), artwork));
}

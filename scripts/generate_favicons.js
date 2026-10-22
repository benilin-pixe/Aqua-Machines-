import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// CRC32 calculation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crc.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function createPNG(width, height, sampleFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  let p = 0;

  // 4x4 Supersampling for anti-aliasing
  const SAMPLES = 4;
  const invTotalSamples = 1 / (SAMPLES * SAMPLES);

  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      let totalR = 0, totalG = 0, totalB = 0, totalA = 0;

      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const subX = (x + (sx + 0.5) / SAMPLES) / width; // 0..1
          const subY = (y + (sy + 0.5) / SAMPLES) / height; // 0..1
          const [r, g, b, a] = sampleFn(subX, subY);
          const alphaNorm = a / 255;
          totalR += r * alphaNorm;
          totalG += g * alphaNorm;
          totalB += b * alphaNorm;
          totalA += a;
        }
      }

      const finalA = Math.round(totalA * invTotalSamples);
      if (finalA > 0) {
        raw[p++] = Math.min(255, Math.max(0, Math.round(totalR / (totalA / 255))));
        raw[p++] = Math.min(255, Math.max(0, Math.round(totalG / (totalA / 255))));
        raw[p++] = Math.min(255, Math.max(0, Math.round(totalB / (totalA / 255))));
        raw[p++] = finalA;
      } else {
        raw[p++] = 0;
        raw[p++] = 0;
        raw[p++] = 0;
        raw[p++] = 0;
      }
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function createICO(images) {
  // images is array of { width, height, pngBuffer }
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count

  const dirEntries = [];
  let currentOffset = 6 + count * 16;

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.pngBuffer.length, 8); // size
    entry.writeUInt32LE(currentOffset, 12); // offset
    dirEntries.push(entry);
    currentOffset += img.pngBuffer.length;
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...images.map(img => img.pngBuffer)
  ]);
}

// Distance to line segment
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Sample function representing the Aqua Machines brand logo
// Colors: Bright aqua blue, cyan, deep navy blue
// Elements: Letter A + Water Droplet + Flowing Wave + Subtle Gear
function sampleAquaLogo(u, v) {
  // Map (0..1, 0..1) to centered coordinate (-1..1, -1..1)
  const x = (u - 0.5) * 2;
  const y = (v - 0.5) * 2;

  // 1. Subtle Gear Cogs at top / upper flanks (representing Machinery & Equipment)
  const distOrigin = Math.hypot(x, y + 0.15);
  const angle = Math.atan2(y + 0.15, x); // -PI to PI
  // Upper hemisphere angles between -2.6 rad and -0.54 rad
  if (y < -0.2 && distOrigin >= 0.72 && distOrigin <= 0.95) {
    // 7 teeth pattern
    const cogFreq = 14;
    const cogVal = Math.sin(angle * cogFreq);
    if (cogVal > 0.35 && distOrigin <= 0.92) {
      // Gear tooth active
      const grad = (y + 0.9) / 0.7;
      const r = Math.round(4 + grad * 10);
      const g = Math.round(80 + grad * 40);
      const b = Math.round(140 + grad * 40);
      return [r, g, b, 255]; // Deep navy/steel cyan
    }
  }

  // 2. Central Water Droplet (Inner aperture of A)
  // Droplet tip at (0, -0.48), bulbous base centered at (0, -0.10) with r = 0.22
  let inDroplet = false;
  let dropletHighlight = false;
  const dropCenterY = -0.12;
  const dropRadius = 0.22;
  const distDropBase = Math.hypot(x, y - dropCenterY);

  if (y >= dropCenterY && distDropBase <= dropRadius) {
    inDroplet = true;
  } else if (y < dropCenterY && y >= -0.52) {
    // Tapering to tip at (0, -0.52)
    const factor = (y - (-0.52)) / (dropCenterY - (-0.52));
    const widthAtY = dropRadius * Math.pow(factor, 0.75);
    if (Math.abs(x) <= widthAtY) {
      inDroplet = true;
    }
  }

  // Droplet specular glint (light reflection)
  if (inDroplet) {
    const glintDist = Math.hypot(x - (-0.07), y - (-0.18));
    if (glintDist < 0.065) {
      dropletHighlight = true;
    }
    const glintApexDist = Math.hypot(x, y - (-0.42));
    if (glintApexDist < 0.035) {
      dropletHighlight = true;
    }
  }

  // 3. Flowing Wave Crossbar of the A
  // Sinusoidal crest spanning between x = -0.62 and +0.62
  let inWaveCrossbar = false;
  let inWaveFoam = false;
  if (Math.abs(x) <= 0.64 && y >= 0.16 && y <= 0.44) {
    const waveSin = 0.28 + 0.07 * Math.sin(x * 5.0 - 0.4);
    const waveDist = Math.abs(y - waveSin);
    if (waveDist <= 0.09) {
      inWaveCrossbar = true;
      if (Math.abs(y - (waveSin - 0.04)) <= 0.025) {
        inWaveFoam = true;
      }
    }
  }

  // 4. Bold Letter "A" Stanchions (Legs)
  // Apex at (0, -0.78), left leg to (-0.72, 0.82), right leg to (+0.72, 0.82)
  const dLeftLeg = distToSegment(x, y, 0, -0.78, -0.68, 0.82);
  const dRightLeg = distToSegment(x, y, 0, -0.78, 0.68, 0.82);
  const legThick = 0.20 + (y + 0.78) * 0.04; // Tapers naturally

  const inLeftLeg = dLeftLeg <= legThick && y >= -0.80 && y <= 0.84;
  const inRightLeg = dRightLeg <= legThick && y >= -0.80 && y <= 0.84;
  const inLegs = inLeftLeg || inRightLeg;

  // Dark navy protective contour around legs and glyph for high contrast on light tabs
  const dLeftContour = distToSegment(x, y, 0, -0.78, -0.68, 0.82);
  const dRightContour = distToSegment(x, y, 0, -0.78, 0.68, 0.82);
  const inNavyContour = (dLeftContour <= legThick + 0.08 || dRightContour <= legThick + 0.08) && y >= -0.86 && y <= 0.90;

  // Composite hierarchy:
  // Droplet renders inside or over
  if (dropletHighlight) {
    return [255, 255, 255, 255]; // Crisp white glint
  }

  if (inDroplet) {
    // Luminous cyan to bright aqua droplet
    const grad = (y - (-0.52)) / 0.64;
    const r = Math.round(56 + grad * (6 - 56));
    const g = Math.round(220 + grad * (182 - 220));
    const b = Math.round(248 + grad * (212 - 248));
    return [r, g, b, 255];
  }

  if (inWaveFoam) {
    // Foam / crest of the flowing wave
    return [224, 242, 254, 255]; // Sky 100
  }

  if (inWaveCrossbar) {
    // Vibrant wave gradient
    const t = (x + 0.6) / 1.2;
    const r = Math.round(8 + t * 40);
    const g = Math.round(180 + t * 40);
    const b = Math.round(210 + t * 40);
    return [r, g, b, 255];
  }

  if (inLeftLeg) {
    // Left surging hydrodynamic wave leg: Bright Cyan to Aqua
    const t = (y + 0.78) / 1.6;
    const r = Math.round(56 - t * 48); // 56 -> 8
    const g = Math.round(220 - t * 75); // 220 -> 145
    const b = Math.round(248 - t * 70); // 248 -> 178
    return [r, g, b, 255];
  }

  if (inRightLeg) {
    // Right industrial leg: Bright Aqua to Deep Blue
    const t = (y + 0.78) / 1.6;
    const r = Math.round(34 - t * 30);
    const g = Math.round(211 - t * 105);
    const b = Math.round(238 - t * 77);
    return [r, g, b, 255];
  }

  // Apex join cap
  if (Math.hypot(x, y - (-0.78)) <= 0.16) {
    return [56, 189, 248, 255]; // Cyan 400
  }

  // Outer dark navy rim / contour (ensures ultra-sharp readability on white browser tabs)
  if (inNavyContour && !inDroplet && y > -0.86) {
    return [4, 18, 38, 255]; // Deep navy #041226
  }

  // Transparent background
  return [0, 0, 0, 0];
}

console.log('Generating Aqua Machines favicons...');

// 1. 16x16 PNG
const png16 = createPNG(16, 16, sampleAquaLogo);
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-16x16.png'), png16);
console.log('Created favicon-16x16.png (', png16.length, 'bytes)');

// 2. 32x32 PNG
const png32 = createPNG(32, 32, sampleAquaLogo);
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png'), png32);
console.log('Created favicon-32x32.png (', png32.length, 'bytes)');

// 3. 48x48 PNG
const png48 = createPNG(48, 48, sampleAquaLogo);
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-48x48.png'), png48);
console.log('Created favicon-48x48.png (', png48.length, 'bytes)');

// 4. 180x180 Apple Touch Icon PNG
const png180 = createPNG(180, 180, sampleAquaLogo);
fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), png180);
console.log('Created apple-touch-icon.png (', png180.length, 'bytes)');

// 5. Multi-resolution favicon.ico (16, 32, 48)
const ico = createICO([
  { width: 16, height: 16, pngBuffer: png16 },
  { width: 32, height: 32, pngBuffer: png32 },
  { width: 48, height: 48, pngBuffer: png48 }
]);
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), ico);
console.log('Created favicon.ico (', ico.length, 'bytes)');

console.log('All Aqua Machines favicon assets successfully generated in /public!');

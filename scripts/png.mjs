import { inflateSync } from 'node:zlib';

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/**
 * Décodeur PNG minimal (8 bits par canal, non entrelacé) renvoyant du RGBA.
 * Il n'existe que pour les scripts Node : dans le navigateur, le décodage est
 * fait par la plateforme (`createImageBitmap`).
 */
export function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error('Ce fichier n’est pas un PNG');

  let offset = 8;
  let header = null;
  let palette = null;
  let alphaTable = null;
  const chunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        bitDepth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    } else if (type === 'PLTE') palette = Buffer.from(body);
    else if (type === 'tRNS') alphaTable = Buffer.from(body);
    else if (type === 'IDAT') chunks.push(Buffer.from(body));
    else if (type === 'IEND') break;
  }

  if (!header) throw new Error('PNG sans en-tête IHDR');
  if (header.bitDepth !== 8) throw new Error(`Profondeur ${header.bitDepth} bits non gérée`);
  if (header.interlace !== 0) throw new Error('PNG entrelacé non géré');

  const channels = CHANNELS[header.colorType];
  if (!channels) throw new Error(`Type de couleur ${header.colorType} non géré`);

  const raw = inflateSync(Buffer.concat(chunks));
  const { width, height } = header;
  const stride = width * channels;
  const pixels = unfilter(raw, width, height, channels, stride);
  return { width, height, data: toRgba(pixels, header, channels, palette, alphaTable) };
}

function unfilter(raw, width, height, channels, stride) {
  const out = Buffer.alloc(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const target = out.subarray(y * stride, (y + 1) * stride);
    const previous = y === 0 ? null : out.subarray((y - 1) * stride, y * stride);

    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? target[i - channels] : 0;
      const up = previous ? previous[i] : 0;
      const upLeft = previous && i >= channels ? previous[i - channels] : 0;
      let value = line[i];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      target[i] = value & 0xff;
    }
  }
  return out;
}

function toRgba(pixels, header, channels, palette, alphaTable) {
  const { width, height, colorType } = header;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const s = i * channels;
    const d = i * 4;
    if (colorType === 0 || colorType === 4) {
      data[d] = data[d + 1] = data[d + 2] = pixels[s];
      data[d + 3] = colorType === 4 ? pixels[s + 1] : 255;
    } else if (colorType === 2 || colorType === 6) {
      data[d] = pixels[s];
      data[d + 1] = pixels[s + 1];
      data[d + 2] = pixels[s + 2];
      data[d + 3] = colorType === 6 ? pixels[s + 3] : 255;
    } else {
      const index = pixels[s];
      data[d] = palette[index * 3];
      data[d + 1] = palette[index * 3 + 1];
      data[d + 2] = palette[index * 3 + 2];
      data[d + 3] = alphaTable && index < alphaTable.length ? alphaTable[index] : 255;
    }
  }
  return data;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

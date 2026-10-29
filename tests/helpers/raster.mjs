/** Fabriques d'images RGBA synthétiques pour les tests, sans fichier externe. */

export function whiteCanvas(width, height) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  return { width, height, data };
}

export function fillRect(image, x0, y0, w, h, [r, g, b]) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      const p = (y * image.width + x) * 4;
      image.data[p] = r;
      image.data[p + 1] = g;
      image.data[p + 2] = b;
      image.data[p + 3] = 255;
    }
  }
  return image;
}

export function fillDisc(image, cx, cy, radius, [r, g, b]) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      if (Math.hypot(x - cx, y - cy) > radius) continue;
      const p = (y * image.width + x) * 4;
      image.data[p] = r;
      image.data[p + 1] = g;
      image.data[p + 2] = b;
      image.data[p + 3] = 255;
    }
  }
  return image;
}

/** Nombre de sous-tracés d'un `d` SVG. */
export function countSubpaths(svg) {
  const match = svg.match(/ d="([^"]*)"/);
  if (!match) return 0;
  return (match[1].match(/M/g) ?? []).length;
}

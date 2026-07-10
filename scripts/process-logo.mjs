import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'LOGO.png');

// App accent color #4F46E5 — recolor by tinting the logo purple
// Strategy: convert to grayscale, then colorize with purple gradient
async function makeIcon(outputPath, size, bgColor, padding = 0.15) {
  const padPx = Math.round(size * padding);
  const innerSize = size - padPx * 2;

  // Recolor: extract alpha, apply purple color
  const recolored = await sharp(src)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = recolored;
  const pixels = new Uint8Array(data);

  // Replace blue hues with purple #4F46E5 = rgb(79,70,229), keeping luminosity
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2], a = pixels[i+3];
    if (a > 10) {
      // Luminosity of original pixel
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // Apply purple tint scaled by luminosity
      pixels[i]   = Math.round(79  * lum + (255 - 79)  * (1 - lum) * 0);
      pixels[i+1] = Math.round(70  * lum + (255 - 70)  * (1 - lum) * 0);
      pixels[i+2] = Math.round(229 * lum + (255 - 229) * (1 - lum) * 0);
      // Keep lighter areas white-ish for the circuit lines
      if (lum > 0.7) {
        pixels[i]   = Math.round(79  + (255 - 79)  * (lum - 0.7) / 0.3);
        pixels[i+1] = Math.round(70  + (255 - 70)  * (lum - 0.7) / 0.3);
        pixels[i+2] = Math.round(229 + (255 - 229) * (lum - 0.7) / 0.3);
      }
    }
  }

  const colorized = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toBuffer();

  const bg = bgColor
    ? { r: parseInt(bgColor.slice(1,3),16), g: parseInt(bgColor.slice(3,5),16), b: parseInt(bgColor.slice(5,7),16), alpha: 1 }
    : { r: 0, g: 0, b: 0, alpha: 0 };

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg }
  })
  .composite([{ input: colorized, top: padPx, left: padPx }])
  .png()
  .toFile(outputPath);

  console.log(`✓ ${outputPath} (${size}x${size})`);
}

mkdirSync(join(root, 'assets'), { recursive: true });

await Promise.all([
  // App icon — white bg, used for iOS and Android
  makeIcon(join(root, 'assets/icon.png'), 1024, '#FFFFFF', 0.18),
  // Splash icon — transparent, centered on splash bg
  makeIcon(join(root, 'assets/splash-icon.png'), 512, null, 0.1),
  // Android adaptive icon foreground — transparent
  makeIcon(join(root, 'assets/android-icon-foreground.png'), 1024, null, 0.2),
  // Favicon
  makeIcon(join(root, 'assets/favicon.png'), 64, '#4F46E5', 0.1),
]);

// Android adaptive bg — solid purple
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 79, g: 70, b: 229, alpha: 1 } }
}).png().toFile(join(root, 'assets/android-icon-background.png'));
console.log('✓ android-icon-background.png (purple)');

// Monochrome (white silhouette on transparent)
await sharp(src)
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(async ({ data, info }) => {
    const px = new Uint8Array(data);
    for (let i = 0; i < px.length; i += 4) {
      if (px[i+3] > 10) { px[i] = 255; px[i+1] = 255; px[i+2] = 255; }
    }
    await sharp(Buffer.from(px), { raw: { width: info.width, height: info.height, channels: 4 } })
      .png().toFile(join(root, 'assets/android-icon-monochrome.png'));
    console.log('✓ android-icon-monochrome.png');
  });

console.log('\nAll icons generated!');

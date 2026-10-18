// Gera os arquivos binários do app a partir de fontes em texto/dependências:
//  - fontes DejaVu (PDF com caracteres técnicos: ², √, π, Σ, ≤ ...)
//  - ícones PWA (public/) e, com --android, os ícones do launcher Android.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(raiz, 'public');
const fontes = join(raiz, 'node_modules', 'dejavu-fonts-ttf');

mkdirSync(join(pub, 'fonts'), { recursive: true });
for (const f of ['DejaVuSansCondensed.ttf', 'DejaVuSansCondensed-Bold.ttf']) {
  copyFileSync(join(fontes, 'ttf', f), join(pub, 'fonts', f));
}
copyFileSync(join(fontes, 'LICENSE'), join(pub, 'fonts', 'LICENSE-DejaVu.txt'));

const icone = Buffer.from(readFileSync(join(raiz, 'resources', 'icon-512.jpg.b64'), 'utf8').trim(), 'base64');
await sharp(icone).resize(192, 192).png().toFile(join(pub, 'icon-192.png'));
await sharp(icone).resize(512, 512).png().toFile(join(pub, 'icon-512.png'));
console.log('✓ fontes e ícones PWA gerados');

if (process.argv.includes('--android')) {
  const res = join(raiz, 'android', 'app', 'src', 'main', 'res');
  if (!existsSync(res)) throw new Error('Pasta android/ não encontrada. Rode "npx cap add android" antes.');
  const AZUL = '#0F3A63';
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const pasta = join(res, `mipmap-${d}`);
    mkdirSync(pasta, { recursive: true });
    const s = Math.round(48 * k);
    await sharp(icone).resize(s, s).png().toFile(join(pasta, 'ic_launcher.png'));
    const mascara = Buffer.from(`<svg width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}" fill="#fff"/></svg>`);
    await sharp(icone).resize(s, s).composite([{ input: mascara, blend: 'dest-in' }]).png().toFile(join(pasta, 'ic_launcher_round.png'));
    // Ícone adaptativo: 108 dp, conteúdo dentro da área segura central
    const f = Math.round(108 * k);
    const interno = Math.round(f * 0.8);
    const fg = await sharp(icone).resize(interno, interno).png().toBuffer();
    await sharp({ create: { width: f, height: f, channels: 4, background: AZUL } })
      .composite([{ input: fg, gravity: 'center' }]).png().toFile(join(pasta, 'ic_launcher_foreground.png'));
  }
  const valores = join(res, 'values');
  mkdirSync(valores, { recursive: true });
  writeFileSync(join(valores, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${AZUL}</color>\n</resources>\n`);
  console.log('✓ ícones Android gerados');
}

import { defineConfig } from 'vite';

// Build da imagem publicada: apenas a tela de visita. O editor local não entra na imagem,
// nem como HTML nem como bundle — não é escondido, simplesmente não é construído.
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { index: 'visita.html' } } },
});

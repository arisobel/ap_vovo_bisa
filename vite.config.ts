import { defineConfig } from 'vite';

// Duas telas: index.html é o editor local, visita.html é a visita do público.
// O Dockerfile publica apenas a segunda. Caminhos relativos à raiz do projeto,
// que é o padrão do Vite, evitam depender de tipos de Node aqui.
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { index: 'index.html', visita: 'visita.html' } } },
});

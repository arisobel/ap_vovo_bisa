# Arquitetura F0/F1

Aplicação estática vanilla TypeScript + Vite, sem serviços externos obrigatórios em execução.

- `src/main.ts`: composição de interface, eventos, estado de sessão, rascunho local, importação e exportação. Conteúdo importado é mostrado com `textContent`/`value`.
- `src/style.css`: interface responsiva, foco visível e estilos locais sem fontes remotas.
- `src/plan/spatial.ts`: funções puras de unidades, calibração e azimute.
- `src/data/validation.ts`: contrato e validação completa antes de substituição do estado.
- `src/data/project.json`: base portátil, inventário real e calibração inicial nula.
- `src/scene/preview.ts`: módulo Three.js importado dinamicamente; renderização sob demanda com OrbitControls. Recebe cômodos já em metros e devolve um handle com `show`, `frame`, `lookFromTop` e `setWallsVisible`. Não lê `apartment.json` nem conhece pixels: quem deriva é `main.ts`. `wallBlocks`, `barriersFrom`, `resolveCollision` e `startingPoint` são funções puras e testáveis, sem WebGL: desenho e colisão saem da mesma fonte, e a colisão não tem malha paralela.
- `src/data/pilot.ts`: contrato e validação da estrutura; `deriveApartment` converte contornos em paredes métricas com vãos recortados.
- `public/assets/references/`: cópias preservadas que Vite inclui em `dist/`.

Planta, catálogo e persistência são independentes de WebGL. Sem janela gráfica, a área 3D informa indisponibilidade e `mountPreview` devolve um handle inerte. O renderer limita pixel ratio a 1,5, observa redimensionamentos e não usa loop contínuo: só desenha em mudança de câmera, de tamanho ou de traçado.

A cena depende da escala. Sem calibração aplicada não há metro por pixel, e a área 3D mostra apenas a grade com o aviso correspondente. Aplicar, reimportar ou trocar a escala remonta a geometria pelo mesmo caminho.

`apartment.json` é a fonte única de paredes e limites, e já alimenta a cena. Blender só complementará objetos; não duplicar estrutura independente. Colisores de F3 devem sair do mesmo contorno, não de geometria paralela.

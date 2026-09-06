# Arquitetura F0

Aplicação estática vanilla TypeScript + Vite, sem serviços externos obrigatórios em execução.

- `src/main.ts`: composição de interface, eventos, estado de sessão, rascunho local, importação e exportação. Conteúdo importado é mostrado com `textContent`/`value`.
- `src/style.css`: interface responsiva, foco visível e estilos locais sem fontes remotas.
- `src/plan/spatial.ts`: funções puras de unidades, calibração e azimute.
- `src/data/validation.ts`: contrato e validação completa antes de substituição do estado.
- `src/data/project.json`: base portátil, inventário real e calibração inicial nula.
- `src/scene/preview.ts`: módulo Three.js importado dinamicamente; renderização de grade sob demanda com OrbitControls. Não contém estrutura arquitetônica.
- `public/assets/references/`: cópias preservadas que Vite inclui em `dist/`.

Planta, catálogo e persistência são independentes de WebGL. Sem janela gráfica, a área 3D informa indisponibilidade. O renderer limita pixel ratio a 1,5, observa redimensionamentos e não usa loop contínuo.

F1 introduzirá `apartment.json` como fonte única para paredes e limites. Blender só complementará objetos; não duplicar estrutura independente.

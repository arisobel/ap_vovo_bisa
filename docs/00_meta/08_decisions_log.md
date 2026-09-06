# Decisões

## D001 — 06/09/2026 — F0 como entrega inicial
Adotar o escopo inicial proposto no PRD, com aplicação executável e documentação. Modelagem estrutural, poses e passeio seguem o roadmap. A grade ilustrativa não representa o imóvel.

## D002 — 06/09/2026 — Referências no caminho do usuário
Manter `docs/90_references/` como fonte dos originais, em vez de criar `references/originals/`. Cópias byte a byte em `public/assets/references/` tornam o build portátil, ao custo de aproximadamente 21 MB de assets. Não há imagens retocadas.

## D003 — 06/09/2026 — Contrato mínimo F0
Usar `src/data/project.json` para planta, inventário e calibração. Validador TypeScript explícito é o contrato executável. Paths e dimensões são confrontados com o inventário conhecido: não carregar URLs arbitrárias via importação. `apartment.json` estrutural será introduzido na F1, sem duplicar paredes em Blender.

## D004 — 06/09/2026 — Escala uniforme, proposta
Origem no primeiro ponto; metros por pixel positivos. A segunda cota mede o desvio sem deformar a imagem ou confirmar automaticamente a escala. Não preencher medidas a partir de números ambíguos da planta.

## D005 — 06/09/2026 — Ambiente local
Node 24 LTS; versões estáveis consultadas no registro npm e lockfile. Three.js em módulo separado e renderização sob demanda; não há animação contínua na F0. Instalação verificada no Node 24.19.0.

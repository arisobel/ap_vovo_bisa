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

## D006 — 06/09/2026 — `apartment.json` com vários cômodos e conferências registradas
O arquivo deixa de descrever um único piloto e passa a `schemaVersion 2`: parâmetros estimados no topo e `rooms[]`. Cada cômodo exige ao menos um registro em `checks`, comparando um número impresso na planta (cota ou área) com o que o traçado mede. `pilot.ts` valida a estrutura inteira e expõe `deriveRoom`, `deriveApartment` e `checkDeviation`. Coordenadas continuam em pixels originais; a convenção de faces internas está escrita no próprio JSON. Nada disso chegou à cena 3D ainda.

## D007 — 06/09/2026 — Área impressa nem sempre é a área do contorno
No DORMIT. 1 a área impressa (16,76 m²) equivale a 3,70 × 4,53, o retângulo livre entre dois nichos de armário; o contorno estrutural mede 19,5 m². O campo `pixels` de cada conferência guarda o que foi de fato comparado, e a evidência explica qual. Não ajustar traçado para forçar coincidência com área impressa.

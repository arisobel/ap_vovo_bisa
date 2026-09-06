# Progresso

## 06/09/2026 — Três cômodos traçados e gravados; conferências contra a planta

O usuário calibrou a escala pela cota impressa 9,12 m da fachada sul do living e pediu o traçado dos demais ambientes. Foram traçados e gravados em `src/data/apartment.json` (schemaVersion 2): LIVING (mantido da entrega anterior), ESCRITÓRIO e DORMIT. 1.

Método: varredura de luminância do JPEG original (parede < 110) para localizar as faces internas de cada parede, em vez de leitura visual. Cada cômodo registra as conferências contra números impressos na planta.

| Cômodo | Conferência | Desvio |
|---|---|---|
| LIVING | cota 6,53 / área 45,16 | −0,24% / +0,43% |
| ESCRITÓRIO | cotas 4,03 e 3,67 / área 16,97 | +0,29%, −0,02% / +0,68% |
| DORMIT. 1 | cotas 3,70 e 4,53 / área 16,76 | −0,83%, −0,22% / −1,04% |

Achados do traçado: o ESCRITÓRIO tem duas linhas contínuas em v=362 e v=500, móveis embutidos rasos que explicam a cota 3,67 (pendência anterior, resolvida). O DORMIT. 1 é um L, com dois nichos de armário de 0,53 m em cantos opostos, e tem duas portas.

Evidências executadas: `npm test` com 44 testes em três arquivos, incluindo 20 novos sobre a estrutura; `npm run build` com TypeScript limpo. `pilot.ts` deixou de ser código órfão do ponto de vista de testes, mas continua sem uso na aplicação: a cena 3D ainda mostra apenas a grade.

Não verificado: nada foi medido fisicamente; todas as cotas vêm do desenho. Espessura de parede, pé-direito, peitoril e alturas de vão continuam estimativas. Faltam cerca de dez ambientes.

Próximo passo: traçar os ambientes restantes pelo mesmo método e, em paralelo, ligar `deriveApartment` à cena para que o traçado apareça em 3D.

## 06/09/2026 — Instalação recuperada após EPERM

O usuário encontrou `EPERM / unlink` no binding nativo do Rolldown ao executar `npm ci`. O servidor Vite deixado pela sessão anterior continuava ativo. Foi encerrado somente o processo Vite deste projeto, identificado pelo caminho e linha de comando; em seguida `npm ci` concluiu com sucesso (47 pacotes instalados). README atualizado para orientar Ctrl+C antes de reinstalar. Servidor deixado parado para o usuário iniciar no próprio terminal com `npm run dev`. Próximo passo de validação F0 permanece o roteiro manual.

## 06/09/2026 — F0 implementada; revisão visual pendente

Entregue:
- Documentação inicial e PRD preservado; originais mantidos no caminho indicado pelo usuário.
- Vite 8.2.2, TypeScript 7.0.2, Three.js 0.185.1 e Vitest 5.0.0; `package-lock.json` registrado.
- Planta SVG com zoom e pontos por clique ou formulário; escala uniforme, origem em A e conferência de outra cota com desvio absoluto e percentual.
- Catálogo de 11 fotos com IDs estáveis, dimensões reais, notas editáveis e associação/pose nulas. Planta registrada separadamente.
- Exportação/importação versionada, validação completa antes da troca de estado e rascunho local.
- Grade 3D explicativa, sem geometria fictícia do apartamento; tratamento de indisponibilidade WebGL e erros das imagens.

Evidências executadas:
- `npm install`: 47 pacotes; auditoria reportou zero vulnerabilidades naquele momento.
- `npm run build`: TypeScript e Vite passaram.
- `npm test`: 24 testes passaram em dois arquivos.
- Servidor local em `127.0.0.1:5173`: página e 12 imagens responderam HTTP 200.
- SHA-256: todas as 12 cópias públicas são idênticas aos originais.

Não verificado: aparência em navegador, fluxo real de cliques/importação/download, responsividade, fallback WebGL em execução e FPS. O runtime Browser retornou “No browser is available”; descoberta retornou lista vazia. Não foi substituída essa verificação por uma declaração de sucesso visual.

Aviso observado: chunk Three.js com cerca de 539 kB minificado / 134 kB gzip; carregamento separado. Ver detalhes em KNOWN_ISSUES.

Próximo passo: executar roteiro manual F0, obter medidas confiáveis e revisar escala/traçado do living antes de construir o piloto F1. Nenhuma escala foi preenchida nem confirmada no JSON inicial.

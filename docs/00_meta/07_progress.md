# Progresso

## 06/09/2026 — F2: poses fotográficas, com o contrato evoluído para a versão 2

O contrato das fotos deixou de proibir associação e pose. `project.json` passa a `schemaVersion 2`; arquivos da F0 continuam sendo aceitos na importação e são migrados, com todas as fotos em `pendente`.

Cada foto agora aceita `roomId` e `pose` com `u`, `v`, `cameraHeight`, `headingDeg`, `pitchDeg`, `verticalFovDeg`, `confidence` e `evidence`. Três regras que o validador impõe e que valem mais que a interface:

- a pose só é aceita se o ponto cair **dentro do contorno do cômodo declarado**, o que amarra `project.json` a `apartment.json`;
- `pendente` proíbe pose, `proposto` e `confirmado` exigem pose, e associar só o ambiente é permitido;
- toda pose exige evidência escrita não vazia e confiança `baixa`, `media` ou `alta`.

A pose é guardada em pixels da planta, não em metros (D012). Recalibrar move as fotos junto com as paredes, em vez de deixá-las para trás.

Interface: ao abrir uma foto aparece o editor de ambiente, ponto e direção. "Marcar ponto e direção na planta" pede dois cliques, o primeiro no ponto da câmera e o segundo para onde ela apontava; o azimute sai daí. Altura, inclinação e campo vertical são campos numéricos. "Comparar com o modelo" troca a fotografia pela cena 3D no mesmo ponto, com o quadro forçado à proporção da foto, para a comparação ser honesta. Salvar como proposta e confirmar são ações separadas, e o card do catálogo passa a mostrar o estado.

Alterar uma foto agora reconstrói o projeto inteiro e o revalida antes de trocar o estado, a mesma regra atômica da importação: uma pose inválida é recusada sem corromper o rascunho.

Evidências executadas: `npm test` com 77 testes em quatro arquivos, sendo 14 novos sobre poses, migração da versão 1 e a convenção de azimute da câmera; `npm run build` com TypeScript limpo.

Não verificado: o editor nunca foi usado em navegador. Nenhuma das 11 fotos foi associada ou posicionada: todas continuam `pendente`, que é o estado correto até haver revisão humana.

Observado: o usuário confirmou que os fechamentos do terraço são gradil, não parede. A observação está registrada nas evidências de `terraco-leste`, `terraco-sul` e `terraco-oeste`, mas a cena continua levantando 2,70 m ali porque não existe altura por parede.

Próximo passo: marcar as fotos da sala, que é o ambiente com mais registros e o único já reconhecido com segurança.

## 06/09/2026 — F3 inicial: passeio em primeira pessoa, e o pé-direito deixa de ser estimativa

O usuário confirmou o pé-direito: 2,70 m. O parâmetro passou de `estimado` para `confirmado` em `apartment.json`, com a confirmação e a data na evidência. O contrato aceita os dois estados; um teste garante que `wallHeight` é o único confirmado, para nenhum outro número se apresentar como medido sem revisão registrada.

Passeio implementado em `preview.ts`. Botão "Andar por dentro": câmera a 1,60 m do piso, W A S D ou setas, mouse para olhar, Shift acelera, Esc sai. Usa pointer lock quando disponível e devolve o controle orbital ao sair. Durante o passeio há loop de animação; fora dele a cena continua desenhando só sob demanda.

Colisão a partir da mesma geometria das paredes, sem malha paralela. A regra que faz o passeio funcionar: um bloco só vira barreira se cruzar a faixa de 0 a 1,80 m. Assim a verga sobre a porta, que começa a 2,10 m, deixa passar, e o peitoril sob a janela, que vai de 0 a 0,90 m, não deixa. Raio do corpo 0,28 m, resolução iterativa contra caixas orientadas.

O ponto de partida é o lugar mais folgado do maior cômodo. A primeira versão usava o centro da caixa envolvente e um teste apanhou o erro: no living, que é em L, esse centro cai exatamente em cima da divisória com o ALMOÇO, e o passeio começaria dentro de uma parede.

Evidências executadas: `npm test` com 61 testes em quatro arquivos, sendo cinco novos sobre passeio e colisão; `npm run build` com TypeScript limpo.

Não verificado: o passeio nunca foi executado em navegador. Movimento, sensibilidade do mouse, pointer lock e sensação de escala dependem de revisão humana. Também não foi medido desempenho com o loop contínuo ligado.

Observado na sessão: o usuário aplicou uma escala de teste de 6 m sobre uma diagonal livre da planta, o que substituiu a calibração conferida no rascunho do navegador e deixou tudo 2,7% maior. O caminho de volta é importar `src/data/project.json` ou repetir a cota 9,12 entre (52;761) e (395;761).

Próximo passo: rodar o passeio e revisar. Depois, F2: marcar de onde cada uma das 11 fotos foi tirada.

## 06/09/2026 — Apartamento aparece em 3D

`src/scene/preview.ts` deixou de mostrar só a grade. `main.ts` deriva os 16 cômodos com `deriveApartment` e passa para a cena, que levanta piso e paredes com os vãos recortados: trecho cheio, peitoril sob a janela e verga sobre porta e janela. São 159 blocos.

A cena depende da escala. Sem calibração aplicada, continua a grade e o aviso de que sem metro não há parede. Aplicar escala, importar outro JSON ou recalibrar remonta tudo pelo mesmo caminho, porque `renderCalibration` chama `renderScene`.

Piso bege para cômodo conferido por cota impressa, azulado para os cinco `sem-cota`: a incerteza do traçado fica visível na própria cena. Três botões novos: enquadrar, vista superior e ocultar paredes.

`wallBlocks` foi extraída como função pura, sem WebGL, e testada: seis testes verificam que a parede cresce para fora do contorno e nunca para dentro do cômodo, que o vão da porta fica vazio com verga de 0,60 m acima, que a janela ganha peitoril de 0,90 m e verga, que cada bloco gira na direção da sua parede e que nenhum bloco ultrapassa a altura declarada.

Evidências executadas: `npm test` com 56 testes em quatro arquivos; `npm run build` com TypeScript limpo.

Não verificado, e isto importa: a interface não foi aberta em navegador nenhum. Esta sessão não tem navegador conectado, como as anteriores. A conferência visual do resultado, o desempenho e o comportamento dos três botões novos continuam pendentes de revisão humana. As imagens geradas nesta sessão são a mesma geometria exportada do código e desenhada por fora, não capturas do aplicativo.

Próximo passo: abrir com `npm run dev` e conferir a cena. Depois, medir o pé-direito real: 2,70 m é o único número que aparece em toda parede e continua sendo estimativa.

## 06/09/2026 — Corredor traçado; apartamento fechado com 16 cômodos

O corredor não é um espaço só. Em v=325..330 há dois tocos de parede, u=228..233 e u=259..268, com 25 px de vão entre eles: o mesmo desenho de um batente. Foi gravado como dois cômodos, `corredor-norte` (3,28 m², liga DORMIT. 1, DORMIT. 2 e BH social) e `corredor-sul` (10,76 m², em L, liga ESCRITÓRIO, COZINHA, LAV., HALL SOCIAL e o corte aberto do LIVING).

A aresta entre u=269 e u=230 em v=501 do `corredor-sul` não tem parede e por isso não aparece na lista de paredes: é exatamente o mesmo corte aberto já registrado no LIVING, agora com as duas pontas coincidindo.

Nenhum dos dois tem cota ou área impressa; ambos são `sem-cota`. O corredor sequer tem nome na planta.

Total: 16 cômodos, 38 vãos, 173,56 m² de contorno traçado. Todos os ambientes com nome na planta estão gravados.

Teste novo: nenhum par de cômodos pode ocupar o mesmo ponto da planta. Roda ponto a ponto na interseção das caixas envolventes e passa. Com o apartamento fechado, sobreposição vira erro de traçado, não detalhe.

Evidências executadas: `npm test` com 50 testes em três arquivos; `npm run build` com TypeScript limpo. O teste de vãos compartilhados agora cobre 15 pares.

Não verificado: nada foi medido fisicamente. Pé-direito, espessura de parede, peitoril e alturas de vão continuam estimativas globais. A cena 3D continua mostrando apenas a grade.

Próximo passo: ligar `deriveApartment` à cena Three.js.

## 06/09/2026 — Setor de serviço, hall e terraço traçados; 14 cômodos gravados

Traçados os oito ambientes restantes com nome na planta: DORMIT. EMP., ÁREA DE SERVIÇO, os três BH, LAV., HALL SOCIAL e TER. Mesmo método de varredura de luminância.

Três deles não têm cota nem área impressa: BH de serviço, LAV. e HALL SOCIAL. Para não fingir conferência onde não há, o contrato ganhou o campo `verification` por cômodo (`cota-impressa` ou `sem-cota`): só quem declara `sem-cota` pode ficar sem `checks`, e quem declara `cota-impressa` sem registrar nenhuma é rejeitado. As conferências ganharam `confidence` (`alta` ou `media`), com tolerância de 1,5% e 3,5%.

| Cômodo | Conferência | Desvio |
|---|---|---|
| DORMIT. EMP. | cotas 2,48 e 2,18 | −0,29% / +0,01% |
| ÁREA DE SERVIÇO | cotas 8,39, 1,52 e 1,34 | +0,14% / −0,29% / −0,79% |
| BH da suíte | cotas 3,03 e 2,10 | +0,04% / +0,02% |
| BH social | cotas 3,03 e 2,16 | +0,04% / +0,94% |
| TER. | cotas 3,40 e 1,48 | −2,25% / −2,99%, confiança média |

Achados: a porta oeste do DORMIT. 1 dá no BH, não no corredor — o dormitório é suíte, e isso explica as duas portas registradas na rodada anterior. A cota 2,18 pertence ao DORMIT. EMP., não ao nicho do DORMIT. 1; a coincidência de 82 px era acidental. A fachada oeste da área de serviço é envidraçada por 6,14 m contínuos. O TER. não tem parede escura nenhuma além da fachada do living: seu contorno vem de guarda-corpos em traço fino, e por isso é o único com desvio acima de 1%.

O teste de vãos compartilhados apontou uma segunda estimativa errada da entrega F0: a porta do terraço estava com 54 px estimados contra 55 px medidos. Corrigida. São sete pares de vão agora sob teste.

Evidências executadas: `npm test` com 49 testes em três arquivos; `npm run build` com TypeScript limpo. A cena 3D continua mostrando apenas a grade: nada disso aparece na aplicação ainda.

Não verificado: nada foi medido fisicamente. Falta o corredor, único espaço restante, que não tem nome na planta e articula quase todas as portas registradas.

Próximo passo: ligar `deriveApartment` à cena Three.js.

## 06/09/2026 — Seis cômodos traçados e gravados; conferências contra a planta

O usuário calibrou a escala pela cota impressa 9,12 m da fachada sul do living e pediu o traçado dos demais ambientes. Foram traçados e gravados em `src/data/apartment.json` (schemaVersion 2): LIVING (mantido da entrega anterior), ESCRITÓRIO, DORMIT. 1, DORMIT. 2, COZINHA e ALMOÇO.

Método: varredura de luminância do JPEG original (parede < 110) para localizar as faces internas de cada parede, em vez de leitura visual. Cada cômodo registra as conferências contra números impressos na planta.

| Cômodo | Conferência | Desvio |
|---|---|---|
| LIVING | cota 6,53 / área 45,16 | −0,24% / +0,43% |
| ESCRITÓRIO | cotas 4,03 e 3,67 / área 16,97 | +0,29%, −0,02% / +0,68% |
| DORMIT. 1 | cotas 3,70 e 4,53 / área 16,76 | −0,83%, −0,22% / −1,04% |
| DORMIT. 2 | cotas 4,03 e 3,02 / área 12,16 | +0,29%, +0,37% / +0,74% |
| COZINHA | cotas 2,80 e 3,74 / área 10,47 | −0,29%, +0,24% / −0,03% |
| ALMOÇO | cotas 2,80 e 3,21 / área 8,99 | −0,29%, −0,60% / −0,91% |

Achados do traçado: o ESCRITÓRIO tem duas linhas contínuas em v=362 e v=500, móveis embutidos rasos que explicam a cota 3,67 (pendência anterior, resolvida). O DORMIT. 1 é um L, com dois nichos de armário de 0,53 m em cantos opostos, e tem duas portas. O vão LIVING/ALMOÇO foi corrigido de 31 px estimados para 25 px medidos, e passou a ser registrado nos dois cômodos com a mesma largura, agora coberto por teste.

Evidências executadas: `npm test` com 45 testes em três arquivos, incluindo 21 novos sobre a estrutura; `npm run build` com TypeScript limpo. `pilot.ts` deixou de ser código órfão do ponto de vista de testes, mas continua sem uso na aplicação: a cena 3D ainda mostra apenas a grade.

Não verificado: nada foi medido fisicamente; todas as cotas vêm do desenho. Espessura de parede, pé-direito, peitoril e alturas de vão continuam estimativas. Faltam sete ambientes, todos sem área ou cota impressa: DORMIT. EMP., ÁREA DE SERVIÇO, HALL SOCIAL, LAV., os três BH e o TER.

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

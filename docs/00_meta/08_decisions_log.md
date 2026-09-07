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

## D008 — 06/09/2026 — Cômodo declara se tem ou não cota impressa
Três ambientes não têm nenhum número impresso na planta. Em vez de inventar conferência ou deixar o traçado passar calado, cada cômodo declara `verification`: `cota-impressa` exige ao menos um registro em `checks`; `sem-cota` proíbe registrar qualquer um. Cada conferência declara `confidence` `alta` ou `media`, com tolerância de 1,5% e 3,5% no teste. Média é para o TER., cujo contorno vem de traços finos de guarda-corpo e não de parede.

## D009 — 06/09/2026 — Corredor gravado como dois cômodos
Os dois tocos de parede em v=325..330 são desenho de batente, não ruído. Em vez de tratar a circulação como um espaço só, foram gravados `corredor-norte` e `corredor-sul`, ligados por um vão. Assim cada porta do apartamento tem os dois lados registrados e o teste de vãos compartilhados cobre 15 pares. Aresta sem parede continua sendo representada pela ausência da aresta em `walls`, como já era no LIVING.

## D010 — 06/09/2026 — A cena recebe metros, não pixels
`preview.ts` não importa `apartment.json` nem sabe o que é pixel: recebe cômodos já derivados e desenha. Assim a conversão de unidade fica num lugar só, `deriveApartment`, e a matemática de posicionamento das paredes fica testável sem WebGL através de `wallBlocks`. A cor do piso distingue cômodo conferido por cota impressa de cômodo `sem-cota`, para a incerteza do traçado não sumir na visualização.

## D011 — 06/09/2026 — Pé-direito confirmado; colisão sai da mesma parede
`wallHeight` = 2,70 m passa a `confirmado`, com a confirmação humana e a data registradas na evidência. Continua sendo o único parâmetro não estimado.

A colisão do passeio é derivada de `wallBlocks`, a mesma função que desenha a parede: não há malha de colisão paralela, como o PRD exige para a geometria. Um bloco vira barreira apenas se cruzar a faixa de 0 a 1,80 m do corpo, o que resolve porta e janela sem caso especial. Folha de porta continua não modelada, então todo vão é atravessável.

## D012 — 06/09/2026 — Pose em pixels da planta, não em metros
O PRD lista `x, z` na pose fotográfica. O contrato guarda `u, v` em pixels e deriva o mundo com a mesma transformação das paredes. Motivo: a origem métrica é o ponto A da calibração, então gravar metros amarraria toda pose a uma calibração específica, e recalibrar deixaria as fotos para trás enquanto a geometria se move. Em pixels, pose e paredes acompanham qualquer recalibração juntas. `poseToWorld` faz a conversão num lugar só.

## D015 - Altura de parede é parâmetro nomeado, não número por parede (07/09/2026)

O terraço precisava de guarda-corpo mais baixo que o pé-direito. Havia duas formas: um campo `height` livre em cada parede, ou a parede escolher entre parâmetros nomeados.

Decisao: `Wall.heightParameter` aponta para `wallHeight` ou `railingHeight`, ambos com valor, estado e evidência no topo do arquivo. Nenhum número solto entra na geometria. Corrigir a estimativa de 1,10 m depois de medir no local muda um lugar e move os três fechamentos juntos, e o estado `estimado` continua visível em vez de se perder dentro de uma parede.

Ausência do campo significa `wallHeight`, então os arquivos anteriores seguem válidos. O validador recusa altura desconhecida, guarda-corpo mais alto que o pé-direito, e vão mais alto que a parede que o recebe - a porta de 2,10 m deixou de caber no gradil de 1,10 m, e isso é testado.

Alternativa descartada: altura livre por parede. Daria liberdade para inventar 1,12 aqui e 1,08 ali sem evidência, que e exatamente o que este projeto tenta evitar.

## D014 - A planta tem um modo por vez (06/09/2026)

A mesma superfície serve a duas tarefas: medir cotas (pontos A e B) e marcar a pose de uma foto (ponto e direcao). Na primeira versao da F2 os dois desenhos conviviam na tela e um clique fora de hora comecava uma nova cota sem aviso, o que confundiu a marcacao logo no primeiro uso real.

Decisao: o roteamento do clique virou funcao pura (`routePlanClick`, em `src/plan/planmode.ts`), testada; enquanto a marcacao de foto esta ativa os marcadores A e B somem, a planta ganha moldura, o cabecalho nomeia a foto e a area de calibracao fica esmaecida. Esc cancela. Dois cliques colados (menos de 8 px) sao recusados em vez de virar um azimute qualquer.

Alternativa descartada: separar em duas plantas, uma por tarefa. Duplicaria o zoom, o carregamento da imagem e a leitura de coordenadas sem resolver a duvida de qual esta valendo.

## D013 — 06/09/2026 — Pose amarrada ao cômodo declarado
Uma pose só é aceita se o ponto cair dentro do contorno do `roomId` declarado, o que liga `project.json` a `apartment.json` na validação. Custo: o traçado passa a ser dependência do contrato das fotos. Ganho: some a classe inteira de erro em que a foto diz um ambiente e a câmera está em outro. Toda pose exige também evidência escrita e confiança declarada; `confirmado` é estado de revisão humana, nunca automático.

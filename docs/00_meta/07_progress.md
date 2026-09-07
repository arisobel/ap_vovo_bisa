# Progresso

## 07/09/2026 — Cotas na cena, clique para passear e botão do mouse como avanço

Quatro pedidos do usuário, todos sobre reduzir atrito no passeio.

**Nomes no chão passou a nascer ligado.** Era o padrão errado: o recurso serve à primeira impressão, e estava escondido atrás de um clique.

**Botão do mouse anda para a frente**, junto com W. Em tela cheia é o gesto natural, e o teclado deixa de ser obrigatório para avançar.

**Clicar no modelo entra no passeio.** Arrastar continua girando a órbita — a diferença é deslocamento e tempo, não o botão: menos de 5 px e menos de 400 ms conta como clique. Havendo fotografia escolhida, entra pelo ponto dela.

**Cotas das paredes**, num checkbox à parte. E aqui houve uma decisão que vale registrar (D022): a cota mede a **parede traçada**, e não repete o número impresso na planta. No escritório a cena mostra 4,04 m onde a planta imprime 4,03 — um centímetro, que é a qualidade do traçado. E mostra 4,23 m na parede onde a planta imprime 3,67, porque a impressa é o vão livre entre dois embutidos de 0,27 m, não a parede inteira. Repetir o número impresso apagaria justamente essa distinção.

Cada cota é uma textura única com linha, setas e número, deitada no piso e recuada 32 cm para dentro. Saíram 71 cotas; paredes com menos de 60 cm ficam sem, porque o desenho não caberia.

Cinco testes cuidam das cotas: comprimento igual ao da parede, recuo para dentro e não para fora, alinhamento com a direção da parede, ausência nas paredes curtas, e a soma das cotas de um cômodo igual ao perímetro das suas paredes.

139 testes passam; TypeScript e build limpos.

## 07/09/2026 — Correção da tela cheia, e a seta do letreiro de porta

Dois retornos do usuário depois de usar. O primeiro, cosmético: a seta lateral do letreiro de porta sugeria uma direção que a porta não tem; virou seta para cima, no sentido de seguir por aqui. Constante compartilhada entre o código e o teste, para não divergirem.

O segundo era erro de projeto meu. A tela cheia valia só para a caixa da cena, então a barra de botões ficava fora dela e não havia como entrar no passeio já em tela cheia. E durante o passeio o ponteiro está capturado, de modo que nenhum botão é clicável — o botão de tela cheia era inalcançável justamente quando mais servia.

Agora o alvo da tela cheia é o painel inteiro, informado pela página a `mountPreview`; cabeçalho e rodapé somem, a barra fica. E a tecla **F** alterna tela cheia de dentro do passeio (D021).

Havia ainda uma armadilha: entrar ou sair de tela cheia solta o ponteiro em alguns navegadores, e o passeio terminaria sozinho no instante em que a tela cheia fosse acionada. Perda de ponteiro dentro de 900 ms de uma troca de tela cheia passou a ser tratada como transição, com o ponteiro pedido de volta em vez de o passeio ser encerrado.

134 testes passam; TypeScript e build limpos. Nada disso foi aberto em navegador por quem construiu — e este é justamente um comportamento que só o navegador confirma.

## 07/09/2026 — Orientação, tela cheia e zoom no passeio

Cinco pedidos do usuário depois de usar a visita publicada, todos sobre o passeio.

**Letreiros nas superfícies.** O rótulo no piso funciona de cima e não funciona andando: a 1,60 m, olhando para a frente, o chão sob os pés está fora do campo de visão. Agora o nome do cômodo aparece no alto da face interna das duas paredes mais longas, e sobre cada porta aparece o nome do cômodo do outro lado (D020). Ambos só aparecem dentro do passeio.

A vizinhança de cada porta é apurada por geometria, não declarada: do meio do vão, um passo para fora da parede cai no cômodo vizinho. Saíram 30 letreiros de porta, e a distribuição confere com a planta — os corredores são os mais nomeados, porque são o que se vê pela maioria das portas. Nada foi acrescentado ao contrato dos dados.

Três testes cuidam do que poderia dar errado em silêncio: o letreiro de parede nunca cai sobre um vão, sempre olha para dentro do próprio cômodo, e o letreiro de porta nunca nomeia o cômodo de onde é lido.

**Leque dinâmico na planta.** O aviso de passeio passou a carregar o campo de visão horizontal, derivado do vertical e da proporção da tela. A planta desenha o setor de visão acompanhando quem caminha, e ele estreita ou alarga junto com o zoom.

**Tela cheia** pela API do navegador, no contêiner da cena, disponível também fora do passeio.

**Zoom pela roda do mouse**, mudando o campo de visão entre 24 e 78 graus, com o valor voltando ao padrão ao sair do passeio. Não é aproximação por deslocamento: é lente, o que mantém a colisão e a posição intactas.

133 testes passam; TypeScript e build limpos. Nada foi aberto em navegador por quem construiu.

## 07/09/2026 — Nome e área escritos no piso, e o que a área revelou

Pedido do usuário: um checkbox que escreva no chão da cena o nome do cômodo e a metragem. Feito nas duas telas, com o rótulo como textura de canvas deitada um centímetro acima do piso — sem fonte externa, sem geometria de texto, sem dependência nova (D019). O ponto e a largura do rótulo saem de `labelPlacement`, que reaproveita o mesmo sampler de ponto folgado que escolhe a partida do passeio: o texto pousa longe das paredes e nunca fica mais largo que o cômodo.

A área é a do traçado, calculada pela fórmula do laço, e não a impressa: quem caminha pisa no polígono do traçado, não no número do desenho.

Escrever essa área forçou a comparação com as cotas impressas, e o resultado é um achado. Dos seis cômodos com área impressa, quatro batem a menos de 1% — LIVING +0,4%, ESCRITÓRIO +0,7%, COZINHA 0,0%, ALMOÇO −0,9%. Os dois dormitórios divergem: DORMIT. 1 +16,2% e DORMIT. 2 +18,4%. Dividindo a sobra pelo maior lado de cada quarto, sai uma faixa de 0,5 a 0,75 m de profundidade — profundidade de armário embutido. **A planta imprime a área do quarto sem o armário.** Isso não era erro de traçado, e agora há teste que afirma as duas coisas separadamente.

O que continua sem explicação: o ESCRITÓRIO bate a 0,7% embora `foto_quarto_03` mostre um armário do piso ao teto. Ou o armário está fora do contorno traçado, ou a convenção da área impressa muda de cômodo para cômodo, que é o que D007 já registrava. Ficou em KNOWN_ISSUES.

Um teste que escrevi antes de olhar os números afirmava que todo cômodo ficaria a menos de 8% da área impressa. Falhou, e ainda bem: substituí por dois testes que afirmam o padrão real, incluindo a profundidade da faixa de armário.

126 testes passam; TypeScript e build limpos.

## 07/09/2026 — O passeio começa de onde a fotografia foi tirada

Primeiro deploy feito pelo usuário, com a visita na raiz do site. O pedido seguinte veio de usar: alternando entre a fotografia e o modelo, clicar em andar por dentro deveria continuar dali, e não saltar para o ponto de partida no meio da sala.

`enterWalk` passou a aceitar uma pose. `walkStartFromPose` é pura e testada: leva ponto, azimute e altura de olho da fotografia, e **não** leva o campo de visão, que é da câmera fotográfica e não de quem caminha. A altura de olho deixou de ser constante durante o passeio; entrando de uma pose, anda-se a 1,55 m em vez de 1,60 m, que é a altura declarada naquela fotografia.

Sair do passeio devolve à vista da fotografia, em vez de reenquadrar o apartamento inteiro — o caminho de volta é o mesmo da ida.

A colisão vale na entrada. Três poses estão a menos de 0,20 m da parede e o raio do corpo é 0,28 m: sem isso, o passeio começaria dentro da alvenaria.

Um teste que escrevi errado revelou um fato melhor que a suposição: eu esperava que a inclinação da pose fosse aparada pelo limite do passeio, e não é. O contrato aceita de −60 a 60 graus, e o passeio permite mais que isso, então **nenhuma pose válida é distorcida ao entrar**. O teste agora afirma essa relação entre os dois limites, em vez de afirmar uma aparagem que não acontece.

O botão diz o que vai fazer: com uma fotografia escolhida, vira "Andar a partir daqui". O mesmo vale no editor, ao comparar uma pose com o modelo.

121 testes passam; TypeScript e build limpos. Nada foi aberto em navegador por quem construiu.

## 07/09/2026 — Tela de visita e publicação estática no CapRover

O usuário pediu uma tela para o público, sem controles de gravação, e deploy no CapRover. A proibição de publicar vinha do escopo da F0 e foi levantada por ele; AGENTS.md e AGENT_SKILL_PROJECT.md registram a mudança e o que continua valendo — sem backend, banco, autenticação, React ou IA.

São duas entradas do Vite (D018). `index.html` segue sendo o editor, local. `visita.html` é a visita: só leitura, sem calibração, sem marcação de pose, sem importar ou exportar, e sem rascunho no armazenamento local — ela usa os arquivos versionados, de modo que todo visitante vê o mesmo.

O pedido específico era que o ponto de vista da fotografia ficasse chamativo. Clicar numa foto desenha, na planta: o **leque do campo de visão**, calculado com `horizontalFov` a partir da proporção da própria fotografia, uma seta na direção do olhar e um anel que pulsa. As demais fotos ficam como pontos discretos, para não competirem. Clicar perto de uma marca na planta também escolhe a foto. A cena 3D vai ao mesmo ponto, e um botão alterna entre a fotografia e o modelo visto dali.

`fovWedge` entrou em `spatial.ts` como função pura, com testes: o arco sai do ponto da câmera, todos os pontos ficam no mesmo raio, o setor é centrado no azimute com a abertura declarada, e a passagem pelo norte não abre furo.

Publicação: `Dockerfile` em duas etapas, node constrói e nginx serve. A imagem roda `build:visita`, cujo único input é `visita.html` — o editor não entra na imagem nem como HTML nem como bundle; não é uma tela escondida atrás de uma URL, ela não é construída. `build.ps1` empacota em `dep/`, e não em `dist/`, que é a saída do Vite; o pacote é montado por lista de inclusão, e `docs/` fica de fora por ser 21 MB de originais que a imagem não usa. `deploy-caprover.ps1` roda testes e typecheck antes de publicar, e lê do `.env` somente as três chaves CAPROVER_*.

Conferido: o pacote sai com 38 arquivos, 20 MB, e a listagem do tar não traz `.env`, `node_modules`, `dist`, `dep`, `docs` nem `.git`. 117 testes passam; TypeScript e build limpos.

Não conferido: **a imagem nunca foi construída**, porque não há Docker nesta sessão, e nenhum deploy foi disparado. A tela de visita também não foi aberta em navegador.

## 07/09/2026 — F4, segunda parte: as duas versões, vazia e mobiliada

O usuário respondeu a pendência 6 do PRD ao ver a cena com acabamentos: quer **as duas versões**, vazia e mobiliada, alternáveis. É a primeira vez que essa preferência sai do default proposto e vira decisão registrada (D017).

A mobília é uma lista por cômodo, com pegada retangular em **pixels da planta**, altura e base em metros, material nomeado e evidência obrigatória. Pixels pelo mesmo motivo das poses: recalibrar move os móveis junto com as paredes. Cada peça declara `loose`, para separar móvel solto de elemento fixo mais tarde sem remexer nos dados; hoje só a geladeira é solta.

Dezesseis peças entraram. Onze vêm do desenho da planta, lidas com grade de coordenadas sobre a imagem ampliada — mesmo método e mesma fonte do traçado das paredes: banheira, vaso, bidê e bancada no BH da suíte; vaso, bidê, bancada, armário e box no BH social; vaso e cuba no BH de serviço; cuba e vaso no lavabo. A varredura automática por componentes conexas foi tentada e descartada: ela junta louça, texto do rótulo e arco de porta num só borrão, o mesmo problema já registrado para a detecção automática de cômodos.

As cinco restantes vêm das fotografias, e é aqui que as poses da F2 começam a pagar: `foto_cozinha_01` foi marcada no ALMOÇO olhando ao norte, então a bancada que aparece à esquerda do quadro está na face oeste e a geladeira à direita está na leste. Sem a pose, isso seria chute.

A mobília entra na colisão **apenas quando visível**, e há teste que compara as contagens de barreira com e sem: a versão vazia continua exatamente a de antes, que é a não regressão exigida pelo critério da F4.

O que ficou de fora, e por quê: o armário embutido do escritório, porque `foto_quarto_03` mostra um armário do piso ao teto com profundidade de armário, enquanto o traçado registra que a cota impressa de 3,67 é o vão livre entre dois embutidos de 0,27 m, profundidade de estante — as duas leituras não se conciliam sem medição. E no BH social a planta desenha dois retângulos cruzados lado a lado; a foto mostra um armário amarelo e um box de vidro fumê, mas nenhuma das fontes diz qual está em qual, então a ordem adotada pode estar trocada. Ambos em KNOWN_ISSUES.

114 testes passam; TypeScript e build limpos.

## 07/09/2026 — F4, primeira parte: acabamentos lidos das fotos e esquadrias

O PRD proíbe esticar fotografia sobre parede como textura e pede materiais simples. Então a cor veio das fotos por amostragem, não por projeção.

Dez materiais nomeados entraram em `apartment.json`, cada um com cor, estado e evidência que registra a foto e a região de pixels de onde a cor saiu. Cada cômodo declara piso, parede e teto apontando para esses nomes; nenhum hexadecimal solto chega à cena (D016). O validador recusa cor fora de `#rrggbb`, material sem evidência e acabamento que aponte para material inexistente.

Antes de amostrar, cada foto é corrigida pelo próprio branco: a superfície que sabemos ser tinta branca vira #f0ede8 e o mesmo ganho por canal vale para as outras amostras daquela foto. Sem isso a parede do LIVING entraria como #bbb6ae — a cor da luz, não a da tinta. Em foto_banheiro_01 a correção é quase nula, porque o assento branco já lê #edecec: ali o bege dos azulejos é real.

O que as fotos mostraram e virou dado: parquete escuro no LIVING (#854c29) contra parquete mel nos dormitórios e no escritório (#d0824f) — são pisos diferentes; cerâmica terracota na cozinha, no corredor de serviço e na área de serviço; cerâmica bege e azulejo bege estampado nos banheiros; esquadrias de alumínio cinza-claro. Cinco cômodos não aparecem em foto nenhuma e receberam o acabamento do vizinho de mesma natureza, dito na evidência. O terraço ficou em cinza neutro, para não afirmar o que ninguém viu.

Todo vão ganhou batente, e toda janela ganhou vidro translúcido. Nada disso vira barreira: a colisão continua lendo apenas os trechos cheios de parede, e há teste que compara a contagem de barreiras antes e depois. Folha de porta não entrou de propósito — fecharia passagens hoje livres, o que seria a regressão de navegação que o critério da F4 proíbe.

O botão **Cores** alterna entre acabamento e conferência: a leitura que distingue cômodo com cota impressa de cômodo sem cota não foi perdida, só deixou de ser a única.

105 testes passam; TypeScript e build limpos. Conferido em render próprio a partir da geometria exportada pelo código do app.

Falta na F4: estampas (espinha, flor do azulejo, junta), rodapés, folhas de porta, louças, armários e móveis soltos. A preferência visual da seção 9, item 6 do PRD continua sem confirmação do usuário.

## 07/09/2026 — F3 concluída: a planta acompanha quem caminha

O passeio já tinha colisão; faltava saber onde se está. Agora, ao entrar no passeio, uma seta laranja aparece na planta mostrando posição e direção, atualizada a cada passo. A conversão usa `worldToPlan`, a mesma transformação que levanta as paredes, e `headingFromYaw`, inversa exata de `poseRotation` — há teste de ida e volta entre as duas, porque essa é a emenda onde um sinal trocado passaria despercebido.

O aviso de passeio deixou de ser um booleano e passou a carregar posição e azimute, emitidos só quando mudam mais de 1 cm ou meio grau: a planta não precisa ser redesenhada 60 vezes por segundo.

Isso fecha a F3. Serve direto à conferência das poses: caminhando até o ponto de uma fotografia dá para comparar o que se vê com o que ela mostra.

95 testes passam; TypeScript e build limpos. Nenhuma tela foi aberta em navegador por quem construiu.

Próximo passo: F4, materiais e elementos, depois de o usuário conferir as poses no navegador.

## 07/09/2026 — O terraço deixou de ser cercado por paredes de 2,70 m

O usuário observou em 06/09/2026, ao rever a cena, que os três fechamentos do terraço são gradil e não parede. A correção ficou pendente porque a altura era global; agora não é mais.

`Wall.heightParameter` aponta para um parâmetro nomeado — `wallHeight` (2,70 m, confirmado) ou `railingHeight` (1,10 m, estimado) —, nunca para um número solto (D015). Os três fechamentos do terraço passaram a `railingHeight`; a face norte continua sendo a fachada do LIVING, com o acesso envidraçado, e segue no pé-direito. Campo ausente vale `wallHeight`, então nada do que já existia mudou de altura.

O validador ganhou três recusas, todas testadas: altura de parede desconhecida, guarda-corpo mais alto que o pé-direito, e vão mais alto que a parede que o recebe — a porta de 2,10 m deixou de caber no gradil de 1,10 m. Os guarda-corpos continuam barrando quem caminha, apesar de baixos.

O que foi corrigido é a **altura**. A aparência não: o gradil é desenhado como parapeito maciço, sem vazios, e 1,10 m é altura usual de guarda-corpo, não medida no local. O que o usuário confirmou é o tipo de fechamento.

92 testes passam; TypeScript e build limpos. Conferido também em render próprio a partir da geometria exportada pelo código do app.

Próximo passo: comparar as poses com o modelo em navegador e resolver as três ressalvas da F2.

## 07/09/2026 — F2 concluída: as 11 fotografias marcadas e confirmadas

O usuário associou, marcou e confirmou as 11 fotografias, cada uma com evidência escrita, e versionou `src/data/project.json`. Sete foram marcadas do cômodo vizinho olhando para dentro do alvo — a pose registra onde a câmera estava, não o que a foto mostra, e o validador impõe isso ao exigir que o ponto caia dentro do cômodo declarado.

Os dados reais quebraram quatro testes e o TypeScript. A causa era minha: os testes liam `initialProject()` e afirmavam que as 11 fotos estavam pendentes, o que deixou de ser verdade no instante em que o arquivo passou a carregar trabalho. Testes de regra agora constroem sua própria cópia sem poses (`semPoses()`); em troca entrou um teste que lê o arquivo real e exige de toda pose gravada ambiente existente, estado diferente de `pendente` e evidência não vazia. O contrato também deixou de tratar a foto do arquivo como se tivesse sempre `roomId: null`: só a identidade da referência é imutável (`Identity`).

Três ressalvas ficaram registradas no roadmap, nenhuma corrigida por inferência: a evidência de `foto_quarto_02` cita o Dormitório 1 enquanto o azimute aponta para o Dormitório 2; três poses ficaram a menos de 0,20 m da parede, `foto_outro_banheiro_01` a 0,02 m; e todas mantiveram o campo vertical padrão de 55°, provavelmente estreito para retrato 1086×1448.

85 testes passam; TypeScript e build limpos. Nenhuma pose foi comparada com o modelo em navegador.

Próximo passo: comparar as poses com o modelo e resolver as três ressalvas antes de tratar materiais.

## 07/09/2026 — A direção da foto passou a ter mira, e a marcação passou a ter fim

Primeiro uso real da marcação, segunda rodada. Duas falhas apareceram juntas: o passo da direção não desenhava nada (a seta só era desenhada para uma pose já salva, nunca para o rascunho), então não havia como ver o que se estava escolhendo; e depois do segundo clique a planta voltava sozinha a medir cotas, de modo que os cliques seguintes viravam pontos A e B sem aviso.

Agora, no passo 2, uma **seta tracejada sai do ponto e segue o cursor**, com a ponta desenhada e o ângulo em graus escrito ao lado. O cabeçalho da planta numera os passos ("passo 1 de 2", "passo 2 de 2"). Depois do clique a seta fica cheia e o azimute continua desenhado a partir do rascunho, lendo o próprio campo — digitar um valor no campo redesenha a seta.

O `PosePick` ganhou o estado `done`: marcado o ponto e a direção, a planta **não** volta a medir cotas por conta própria. Clique nela avisa o que fazer; para medir de novo é preciso pedir, pelo botão **Voltar a medir cotas**, por **Esc**, ou trocando de aba na calibração. Regra em `routePlanClick`, com teste.

83 testes passam; TypeScript e build limpos. Nada disso foi aberto em navegador por quem construiu.

Próximo passo: marcar as fotos da sala, o ambiente com mais registros e o único já reconhecido com segurança.

## 06/09/2026 — Correção da F2: a planta passa a ter um modo por vez

No primeiro uso real da marcação, os cliques da pose e os pontos A e B da cota se misturaram na mesma superfície: o marcador verde da câmera e o marcador laranja da cota apareciam juntos, e um clique depois da marcação começava uma cota nova sem aviso, com a ajuda ainda dizendo "Ponto A marcado".

O roteamento do clique virou função pura e testada, `routePlanClick` em `src/plan/planmode.ts`. Enquanto a marcação de foto está ativa: os marcadores A e B somem, a planta ganha moldura verde, o cabeçalho nomeia a foto sendo marcada, a área de calibração fica esmaecida e nenhum clique chega à medição de cotas. **Esc** cancela. Dois cliques a menos de 8 px um do outro são recusados com aviso, em vez de virar um azimute de ruído.

`azimuthBetween` foi extraída para `src/plan/spatial.ts`, ao lado de `headingDirection`, e os testes conferem as duas contra a mesma convenção: 0 no topo da planta, 90 à direita.

82 testes passam; TypeScript e build limpos. Nada disso foi aberto em navegador por quem construiu.

Próximo passo: marcar as fotos da sala, o ambiente com mais registros e o único já reconhecido com segurança.

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

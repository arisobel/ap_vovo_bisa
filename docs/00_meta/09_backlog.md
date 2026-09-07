# Backlog

## F0 — validação restante
- Executar revisão visual desktop/mobile e roteiro manual do blueprint quando houver navegador conectado.
- Conferir falha de imagem e fallback WebGL na interface em execução.

## F1 — em andamento
- Confirmar que a planta corresponde à configuração atual.
- Obter medida real conhecida em campo; hoje toda cota vem do desenho.
- Traçado estrutural concluído: 16 cômodos, incluindo os dois trechos de corredor. Nada mais a traçar na planta.
- BH de serviço, LAV. e HALL SOCIAL estão gravados como `sem-cota`: traçado sem conferência independente. Revisar em campo antes de tratar como confiáveis.
- Conferir a cena 3D em navegador: nunca foi aberta. Verificar aparência, desempenho e os botões enquadrar/vista superior/ocultar paredes.
- Medir espessura de parede, peitoril e altura de janela em campo. O pé-direito já foi confirmado; esses quatro continuam estimados.
- Medir espessura real de parede por banda de pixels em vez do valor global estimado de 0,15 m.
- Revisar pé-direito antes de afirmar precisão; alturas provisórias devem ser rotuladas.

## F2 — em andamento
- Editor de ponto/direção, comparação na proporção da foto e schema v2: implementados.
- Marcar as 11 fotos: nenhuma foi associada ainda. Todas continuam `pendente`.
- Identificar quartos, escritório e banheiros com revisão humana; os nomes dos arquivos não valem como associação.
- Revisar o editor em navegador: a marcação por dois cliques e a comparação nunca foram usadas.

## F3 / F4
- Passeio e colisão implementados; falta revisar em navegador e sincronizar a posição do caminhante com a planta 2D.
- Modelar folha de porta ou marcar visualmente o vão: hoje todo vão é atravessável.
- Mobília ainda não traçada: armário embutido do escritório (ver KNOWN_ISSUES: a foto mostra armário profundo, o traçado registra embutidos de 0,27 m), armários da área de serviço e do corredor de serviço, tanque, sofá e escrivaninha do escritório, e o que houver nos dormitórios.
- Mobília desenhada como caixa: banheira, vaso e cuba são blocos retangulares com a cor da louça. Forma real exige geometria por tipo de peça.
- Estampas e desenhos de acabamento: o parquete em espinha, a flor do azulejo e a junta da cerâmica são cor lisa hoje. Exige textura procedural ou imagem derivada, com identificação de derivada.
- Rodapés, folhas de porta, louças e armários embutidos. Folha de porta muda a navegação e precisa de decisão antes: hoje todo vão é passagem livre.
- Vazios do gradil: hoje o guarda-corpo do terraço é um parapeito maciço de 1,10 m. Desenhar os montantes exige geometria de balaústre, não só altura, e cabe junto com materiais na F4.
- Medir no local a altura do gradil, a espessura de parede, o peitoril e a altura de janela. `railingHeight` é a segunda altura do projeto e continua estimada.
- Materiais/objetos fixos após validação estrutural.
- Medir desempenho, custo de imagens e bundle; considerar miniaturas derivadas preservando originais.

## Mobile
- Passeio por toque implementado (arrastar para olhar, botões para andar, pinça para aproximar). Nunca aberto em celular por mim: confirmar em uso real o tamanho dos botões, a sensibilidade do arrasto e se a barra de ferramentas continua alcançável.
- Tela cheia no iPhone: o Safari do iOS não implementa `requestFullscreen` em elemento comum. O botão existe e o navegador recusa; a mensagem de recusa é exibida, mas não há alternativa oferecida.
- A planta e a cena dividem a tela em duas colunas até 700 px de largura. Em celular empilham; não foi medido se a cena sobra pequena demais para o passeio fora da tela cheia.

## Produto — planta de terceiros (intenção registrada, não iniciado)
Pedido do usuário em 07/09/2026: avaliar o que falta para o mesmo aplicativo servir a outras plantas, com entrada simples de uma planta nova. Registrado como intenção; nada começou, e começar exige pedido explícito.

O motor já é genérico: escala, colisão, passeio, cotas, letreiros, poses e publicação leem `apartment.json` + `project.json` e não conhecem este apartamento. O que é feito à mão hoje é o traçado.

- Degrau 1 — editor de contorno sobre a planta. Clicar os cantos de um cômodo, arrastar vãos nas paredes e gravar em `apartment.json`, com a mesma validação de hoje. É o degrau que substitui a varredura de pixels feita fora do aplicativo, e o único que torna o traçado possível sem mim. Serve já a este projeto: as pendências do armário do escritório e da ordem armário/box no BH social seriam resolvidas pelo próprio usuário.
- Degrau 2 — mais de um projeto. Hoje há um `apartment.json` e um `project.json` embutidos no bundle. Exige lista de plantas e um pacote por planta (imagens + contratos). Sem backend, por importação de arquivo; com backend, quebra a restrição de arquitetura vigente e precisa de decisão do usuário antes.
- Degrau 3 — assistência no traçado. Detecção automática de paredes já foi tentada nesta planta e falhou (ver KNOWN_ISSUES: janelas e portas são furos na máscara de parede e o exterior vaza para dentro, fundindo cômodos). Um produto pode sugerir e deixar corrigir; não pode prometer traçado automático.
- Entrada alternativa a avaliar no degrau 3: `IFCLoader` do three.js. Quem tem o projeto em IFC/BIM entrega geometria e nomes de ambiente prontos, sem traçar nada — mas é outro caminho de dados, não a planta em JPEG, e exige contrato próprio.

## Foto-realismo — referências enviadas pelo usuário (07/09/2026)
Exemplos do three.js indicados como visão futura. Ordenados por proporção entre efeito e custo; nenhum iniciado.

- Textura de piso e revestimento (`webgl_lights_physical` mostra o efeito). É o que mais muda a impressão pelo menor custo: recortes ladrilháveis do parquete, do azulejo e da cerâmica tirados das 11 fotografias, mais mapeamento de tom (ACES) e sombra suave. Derivadas devem ser identificadas como tal; os originais continuam intactos em `docs/90_references/`.
- Iluminação por sondas (`webgl_lightprobes`, `_complex`, `_sponza`). O exemplo `complex` é exatamente o caso deste projeto: volumes de sonda independentes por cômodo, com luz indireta e sangramento de cor entre superfícies. Depende de geometria fechada, que o traçado já produz, e de um passo de pré-cálculo — é o degrau mais caro e o de maior efeito.
- Luminárias reais (`webgl_lights_spotlight`, `webgl_lights_physical`). Exige saber onde estavam as luminárias e de que tipo eram; hoje não há evidência disso em nenhuma foto, e inventar posição de luz é inventar dado.
- Mobília em malha real (`webgl_loader_gltf`) no lugar das caixas atuais. Depende de origem e licença dos modelos, e cada modelo pesa no bundle e na imagem publicada.

## Experimento visual do LIVING — depois da revisão
- Ajustar os números do cenário ilustrativo: intensidade do sol, da hemisférica e da ambiente residual, e a exposição padrão. São palpite não conferido; o controle de exposição no painel existe para o usuário achar o valor certo e informar.
- Esquadria e vidro do living seguem em material antigo. Vidro pede transmissão; esquadria sozinha não muda a leitura.
- Cortineiro de madeira escura no alto das paredes, com friso dourado, visível nas três fotos do living. Não modelado.
- Coluna aparente no living: `foto_sala_01` e `foto_sala_03` mostram um pilar saliente que o traçado não registra.
- Estender acabamentos aos demais cômodos exige resolver antes o acabamento de cada um com a mesma exigência de evidência. Cozinha e banheiros pedem a flor do azulejo, que é outro padrão gerado.
- Sofá em GLB e iluminação indireta por sondas: adiados por decisão do usuário até a revisão desta rodada.

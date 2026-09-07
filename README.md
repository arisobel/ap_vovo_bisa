# Apartamento da Vovó Bisa

Base local da visita 3D: planta original interativa, calibração por dois pontos, conferência de uma segunda cota, catálogo das 11 fotografias e o apartamento levantado em 3D a partir do traçado. A área 3D levanta os 16 cômodos traçados a partir da escala aplicada e permite andar por dentro. Pé-direito 2,70 m confirmado; espessura de parede, peitoril e altura de janela continuam estimativas.

## Executar

No Windows, encerre o servidor com **Ctrl+C** no terminal de `npm run dev` antes de executar `npm ci`. O Vite pode manter o arquivo nativo do Rolldown em uso, causando `EPERM / unlink` durante a reinstalação. Depois da instalação, inicie novamente com `npm run dev`. Não é necessário repetir `npm ci` a cada abertura do aplicativo.

Use Node.js 24 LTS e npm. Ambiente verificado: Node 24.19.0 e npm 11.17.0, Windows. O lockfile registra as versões instaladas. Requisitos do Vite: [guia oficial](https://vite.dev/guide/); os requisitos adicionais de Vitest estão refletidos em `package.json`.

```powershell
npm ci
npm run dev
```

Abra o endereço indicado no terminal, normalmente http://127.0.0.1:5173/. Tudo é executado localmente; não há conta, backend ou serviço remoto obrigatório. A instalação inicial dos pacotes precisa de acesso ao npm.

```powershell
npm test
npm run typecheck
npm run build
npm run preview
```

O build estático fica em `dist/`. Use o servidor de preview para abri-lo (normalmente http://127.0.0.1:4173/); não abra `index.html` via `file://`. Não há configuração de publicação.

## Usar a base

1. Na planta, marque A e B nas extremidades de uma medida conhecida. Use o zoom para posicionar os pontos; também é possível preencher suas coordenadas em pixels pelo teclado.
2. Digite a distância em metros, com vírgula ou ponto decimal, e clique em **Aplicar escala**. A origem passa a ser A; a escala continua **proposta**, sem confirmação automática.
3. Em **Conferir outra cota**, selecione dois outros pontos, preferencialmente em direção perpendicular. Informe a distância conhecida e compare. O resultado mostra distância na escala, desvio em metros e percentual. A imagem não é deformada.
4. Selecione uma fotografia no catálogo para vê-la inteira e editar suas observações. Os títulos refletem os arquivos: não confirmam o ambiente, ponto ou direção de captura.
5. Em **Ambiente, ponto e direção**, escolha o cômodo e clique em **Marcar ponto e direção na planta**: o primeiro clique é onde a câmera estava, o segundo é para onde ela apontava. No passo 2 uma seta tracejada sai do ponto e segue o cursor, mostrando o ângulo em graus antes do clique. Enquanto a marcação está ativa a planta ganha moldura verde, o cabeçalho numera o passo, os pontos A e B da cota somem e nenhum clique chega à medição. Marcado o ponto e a direção, a planta só volta a medir cotas por **Voltar a medir cotas**, por **Esc** ou trocando de aba na calibração. Ajuste altura, inclinação e campo de visão, escreva a evidência e salve como proposta. **Comparar com o modelo** troca a foto pela cena 3D no mesmo ponto e na mesma proporção. **Confirmar** é uma ação separada, para depois da comparação.
6. Com a escala aplicada, a área da direita levanta os 16 cômodos traçados. **Andar por dentro** entra no passeio: W A S D ou setas para caminhar, mouse para olhar, Shift para acelerar, Esc para sair. Durante o passeio, uma seta laranja na planta mostra onde você está e para onde olha. **Enquadrar**, **Vista superior** e **Ocultar paredes** ajudam na visão geral. **Cores: acabamento** pinta piso e parede com os materiais lidos nas fotografias; o mesmo botão alterna para **Cores: conferência**, onde piso bege é cômodo conferido por cota impressa e piso azulado é cômodo sem cota para conferir. **Com mobília** alterna entre o apartamento mobiliado e o vazio; sem mobília, a circulação volta a ser exatamente a de antes. **Nomes no chão** escreve no piso o nome de cada cômodo e sua área.
7. **Exportar JSON** baixa `vovo-bisa-projeto.json`. Guarde uma cópia; para versionar a nova base, salve em `src/data/project.json`. O navegador não escreve automaticamente nessa pasta.
8. **Importar JSON** valida integralmente o arquivo antes de aplicá-lo. Arquivos inválidos mantêm o estado anterior. A importação válida substitui o rascunho da sessão.

O rascunho é salvo no armazenamento local do navegador, sujeito a disponibilidade e limpeza pelo próprio navegador. Ele tem precedência sobre a base do repositório ao recarregar. Após trocar `src/data/project.json`, importe esse arquivo também na interface se já houver um rascunho. JSON exportado na F0 continua sendo aceito na importação e é migrado para a versão 2, com todas as fotos pendentes.

## Duas telas

`index.html` é o **editor**: calibração, marcação de poses, importação e exportação. É a ferramenta de trabalho e continua local.

`visita.html` é a **visita**: só leitura. Clicar numa fotografia acende o ponto de onde ela foi tirada — um leque mostrando o alcance da câmera, uma seta na direção do olhar e um anel que pulsa — e leva a câmera 3D ao mesmo ponto. Dá para alternar entre a fotografia e o modelo visto dali. Com uma fotografia escolhida, o botão vira **Andar a partir daqui**: o passeio começa exatamente no ponto e na direção dela, e sair do passeio devolve à mesma vista. Sem fotografia escolhida, o passeio começa no meio da sala, como antes. Não há nada que grave parâmetro, e a visita não lê o rascunho do navegador: ela usa os arquivos versionados, então todo visitante vê o mesmo.

Em desenvolvimento, a visita fica em `/visita.html`. Na imagem publicada, ela é a página inicial.

## Publicar no CapRover

A imagem é nginx servindo arquivos estáticos: sem backend, sem banco, sem autenticação. Só a visita é construída — o editor não entra na imagem.

```powershell
Copy-Item .env.example .env      # e preencha CAPROVER_URL, CAPROVER_APP e CAPROVER_APP_TOKEN
npm install -g caprover          # uma vez
.\deploy-caprover.ps1
```

O script roda `npm test` e `npm run typecheck`, monta o pacote com `build.ps1` e publica. `build.ps1` sozinho apenas empacota, em `dep/`, guardando os cinco pacotes mais recentes. `.env` e `dep/` são ignorados pelo Git e nunca entram no pacote, assim como `docs/`, `dist/` e `node_modules/`.

Para conferir o pacote antes de publicar: `tar -tzf dep\<arquivo>.tar.gz`.

## Arquivos

- `docs/10_product/PRD.md`: cópia integral do PRD fornecido.
- `docs/90_references/`: planta e 11 fotos originais, intactas.
- `public/assets/references/`: cópias idênticas usadas pela aplicação e pelo build.
- `src/data/project.json`: inventário das fotos e calibração portátil.
- `src/data/apartment.json`: traçado estrutural dos 16 cômodos, com paredes, vãos, materiais de acabamento, mobília e as conferências contra as cotas impressas.
- `src/data/pilot.ts`: contrato do traçado e conversão dos contornos para metros.
- `src/data/validation.ts`: contrato executável das fotos e da calibração, com poses, e validação atômica de importação.
- `src/plan/spatial.ts`: escala, transformação, inversa, conferência e azimutes.
- `src/scene/preview.ts`: cena Three.js, paredes com vãos recortados, passeio em primeira pessoa e colisão.
- `docs/00_meta/07_progress.md`: evidências da entrega e próximo passo.
- `src/visit.ts`: a tela de visita, somente leitura.
- `Dockerfile`, `nginx.conf`, `captain-definition`: imagem estática publicável.
- `build.ps1`, `deploy-caprover.ps1`, `.env.example`: empacotamento em `dep/` e publicação.
- `docs/40_delivery/F0_BLUEPRINT.md`: escopo e roteiro manual.

## Validação e limitações

126 testes automatizados passaram, assim como TypeScript e build. Eles cobrem escala, contrato dos dados, poses fotográficas e migração da versão 1, traçado dos 16 cômodos contra as cotas impressas da planta, sobreposição entre cômodos, recorte de vãos nas paredes, colisão do passeio, a convenção de azimute da câmera nos dois sentidos, a posição do passeio de volta na planta o roteamento dos cliques entre medir cota e marcar foto, os acabamentos e esquadrias, a mobília com sua colisão condicional, o setor de visão desenhado na tela de visita, a entrada do passeio a partir de uma pose, e a área de cada cômodo contra a cota impressa.

Nada foi medido no apartamento, com uma exceção: o pé-direito de 2,70 m foi confirmado pelo usuário. Os três fechamentos do terraço sobem 1,10 m por serem gradil, tipo de fechamento confirmado pelo usuário; a altura em si é a usual de guarda-corpo e continua estimada, e o desenho é um parapeito maciço, sem os vazios. Espessura de parede, peitoril e altura de janela continuam estimativas globais.

As cores de acabamento são propostas lidas das fotografias: mediana de uma região de pixels, corrigida pelo branco da própria foto, com a região registrada na evidência de cada material. Nenhuma amostra física foi comparada, e estampas não são reproduzidas — o parquete em espinha, a flor do azulejo e a junta da cerâmica aparecem como cor lisa. O terraço não foi fotografado e usa um cinza neutro, escolhido para não afirmar um acabamento que ninguém viu.

A mobília são dezesseis peças propostas: as louças e bancadas que a planta desenha nos banheiros e no lavabo, e a bancada, o armário e a geladeira da cozinha, estas lidas das fotografias com a pose marcada. Cada peça é uma caixa retangular com a cor do material, não a forma real. Muita coisa que aparece nas fotos ainda não foi traçada — o armário do escritório, os armários da área de serviço, o sofá, a escrivaninha. Todas as cotas do traçado vêm do desenho da planta, e três cômodos (BH de serviço, LAV. e HALL SOCIAL) não têm nenhum número impresso para conferir. As áreas escritas no piso são as do traçado: quatro dos seis cômodos com área impressa batem a menos de 1%, mas os dois dormitórios ficam 16% e 18% acima, porque a planta imprime a área sem o armário embutido.

Nenhuma tela foi aberta em navegador por quem construiu: as sessões não tinham navegador conectado. Aparência, desempenho e o passeio dependem de revisão humana.

O Vite informa um chunk Three.js de aproximadamente 539 kB minificado (134 kB gzip), carregado separadamente. Não foi medido desempenho/FPS. As imagens originais somam aproximadamente 21 MB; as fotos do catálogo usam carregamento preguiçoso. Miniaturas otimizadas ficam para trabalho posterior, com identificação de derivadas.

As 11 fotos foram associadas, marcadas e confirmadas pelo usuário em 07/09/2026, cada uma com evidência escrita. A associação é humana: os nomes dos arquivos não valem como evidência e o validador recusa pose sem ela. Três ressalvas seguem abertas, listadas em `docs/10_product/MVP_ROADMAP.md`: uma evidência que contradiz o azimute, três poses a menos de 0,20 m da parede e o campo de visão vertical mantido no padrão de 55°. Nenhuma pose foi comparada com o modelo em navegador.

Próximo passo: comparar cada pose com o modelo em navegador e resolver as três ressalvas antes de tratar materiais e aparência.

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
6. Com a escala aplicada, a área da direita levanta os 16 cômodos traçados. **Andar por dentro** entra no passeio: W A S D ou setas para caminhar, mouse para olhar, Shift para acelerar, Esc para sair. **Enquadrar**, **Vista superior** e **Ocultar paredes** ajudam na visão geral. Piso bege é cômodo conferido por cota impressa; piso azulado é cômodo sem cota para conferir.
7. **Exportar JSON** baixa `vovo-bisa-projeto.json`. Guarde uma cópia; para versionar a nova base, salve em `src/data/project.json`. O navegador não escreve automaticamente nessa pasta.
8. **Importar JSON** valida integralmente o arquivo antes de aplicá-lo. Arquivos inválidos mantêm o estado anterior. A importação válida substitui o rascunho da sessão.

O rascunho é salvo no armazenamento local do navegador, sujeito a disponibilidade e limpeza pelo próprio navegador. Ele tem precedência sobre a base do repositório ao recarregar. Após trocar `src/data/project.json`, importe esse arquivo também na interface se já houver um rascunho. JSON exportado na F0 continua sendo aceito na importação e é migrado para a versão 2, com todas as fotos pendentes.

## Arquivos

- `docs/10_product/PRD.md`: cópia integral do PRD fornecido.
- `docs/90_references/`: planta e 11 fotos originais, intactas.
- `public/assets/references/`: cópias idênticas usadas pela aplicação e pelo build.
- `src/data/project.json`: inventário das fotos e calibração portátil.
- `src/data/apartment.json`: traçado estrutural dos 16 cômodos, com paredes, vãos e as conferências contra as cotas impressas.
- `src/data/pilot.ts`: contrato do traçado e conversão dos contornos para metros.
- `src/data/validation.ts`: contrato executável das fotos e da calibração, com poses, e validação atômica de importação.
- `src/plan/spatial.ts`: escala, transformação, inversa, conferência e azimutes.
- `src/scene/preview.ts`: cena Three.js, paredes com vãos recortados, passeio em primeira pessoa e colisão.
- `docs/00_meta/07_progress.md`: evidências da entrega e próximo passo.
- `docs/40_delivery/F0_BLUEPRINT.md`: escopo e roteiro manual.

## Validação e limitações

92 testes automatizados passaram, assim como TypeScript e build. Eles cobrem escala, contrato dos dados, poses fotográficas e migração da versão 1, traçado dos 16 cômodos contra as cotas impressas da planta, sobreposição entre cômodos, recorte de vãos nas paredes, colisão do passeio, a convenção de azimute da câmera e o roteamento dos cliques da planta entre medir cota e marcar foto.

Nada foi medido no apartamento, com uma exceção: o pé-direito de 2,70 m foi confirmado pelo usuário. Os três fechamentos do terraço sobem 1,10 m por serem gradil, tipo de fechamento confirmado pelo usuário; a altura em si é a usual de guarda-corpo e continua estimada, e o desenho é um parapeito maciço, sem os vazios. Espessura de parede, peitoril e altura de janela continuam estimativas globais. Todas as cotas do traçado vêm do desenho da planta, e três cômodos (BH de serviço, LAV. e HALL SOCIAL) não têm nenhum número impresso para conferir.

Nenhuma tela foi aberta em navegador por quem construiu: as sessões não tinham navegador conectado. Aparência, desempenho e o passeio dependem de revisão humana.

O Vite informa um chunk Three.js de aproximadamente 539 kB minificado (134 kB gzip), carregado separadamente. Não foi medido desempenho/FPS. As imagens originais somam aproximadamente 21 MB; as fotos do catálogo usam carregamento preguiçoso. Miniaturas otimizadas ficam para trabalho posterior, com identificação de derivadas.

As 11 fotos foram associadas, marcadas e confirmadas pelo usuário em 07/09/2026, cada uma com evidência escrita. A associação é humana: os nomes dos arquivos não valem como evidência e o validador recusa pose sem ela. Três ressalvas seguem abertas, listadas em `docs/10_product/MVP_ROADMAP.md`: uma evidência que contradiz o azimute, três poses a menos de 0,20 m da parede e o campo de visão vertical mantido no padrão de 55°. Nenhuma pose foi comparada com o modelo em navegador.

Próximo passo: comparar cada pose com o modelo em navegador e resolver as três ressalvas antes de tratar materiais e aparência.

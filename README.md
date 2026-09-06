# Apartamento da Vovó Bisa

Base local da visita 3D: planta original interativa, calibração por dois pontos, conferência de uma segunda cota e catálogo das 11 fotografias. Esta entrega implementa F0. A área 3D apresenta apenas uma grade ilustrativa: a estrutura do apartamento ainda não foi modelada.

## Executar

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
5. **Exportar JSON** baixa `vovo-bisa-projeto.json`. Guarde uma cópia; para versionar a nova base, salve em `src/data/project.json`. O navegador não escreve automaticamente nessa pasta.
6. **Importar JSON** valida integralmente o arquivo antes de aplicá-lo. Arquivos inválidos mantêm o estado anterior. A importação válida substitui o rascunho da sessão.

O rascunho é salvo no armazenamento local do navegador, sujeito a disponibilidade e limpeza pelo próprio navegador. Ele tem precedência sobre a base do repositório ao recarregar. Após trocar `src/data/project.json`, importe esse arquivo também na interface se já houver um rascunho. JSON de F0 mantém associações e poses `null/pendente`; a evolução desse contrato pertence à F2.

## Arquivos

- `docs/10_product/PRD.md`: cópia integral do PRD fornecido.
- `docs/90_references/`: planta e 11 fotos originais, intactas.
- `public/assets/references/`: cópias idênticas usadas pela aplicação e pelo build.
- `src/data/project.json`: inventário inicial e calibração portátil, inicialmente nula.
- `src/data/validation.ts`: contrato executável e validação atômica de importação.
- `src/plan/spatial.ts`: escala, transformação, inversa, conferência e azimutes.
- `src/scene/preview.ts`: grade Three.js independente da planta e das fotos.
- `docs/00_meta/07_progress.md`: evidências da entrega e próximo passo.
- `docs/40_delivery/F0_BLUEPRINT.md`: escopo e roteiro manual.

## Validação e limitações

24 testes automatizados passaram, assim como TypeScript e build. As 12 referências responderam HTTP 200; hashes SHA-256 confirmaram igualdade entre originais e cópias públicas. Não houve inspeção visual interativa: o Browser da sessão não tinha navegador conectado. Execute o roteiro do blueprint antes de considerar a interface visualmente aprovada.

O Vite informa um chunk Three.js de aproximadamente 539 kB minificado (134 kB gzip), carregado separadamente. Não foi medido desempenho/FPS. As imagens originais somam aproximadamente 21 MB; as fotos do catálogo usam carregamento preguiçoso. Miniaturas otimizadas ficam para trabalho posterior, com identificação de derivadas.

Próximo passo: revisar a escala e o traçado do living para iniciar F1. Confirmar configuração atual da planta, uma medida real e outra perpendicular, quando possível. Nenhuma dimensão ou pose foi presumida nesta entrega.

# Blueprint F0

Escopo: PRD seção 11, adaptando apenas o caminho das referências para `docs/90_references/` conforme usuário. Não construir apartamento genérico ou fases seguintes.

## Roteiro manual de aceite

1. Executar `npm ci` e `npm run dev`. Abrir no desktop e anotar navegador, resolução e hardware.
2. Conferir português, planta à esquerda e visualização à direita; reduzir a janela e conferir empilhamento e ausência de cortes nos controles.
3. Abrir as 11 fotos; conferir imagem inteira, título, pendência e observações. Verificar zoom da planta e retorno ao ajuste.
4. Como teste sintético (não medida do imóvel), inserir A=(50,50), B=(150,50), distância 2 m. Esperar 0,02 m/px.
5. Conferir A=(50,50), B=(50,160), distância 2 m. Esperar 2,2 m calculados e desvio +0,2 m / +10%. Não tratar o teste como calibração real.
6. Repetir marcação por clique com zoom; conferir posição dos marcadores e equivalência às coordenadas em pixels.
7. Editar nota, exportar, recarregar, importar o arquivo e conferir preservação da nota, pontos e escala.
8. Importar JSON inválido, versão desconhecida, foto duplicada e escala inconsistente. Conferir mensagem de rejeição e manutenção do estado anterior.
9. Com o navegador configurado sem WebGL, conferir mensagem e operação de planta/fotos. Simular imagem indisponível via ferramentas de desenvolvimento e conferir erro explícito.
10. Usar Tab e teclado para coordenadas, botões, notas e seleção das fotos. Conferir foco visível. Verificar interface com preferência de movimento reduzido.
11. Reimportar `src/data/project.json` original para remover as medidas sintéticas antes da calibração real.

Automação: conversão ida/volta, azimutes cardinais, desvio perpendicular, dados inválidos e roundtrip completo. Resultados e execução real ficam apenas em `../00_meta/07_progress.md`.

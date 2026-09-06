# Progresso

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

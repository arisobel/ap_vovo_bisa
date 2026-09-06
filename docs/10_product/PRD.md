# PRD — Visita 3D ao apartamento da Vovó Bisa

Versão: 0.1 — proposta para validação • Data: 06/09/2026
Ambiente: desenvolvimento local no VS Code; execução no navegador.
Status: planejamento, sem implementação do aplicativo nesta entrega.

## 1. Objetivo e recomendação

Criar uma representação navegável do apartamento, baseada na planta e nas fotografias fornecidas, com identificação do ponto e da direção de captura de cada foto. O visitante poderá entender a distribuição dos ambientes, caminhar pelo modelo e consultar a fotografia real correspondente.

Stack recomendada: Three.js + TypeScript + Vite + HTML/CSS, com planta interativa em SVG e dados em JSON. Blender será uma ferramenta complementar de acabamento, exportando objetos em GLB. O MVP não precisa de backend, banco de dados, React, serviço de IA ou processamento remoto.

A planta orienta geometria e dimensões; as fotos orientam acabamentos e interpretação visual. Nenhuma dimensão oculta ou posição de câmera inferida deve ser apresentada como medida confirmada. O resultado inicial será uma reconstrução aproximada e verificável, não uma captura fotográfica integral do imóvel.

## 2. Evidências disponíveis

Foram examinados uma planta e 11 fotografias. A planta apresenta living, almoço, cozinha, área de serviço, dormitório de empregados, dois dormitórios, escritório, banheiros, lavabo, hall social e terraço. Preservar esses nomes originais até confirmar os usos atuais.

Há cotas e áreas legíveis em diversos ambientes, suficientes para começar a calibração, mas ainda é necessário verificar consistência entre as cotas. A imagem da planta tem resolução limitada: não interpretar números duvidosos como dados definitivos nem deduzir altura de paredes pela planta baixa.

As fotos mostram parquet nas áreas secas, revestimentos cerâmicos nas áreas molhadas, esquadrias, armários e alguns móveis. Não fornecem cobertura completa de todas as superfícies.

### Inventário e correspondência preliminar

| Arquivo original | Evidência visual | Associação com a planta |
|---|---|---|
| foto_sala_01.png | Área de parquet e acesso envidraçado ao exterior | Provável living; ponto e direção pendentes |
| foto_sala_02.png | Sofás, janela e acesso envidraçado | Provável living; ponto e direção pendentes |
| foto_sala_03.png | Área alongada de parquet, janela e porta | Área social provável; confirmar living/almoço |
| foto_corredor_cozinha_01.png | Porta para passagem longa com janelas | Provável conexão cozinha/área de serviço |
| foto_cozinha_01.png | Pia, geladeira e passagem ao fundo | Cozinha provável |
| foto_quarto_01.png | Quarto vazio, parquet, janela e armário | Ambiente específico a confirmar |
| foto_quarto_02.png | Cama, estante, mesa e armário | Ambiente específico a confirmar |
| foto_quarto_03.png | Mesa, sofá e armários | Ambiente específico a confirmar; uso não prova ser o escritório da planta |
| foto_banheiro_01.png | Box, armário amarelo e louças de tom terroso | Banheiro específico a confirmar |
| foto_outro_banheiro_01.png | Janela, louças e revestimento claro | Banheiro específico a confirmar |
| foto_lavabo_01.png | Vista externa para pequeno sanitário de revestimento escuro | Lavabo provável; confirmar na planta |

Os nomes dos arquivos não bastam para identificar DORMIT. 1, DORMIT. 2 e ESCRITÓRIO. Todas as poses de câmera começam como pendentes; sugestões futuras terão justificativa e grau de confiança. Nenhuma coordenada real foi estabelecida neste PRD.

## 3. Experiência do usuário

### Visitante

1. Abre o aplicativo e visualiza o apartamento em perspectiva, sem teto.
2. Seleciona um ambiente na planta ou na lista de ambientes.
3. Entra no passeio e usa teclado/mouse; também pode selecionar pontos de observação acessíveis por botões.
4. A planta acompanha sua posição e direção em tempo real.
5. Ao selecionar um marcador fotográfico, abre a foto real e pode assumir o ponto de observação correspondente no modelo.
6. Alterna entre foto e modelo, reconhecendo que enquadramentos aproximados podem apresentar diferenças.

### Editor local

1. Carrega a planta e informa uma medida conhecida entre dois pontos.
2. Verifica a escala contra outras cotas em eixos diferentes.
3. Define ambientes, paredes e aberturas em dados estruturados.
4. Seleciona uma foto, marca o ponto na planta e arrasta uma seta para definir a direção.
5. Ajusta altura da câmera, inclinação e campo de visão quando necessário.
6. Compara foto e câmera 3D e marca a associação como proposta ou confirmada.
7. Exporta o JSON e o salva no projeto pelo VS Code.

A edição inicial pode usar JSON para a geometria; o editor visual completo de paredes fica para uma fase posterior. O editor visual de pontos fotográficos faz parte do MVP.

## 4. Escopo do MVP

| ID | Requisito | Critério de aceite |
|---|---|---|
| RF01 | Planta calibrada | Dois pontos e uma distância definem escala; outra cota é comparada e o desvio é mostrado |
| RF02 | Modelo estrutural | Pisos, paredes, portas e janelas refletem o traçado validado; portas permitem passagem |
| RF03 | Visão geral | Orbitar, aproximar e selecionar ambientes; teto removível |
| RF04 | Passeio | WASD/setas e mouse; Esc libera cursor; botão retorna a ponto seguro |
| RF05 | Limites de circulação | Usuário não atravessa paredes nem sai por janelas; vãos de portas permanecem navegáveis |
| RF06 | Planta sincronizada | Posição e direção da câmera são atualizadas no mapa |
| RF07 | Catálogo de fotos | As 11 fotos possuem ID, arquivo, observações e estado de associação; ausências aparecem explicitamente |
| RF08 | Ponto e direção | Editor posiciona marcador e seta; valores persistem após exportação/importação |
| RF09 | Comparação | Seleção de foto abre imagem e aplica sua pose à câmera quando disponível |
| RF10 | Incerteza explícita | Medidas estimadas e poses propostas têm identificação visível no modo de edição |
| RF11 | Persistência portátil | JSON exportado pode ser reimportado; formato inválido gera mensagem sem apagar estado válido |
| RF12 | Operação local | README permite instalar e executar; build gera arquivos estáticos sem serviço externo obrigatório |

O cone desenhado na planta representa o campo de visão horizontal. Não deve ser confundido com uma área fotografada medida com precisão.

## 5. Fora do MVP

Reconstrução automática fotorrealista; panoramas 360 gerados a partir de fotos convencionais; levantamento arquitetônico certificado; BIM; realidade virtual; multiplayer; login; banco de dados; publicação pública; editor CAD completo; mobiliário detalhado; iluminação fisicamente calibrada.

Fotogrametria, NeRF e Gaussian Splatting não são a proposta inicial para este conjunto de imagens. São alternativas a estudar com captura adicional planejada e cobertura adequada. O projeto não deve depender de conseguir reconstruir superfícies que não aparecem nas fotos.

## 6. Arquitetura técnica

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Interface | HTML + CSS + TypeScript | Painéis, catálogo, controles e editor |
| Planta | SVG | Imagem de fundo, polígonos, pontos, setas e seleção |
| Renderização | Three.js / WebGLRenderer | Geometria, materiais, luzes e câmera |
| Desenvolvimento | Vite + npm | Servidor local e build estático |
| Dados | JSON versionado + validação de schema | Geometria, escala, fotos e proveniência |
| Detalhamento posterior | Blender → GLB → GLTFLoader | Armários, louças e objetos específicos |
| Verificação | Vitest e roteiro manual | Transformações espaciais, dados e navegação |

Usar OrbitControls na visão geral e PointerLockControls no passeio desktop. PointerLockControls não implementa colisões: construir circulação separadamente. Para apartamento em um pavimento, começar com colisão 2D no plano do piso, câmera com altura fixa e raio do visitante configurável. Considerar segmentos varridos ou subpassos para evitar atravessamento em frames lentos. Não exigir motor de física no MVP.

Portas e janelas devem ser aberturas reais na geração da parede, não retângulos desenhados sobre uma parede sólida. A colisão deriva da mesma geometria lógica e conserva as janelas como barreiras.

Usar materiais simples e iluminação suficiente para orientação. As fotos completas aparecem nos pontos fotográficos; não aplicar uma foto inteira arbitrariamente sobre uma parede como se fosse uma textura ortogonal.

### Organização sugerida

| Caminho | Conteúdo |
|---|---|
| docs/00_meta/ | Orquestração, contrato, progresso, decisões, backlog e problemas |
| docs/10_product/PRD.md | Este PRD como fonte única de requisitos |
| docs/10_product/MVP_ROADMAP.md | Fases e critérios de passagem |
| docs/20_domain/SPATIAL_RULES.md | Unidades, eixos, validação e incerteza |
| docs/30_architecture/ARCHITECTURE.md | Componentes e responsabilidades |
| docs/30_architecture/DATA_CONTRACT.md | Schemas e compatibilidade |
| docs/40_delivery/ | Blueprint da fase ativa |
| references/originals/ | Planta e fotos originais preservadas |
| public/assets/ | Cópias otimizadas para exibição e modelos GLB |
| src/data/ | apartment.json, photos.json e schemas |
| src/scene/ | Construção de geometria e materiais |
| src/navigation/ | Controles e colisão |
| src/plan/ | Calibração, conversões e marcadores SVG |
| src/ui/ | Interface e edição |
| tests/ | Testes espaciais e de validação |
| blender/ | Arquivos .blend e scripts de exportação, quando necessários |

### Fonte única da geometria

No MVP, apartment.json é a fonte da estrutura e dos limites de circulação. O Blender complementa com objetos decorativos registrados no mesmo sistema de coordenadas. Não manter paredes independentes em JSON e Blender. Se futuramente o Blender assumir toda a estrutura, registrar uma decisão e mudar explicitamente a fonte de verdade e a geração de colisores.

### Coordenadas e calibração

- Unidade do mundo: metro. Three.js: Y vertical; piso em XZ.
- Planta: pixels originais, origem no canto superior esquerdo; u cresce para a direita e v para baixo.
- Convenção inicial: X cresce para a direita da planta, Z cresce para baixo. Definir origem métrica identificável na planta.
- Modelo básico: X = (u − u0) × s e Z = (v − v0) × s, onde s é metros por pixel. Registrar transformação e inversa.
- Não deformar a imagem independentemente nos dois eixos para forçar cotas. Se houver discrepância, registrar distorção ou erro de leitura e tratar conscientemente.
- Direção serializada: azimute em graus, 0 apontando ao topo da planta (−Z), 90 à direita (+X), 180 abaixo (+Z), 270 à esquerda (−X).
- Direção horizontal no mundo: (sin(a), 0, −cos(a)). Aplicar inclinação separadamente; converter graus para radianos apenas internamente.
- Armazenar campo de visão vertical; calcular horizontal usando a proporção da foto: hFov = 2 atan(tan(vFov/2) × aspect).
- Na comparação, usar viewport com a mesma proporção da foto. Recortes e correções de perspectiva impedem assumir que a foto conserva os parâmetros originais de câmera.
- Altura, espessura de paredes e campo de visão desconhecidos podem ter valores provisórios documentados, nunca rotulados como medidos.

### Contrato mínimo dos dados

| Entidade | Campos essenciais |
|---|---|
| Projeto | schemaVersion, unidades, referência da planta, transformação, estado de calibração |
| Ambiente | id, nome original, polígono, evidências, estado de validação |
| Parede | id, extremos, espessura, altura, proveniência das medidas |
| Abertura | id, wallId, tipo, posição ao longo da parede, largura, base e altura |
| Foto | id, caminho, dimensões da imagem, original/derivada, roomId opcional, observações |
| Pose fotográfica | x, z, cameraHeight, headingDeg, pitchDeg, verticalFovDeg, status, confidence, evidências |

Usar null para associação ou pose desconhecida; não usar zero como substituto de ausência. Estados: pendente, proposto, confirmado. Confiança: baixa, média ou alta, sem probabilidade numérica artificial. Uma pose é confirmada mediante validação humana registrada.

O navegador mantém rascunho local para conveniência, mas o arquivo JSON exportado e versionado é a fonte portátil. Alterar estado no navegador não equivale a salvar em src/data. Implementar botão Exportar e informar esse comportamento claramente.

## 7. Qualidade e validação

- Registrar navegador, resolução e hardware de referência antes de avaliar desempenho. Meta inicial proposta: pelo menos 30 FPS a 1080p em notebook com GPU integrada, sujeita à medição real.
- Limitar resolução de renderização e carregar fotos grandes sob demanda. Ajustar texturas após medir memória e desempenho.
- Tratar ausência de WebGL com mensagem clara; a lista de fotos e a planta devem continuar utilizáveis quando possível.
- Botões identificados, foco visível, instruções curtas e opção de reduzir movimento. Passeio livre desktop é prioritário; em telas menores, manter seleção de pontos e arraste para olhar, sem depender de pointer lock.
- Testar conversão planta→mundo→planta, quatro azimutes cardinais, importação inválida e circulação por portas versus bloqueio por paredes/janelas.
- Verificar visualmente escala, conexão entre ambientes, posição das aberturas e comparação das fotos. Registrar divergências, sem declarar fidelidade completa apenas porque o build passou.
- Manter originais intactos. Se forem usadas fotos retocadas, identificá-las como derivadas; limpar imperfeições em uma imagem não comprova o estado físico do imóvel.

## 8. Roadmap

| Fase | Entrega | Condição para avançar |
|---|---|---|
| F0 — Base verificável | Documentação, inventário, app local e planta com calibração | Referências carregadas; hipóteses e pendências registradas |
| F1 — Estrutura | Apartamento em blocos simples, portas, janelas e visão geral | Traçado e escala revisados pelo usuário |
| F2 — Fotografias | Editor de ponto/direção e comparação foto/modelo | 11 registros existentes; associações revisadas ou explicitamente pendentes |
| F3 — Passeio | Navegação, colisão e planta sincronizada | Percurso pelas áreas modeladas sem atravessar barreiras |
| F4 — Aparência | Materiais, esquadrias e objetos selecionados | Ganho visual sem regressão de navegação/desempenho |

Priorizar um ambiente piloto, preferencialmente o living, antes de detalhar o apartamento inteiro. As fotos sugerem múltiplas vistas da área social, úteis para comparar aberturas e enquadramentos.

## 9. Pendências para validação espacial

1. Confirmar que a planta representa a configuração atual do apartamento.
2. Confirmar uma medida real conhecida e, idealmente, outra em direção perpendicular.
3. Informar pé-direito; enquanto ausente, manter estimativa identificada.
4. Identificar quais fotos correspondem a cada dormitório/escritório e banheiro.
5. Marcar ou revisar pontos e direções aproximados das fotos.
6. Confirmar preferência visual: vazio, mobiliário existente ou ambos. Default proposto: estrutura e elementos fixos; móveis soltos entram depois.

Essas pendências não impedem iniciar F0, o catálogo de fotos e a ferramenta de marcação. Impedem afirmar precisão espacial final.

## 10. Adaptação do seed de orquestração

O documento enviado pertence ao CRM Conversacional API e inclui WhatsApp Gateway, PostgreSQL, DDL, OpenAPI e regras comerciais. Reaproveitar seu método de continuidade e fontes únicas; substituir seu conteúdo de domínio. A proposta abaixo é texto para o arquivo do futuro projeto, não alteração do anexo original.

Conteúdo sugerido para docs/00_meta/AGENT_SKILL_ORCHESTRATION.md:

```markdown
# AGENT SKILL ORCHESTRATION

## Papel
Controlar leitura, execução, registro e retomada da Visita 3D ao apartamento da Vovó Bisa.

## Fontes únicas
| Função | Arquivo |
|---|---|
| Progresso | docs/00_meta/07_progress.md |
| Decisões | docs/00_meta/08_decisions_log.md |
| Backlog | docs/00_meta/09_backlog.md |
| Problemas observados | docs/00_meta/KNOWN_ISSUES.md |
| Contrato do projeto | docs/00_meta/AGENT_SKILL_PROJECT.md |
| Requisitos | docs/10_product/PRD.md |
| Roadmap | docs/10_product/MVP_ROADMAP.md |
| Regras espaciais | docs/20_domain/SPATIAL_RULES.md |
| Arquitetura | docs/30_architecture/ARCHITECTURE.md |
| Contrato de dados | docs/30_architecture/DATA_CONTRACT.md |

Não criar fontes concorrentes para requisitos, progresso, decisões ou backlog.

## Antes
1. Ler contrato, progresso, backlog, PRD e roadmap.
2. Ler blueprint da fase ativa em docs/40_delivery/.
3. Consultar regras espaciais e contratos afetados.
4. No primeiro bootstrap, criar os arquivos ausentes com base no PRD e registrar a criação.

## Durante
1. Preservar originais e referências de evidência.
2. Separar dado observado, estimado e confirmado.
3. Manter planta, câmera e geometria no mesmo sistema de coordenadas.
4. Atualizar contrato quando o formato de dados mudar.
5. Registrar tradeoffs em decisões e somente problemas observados em KNOWN_ISSUES.md.

## Depois
1. Atualizar progresso e backlog.
2. Acrescentar evidências de validação e limitações.
3. Registrar próximo passo concreto para retomada.

## Prioridade inicial
F0: aplicação local, inventário das referências e calibração da planta.
Stack: Three.js + TypeScript + Vite + HTML/CSS + SVG + JSON.
Blender é complementar. Sem backend no MVP.

## Antipadrões
- Inventar medidas ou confirmar poses sem evidência.
- Duplicar estrutura entre Blender e JSON.
- Acoplar geometria a componentes de interface.
- Confundir foto convencional com panorama 360.
- Priorizar decoração antes de validar traçado e escala.
- Declarar fase concluída sem evidência de execução.
```

## 11. Prompt inicial para o Codex no VS Code

Copiar o PRD para docs/10_product/PRD.md e colocar as imagens em references/originals antes de usar o prompt. O agente deve adaptar o seed conforme a seção anterior, preservando sua versão de referência.

```text
Você está trabalhando no projeto local “Visita 3D ao apartamento da Vovó Bisa”.

Leia docs/10_product/PRD.md, as instruções aplicáveis do repositório e o seed AGENT_SKILL_ORCHESTRATION.md disponível. Inspecione references/originals. Se houver regras de CRM/WhatsApp no seed, adapte somente a documentação deste novo projeto ao domínio espacial definido no PRD; preserve uma cópia do seed original como referência. Não importe backend, banco de dados ou regras comerciais do projeto anterior.

Objetivo desta execução: implementar SOMENTE F0, deixando uma base executável e verificável. Não publicar nem desenvolver todas as fases de uma vez.

1. Inspecione o diretório atual antes de criar arquivos; preserve trabalho existente. Crie a estrutura documental e adapte docs/00_meta/AGENT_SKILL_ORCHESTRATION.md. Evite duplicar fontes de verdade. No AGENTS.md da raiz, indique a leitura desse arquivo, preservando instruções existentes.
2. Inicialize Vite + TypeScript vanilla + Three.js + HTML/CSS. Use versões estáveis compatíveis, verifique os requisitos do Node e registre lockfile. Não introduza React, backend, banco ou serviços de IA.
3. Crie uma interface em português com planta à esquerda, área de visualização à direita e catálogo das fotos. A área 3D pode estar vazia com explicação durante F0; não invente um apartamento genérico para simular conclusão.
4. Implemente calibração: selecionar dois pontos da planta, informar distância em metros, armazenar transformação e inversa e comparar com outra cota. Implemente conversão consistente XZ/Y conforme o PRD.
5. Cadastre todas as imagens encontradas com IDs estáveis. Registre associação e pose como null/pendente. Não associe quarto_01 a DORMIT. 1 pelo nome. Mostre fotos reais e erros de carregamento explícitos.
6. Permita exportar/importar JSON versionado de calibração e inventário; valide antes de aplicar e preserve estado válido em caso de erro. Explique que exportar não grava automaticamente nos arquivos do repositório.
7. Adicione testes significativos de ida/volta das coordenadas e rejeição de dados inválidos. Execute verificação TypeScript e build. Registre o que foi executado e o que não pôde ser verificado visualmente.
8. Escreva README com instalação e npm run dev, build e preview. Documente os caminhos para salvar JSON exportado.
9. Atualize progresso, backlog, decisões e pendências. Encerre com instruções para abrir localmente, arquivos relevantes e o próximo passo F1.

Restrições: preservar as imagens originais; não inventar cotas, posições de câmera ou correspondências; não aplicar fotos completas como texturas de parede; não detalhar móveis; não adicionar publicação ou autenticação.

Se faltar alguma medida, continue com importação, catálogo e interface de calibração, deixando a escala como não confirmada. Pergunte somente o dado necessário para a validação espacial posterior. Não declare F1 ou fidelidade do apartamento concluídas nesta execução.
```

## 12. Referências técnicas

Consultadas em 06/09/2026:

- Three.js — biblioteca de renderização: https://threejs.org/
- Controles de primeira pessoa: https://threejs.org/docs/pages/PointerLockControls.html
- Carregamento glTF/GLB: https://threejs.org/docs/pages/GLTFLoader.html
- Vite — desenvolvimento local, templates vanilla-ts e build: https://vite.dev/guide/
- Exportador glTF do Blender, projeto oficial: https://github.com/KhronosGroup/glTF-Blender-IO

A escolha da stack, o escopo e a ordem das fases são recomendações de arquitetura para este projeto; não constituem promessas de reconstrução automática oferecidas por essas ferramentas.

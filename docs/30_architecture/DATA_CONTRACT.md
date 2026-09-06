# Contrato de dados — schemaVersion 1 / F0

Validador executável: `src/data/validation.ts`. Arquivo base: `src/data/project.json`. Importações são limitadas a 1 MB, validadas integralmente e normalizadas antes de aplicar. O schema de F0 é restrito a este acervo, não um importador genérico de projetos.

| Campo | Regra |
|---|---|
| schemaVersion / units | `1` / `m` |
| planId | `planta_apartamento` |
| plan | Referência original da planta |
| photos | Exatamente 11 referências conhecidas, IDs únicos; ordem é normalizada |
| calibration | `null` ou objeto proposto válido |

Referência: `id`, `path`, `originalPath`, `width`, `height`, `kind`, `source`, `roomId`, `pose`, `status`, `observations`. Metadados dos originais devem corresponder ao inventário base. `source=original`, `roomId=null`, `pose=null`, `status=pendente`. Observações são texto de até 5.000 caracteres. As fotos não são embutidas no JSON: caminhos relativos apontam para assets conhecidos do app.

Calibração: `reference`, `check` (medida ou null), `transform`, `status=proposto`. Cada medida contém `points:[{u,v},{u,v}]` e `distanceMeters`. Transformação contém `origin:{u,v}` e `metersPerPixel`; deve ser consistente com a referência. A inversa é calculada pelas funções espaciais.

Sem campos de confirmação humana ou poses nesta versão; sua introdução exige evolução explícita na F2. Propriedades extras não usadas são descartadas na normalização; versões desconhecidas são rejeitadas. Importação malformada, inventário incompleto, caminhos alterados e escalas inconsistentes não substituem o estado válido.

Persistência: rascunho local em `vovo-bisa-project-v1`. Fonte portátil é o JSON exportado. Para atualizar a base do repositório, salvar em `src/data/project.json`. A aplicação não escreve no filesystem. Estado local pode divergir da base e tem precedência ao abrir; importar explicitamente a base atualizada para sincronizar o navegador.

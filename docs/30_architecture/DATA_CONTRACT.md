# Contrato de dados — schemaVersion 2 / F2

Validador executável: `src/data/validation.ts`. Arquivo base: `src/data/project.json`. Importações são limitadas a 1 MB, validadas integralmente e normalizadas antes de aplicar. O schema é restrito a este acervo, não um importador genérico de projetos.

| Campo | Regra |
|---|---|
| schemaVersion / units | `2` na saída; `1` ainda é aceito na entrada e migrado / `m` |
| planId | `planta_apartamento` |
| plan | Referência original da planta; nunca recebe ambiente, pose ou estado diferente de pendente |
| photos | Exatamente 11 referências conhecidas, IDs únicos; ordem é normalizada |
| calibration | `null` ou objeto proposto válido |

Referência: `id`, `path`, `originalPath`, `width`, `height`, `kind`, `source`, `roomId`, `pose`, `status`, `observations`. Metadados dos originais devem corresponder ao inventário base. Observações são texto de até 5.000 caracteres. As fotos não são embutidas no JSON: caminhos relativos apontam para assets conhecidos do app.

Calibração: `reference`, `check` (medida ou null), `transform`, `status=proposto`. Cada medida contém `points:[{u,v},{u,v}]` e `distanceMeters`. Transformação contém `origin:{u,v}` e `metersPerPixel`; deve ser consistente com a referência.

## Associação e pose fotográfica

`roomId` é `null` ou o id de um cômodo existente em `apartment.json`. `status` é `pendente`, `proposto` ou `confirmado`.

`pose` é `null` ou um objeto com `u`, `v`, `cameraHeight`, `headingDeg`, `pitchDeg`, `verticalFovDeg`, `confidence` e `evidence`.

Regras verificadas na importação:

- Pose exige `roomId`, e o ponto `u,v` precisa cair **dentro do contorno daquele cômodo**. Foto associada à cozinha não aceita ponto no living.
- `pendente` proíbe pose; `proposto` e `confirmado` exigem pose. Associar só o ambiente, sem ponto, é permitido e mantém o estado `pendente`.
- `evidence` da pose é obrigatória e não pode ser só espaço em branco. Uma pose sem justificativa escrita é recusada.
- `confidence` é `baixa`, `media` ou `alta`. Sem probabilidade numérica.
- Faixas: altura da câmera 0,3 a 2,5 m; azimute 0 a 359,99; inclinação −60 a 60; campo vertical 20 a 100 graus.

A pose é guardada **em pixels da planta**, não em metros. O mundo é derivado por `poseToWorld` com a mesma transformação que levanta as paredes. Assim uma recalibração reposiciona todas as poses junto com a geometria, em vez de deixá-las para trás. O campo de visão horizontal não é armazenado: `horizontalFov` o calcula pela proporção da fotografia, conforme o PRD.

Persistência: rascunho local em `vovo-bisa-project-v1`. Fonte portátil é o JSON exportado. Para atualizar a base do repositório, salvar em `src/data/project.json`. A aplicação não escreve no filesystem. Estado local pode divergir da base e tem precedência ao abrir; importar explicitamente a base atualizada para sincronizar o navegador.

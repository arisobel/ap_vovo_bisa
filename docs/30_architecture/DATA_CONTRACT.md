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

## Estrutura do apartamento — `apartment.json`

Validador executável: `src/data/pilot.ts`. Esta seção documenta o bloco `materials`, que existe no arquivo desde a F4 e até agora não estava no contrato, e os campos acrescentados na rodada do experimento visual.

### `parameters`

Todos obrigatórios, cada um com `value`, `status` (`estimado` ou `confirmado`) e `evidence` escrita. Nenhuma dimensão do projeto é número solto no código.

| Parâmetro | Faixa aceita | Situação |
|---|---|---|
| `wallHeight` | 0,2 a 5 m | confirmado pelo usuário: 2,70 m |
| `railingHeight` | 0,2 a 5 m | estimado; nunca maior que `wallHeight` |
| `wallThickness` | 0,05 a 0,6 m | estimado |
| `doorHeight` | 0,2 a 5 m | estimado |
| `windowBase` | 0 a 3 m | estimado |
| `windowHeight` | 0,2 a 5 m | estimado |
| `baseboardHeight` | 0,02 a 0,4 m | estimado; nunca maior que `wallHeight` |
| `tacoLength` | 0,05 a 1 m | estimado; sempre maior que `tacoWidth` |
| `tacoWidth` | 0,02 a 0,5 m | estimado |

A faixa não é margem de erro medida: é o que se admite antes de tratar o número como engano de digitação.

### `materials`

Dicionário de material nomeado. A chave é o identificador usado em `finishes`.

| Campo | Regra |
|---|---|
| `color` | `#rrggbb` minúsculo, obrigatório |
| `roughness` | opcional, 0 a 1; ausente adota 0,85 |
| `metalness` | opcional, 0 a 1; ausente adota 0 |
| `pattern` | opcional; `{ kind: "espinha", rotationDeg: 0 a 90 }` |
| `status` | `proposto` ou `confirmado` |
| `evidence` | obrigatória, texto |

Cor, rugosidade e metalicidade são **aparência proposta, não medida**: ninguém mediu o brilho de nenhuma superfície deste apartamento. Arquivos sem os campos ópticos continuam válidos e recebem os valores adotados.

`pattern` descreve um desenho gerado por regra, não uma imagem: as dimensões físicas vêm dos parâmetros nomeados, e `rotationDeg` é o giro do padrão em relação às paredes. Hoje só `piso-parquete-escuro` declara um.

`deriveRoom` devolve `finishes` (só as cores, que é o que a cena base consome) e `optics` (cor mais rugosidade, metalicidade e padrão), lado a lado. Quem precisa de PBR pede `optics`; nada quebrou para quem lia `finishes`.


# Roadmap operacional

Requisitos e critérios completos: `PRD.md`, seções 4 e 8.

| Fase | Entrega | Passagem |
|---|---|---|
| F0 | Base local, inventário, planta e calibração | Referências carregadas, hipóteses registradas; conferir interface |
| F1 | Estrutura piloto e depois apartamento | Escala e traçado revisados pelo usuário |
| F2 | Editor de fotografias e comparação | 11 registros revisados ou pendentes explicitamente |
| F3 | Passeio, colisões e planta sincronizada | Percurso testado sem atravessar barreiras |
| F4 | Materiais e elementos selecionados | Aparência melhor sem regressão de navegação |

Fase atual: F0 a F3 concluídas. A F4 entregou sua primeira parte em 07/09/2026: acabamentos e esquadrias.

Entregue na F4: dez materiais nomeados com cor, estado e evidência; piso, parede e teto declarados por cômodo; batente em todo vão e vidro em toda janela; alternância entre as cores de acabamento e as cores de conferência, para não perder a leitura que distingue cômodo com cota impressa de cômodo sem cota.

Segunda parte da F4, em 07/09/2026: mobília, em duas versões. O usuário respondeu a pendência 6 do PRD — quer **vazio e mobiliado**, alternáveis. Dezesseis peças entraram: as louças e bancadas que a planta desenha nos quatro banheiros e no lavabo, mais a bancada, o armário e a geladeira da cozinha, estas lidas das fotografias com a pose marcada. Cada peça tem pegada em pixels da planta, material nomeado e evidência (D017).

Falta na F4: estampas e desenhos (o parquete em espinha e a flor do azulejo são cor lisa hoje), rodapés, folhas de porta, e a mobília que ainda não foi traçada — armário do escritório, armários da área de serviço, tanque, sofá e escrivaninha. As peças modeladas são caixas retangulares com a cor da louça, não a forma real.

A F2 passou em 07/09/2026: as 11 fotografias foram associadas a um ambiente, marcadas com ponto e direção na planta e **confirmadas pelo usuário**, cada uma com evidência escrita. Sete delas foram marcadas do cômodo vizinho olhando para dentro do alvo, o que é o registro correto: a pose diz onde a câmera estava, não o que a foto mostra.

Ressalvas registradas na passagem, todas a resolver com o usuário e nenhuma corrigida por inferência:

- `foto_quarto_02` tem evidência escrita citando o Dormitório 1, mas o azimute de 90° a partir do corredor norte aponta para o Dormitório 2;
- três poses ficaram a menos de 0,20 m da parede (`foto_outro_banheiro_01` a 0,02 m), coerente com fotos tiradas da soleira, mas a câmera nasce dentro da espessura da parede na cena;
- todas mantiveram o campo vertical padrão de 55°, provavelmente estreito para fotos de celular em retrato 1086×1448.

Nenhuma tela foi aberta em navegador por quem construiu.

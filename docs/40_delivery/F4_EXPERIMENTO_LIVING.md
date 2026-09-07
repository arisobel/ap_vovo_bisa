# F4 — Experimento visual do LIVING (primeira rodada)

Escopo autorizado pelo usuário em 07/09/2026, depois do estudo. Um cômodo, três opções de comparação, desligado por padrão, ausente da visita pública. Fora desta rodada por decisão dele: sofá em GLB, sondas de luz, spots, reflexo de ambiente e iluminação indireta.

**A validação visual está PENDENTE.** Nenhum navegador nesta sessão. O que segue é o roteiro para quem tem tela.

## Como abrir

```
npm install      # se ainda não instalou
npm run dev
```

Abre em **http://127.0.0.1:5173/** — o editor local (`index.html`). A visita, `visita.html`, não tem nem nunca terá este painel.

A escala já está gravada em `src/data/project.json`, então os 16 cômodos sobem sozinhos. Se o navegador tiver um rascunho antigo em memória local sem escala, aplique a escala proposta antes.

## Caminho de cliques para comparar as três versões

O enquadramento justo é o da fotografia, e o editor já sabe fazê-lo.

1. Role até o catálogo e clique em **`foto_sala_03`** — a que olha da bifurcação do L para a janela do fundo. É a pose mais bem corroborada do living: o raio central atravessa o centro de `window-south`, e as duas feições visíveis na imagem batem a 2–3° do calculado.
2. Abra **Ambiente, ponto e direção** e clique em **Comparar com o modelo**. O quadro passa a ter a proporção 1086 × 1448 da fotografia e a câmera vai para a pose, com o campo de visão gravado nela. O botão vira **Voltar a foto** — é com ele que se alterna original e modelo no mesmo recorte.
3. Logo acima da imagem, abra **Experimento visual do LIVING**.
4. Troque entre **Atual → Acabamentos → Iluminação**. A câmera não se move: é o que torna as três comparáveis.
5. Em **Iluminação**, use o controle de **Exposição** (0,40 a 2,00). Os valores do cenário são palpite não conferido; este controle existe para você achar o certo e me dizer qual é.

Para ver de dentro andando: **Andar por dentro** (com a comparação ligada, o passeio começa no ponto da própria fotografia). O teto aparece nos dois casos — no passeio e na comparação pela pose — e some na vista geral de cima, onde tamparia tudo.

## O que verificar

| Item | O que olhar |
|---|---|
| As três opções, mesma câmera | O enquadramento não pode mudar ao trocar de opção. Se mudar, é defeito. |
| Teto na comparação e no passeio | Presente nos dois. Ausente em **Enquadrar** e em **Vista superior**. |
| Rodapé nas portas | A faixa branca tem de sumir nas duas portas do living — a do ALMOÇO e a do terraço — e continuar sob a janela. |
| Sombras | Sem vazamento por parede, sem listra de acne nas paredes de 15 cm, e a luz entrando pelos vãos e não através deles. O vidro não projeta sombra, de propósito. |
| Parquete | Direção do desenho contra `foto_sala_01`; se a espinha estiver correndo no sentido errado, é `rotationDeg` do material. Repetição: procure a mesma tábua clara formando grade a cada 1,26 m. |
| Retorno ao estado anterior | Em **Atual**, a cena tem de ficar idêntica à de antes desta entrega, inclusive nos outros cômodos. |
| Legibilidade | Nomes no chão e Medidas continuam legíveis sobre o piso texturizado e sob qualquer exposição. |
| Cores de conferência | Ligue **Cores: conferência**. O experimento tem de se suspender sozinho e dizer por quê. |
| Navegação e catálogo | Passeio, colisão, planta sincronizada, seleção de fotos: sem regressão. |

Não troque a paleta enquanto estiver comparando: trocar de paleta remonta a cena e reenquadra a câmera. É comportamento anterior a esta entrega, não introduzido por ela.

## Desempenho — como medir

O painel mostra, enquanto aberto: **draw calls**, **triângulos** e **tempo de quadro**. O tempo de quadro só existe **durante o passeio**, porque fora dele a cena não desenha — número de cena parada seria ficção.

Meça **em movimento**, andando pelo living uns 30 segundos, nas três opções, e anote:

- aparelho, navegador e resolução;
- ms por quadro e FPS, na mediana e no pior momento;
- draw calls e triângulos.

Repita no celular, em tela cheia. Não compare a quantidade de malhas com draw calls medidos: são coisas diferentes, e só o segundo é medida.

**Peso adicional de recursos: zero byte de asset.** A textura do parquete é gerada no navegador a partir da regra, não baixada. O custo é de memória de vídeo: uma textura de 1024 × 1024 RGBA, cerca de 4 MB, uns 5,3 MB com mipmaps. O pedaço `experiment` tem 7,54 kB (3,45 kB comprimido) e **não entra na visita**; o pedaço `preview` cresceu 0,7 kB.

## Limitações desta rodada, declaradas

- **O modo Iluminação muda o apartamento inteiro.** Curva de tom, exposição e as duas luzes são globais. Os outros cômodos mudam de aparência nesse modo, e isso não é defeito: é o limite do isolamento por cômodo, e foi a alternativa autorizada. O modo **Acabamentos**, esse sim, não toca em nada global.
- **O sol é cenário ilustrativo.** Não há orientação solar nem horário confirmados. Azimute e elevação são escolha de aparência.
- **Não há reflexo da janela no parquete nem luz indireta.** O piso tem brilho especular do sol direto; o reflexo do ambiente exigiria mapa de ambiente, e a luz rebatida exigiria sondas. Nenhum dos dois entrou.
- **Esquadria e vidro do living seguem em material antigo.**
- **O tamanho do taco é estimado**, 7 × 21 cm. Muda a escala do desenho no piso inteiro se for medido e for outro.

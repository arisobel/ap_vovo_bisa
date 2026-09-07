// Padrão de parquete em espinha de peixe, gerado por regra.
//
// Por que gerado e não recortado da fotografia: um recorte traz junto a perspectiva, a sombra e o
// reflexo do dia em que a foto foi tirada. Repetido dezenas de vezes no piso, o mesmo reflexo
// apareceria em toda a sala e a mesma tábua clara reapareceria a cada metro. As fotografias entram
// aqui como referência de proporção, direção e cor — não como pixels.
//
// Geometria do padrão: tábuas de comprimento `length` e largura `width`, alternando entre deitadas
// e em pé. O par (deitada, em pé) se repete pelos vetores u = (a, a) e v = (-b, b), que são
// ortogonais e correm nas duas diagonais. O ladrilho retangular que uma textura precisa sai daí:
// o menor período alinhado aos eixos é 2·q·a, onde q é o menor inteiro que torna q·a/b inteiro.
// Para o taco brasileiro corrente de 7 × 21 cm, a/b = 3, q = 1 e o ladrilho tem 42 cm de lado.
//
// As dimensões do taco são ESTIMADAS. Vêm dos parâmetros nomeados `tacoLength` e `tacoWidth`, não
// de número solto aqui, e não foram medidas no imóvel.

export type Plank = {
  // Canto inferior esquerdo, em metros, dentro do ladrilho. Pode ficar fora de [0, período]:
  // quem desenha é que repete a peça nas bordas para fechar a emenda.
  x: number;
  y: number;
  width: number;
  height: number;
  // Direção da fibra da madeira, para o desenho do veio.
  grain: 'x' | 'y';
  // Multiplicador de claridade sobre a cor declarada do material. 1 = a própria cor.
  tone: number;
};

export type Parquet = {
  // Lado do ladrilho de textura, em metros. É um múltiplo inteiro do período mínimo do padrão:
  // repetir o período mínimo de 42 cm numa sala de 45 m² poria a mesma tábua clara em cena umas
  // 450 vezes, e o olho encontra essa grade. Um ladrilho maior custa memória e esconde a repetição.
  periodMeters: number;
  blocks: number;
  plankLength: number;
  plankWidth: number;
  planks: Plank[];
};

export const MAX_DENOMINADOR = 8;

// Menor período alinhado aos eixos. Lança quando a proporção entre comprimento e largura não fecha
// um ladrilho razoável — é melhor recusar do que gerar uma textura com emenda visível.
export function herringbonePeriod(plankLength: number, plankWidth: number, maxDenominador = MAX_DENOMINADOR): number {
  if (!(plankLength > 0) || !(plankWidth > 0) || plankWidth >= plankLength) {
    throw new Error('Parquete: a tábua precisa ser mais comprida que larga.');
  }
  const razao = plankLength / plankWidth;
  for (let q = 1; q <= maxDenominador; q++) {
    const produto = q * razao;
    if (Math.abs(produto - Math.round(produto)) < 1e-6) return 2 * q * plankLength;
  }
  throw new Error(`Parquete: proporção ${razao.toFixed(3)} não fecha ladrilho com denominador até ${maxDenominador}.`);
}

// Ruído determinístico: a mesma tábua recebe sempre o mesmo tom, em qualquer máquina e execução.
function ruido(m: number, n: number, k: number): number {
  const s = Math.sin(m * 127.1 + n * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// Tom de uma tábua. A maioria varia pouco em torno da cor amostrada; uma minoria é bem mais clara,
// como as peças de reposição visíveis em foto_sala_01 e foto_sala_03.
function tomDaTabua(m: number, n: number, k: number): number {
  const r = ruido(m, n, k);
  // Peça de reposição, bem mais clara: aparecem espalhadas em foto_sala_01 e foto_sala_03.
  if (r > .94) return 1.3 + (r - .94) * 1.8;
  // Tábua mais escura, com moderação: no piso real a variação escura é discreta, e um tom muito
  // baixo repetido em ladrilho vira uma mancha reconhecível.
  if (r < .07) return .84 + r;
  return .92 + ruido(n, m, k + 17) * .18;
}

export const BLOCOS_PADRAO = 3;

export function herringbone(plankLength: number, plankWidth: number, blocos = BLOCOS_PADRAO): Parquet {
  const a = plankLength, b = plankWidth;
  if (!Number.isInteger(blocos) || blocos < 1 || blocos > 8) throw new Error('Parquete: blocos fora de faixa.');
  // Múltiplo inteiro do período mínimo: continua fechando a emenda, com mais tábuas distintas.
  const periodo = herringbonePeriod(a, b) * blocos;
  const passosM = Math.ceil(periodo / a) + 1;
  const passosN = Math.ceil(periodo / b) + 1;
  const vistos = new Set<string>();
  const planks: Plank[] = [];
  const grade = b / 1000;
  // Reduz ao ladrilho encostando no zero pelo outro lado: sem isto, uma origem que cai em 0 e outra
  // que cai em período−ε viram duas origens diferentes por erro de ponto flutuante, e o ladrilho
  // ganha uma tábua a mais em cima de outra.
  const dentro = (t: number) => {
    const r = ((t % periodo) + periodo) % periodo;
    return periodo - r < grade ? 0 : r;
  };
  for (let m = 0; m <= passosM; m++) {
    for (let n = 0; n <= passosN; n++) {
      // Origem do par, reduzida ao ladrilho.
      const x = dentro(m * a - n * b);
      const y = dentro(m * a + n * b);
      const chave = `${Math.round(x / grade)}:${Math.round(y / grade)}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      planks.push({ x, y, width: a, height: b, grain: 'x', tone: tomDaTabua(m, n, 0) });
      planks.push({ x: x + a, y, width: b, height: a, grain: 'y', tone: tomDaTabua(m, n, 1) });
    }
  }
  const esperado = Math.round((periodo * periodo) / (a * b));
  if (planks.length !== esperado) {
    throw new Error(`Parquete: ${planks.length} tábuas no ladrilho, esperadas ${esperado}.`);
  }
  return { periodMeters: periodo, blocks: blocos, plankLength: a, plankWidth: b, planks };
}

// Quanto a textura se repete por metro de mundo. As UVs do piso já estão em metros — ShapeGeometry
// emite as próprias coordenadas do vértice como UV —, então a repetição é o inverso do ladrilho.
export function parquetRepeat(periodMeters: number): number {
  return 1 / periodMeters;
}

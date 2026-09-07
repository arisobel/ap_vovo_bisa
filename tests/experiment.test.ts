import { describe, expect, it } from 'vitest';
import { AmbientLight, DirectionalLight, Group, Mesh, MeshLambertMaterial, Scene, type WebGLRenderer } from 'three';
import { herringbone, herringbonePeriod, parquetRepeat } from '../src/scene/parquet';
import { baseboardRuns, ceilingHeight, createExperiment, PROFUNDIDADE_RODAPE } from '../src/scene/experiment';
import { deriveApartment, initialApartment } from '../src/data/pilot';
import { calibrate } from '../src/plan/spatial';

const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
const apartment = initialApartment();
const rooms = deriveApartment(apartment, transform);
const living = rooms.find(r => r.id === 'living')!;
const taco = { length: apartment.parameters.tacoLength.value, width: apartment.parameters.tacoWidth.value };

function dentroDoContorno(contour: { x: number; z: number }[], p: { x: number; z: number }) {
  let dentro = false;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i], b = contour[(i + 1) % contour.length];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < a.x + (p.z - a.z) * (b.x - a.x) / (b.z - a.z)) dentro = !dentro;
  }
  return dentro;
}

describe('escala do parquete em espinha', () => {
  it('o ladrilho fecha sem sobra: as tábuas cobrem a área exatamente uma vez', () => {
    const padrao = herringbone(taco.length, taco.width);
    const soma = padrao.planks.reduce((t, p) => t + p.width * p.height, 0);
    expect(soma).toBeCloseTo(padrao.periodMeters * padrao.periodMeters, 9);
  });

  it('as tábuas têm o tamanho declarado nos parâmetros, e não um valor inventado no desenho', () => {
    const padrao = herringbone(taco.length, taco.width);
    for (const p of padrao.planks) {
      const lados = [p.width, p.height].sort((a, b) => a - b);
      expect(lados[0]).toBeCloseTo(taco.width, 12);
      expect(lados[1]).toBeCloseTo(taco.length, 12);
    }
    // Metade deitada, metade em pé: é o que faz a espinha.
    expect(padrao.planks.filter(p => p.grain === 'x')).toHaveLength(padrao.planks.length / 2);
  });

  it('o ladrilho é múltiplo inteiro do período mínimo do padrão', () => {
    const minimo = herringbonePeriod(taco.length, taco.width);
    const padrao = herringbone(taco.length, taco.width);
    expect(minimo).toBeCloseTo(2 * taco.length, 12);
    expect(padrao.periodMeters / minimo).toBeCloseTo(padrao.blocks, 12);
    expect(Number.isInteger(padrao.blocks)).toBe(true);
  });

  it('a repetição da textura é o inverso do ladrilho, porque as UVs do piso estão em metros', () => {
    const padrao = herringbone(taco.length, taco.width);
    // Um piso de 9,12 m recebe exatamente esta quantidade de ladrilhos, sem escala mágica.
    expect(parquetRepeat(padrao.periodMeters) * 9.12).toBeCloseTo(9.12 / padrao.periodMeters, 9);
  });

  it('recusa proporção de taco que não fecha ladrilho, em vez de gerar emenda visível', () => {
    expect(() => herringbonePeriod(0.2, 0.061)).toThrow(/não fecha ladrilho/);
    expect(() => herringbonePeriod(0.07, 0.21)).toThrow(/mais comprida que larga/);
  });
});

describe('recorte do rodapé', () => {
  const trechos = baseboardRuns(living);

  it('nenhum trecho de rodapé atravessa uma porta', () => {
    for (const wall of living.walls) {
      const portas = wall.openings.filter(o => o.type === 'door');
      for (const porta of portas) {
        for (const t of trechos.filter(t => t.wallId === wall.id)) {
          const invade = t.start < porta.offset + porta.width - 1e-9 && t.end > porta.offset + 1e-9;
          expect(invade, `${t.wallId}: rodapé de ${t.start.toFixed(2)} a ${t.end.toFixed(2)} sobre a porta`).toBe(false);
        }
      }
    }
  });

  it('sob a janela o rodapé continua, porque ali a parede encosta no piso', () => {
    const parede = living.walls.find(w => w.openings.some(o => o.type === 'window'))!;
    const janela = parede.openings.find(o => o.type === 'window')!;
    const meio = janela.offset + janela.width / 2;
    const sob = trechos.filter(t => t.wallId === parede.id && t.start <= meio && t.end >= meio);
    expect(sob).toHaveLength(1);
  });

  it('o rodapé cobre o perímetro menos a largura das portas', () => {
    const perimetro = living.walls.reduce((t, w) => t + Math.hypot(w.end.x - w.start.x, w.end.z - w.start.z), 0);
    const portas = living.walls.reduce((t, w) => t + w.openings.filter(o => o.type === 'door').reduce((s, o) => s + o.width, 0), 0);
    const rodape = trechos.reduce((t, r) => t + r.length, 0);
    expect(rodape).toBeCloseTo(perimetro - portas, 9);
    expect(portas).toBeGreaterThan(0);
  });

  it('o rodapé fica do lado de dentro do cômodo, encostado na face interna da parede', () => {
    // A verificação é conter o ponto no contorno, e não a distância a um centro: o living é um L,
    // e num L o centro médio dos vértices cai no braço errado para metade das paredes.
    for (const t of trechos) {
      const wall = living.walls.find(w => w.id === t.wallId)!;
      const comprimento = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
      const meio = (t.start + t.end) / 2;
      const naFace = {
        x: wall.start.x + ((wall.end.x - wall.start.x) / comprimento) * meio,
        z: wall.start.z + ((wall.end.z - wall.start.z) / comprimento) * meio,
      };
      // Deslocado da face por meia profundidade, e para o lado de dentro.
      expect(Math.hypot(t.x - naFace.x, t.z - naFace.z)).toBeCloseTo(PROFUNDIDADE_RODAPE / 2, 9);
      expect(dentroDoContorno(living.contour, t), t.wallId).toBe(true);
      // Um passo maior na mesma direção continua dentro: prova que o sentido é para dentro, e não
      // que o ponto só resistiu por estar a sete milímetros da linha.
      const passo = {
        x: naFace.x + (t.x - naFace.x) * 40,
        z: naFace.z + (t.z - naFace.z) * 40,
      };
      expect(dentroDoContorno(living.contour, passo), `${t.wallId} para fora`).toBe(true);
    }
  });

  it('o teto do living usa o pé-direito, não uma altura escrita à mão', () => {
    expect(ceilingHeight(living)).toBeCloseTo(apartment.parameters.wallHeight.value, 12);
  });
});

// Um renderizador de mentira, com só o que o experimento toca. Serve para provar a restauração:
// o modo 'atual' tem de devolver exatamente o estado de origem, e o modo 'acabamentos' não pode
// tocar em nada global — é essa a afirmação que o painel faz ao usuário.
function rendererFalso() {
  return {
    toneMapping: 0,
    toneMappingExposure: 1,
    shadowMap: { enabled: false, autoUpdate: true, type: 1, needsUpdate: false },
    capabilities: { getMaxAnisotropy: () => 4 },
    info: { render: { calls: 0, triangles: 0 } },
  };
}

function montar() {
  const scene = new Scene();
  const pisos = new Group(), paredes = new Group(), moveis = new Group();
  scene.add(pisos, paredes, moveis);
  const ambiente = new AmbientLight('#ffffff', 1.9);
  const sol = new DirectionalLight('#ffffff', 1.1);
  sol.position.set(-6, 14, 8);
  scene.add(ambiente, sol);
  const original = new MeshLambertMaterial({ color: '#854c29' });
  const piso = new Mesh(undefined, original);
  piso.userData = { roomId: 'living', kind: 'piso' };
  const parede = new Mesh(undefined, original);
  parede.userData = { roomId: 'living', kind: 'parede' };
  const vizinho = new Mesh(undefined, original);
  vizinho.userData = { roomId: 'cozinha', kind: 'piso' };
  pisos.add(piso, vizinho);
  paredes.add(parede);
  const renderer = rendererFalso();
  const experimento = createExperiment({
    scene, renderer: renderer as unknown as WebGLRenderer, pisos, paredes, moveis, ambiente, sol,
    taco, alturaRodape: apartment.parameters.baseboardHeight.value,
    render: () => {}, report: () => {},
  });
  experimento.rebuild(rooms);
  return { scene, renderer, experimento, ambiente, sol, piso, parede, vizinho, original };
}

function fotografia(renderer: ReturnType<typeof rendererFalso>, ambiente: AmbientLight, sol: DirectionalLight) {
  return JSON.stringify({
    toneMapping: renderer.toneMapping,
    exposicao: renderer.toneMappingExposure,
    sombra: { ...renderer.shadowMap, needsUpdate: undefined },
    ambiente: ambiente.intensity,
    sol: { i: sol.intensity, p: sol.position.toArray(), alvo: sol.target.position.toArray(), sombra: sol.castShadow },
  });
}

describe('modo experimental: aplicação e restauração', () => {
  it('volta ao estado de origem ao sair da iluminação', () => {
    const { renderer, experimento, ambiente, sol } = montar();
    const antes = fotografia(renderer, ambiente, sol);
    experimento.setMode('iluminacao');
    expect(fotografia(renderer, ambiente, sol)).not.toBe(antes);
    expect(renderer.shadowMap.enabled).toBe(true);
    // Nada se move na cena: o mapa de sombra não pode ser refeito a cada quadro do passeio.
    expect(renderer.shadowMap.autoUpdate).toBe(false);
    experimento.setMode('atual');
    expect(fotografia(renderer, ambiente, sol)).toBe(antes);
  });

  it('acabamentos não tocam em nenhuma configuração global', () => {
    const { renderer, experimento, ambiente, sol } = montar();
    const antes = fotografia(renderer, ambiente, sol);
    experimento.setMode('acabamentos');
    expect(fotografia(renderer, ambiente, sol)).toBe(antes);
  });

  it('troca o material só do cômodo do experimento, e devolve o objeto original', () => {
    const { experimento, piso, parede, vizinho, original } = montar();
    experimento.setMode('acabamentos');
    expect(piso.material).not.toBe(original);
    expect(parede.material).not.toBe(original);
    expect(vizinho.material, 'cômodo vizinho não pode ser repintado').toBe(original);
    experimento.setMode('atual');
    expect(piso.material).toBe(original);
    expect(parede.material).toBe(original);
  });

  it('acende teto e rodapé do living, e o teto só aparece quando se olha de dentro', () => {
    const { scene, experimento } = montar();
    const extras = scene.children.filter(o => o.type === 'Group' && o.children.some(c => c.userData?.kind === 'teto'));
    expect(extras).toHaveLength(1);
    const grupo = extras[0];
    const teto = grupo.children.find(c => c.userData?.kind === 'teto')!;
    const rodapes = grupo.children.filter(c => c.userData?.kind === 'rodape');
    expect(rodapes.length).toBe(baseboardRuns(living).length);
    experimento.setMode('acabamentos');
    expect(grupo.visible).toBe(true);
    expect(teto.visible, 'de fora, o teto tamparia a vista de cima').toBe(false);
    experimento.setInterior(true);
    expect(teto.visible).toBe(true);
    experimento.setMode('atual');
    expect(grupo.visible).toBe(false);
  });

  it('trocar de opção não fabrica material novo a cada clique', () => {
    const { experimento, piso } = montar();
    experimento.setMode('acabamentos');
    const primeiro = piso.material;
    for (let i = 0; i < 8; i++) {
      experimento.setMode(i % 2 ? 'acabamentos' : 'iluminacao');
    }
    experimento.setMode('acabamentos');
    // O usuário troca de opção o tempo todo: se cada troca criasse material, a memória cresceria
    // durante a própria comparação.
    expect(piso.material).toBe(primeiro);
  });

  it('sobrevive a uma cena sem cômodos', () => {
    const { experimento, piso, original } = montar();
    experimento.setMode('iluminacao');
    experimento.rebuild(null);
    expect(piso.material).toBe(original);
    experimento.setMode('atual');
  });

  it('o vidro não projeta sombra: um painel opaco à luz fecharia a janela', () => {
    const { scene, experimento, paredes } = { ...montar(), paredes: null as never };
    const vidro = new Mesh(undefined, new MeshLambertMaterial());
    vidro.userData = { roomId: 'living', kind: 'vidro' };
    const grupoParedes = scene.children.find(o => o.type === 'Group' && o.children.some(c => c.userData?.kind === 'parede'))!;
    grupoParedes.add(vidro);
    experimento.setMode('iluminacao');
    expect(vidro.castShadow).toBe(false);
    expect(vidro.receiveShadow).toBe(true);
    const parede = grupoParedes.children.find(c => c.userData?.kind === 'parede')!;
    expect(parede.castShadow).toBe(true);
    experimento.setMode('atual');
    expect(parede.castShadow).toBe(false);
  });
});

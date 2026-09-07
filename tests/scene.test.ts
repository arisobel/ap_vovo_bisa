import { describe, expect, it } from 'vitest';
import { barriersFrom, headingFromYaw, poseRotation, resolveCollision, startingPoint, wallBlocks } from '../src/scene/preview';
import { deriveApartment, initialApartment } from '../src/data/pilot';
import { calibrate, headingDirection, planToWorld, worldToPlan } from '../src/plan/spatial';

const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
const rooms = deriveApartment(initialApartment(), transform);
const room = (id: string) => rooms.find(r => r.id === id)!;
const wall = (roomId: string, wallId: string) => room(roomId).walls.find(w => w.id === wallId)!;

describe('blocos de parede da cena', () => {
  it('empurra a parede para fora do contorno, nunca para dentro do cômodo', () => {
    const escritorio = room('escritorio');
    const centroZ = escritorio.contour.reduce((s, p) => s + p.z, 0) / escritorio.contour.length;
    const centroX = escritorio.contour.reduce((s, p) => s + p.x, 0) / escritorio.contour.length;
    // Norte: a parede fica acima (z menor) do que a face interna que a originou.
    const norte = wallBlocks(wall('escritorio', 'escritorio-norte'))[0];
    expect(norte.position[2]).toBeLessThan(wall('escritorio', 'escritorio-norte').start.z);
    expect(norte.position[2]).toBeLessThan(centroZ);
    // Leste: a parede fica à direita (x maior) da face interna.
    const leste = wallBlocks(wall('escritorio', 'escritorio-leste'))[0];
    expect(leste.position[0]).toBeGreaterThan(wall('escritorio', 'escritorio-leste').start.x);
    expect(leste.position[0]).toBeGreaterThan(centroX);
  });

  it('deixa o vão da porta vazio e fecha só a verga acima dela', () => {
    const oeste = wall('escritorio', 'escritorio-oeste');
    const blocos = wallBlocks(oeste);
    // Porta de 2,10 m em parede de 2,70 m: dois trechos cheios e a verga sobre o vão.
    expect(blocos).toHaveLength(3);
    const verga = blocos.find(b => b.position[1] > 2.1)!;
    expect(verga.size[1]).toBeCloseTo(0.6, 6);
    expect(blocos.filter(b => b.size[1] === 2.7)).toHaveLength(2);
  });

  it('põe o peitoril embaixo e a verga em cima da janela', () => {
    const blocos = wallBlocks(wall('escritorio', 'escritorio-leste'));
    const alturas = blocos.map(b => b.size[1]).sort((a, b) => a - b);
    // 0,60 de verga, 0,90 de peitoril e dois trechos cheios de 2,70.
    expect(alturas[0]).toBeCloseTo(0.6, 6);
    expect(alturas[1]).toBeCloseTo(0.9, 6);
    expect(alturas.slice(2)).toEqual([2.7, 2.7]);
  });

  it('gira cada bloco na direção da sua parede', () => {
    const norte = wallBlocks(wall('escritorio', 'escritorio-norte'))[0];
    const leste = wallBlocks(wall('escritorio', 'escritorio-leste'))[0];
    expect(norte.rotationY).toBeCloseTo(0, 6);
    expect(Math.abs(leste.rotationY)).toBeCloseTo(Math.PI / 2, 6);
  });

  it('mantém todo bloco dentro da altura de parede declarada', () => {
    for (const r of rooms) {
      for (const w of r.walls) {
        for (const b of wallBlocks(w)) {
          expect(b.position[1] + b.size[1] / 2, `${r.id}/${w.id}`).toBeLessThanOrEqual(w.height + 1e-9);
          expect(b.position[1] - b.size[1] / 2, `${r.id}/${w.id}`).toBeGreaterThanOrEqual(-1e-9);
        }
      }
    }
  });

  it('levanta parede em todo o apartamento traçado', () => {
    const total = rooms.reduce((s, r) => s + r.walls.reduce((n, w) => n + wallBlocks(w).length, 0), 0);
    expect(rooms).toHaveLength(16);
    expect(total).toBeGreaterThan(80);
  });
});

describe('passeio em primeira pessoa', () => {
  const barreiras = barriersFrom(rooms);

  it('deixa a verga da porta passar e o peitoril da janela barrar', () => {
    const porta = wall('escritorio', 'escritorio-oeste');
    const janela = wall('escritorio', 'escritorio-leste');
    // Parede com porta: 3 blocos, mas só os 2 cheios chegam à altura do corpo.
    expect(wallBlocks(porta)).toHaveLength(3);
    expect(barriersFrom([{ ...room('escritorio'), walls: [porta] }])).toHaveLength(2);
    // Parede com janela: o peitoril de 0,90 m continua barrando.
    expect(wallBlocks(janela)).toHaveLength(4);
    expect(barriersFrom([{ ...room('escritorio'), walls: [janela] }])).toHaveLength(3);
  });

  it('empurra para fora quem tenta entrar na parede', () => {
    const alvo = barreiras[0];
    const solto = resolveCollision(alvo.cx, alvo.cz, .28, barreiras);
    const distancia = Math.hypot(solto.x - alvo.cx, solto.z - alvo.cz);
    expect(distancia).toBeGreaterThan(0);
    // Depois de resolvido, uma segunda passada não mexe mais: a posição é estável.
    const outra = resolveCollision(solto.x, solto.z, .28, barreiras);
    expect(Math.hypot(outra.x - solto.x, outra.z - solto.z)).toBeLessThan(1e-6);
  });

  it('não atravessa a parede sul do living por mais que se empurre', () => {
    const sul = wall('living', 'living-south');
    const meio = { x: (sul.start.x + sul.end.x) / 2, z: (sul.start.z + sul.end.z) / 2 };
    let p = { x: meio.x, z: meio.z - 1.5 };
    for (let i = 0; i < 40; i++) p = resolveCollision(p.x, p.z + .2, .28, barreiras);
    // A parede está em z ~ meio.z; o caminhante fica antes dela, nunca do outro lado.
    expect(p.z).toBeLessThan(meio.z);
  });

  it('atravessa o vão da porta entre almoço e living', () => {
    const parede = wall('almoco', 'almoco-sul');
    const dir = { x: (parede.end.x - parede.start.x), z: (parede.end.z - parede.start.z) };
    const comprimento = Math.hypot(dir.x, dir.z);
    const abertura = (40 + 25 / 2) * (comprimento / 105); // vão a 52,5 px do início, numa parede de 105 px
    const centro = {
      x: parede.start.x + dir.x / comprimento * abertura,
      z: parede.start.z + dir.z / comprimento * abertura,
    };
    let p = { x: centro.x, z: centro.z - .8 };
    for (let i = 0; i < 30; i++) p = resolveCollision(p.x, p.z + .1, .28, barreiras);
    // Passou para o outro lado da divisória.
    expect(p.z).toBeGreaterThan(centro.z);
  });

  it('começa o passeio dentro de um cômodo, não dentro de uma parede', () => {
    const inicio = startingPoint(rooms)!;
    expect(inicio).not.toBeNull();
    const solto = resolveCollision(inicio.x, inicio.z, .28, barreiras);
    expect(Math.hypot(solto.x - inicio.x, solto.z - inicio.z)).toBeLessThan(1e-9);
    // Folga real, não apenas ausência de colisão: dá para virar no lugar sem encostar.
    const perto = barreiras.some(b => Math.hypot(inicio.x - b.cx, inicio.z - b.cz) < .8);
    expect(perto).toBe(false);
  });
});

describe('câmera na pose da fotografia', () => {
  it('aponta para o mesmo lado que o azimute da planta', () => {
    for (const heading of [0, 45, 90, 180, 270, 359]) {
      const { y } = poseRotation({ headingDeg: heading, pitchDeg: 0 });
      // Câmera olha para -Z; girada por y, a direção vira (sin heading, 0, -cos heading).
      const frente = { x: -Math.sin(y), z: -Math.cos(y) };
      const esperado = headingDirection(heading);
      expect(frente.x, `azimute ${heading}`).toBeCloseTo(esperado.x, 9);
      expect(frente.z, `azimute ${heading}`).toBeCloseTo(esperado.z, 9);
    }
  });
  it('inclina para cima com pitch positivo', () => {
    expect(poseRotation({ headingDeg: 0, pitchDeg: 20 }).x).toBeGreaterThan(0);
  });
});

describe('gradil do terraço', () => {
  const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
  const terraco = deriveApartment(initialApartment(), transform).find(r => r.id === 'terraco')!;

  it('desenha o guarda-corpo baixo, não uma parede de pé-direito', () => {
    const leste = terraco.walls.find(w => w.id === 'terraco-leste')!;
    const blocos = wallBlocks(leste);
    expect(blocos).toHaveLength(1);
    expect(blocos[0].size[1]).toBeCloseTo(1.1, 9);
    expect(blocos[0].position[1]).toBeCloseTo(0.55, 9);
  });

  it('continua barrando quem caminha, apesar de baixo', () => {
    const gradil = terraco.walls.filter(w => w.id !== 'terraco-norte');
    expect(barriersFrom([{ ...terraco, walls: gradil }])).toHaveLength(3);
  });
});

describe('planta sincronizada com o passeio', () => {
  it('lê o azimute da câmera de volta pela mesma convenção', () => {
    for (const grau of [0, 35, 89, 152, 244, 270, 359]) {
      const { y } = poseRotation({ headingDeg: grau, pitchDeg: 0 });
      expect(headingFromYaw(y)).toBeCloseTo(grau, 9);
    }
  });

  it('mantém o azimute em 0 a 360, aberto no fim, para qualquer yaw', () => {
    for (let yaw = -8; yaw <= 8; yaw += 0.13) {
      const grau = headingFromYaw(yaw);
      expect(grau).toBeGreaterThanOrEqual(0);
      expect(grau).toBeLessThan(360);
    }
  });

  it('leva a posição do passeio de volta ao pixel da planta', () => {
    const t = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
    const partida = startingPoint(deriveApartment(initialApartment(), t));
    const pixel = worldToPlan(partida!, t);
    expect(pixel.u).toBeGreaterThan(52);
    expect(pixel.u).toBeLessThan(395);
    expect(planToWorld(pixel, t).x).toBeCloseTo(partida!.x, 9);
  });
});

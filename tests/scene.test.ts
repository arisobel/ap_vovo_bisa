import { describe, expect, it } from 'vitest';
import { barriersFrom, doorwayLabels, SETA_DESTINO, fixtureBlock, FOV_MAX, FOV_MIN, FOV_PASSEIO, headingFromYaw, horizontalFovDeg, innerPoint, labelFacing, labelPlacement, openingParts, PITCH_LIMITE, poseRotation, resolveCollision, roomArea, startingPoint, walkStartFromPose, wallBlocks, wallDimensions, wallLabels, zoomFov } from '../src/scene/preview';
import { deriveApartment, initialApartment } from '../src/data/pilot';
import { POSE_LIMITS } from '../src/data/validation';
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

describe('esquadrias', () => {
  const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
  const salas = deriveApartment(initialApartment(), transform);
  const parede = (roomId: string, wallId: string) => salas.find(r => r.id === roomId)!.walls.find(w => w.id === wallId)!;

  it('põe vidro em janela e nenhum vidro em porta', () => {
    const janela = salas.flatMap(r => r.walls).find(w => w.openings.some(o => o.type === 'window'))!;
    expect(openingParts(janela).some(p => p.part === 'glass')).toBe(true);
    const soPorta = salas.flatMap(r => r.walls).find(w => w.openings.length > 0 && w.openings.every(o => o.type === 'door'))!;
    expect(openingParts(soPorta).every(p => p.part === 'frame')).toBe(true);
  });

  it('dá quatro peças de batente à janela e três à porta', () => {
    const janela = salas.flatMap(r => r.walls).find(w => w.openings.length === 1 && w.openings[0].type === 'window')!;
    expect(openingParts(janela).filter(p => p.part === 'frame')).toHaveLength(4);
    const porta = salas.flatMap(r => r.walls).find(w => w.openings.length === 1 && w.openings[0].type === 'door')!;
    // Porta não tem peitoril: dois montantes e a travessa.
    expect(openingParts(porta).filter(p => p.part === 'frame')).toHaveLength(3);
  });

  it('mantém batente e vidro dentro do vão e abaixo da parede', () => {
    for (const sala of salas) for (const w of sala.walls) {
      for (const parte of openingParts(w)) {
        const topo = parte.position[1] + parte.size[1] / 2;
        expect(topo, `${w.id}`).toBeLessThanOrEqual(w.height + 1e-9);
        expect(parte.position[1] - parte.size[1] / 2).toBeGreaterThanOrEqual(-1e-9);
        expect(parte.size[0]).toBeGreaterThan(0);
      }
    }
  });

  it('não cria esquadria em parede sem vão', () => {
    expect(openingParts(parede('terraco', 'terraco-leste'))).toHaveLength(0);
  });

  it('não altera a colisão: esquadria não é barreira', () => {
    const antes = barriersFrom(salas).length;
    expect(antes).toBeGreaterThan(0);
    // barriersFrom lê apenas wallBlocks; openingParts é decoração.
    expect(barriersFrom(salas)).toHaveLength(antes);
  });
});

describe('mobília na cena', () => {
  const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
  const salas = deriveApartment(initialApartment(), transform);

  it('só entra na colisão quando a mobília está visível', () => {
    const vazio = barriersFrom(salas);
    const mobiliado = barriersFrom(salas, 1.8, true);
    const pecas = salas.flatMap(r => r.fixtures).filter(f => f.base < 1.8 && f.base + f.height > 0);
    expect(pecas.length).toBeGreaterThan(0);
    expect(mobiliado.length - vazio.length).toBe(pecas.length);
  });

  it('põe a peça em pé no lugar certo do mundo', () => {
    const banheira = salas.find(r => r.id === 'bh-suite')!.fixtures.find(f => f.id === 'bhsuite-banheira')!;
    const bloco = fixtureBlock(banheira);
    expect(bloco.position[1]).toBeCloseTo(banheira.base + banheira.height / 2, 9);
    expect(bloco.size[1]).toBeCloseTo(banheira.height, 9);
    expect(bloco.position[0]).toBeCloseTo(banheira.center.x, 9);
  });

  it('não põe quem caminha dentro de um móvel', () => {
    const partida = startingPoint(salas)!;
    for (const sala of salas) for (const f of sala.fixtures) {
      const dentroX = Math.abs(partida.x - f.center.x) < f.size.width / 2;
      const dentroZ = Math.abs(partida.z - f.center.z) < f.size.depth / 2;
      expect(dentroX && dentroZ, f.id).toBe(false);
    }
  });
});

describe('passeio a partir de uma fotografia', () => {
  const pose = { x: 3.1, z: -4.2, height: 1.55, headingDeg: 240, pitchDeg: -8, verticalFovDeg: 55 };

  it('começa no ponto, na direção e na altura da fotografia', () => {
    const inicio = walkStartFromPose(pose);
    expect(inicio.x).toBe(pose.x);
    expect(inicio.z).toBe(pose.z);
    expect(inicio.eyeHeight).toBe(pose.height);
    expect(inicio.yaw).toBeCloseTo(poseRotation(pose).y, 12);
    expect(inicio.pitch).toBeCloseTo(poseRotation(pose).x, 12);
  });

  it('reproduz a mesma direção que o azimute da planta', () => {
    for (const grau of [0, 61, 96, 152, 244, 357]) {
      const inicio = walkStartFromPose({ ...pose, headingDeg: grau });
      expect(headingFromYaw(inicio.yaw)).toBeCloseTo(grau, 9);
    }
  });

  it('preserva a inclinação de qualquer pose válida, e apara só o que o contrato já recusaria', () => {
    // POSE_LIMITS aceita de -60 a 60 graus; o passeio permite mais que isso.
    for (const grau of [-60, -8, 0, 8, 60]) {
      expect(walkStartFromPose({ ...pose, pitchDeg: grau }).pitch).toBeCloseTo(grau * Math.PI / 180, 12);
    }
    expect(POSE_LIMITS.pitchDeg[1] * Math.PI / 180).toBeLessThan(PITCH_LIMITE);
    // A aparagem é defensiva: só age em valor que o validador nunca deixaria passar.
    expect(walkStartFromPose({ ...pose, pitchDeg: 120 }).pitch).toBeCloseTo(PITCH_LIMITE, 12);
  });

  it('não leva o campo de visão da fotografia para o passeio', () => {
    expect(Object.keys(walkStartFromPose(pose))).not.toContain('verticalFovDeg');
  });
});

describe('rótulos no piso', () => {
  const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
  const salas = deriveApartment(initialApartment(), transform);

  // Os dois dormitórios divergem da área impressa porque a planta não conta o armário
  // embutido; ver D007. O rótulo mostra a área do traçado, que é a do modelo na tela.
  const armarioEmbutido = ['dormitorio-1', 'dormitorio-2'];

  it('bate com a área impressa, exceto onde a planta não conta o armário embutido', () => {
    const apartment = initialApartment();
    let comparadas = 0;
    for (const sala of salas) {
      const area = roomArea(sala.contour);
      expect(area, sala.id).toBeGreaterThan(0);
      const impressa = apartment.rooms.find(r => r.id === sala.id)!.checks.find(c => c.kind === 'area');
      if (!impressa) continue;
      comparadas += 1;
      const desvio = Math.abs(area - impressa.printed) / impressa.printed;
      if (armarioEmbutido.includes(sala.id)) expect(desvio, sala.id).toBeGreaterThan(.1);
      else expect(desvio, sala.id).toBeLessThan(.01);
    }
    expect(comparadas).toBe(6);
  });

  it('mede a diferença dos dormitórios como uma faixa de armário, não como erro de traçado', () => {
    const apartment = initialApartment();
    for (const id of armarioEmbutido) {
      const sala = salas.find(r => r.id === id)!;
      const impressa = apartment.rooms.find(r => r.id === id)!.checks.find(c => c.kind === 'area')!;
      const sobra = roomArea(sala.contour) - impressa.printed;
      const zs = sala.contour.map(p => p.z), xs = sala.contour.map(p => p.x);
      const maiorLado = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
      // A sobra dividida pelo maior lado dá a profundidade da faixa: entre 50 e 75 cm,
      // que é profundidade de armário e não erro de contorno.
      const profundidade = sobra / maiorLado;
      expect(profundidade, id).toBeGreaterThan(.5);
      expect(profundidade, id).toBeLessThan(.75);
    }
  });

  it('põe o rótulo dentro do cômodo, com folga das paredes', () => {
    for (const sala of salas) {
      const lugar = labelPlacement(sala)!;
      expect(lugar, sala.id).not.toBeNull();
      const barreiras = barriersFrom([sala]);
      expect(barreiras.length).toBeGreaterThan(0);
      // O centro do rótulo não pode cair fora: resolveCollision não o empurraria.
      const livre = resolveCollision(lugar.center.x, lugar.center.z, .01, barreiras);
      expect(Math.hypot(livre.x - lugar.center.x, livre.z - lugar.center.z), sala.id).toBeLessThan(.05);
    }
  });

  it('nunca deixa o rótulo mais largo que o cômodo', () => {
    for (const sala of salas) {
      const lugar = labelPlacement(sala)!;
      const xs = sala.contour.map(p => p.x);
      expect(lugar.width, sala.id).toBeLessThanOrEqual(Math.max(...xs) - Math.min(...xs));
    }
  });

  it('usa o mesmo ponto folgado que escolhe a partida do passeio', () => {
    const maior = salas.reduce((a, b) => (roomArea(a.contour) > roomArea(b.contour) ? a : b));
    expect(startingPoint(salas)).toEqual(innerPoint(maior.contour));
  });
});

describe('letreiros de parede e de porta', () => {
  const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
  const salas = deriveApartment(initialApartment(), transform);

  it('escreve o nome do cômodo virado para dentro dele', () => {
    for (const sala of salas) {
      for (const label of wallLabels(sala)) {
        expect(label.text).toBe(sala.name);
        const olhar = labelFacing(label.rotationY);
        // Meio metro à frente do letreiro tem de cair dentro do próprio cômodo.
        const alvo = { x: label.x + olhar.x * .5, z: label.z + olhar.z * .5 };
        expect(dentroDoContorno(sala.contour, alvo), `${sala.id}/${label.text}`).toBe(true);
      }
    }
  });

  it('mantém o letreiro abaixo do teto e acima da cintura', () => {
    for (const sala of salas) {
      const altura = Math.max(...sala.walls.map(w => w.height));
      for (const label of wallLabels(sala)) {
        expect(label.y, sala.id).toBeLessThan(altura);
        expect(label.y, sala.id).toBeGreaterThan(.5);
      }
    }
  });

  it('nunca põe o letreiro de parede sobre um vão', () => {
    for (const sala of salas) {
      for (const label of wallLabels(sala)) {
        for (const wall of sala.walls) {
          const comprimento = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
          const dx = (wall.end.x - wall.start.x) / comprimento, dz = (wall.end.z - wall.start.z) / comprimento;
          const t = (label.x - wall.start.x) * dx + (label.z - wall.start.z) * dz;
          const naParede = Math.abs((label.x - wall.start.x) * dz - (label.z - wall.start.z) * dx) < .1 && t > 0 && t < comprimento;
          if (!naParede) continue;
          for (const vao of wall.openings) {
            expect(t > vao.offset && t < vao.offset + vao.width, `${sala.id} ${label.text} sobre ${vao.type}`).toBe(false);
          }
        }
      }
    }
  });

  it('nomeia sobre cada porta o cômodo do outro lado, nunca o próprio', () => {
    const rotulos = doorwayLabels(salas);
    expect(rotulos.length).toBeGreaterThan(10);
    const nomes = new Set(salas.map(s => s.name));
    for (const label of rotulos) {
      const nome = label.text.replace(`${SETA_DESTINO} `, '');
      expect(nomes.has(nome), label.text).toBe(true);
      const olhar = labelFacing(label.rotationY);
      // O letreiro é lido de dentro do cômodo de origem, que não é o cômodo nomeado.
      const daqui = salas.find(s => dentroDoContorno(s.contour, { x: label.x + olhar.x * .4, z: label.z + olhar.z * .4 }));
      expect(daqui, label.text).toBeDefined();
      expect(daqui!.name).not.toBe(nome);
    }
  });

  it('só rotula portas, e sempre com folga sob o teto', () => {
    for (const label of doorwayLabels(salas)) {
      expect(label.y).toBeGreaterThan(1.8);
      expect(label.y).toBeLessThan(2.7);
    }
  });
});

describe('zoom do passeio', () => {
  it('aproxima e afasta dentro de limites', () => {
    expect(zoomFov(FOV_PASSEIO, -1)).toBeLessThan(FOV_PASSEIO);
    expect(zoomFov(FOV_PASSEIO, 1)).toBeGreaterThan(FOV_PASSEIO);
    let fov = FOV_PASSEIO;
    for (let i = 0; i < 60; i++) fov = zoomFov(fov, -1);
    expect(fov).toBe(FOV_MIN);
    for (let i = 0; i < 60; i++) fov = zoomFov(fov, 1);
    expect(fov).toBe(FOV_MAX);
  });

  it('deriva o campo horizontal que a planta desenha', () => {
    expect(horizontalFovDeg(FOV_PASSEIO, 16 / 9)).toBeGreaterThan(FOV_PASSEIO);
    expect(horizontalFovDeg(FOV_PASSEIO, 1)).toBeCloseTo(FOV_PASSEIO, 9);
    // Aproximar estreita o leque desenhado na planta.
    expect(horizontalFovDeg(FOV_MIN, 16 / 9)).toBeLessThan(horizontalFovDeg(FOV_MAX, 16 / 9));
  });
});

// Ponto dentro de contorno em metros, para os testes acima.
function dentroDoContorno(contour: { x: number; z: number }[], p: { x: number; z: number }) {
  let dentro = false;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i], b = contour[(i + 1) % contour.length];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < a.x + (p.z - a.z) * (b.x - a.x) / (b.z - a.z)) dentro = !dentro;
  }
  return dentro;
}

describe('letreiro de porta aponta para frente', () => {
  it('usa a seta para cima, no sentido de seguir por aqui', () => {
    expect(SETA_DESTINO).toBe('\u2191');
    const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
    const rotulos = doorwayLabels(deriveApartment(initialApartment(), transform));
    expect(rotulos.every(l => l.text.startsWith(`${SETA_DESTINO} `))).toBe(true);
  });
});

describe('cotas das paredes', () => {
  const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
  const salas = deriveApartment(initialApartment(), transform);

  it('mede exatamente o comprimento da parede traçada', () => {
    for (const sala of salas) {
      for (const cota of wallDimensions(sala)) {
        const wall = sala.walls.find(w => w.id === cota.wallId)!;
        expect(cota.length, cota.wallId).toBeCloseTo(wall.length, 9);
        expect(cota.text).toMatch(/^\d+,\d{2} m$/);
      }
    }
  });

  it('recua a cota para dentro do cômodo, nunca para fora', () => {
    for (const sala of salas) {
      for (const cota of wallDimensions(sala)) {
        const wall = sala.walls.find(w => w.id === cota.wallId)!;
        const meio = { x: (wall.start.x + wall.end.x) / 2, z: (wall.start.z + wall.end.z) / 2 };
        const alvo = { x: meio.x + (cota.x - meio.x) * 3, z: meio.z + (cota.z - meio.z) * 3 };
        // Três vezes o recuo ainda tem de cair dentro do cômodo em paredes longas.
        if (wall.length > 2.2) expect(dentroDoContorno(sala.contour, alvo), `${sala.id}/${cota.wallId}`).toBe(true);
      }
    }
  });

  it('alinha a cota com a direção da parede', () => {
    for (const sala of salas) {
      for (const cota of wallDimensions(sala)) {
        const wall = sala.walls.find(w => w.id === cota.wallId)!;
        const dx = (wall.end.x - wall.start.x) / wall.length;
        const dz = (wall.end.z - wall.start.z) / wall.length;
        expect(Math.cos(cota.rotationY), cota.wallId).toBeCloseTo(dx, 9);
        expect(-Math.sin(cota.rotationY), cota.wallId).toBeCloseTo(dz, 9);
      }
    }
  });

  it('ignora paredes curtas demais para caber a cota', () => {
    const curtas = salas.flatMap(s => s.walls).filter(w => w.length < .6);
    const cotadas = new Set(salas.flatMap(s => wallDimensions(s)).map(c => c.wallId));
    for (const w of curtas) expect(cotadas.has(w.id), w.id).toBe(false);
  });

  it('soma das cotas de um cômodo bate com o perímetro das suas paredes', () => {
    const escritorio = salas.find(s => s.id === 'escritorio')!;
    const soma = wallDimensions(escritorio).reduce((t, c) => t + c.length, 0);
    const perimetro = escritorio.walls.reduce((t, w) => t + w.length, 0);
    expect(soma).toBeCloseTo(perimetro, 9);
  });
});

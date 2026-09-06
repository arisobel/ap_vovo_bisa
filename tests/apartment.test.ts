import { describe, expect, it } from 'vitest';
import { checkDeviation, checkTolerance, deriveApartment, deriveRoom, findRoom, initialApartment, validateApartment, wallPieces } from '../src/data/pilot';
import { calibrate } from '../src/plan/spatial';

// Escala proposta pela cota 9,12 m da fachada sul do living. Não é medida conferida em campo.
const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });

describe('estrutura traçada sobre a planta', () => {
  it('valida a base e traz os cômodos já traçados', () => {
    const apartment = initialApartment();
    expect(apartment.rooms).toHaveLength(16);
    expect(apartment.rooms.filter(r => r.verification === 'sem-cota').map(r => r.id)).toEqual(['bh-servico', 'lavabo', 'hall-social', 'corredor-norte', 'corredor-sul']);
    expect(apartment.rooms.every(r => r.status === 'proposto')).toBe(true);
    expect(apartment.parameters.wallHeight).toMatchObject({ value: 2.7, status: 'confirmado' });
    // Só o pé-direito foi confirmado; nada mais pode se apresentar como medido sem revisão humana registrada.
    expect(Object.entries(apartment.parameters).filter(([, p]) => p.status === 'confirmado').map(([k]) => k)).toEqual(['wallHeight']);
  });

  it('mantém cada conferência impressa dentro da tolerância da sua confiança', () => {
    for (const room of initialApartment().rooms) {
      for (const check of room.checks) {
        const { deviationPercent } = checkDeviation(check, transform);
        expect(Math.abs(deviationPercent), `${room.id}/${check.id} desviou ${deviationPercent.toFixed(2)}%`).toBeLessThan(checkTolerance[check.confidence]);
      }
    }
  });

  it('só dispensa conferência quem declara não ter cota impressa', () => {
    for (const room of initialApartment().rooms) {
      expect(room.checks.length > 0, room.id).toBe(room.verification === 'cota-impressa');
    }
  });

  it('recorta os vãos das paredes do escritório', () => {
    const apartment = initialApartment();
    const derived = deriveRoom(findRoom(apartment, 'escritorio'), apartment.parameters, transform);
    const leste = derived.walls.find(w => w.id === 'escritorio-leste')!;
    expect(leste.length).toBeCloseTo(159 * transform.metersPerPixel, 6);
    // Janela no meio da parede: trecho antes, peitoril, verga e trecho depois.
    expect(leste.pieces).toHaveLength(4);
    expect(derived.walls.find(w => w.id === 'escritorio-norte')!.pieces).toHaveLength(1);
  });

  it('registra o mesmo vão físico com a mesma largura nos dois cômodos que ele liga', () => {
    const apartment = initialApartment();
    const pares = [
      ['living', 'door-almoco', 'almoco', 'porta-almoco-living'],
      ['cozinha', 'porta-cozinha-almoco', 'almoco', 'porta-almoco-cozinha'],
      ['cozinha', 'porta-cozinha-norte', 'area-servico', 'porta-servico-cozinha'],
      ['dormitorio-1', 'porta-dorm1-oeste', 'bh-suite', 'porta-bh-suite'],
      ['dormitorio-empregada', 'porta-dormemp', 'area-servico', 'porta-servico-dormemp'],
      ['bh-servico', 'porta-bh-servico', 'area-servico', 'porta-servico-bh'],
      ['living', 'door-terrace', 'terraco', 'porta-terraco'],
      ['dormitorio-1', 'porta-dorm1-sul', 'corredor-norte', 'passagem-cornorte-dorm1'],
      ['dormitorio-2', 'porta-dorm2', 'corredor-norte', 'passagem-cornorte-dorm2'],
      ['bh-social', 'porta-bh-social', 'corredor-norte', 'passagem-cornorte-bh'],
      ['corredor-norte', 'passagem-corredores', 'corredor-sul', 'passagem-corsul-corredores'],
      ['escritorio', 'porta-escritorio', 'corredor-sul', 'passagem-corsul-escritorio'],
      ['hall-social', 'porta-hall', 'corredor-sul', 'passagem-corsul-hall'],
      ['cozinha', 'porta-cozinha-leste', 'corredor-sul', 'passagem-corsul-cozinha'],
      ['lavabo', 'porta-lavabo', 'corredor-sul', 'passagem-corsul-lavabo'],
    ];
    for (const [roomA, openingA, roomB, openingB] of pares) {
      const a = findRoom(apartment, roomA).openings.find(o => o.id === openingA)!;
      const b = findRoom(apartment, roomB).openings.find(o => o.id === openingB)!;
      expect(a.widthPixels, `${openingA} x ${openingB}`).toBe(b.widthPixels);
    }
  });

  // Com o apartamento inteiro traçado, dois cômodos ocuparem o mesmo pixel passa a ser erro de traçado.
  it('não deixa dois cômodos se sobreporem', () => {
    const rooms = initialApartment().rooms;
    const caixa = (c: { u: number; v: number }[]) => ({
      u0: Math.min(...c.map(p => p.u)), u1: Math.max(...c.map(p => p.u)),
      v0: Math.min(...c.map(p => p.v)), v1: Math.max(...c.map(p => p.v)),
    });
    const dentro = (c: { u: number; v: number }[], u: number, v: number) => {
      let inside = false;
      for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
        if ((c[i].v > v) !== (c[j].v > v) && u < (c[j].u - c[i].u) * (v - c[i].v) / (c[j].v - c[i].v) + c[i].u) inside = !inside;
      }
      return inside;
    };
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = caixa(rooms[i].contour), b = caixa(rooms[j].contour);
        const u0 = Math.max(a.u0, b.u0), u1 = Math.min(a.u1, b.u1);
        const v0 = Math.max(a.v0, b.v0), v1 = Math.min(a.v1, b.v1);
        for (let u = u0 + .5; u < u1; u++) for (let v = v0 + .5; v < v1; v++) {
          if (dentro(rooms[i].contour, u, v) && dentro(rooms[j].contour, u, v)) {
            throw new Error(`${rooms[i].id} e ${rooms[j].id} ocupam o mesmo ponto (${u}; ${v}).`);
          }
        }
      }
    }
  });

  it('deriva os cômodos e preserva o L do dormitório 1', () => {
    const apartment = initialApartment();
    const derived = deriveApartment(apartment, transform);
    expect(derived).toHaveLength(16);
    const dorm = derived.find(r => r.id === 'dormitorio-1')!;
    expect(dorm.contour).toHaveLength(8);
    expect(dorm.walls).toHaveLength(8);
    expect(dorm.walls.flatMap(w => w.openings)).toHaveLength(3);
  });

  it.each([
    ['versão desconhecida', (a: any) => { a.schemaVersion = 3; }],
    ['cômodo duplicado', (a: any) => { a.rooms.push(structuredClone(a.rooms[1])); }],
    ['contorno em sentido anti-horário', (a: any) => { a.rooms[1].contour.reverse(); }],
    ['aresta diagonal', (a: any) => { a.rooms[1].contour[1].v += 3; }],
    ['ponto fora da planta', (a: any) => { a.rooms[1].contour[1].u = 9000; }],
    ['parede em aresta inexistente', (a: any) => { a.rooms[1].walls[0].edge = 9; }],
    ['abertura maior que a parede', (a: any) => { a.rooms[1].openings[0].widthPixels = 400; }],
    ['abertura em parede desconhecida', (a: any) => { a.rooms[1].openings[0].wallId = 'nao-existe'; }],
    ['janela sem peitoril declarado', (a: any) => { a.rooms[1].openings[0].base = 0; }],
    ['cômodo sem conferência', (a: any) => { a.rooms[1].checks = []; }],
    ['conferência em cômodo sem cota', (a: any) => { a.rooms[10].checks = [structuredClone(a.rooms[1].checks[0])]; }],
    ['confiança desconhecida', (a: any) => { a.rooms[1].checks[0].confidence = 'altissima'; }],
    ['verificação desconhecida', (a: any) => { a.rooms[1].verification = 'chute'; }],
    ['conferência sem evidência', (a: any) => { a.rooms[1].checks[0].evidence = ''; }],
    ['parâmetro fora de faixa', (a: any) => { a.parameters.wallHeight.value = 40; }],
    ['parâmetro apresentado como medido', (a: any) => { a.parameters.wallHeight.status = 'medido'; }],
  ])('rejeita %s sem alterar a base carregada', (_label, mutate) => {
    const current = initialApartment();
    const before = JSON.stringify(current);
    const invalid = structuredClone(current) as any;
    mutate(invalid);
    expect(() => validateApartment(invalid)).toThrow();
    expect(JSON.stringify(initialApartment())).toBe(before);
  });

  it('rejeita aberturas sobrepostas na mesma parede', () => {
    const apartment = structuredClone(initialApartment()) as any;
    const sul = apartment.rooms[0].openings.find((o: any) => o.wallId === 'living-south');
    sul.offsetPixels = 260;
    expect(() => validateApartment(apartment)).toThrow(/sobrepostas/);
  });
});

describe('recorte métrico de vãos', () => {
  it('divide a parede em trechos cheios, peitoril e verga', () => {
    const pieces = wallPieces(4, 2.7, [{ offset: 1, width: 1.2, base: .9, height: 1.2 }]);
    expect(pieces.map(p => [p.start, p.end, p.base])).toEqual([[0, 1, 0], [1, 2.2, 0], [1, 2.2, 2.1], [2.2, 4, 0]]);
    expect(pieces.map(p => p.height)).toEqual([2.7, .9, expect.closeTo(.6, 9), 2.7]);
  });
  it('rejeita vão que não cabe na parede', () => {
    expect(() => wallPieces(2, 2.7, [{ offset: 1.5, width: 1, base: 0, height: 2.1 }])).toThrow();
  });
});

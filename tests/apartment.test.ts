import { describe, expect, it } from 'vitest';
import { checkDeviation, deriveApartment, deriveRoom, findRoom, initialApartment, validateApartment, wallPieces } from '../src/data/pilot';
import { calibrate } from '../src/plan/spatial';

// Escala proposta pela cota 9,12 m da fachada sul do living. Não é medida conferida em campo.
const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });

describe('estrutura traçada sobre a planta', () => {
  it('valida a base e traz os cômodos já traçados', () => {
    const apartment = initialApartment();
    expect(apartment.rooms.map(r => r.id)).toEqual(['living', 'escritorio', 'dormitorio-1']);
    expect(apartment.rooms.every(r => r.status === 'proposto')).toBe(true);
    expect(Object.values(apartment.parameters).every(p => p.status === 'estimado')).toBe(true);
  });

  it('mantém cada conferência impressa dentro de 1,5% na escala proposta', () => {
    for (const room of initialApartment().rooms) {
      for (const check of room.checks) {
        const { deviationPercent } = checkDeviation(check, transform);
        expect(Math.abs(deviationPercent), `${room.id}/${check.id} desviou ${deviationPercent.toFixed(2)}%`).toBeLessThan(1.5);
      }
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

  it('deriva os três cômodos e preserva o L do dormitório 1', () => {
    const apartment = initialApartment();
    const derived = deriveApartment(apartment, transform);
    expect(derived).toHaveLength(3);
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

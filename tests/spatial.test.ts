import { describe, expect, it } from 'vitest';
import { azimuthBetween, calibrate, compareMeasurement, fovWedge, headingDirection, planToWorld, worldToPlan } from '../src/plan/spatial';
import { MIN_HEADING_PIXELS, routePlanClick } from '../src/plan/planmode';

describe('regras espaciais', () => {
  it('calibra em metros e preserva ida/volta com origem deslocada', () => {
    const t = calibrate({ points: [{ u: 30, v: 50 }, { u: 330, v: 450 }], distanceMeters: 10 });
    expect(t.metersPerPixel).toBe(.02);
    expect(planToWorld({ u: 80, v: 150 }, t)).toEqual({ x: 1, z: 2 });
    for (const p of [{ u: 0, v: 0 }, { u: 506, v: 854 }, { u: 197.12, v: 348.56 }]) {
      const roundtrip = worldToPlan(planToWorld(p, t), t);
      expect(roundtrip.u).toBeCloseTo(p.u, 10);
      expect(roundtrip.v).toBeCloseTo(p.v, 10);
    }
  });
  it('compara uma cota perpendicular sem deformar os eixos', () => {
    const t = calibrate({ points: [{ u: 0, v: 0 }, { u: 100, v: 0 }], distanceMeters: 2 });
    const result = compareMeasurement({ points: [{ u: 20, v: 10 }, { u: 20, v: 120 }], distanceMeters: 2 }, t);
    expect(result.measuredMeters).toBeCloseTo(2.2);
    expect(result.deviationPercent).toBeCloseTo(10);
    expect(t.metersPerPixel).toBe(.02);
  });
  it.each([0, -1, NaN, Infinity])('rejeita distância inválida: %s', distanceMeters => {
    expect(() => calibrate({ points: [{ u: 0, v: 0 }, { u: 10, v: 0 }], distanceMeters })).toThrow();
  });
  it('rejeita pontos coincidentes', () => {
    expect(() => calibrate({ points: [{ u: 2, v: 2 }, { u: 2, v: 2 }], distanceMeters: 3 })).toThrow();
  });
  it.each([[0, 0, -1], [90, 1, 0], [180, 0, 1], [270, -1, 0]])('azimute %s', (a, x, z) => {
    expect(headingDirection(a).x).toBeCloseTo(x);
    expect(headingDirection(a).z).toBeCloseTo(z);
  });
});

describe('modo da planta', () => {
  const A = { u: 200, v: 400 };

  it('mede a cota apenas quando nenhuma foto está sendo marcada', () => {
    expect(routePlanClick('idle', null, A)).toEqual({ target: 'calibration', point: A });
    expect(routePlanClick('idle', { u: 10, v: 10 }, A)).toEqual({ target: 'calibration', point: A });
  });

  it('não deixa o clique da foto virar ponto de cota', () => {
    expect(routePlanClick('point', null, A).target).toBe('pose-point');
    expect(routePlanClick('heading', { u: 200, v: 500 }, A).target).toBe('pose-heading');
  });

  it('lê a direção pela mesma convenção de azimute das paredes', () => {
    const cases: [number, number, number][] = [[200, 300, 0], [300, 400, 90], [200, 500, 180], [100, 400, 270]];
    for (const [u, v, esperado] of cases) {
      const acao = routePlanClick('heading', A, { u, v });
      expect(acao.target === 'pose-heading' && acao.headingDeg).toBeCloseTo(esperado, 9);
      expect(azimuthBetween(A, { u, v })).toBeCloseTo(esperado, 9);
    }
  });

  it('não volta sozinha a medir cota depois de marcar', () => {
    const acao = routePlanClick('done', A, { u: 10, v: 10 });
    expect(acao.target).toBe('ignored');
    expect(acao.target === 'ignored' && acao.reason).toMatch(/Refazer ponto e direção/);
  });

  it('recusa direção sem ponto e cliques colados no ponto', () => {
    expect(routePlanClick('heading', null, A).target).toBe('ignored');
    expect(routePlanClick('heading', A, { u: A.u + 3, v: A.v + 3 }).target).toBe('ignored');
    expect(routePlanClick('heading', A, { u: A.u + MIN_HEADING_PIXELS, v: A.v }).target).toBe('pose-heading');
  });

  it('mantém o azimute dentro de 0 a 360, aberto no fim', () => {
    for (let u = -300; u <= 300; u += 7) for (let v = -300; v <= 300; v += 7) {
      if (u === 0 && v === 0) continue;
      const grau = azimuthBetween(A, { u: A.u + u, v: A.v + v });
      expect(grau).toBeGreaterThanOrEqual(0);
      expect(grau).toBeLessThan(360);
    }
  });
});

describe('setor de visão', () => {
  const origem = { u: 200, v: 400 };

  it('sai do ponto da câmera e mantém todo o arco no mesmo raio', () => {
    const setor = fovWedge(origem, 90, 60, 50);
    expect(setor[0]).toEqual(origem);
    for (const p of setor.slice(1)) expect(Math.hypot(p.u - origem.u, p.v - origem.v)).toBeCloseTo(50, 9);
  });

  it('centra o setor no azimute e abre o campo declarado', () => {
    const setor = fovWedge(origem, 90, 60, 50, 2).slice(1);
    expect(azimuthBetween(origem, setor[1])).toBeCloseTo(90, 9);
    expect(azimuthBetween(origem, setor[0])).toBeCloseTo(60, 9);
    expect(azimuthBetween(origem, setor[2])).toBeCloseTo(120, 9);
  });

  it('atravessa o norte sem furo no arco', () => {
    const setor = fovWedge(origem, 0, 80, 40, 8).slice(1);
    for (let i = 1; i < setor.length; i++) {
      expect(Math.hypot(setor[i].u - setor[i - 1].u, setor[i].v - setor[i - 1].v)).toBeLessThan(12);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { calibrate, compareMeasurement, headingDirection, planToWorld, worldToPlan } from '../src/plan/spatial';

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

import { describe, expect, it } from 'vitest';
import { initialProject, parseProject, validateProject } from '../src/data/validation';
import { calibrate } from '../src/plan/spatial';

describe('contrato portátil F0', () => {
  it('preserva as 11 fotos pendentes e a planta em exportação/importação', () => {
    const project = initialProject();
    expect(project.photos).toHaveLength(11);
    expect(project.photos.every(p => p.pose === null && p.roomId === null)).toBe(true);
    expect(parseProject(JSON.stringify(project))).toEqual(project);
  });
  it('reimporta calibração, conferência e observações sem perder precisão', () => {
    const project = initialProject();
    const reference = { points: [{ u: 20, v: 30 }, { u: 220, v: 30 }] as [{ u: number; v: number }, { u: number; v: number }], distanceMeters: 3.7 };
    project.calibration = { reference, transform: calibrate(reference), check: { points: [{ u: 40, v: 40 }, { u: 40, v: 240 }], distanceMeters: 3.8 }, status: 'proposto' };
    project.photos[0].observations = 'Revisar a janela; ambiente ainda desconhecido.';
    expect(parseProject(JSON.stringify(project))).toEqual(project);
  });
  it.each([
    (p: any) => { p.schemaVersion = 2; },
    (p: any) => { p.units = 'cm'; },
    (p: any) => { p.photos.pop(); },
    (p: any) => { p.photos[0] = p.photos[1]; },
    (p: any) => { p.photos[0].path = 'https://example.org/image.png'; },
    (p: any) => { p.photos[0].pose = { x: 0 }; },
    (p: any) => { p.photos[0].roomId = 'dormit-1'; },
    (p: any) => { p.plan.width = 1; },
    (p: any) => { delete p.calibration; },
  ])('rejeita alteração incompatível e mantém o estado válido', mutate => {
    const current = initialProject();
    const before = JSON.stringify(current);
    const invalid = structuredClone(current); mutate(invalid);
    expect(() => validateProject(invalid)).toThrow();
    expect(JSON.stringify(current)).toBe(before);
  });
  it('rejeita escala adulterada e coordenadas fora da planta', () => {
    const project = initialProject();
    project.calibration = { reference: { points: [{ u: 0, v: 0 }, { u: 100, v: 0 }], distanceMeters: 2 }, transform: { origin: { u: 0, v: 0 }, metersPerPixel: .04 }, check: null, status: 'proposto' };
    expect(() => validateProject(project)).toThrow(/inconsistente/);
    project.calibration.reference.points[1].u = 99999;
    expect(() => validateProject(project)).toThrow(/fora da planta/);
  });
  it('rejeita sintaxe inválida, nulos e arquivo excessivo', () => {
    for (const text of ['{', 'null', '[]', ' '.repeat(1_000_001)]) expect(() => parseProject(text)).toThrow();
  });
});

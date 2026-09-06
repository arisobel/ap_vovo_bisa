import original from './project.json';
import { calibrate, type Measurement, type Transform } from '../plan/spatial';

export type Reference = {
  id: string; path: string; originalPath: string; width: number; height: number;
  kind: 'photo' | 'plan'; source: 'original'; roomId: null; pose: null;
  status: 'pendente'; observations: string;
};
export type Calibration = {
  reference: Measurement; check: Measurement | null; transform: Transform; status: 'proposto';
};
export type Project = {
  schemaVersion: 1; units: 'm'; planId: string; plan: Reference;
  calibration: Calibration | null; photos: Reference[];
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Objeto JSON esperado.');
  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Coordenada ou medida inválida.');
  return value;
}
function point(value: unknown) {
  const p = object(value);
  const u = number(p.u), v = number(p.v);
  if (u < 0 || v < 0 || u > original.plan.width || v > original.plan.height) throw new Error('Ponto fora da planta.');
  return { u, v };
}
function measurement(value: unknown): Measurement {
  const m = object(value);
  if (!Array.isArray(m.points) || m.points.length !== 2) throw new Error('A medida exige dois pontos.');
  const result: Measurement = { points: [point(m.points[0]), point(m.points[1])], distanceMeters: number(m.distanceMeters) };
  calibrate(result);
  return result;
}
function reference(value: unknown, expected: typeof original.plan): Reference {
  const r = object(value);
  for (const key of ['id', 'path', 'originalPath', 'width', 'height', 'kind', 'source'] as const) {
    if (r[key] !== expected[key]) throw new Error(`Referência ausente ou incompatível: ${expected.id} (${key}).`);
  }
  if (r.roomId !== null || r.pose !== null || r.status !== 'pendente') throw new Error('Na F0, associações e poses devem permanecer null/pendente.');
  if (typeof r.observations !== 'string' || r.observations.length > 5000) throw new Error('Observação inválida (máximo 5.000 caracteres).');
  return { ...expected, observations: r.observations } as Reference;
}

// Valida tudo antes de retornar um novo estado: nenhuma mutação parcial.
export function validateProject(value: unknown): Project {
  const p = object(value);
  if (p.schemaVersion !== 1 || p.units !== 'm' || p.planId !== original.planId) throw new Error('Versão, unidade ou planta incompatível com este projeto.');
  if (!Array.isArray(p.photos) || p.photos.length !== original.photos.length) throw new Error('O inventário deve conter as 11 fotografias originais.');
  const photos = original.photos.map(expected => {
    const matches = (p.photos as unknown[]).filter(item => object(item).id === expected.id);
    if (matches.length !== 1) throw new Error(`Foto ausente ou duplicada: ${expected.id}.`);
    return reference(matches[0], expected);
  });
  let calibration: Calibration | null = null;
  if (p.calibration !== null) {
    const c = object(p.calibration);
    if (c.status !== 'proposto') throw new Error('A calibração F0 deve ter estado proposto.');
    const ref = measurement(c.reference);
    const transform = calibrate(ref);
    const supplied = object(c.transform);
    const origin = point(supplied.origin);
    if (origin.u !== transform.origin.u || origin.v !== transform.origin.v || Math.abs(number(supplied.metersPerPixel) - transform.metersPerPixel) > 1e-12) throw new Error('Transformação inconsistente com a medida de referência.');
    calibration = { reference: ref, check: c.check === null ? null : measurement(c.check), transform, status: 'proposto' };
  }
  return { schemaVersion: 1, units: 'm', planId: original.planId, plan: reference(p.plan, original.plan), photos, calibration };
}

export function initialProject(): Project { return validateProject(original); }
export function parseProject(text: string): Project {
  if (text.length > 1_000_000) throw new Error('JSON muito grande (limite: 1 MB).');
  return validateProject(JSON.parse(text.replace(/^\uFEFF/, '')));
}

import original from './project.json';
import { containsPoint, initialApartment, type Room } from './pilot';
import { calibrate, type Measurement, type Transform } from '../plan/spatial';

export type Confidence = 'baixa' | 'media' | 'alta';
export type PhotoStatus = 'pendente' | 'proposto' | 'confirmado';
// A pose é guardada em pixels da planta, não em metros: assim ela sobrevive a uma recalibração.
// O mundo é derivado depois, pela mesma transformação que levanta as paredes.
export type Pose = {
  u: number; v: number;
  cameraHeight: number; headingDeg: number; pitchDeg: number; verticalFovDeg: number;
  confidence: Confidence; evidence: string;
};
export type Reference = {
  id: string; path: string; originalPath: string; width: number; height: number;
  kind: 'photo' | 'plan'; source: 'original'; roomId: string | null; pose: Pose | null;
  status: PhotoStatus; observations: string;
};
export type Calibration = {
  reference: Measurement; check: Measurement | null; transform: Transform; status: 'proposto';
};
export type Project = {
  schemaVersion: 2; units: 'm'; planId: string; plan: Reference;
  calibration: Calibration | null; photos: Reference[];
};

export const POSE_LIMITS = {
  cameraHeight: [0.3, 2.5], headingDeg: [0, 360], pitchDeg: [-60, 60], verticalFovDeg: [20, 100],
} as const;
export const confidences: Confidence[] = ['baixa', 'media', 'alta'];

const rooms: Room[] = initialApartment().rooms;
export const roomOptions = rooms.map(r => ({ id: r.id, name: r.name }));

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Objeto JSON esperado.');
  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Coordenada ou medida inválida.');
  return value;
}
function ranged(value: unknown, [min, max]: readonly [number, number], label: string): number {
  const n = number(value);
  if (n < min || n > max) throw new Error(`${label} fora da faixa aceita (${min} a ${max}).`);
  return n;
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

// A pose só é aceita dentro do cômodo que a foto declara. Sem cômodo não há pose.
function pose(value: unknown, roomId: string | null): Pose {
  const p = object(value);
  if (!roomId) throw new Error('Uma pose exige o ambiente associado; informe roomId antes do ponto.');
  const room = rooms.find(r => r.id === roomId);
  if (!room) throw new Error(`Ambiente desconhecido: ${roomId}.`);
  const { u, v } = point(p);
  if (!containsPoint(room.contour, { u, v })) throw new Error(`O ponto da foto está fora do contorno de ${room.name}.`);
  const heading = ranged(p.headingDeg, POSE_LIMITS.headingDeg, 'Azimute');
  if (heading >= 360) throw new Error('Azimute deve ser menor que 360 graus.');
  if (typeof p.evidence !== 'string' || !p.evidence.trim() || p.evidence.length > 5000) throw new Error('Toda pose precisa de evidência escrita (até 5.000 caracteres).');
  if (!confidences.includes(p.confidence as Confidence)) throw new Error('Confiança deve ser baixa, media ou alta.');
  return {
    u, v,
    cameraHeight: ranged(p.cameraHeight, POSE_LIMITS.cameraHeight, 'Altura da câmera'),
    headingDeg: heading,
    pitchDeg: ranged(p.pitchDeg, POSE_LIMITS.pitchDeg, 'Inclinação'),
    verticalFovDeg: ranged(p.verticalFovDeg, POSE_LIMITS.verticalFovDeg, 'Campo de visão vertical'),
    confidence: p.confidence as Confidence,
    evidence: p.evidence,
  };
}

// Só a identidade da referência é imutável; ambiente, pose e estado vêm do arquivo lido.
type Identity = Pick<Reference, 'id' | 'path' | 'originalPath' | 'width' | 'height' | 'kind' | 'source'>;

function reference(value: unknown, expected: Identity, allowPose: boolean): Reference {
  const r = object(value);
  for (const key of ['id', 'path', 'originalPath', 'width', 'height', 'kind', 'source'] as const) {
    if (r[key] !== expected[key]) throw new Error(`Referência ausente ou incompatível: ${expected.id} (${key}).`);
  }
  if (typeof r.observations !== 'string' || r.observations.length > 5000) throw new Error('Observação inválida (máximo 5.000 caracteres).');
  const base = { ...expected, observations: r.observations };
  if (!allowPose) {
    if (r.roomId !== null || r.pose !== null || r.status !== 'pendente') throw new Error('A planta não recebe ambiente, pose ou estado diferente de pendente.');
    return { ...base, roomId: null, pose: null, status: 'pendente' };
  }
  const roomId = r.roomId === null || r.roomId === undefined ? null : String(r.roomId);
  if (roomId !== null && !rooms.some(room => room.id === roomId)) throw new Error(`Ambiente desconhecido: ${roomId}.`);
  const status = r.status as PhotoStatus;
  if (status !== 'pendente' && status !== 'proposto' && status !== 'confirmado') throw new Error('Estado da foto deve ser pendente, proposto ou confirmado.');
  const posed = r.pose === null || r.pose === undefined ? null : pose(r.pose, roomId);
  if (status === 'pendente' && posed) throw new Error('Foto pendente não pode carregar pose; use proposto ou confirmado.');
  if (status !== 'pendente' && !posed) throw new Error('Só uma foto com pose pode ser proposta ou confirmada.');
  return { ...base, roomId, pose: posed, status };
}

// Valida tudo antes de retornar um novo estado: nenhuma mutação parcial.
export function validateProject(value: unknown): Project {
  const p = object(value);
  if (p.units !== 'm' || p.planId !== original.planId) throw new Error('Unidade ou planta incompatível com este projeto.');
  if (p.schemaVersion !== 1 && p.schemaVersion !== 2) throw new Error('Versão de schema desconhecida.');
  // Arquivo da F0 continua sendo aceito: ele simplesmente não tem pose nenhuma.
  const herdado = p.schemaVersion === 1;
  if (!Array.isArray(p.photos) || p.photos.length !== original.photos.length) throw new Error('O inventário deve conter as 11 fotografias originais.');
  const photos = original.photos.map(expected => {
    const matches = (p.photos as unknown[]).filter(item => object(item).id === expected.id);
    if (matches.length !== 1) throw new Error(`Foto ausente ou duplicada: ${expected.id}.`);
    return reference(matches[0], expected as Identity, !herdado);
  });
  let calibration: Calibration | null = null;
  if (p.calibration !== null && p.calibration !== undefined) {
    const c = object(p.calibration);
    if (c.status !== 'proposto') throw new Error('A calibração deve ter estado proposto.');
    const ref = measurement(c.reference);
    const transform = calibrate(ref);
    const supplied = object(c.transform);
    const origin = point(supplied.origin);
    if (origin.u !== transform.origin.u || origin.v !== transform.origin.v || Math.abs(number(supplied.metersPerPixel) - transform.metersPerPixel) > 1e-12) throw new Error('Transformação inconsistente com a medida de referência.');
    calibration = { reference: ref, check: c.check === null || c.check === undefined ? null : measurement(c.check), transform, status: 'proposto' };
  } else if (!('calibration' in p)) throw new Error('Campo de calibração ausente.');
  return { schemaVersion: 2, units: 'm', planId: original.planId, plan: reference(p.plan, original.plan as Identity, false), photos, calibration };
}

export function initialProject(): Project { return validateProject(original); }
export function parseProject(text: string): Project {
  if (text.length > 1_000_000) throw new Error('JSON muito grande (limite: 1 MB).');
  return validateProject(JSON.parse(text.replace(/^﻿/, '')));
}

// Mundo em metros a partir da pose em pixels, usando a mesma transformação das paredes.
export function poseToWorld(p: Pose, transform: Transform) {
  return {
    x: (p.u - transform.origin.u) * transform.metersPerPixel,
    z: (p.v - transform.origin.v) * transform.metersPerPixel,
    height: p.cameraHeight,
    headingDeg: p.headingDeg,
    pitchDeg: p.pitchDeg,
    verticalFovDeg: p.verticalFovDeg,
  };
}

// Campo de visão horizontal derivado do vertical pela proporção da foto, conforme o PRD.
export function horizontalFov(verticalFovDeg: number, aspect: number): number {
  return 2 * Math.atan(Math.tan(verticalFovDeg * Math.PI / 180 / 2) * aspect) * 180 / Math.PI;
}

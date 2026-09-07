export type Point = { u: number; v: number };
export type Transform = { origin: Point; metersPerPixel: number };
export type Measurement = { points: [Point, Point]; distanceMeters: number };

export function pixelDistance(a: Point, b: Point): number {
  return Math.hypot(b.u - a.u, b.v - a.v);
}

export function calibrate(measurement: Measurement): Transform {
  const { points: [a, b], distanceMeters } = measurement;
  const pixels = pixelDistance(a, b);
  if (![a.u, a.v, b.u, b.v, distanceMeters, pixels].every(Number.isFinite) || pixels < 1 || distanceMeters <= 0) {
    throw new Error('Informe uma distância positiva e dois pontos separados por pelo menos 1 pixel.');
  }
  return { origin: { ...a }, metersPerPixel: distanceMeters / pixels };
}

export function planToWorld(p: Point, t: Transform) {
  return { x: (p.u - t.origin.u) * t.metersPerPixel, z: (p.v - t.origin.v) * t.metersPerPixel };
}

export function worldToPlan(p: { x: number; z: number }, t: Transform): Point {
  return { u: p.x / t.metersPerPixel + t.origin.u, v: p.z / t.metersPerPixel + t.origin.v };
}

export function compareMeasurement(m: Measurement, t: Transform) {
  const measuredMeters = pixelDistance(...m.points) * t.metersPerPixel;
  const deviationMeters = measuredMeters - m.distanceMeters;
  return { measuredMeters, deviationMeters, deviationPercent: deviationMeters / m.distanceMeters * 100 };
}

export function headingDirection(degrees: number) {
  const a = degrees * Math.PI / 180;
  return { x: Math.sin(a), y: 0, z: -Math.cos(a) };
}

// Azimute de um ponto para outro na convenção da planta: 0 = topo (-v), 90 = direita (+u).
export function azimuthBetween(from: Point, to: Point): number {
  return (Math.atan2(to.u - from.u, from.v - to.v) * 180 / Math.PI + 360) % 360;
}

import { azimuthBetween, pixelDistance, type Point } from './spatial';

export type PosePick = 'idle' | 'point' | 'heading';
export type PlanClick =
  | { target: 'calibration'; point: Point }
  | { target: 'pose-point'; point: Point }
  | { target: 'pose-heading'; headingDeg: number }
  | { target: 'ignored'; reason: string };

// Distância mínima entre o ponto da câmera e o clique de direção: dois cliques quase no mesmo
// lugar não definem azimute nenhum, apenas ruído do mouse.
export const MIN_HEADING_PIXELS = 8;

// Um clique na planta serve a uma tarefa só. Enquanto a marcação de foto está ativa nenhum clique
// chega à medição de cotas, e fora dela nenhum clique mexe na pose: era essa mistura que
// embaralhava os pontos A e B com o ponto da câmera.
export function routePlanClick(pick: PosePick, draft: Point | null, point: Point): PlanClick {
  if (pick === 'point') return { target: 'pose-point', point };
  if (pick === 'heading') {
    if (!draft) return { target: 'ignored', reason: 'Marque primeiro o ponto onde a câmera estava.' };
    if (pixelDistance(draft, point) < MIN_HEADING_PIXELS) return { target: 'ignored', reason: 'Clique mais longe do ponto da câmera para definir a direção.' };
    return { target: 'pose-heading', headingDeg: azimuthBetween(draft, point) };
  }
  return { target: 'calibration', point };
}

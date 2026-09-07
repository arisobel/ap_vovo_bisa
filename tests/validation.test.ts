import { describe, expect, it } from 'vitest';
import { horizontalFov, initialProject, parseProject, poseToWorld, roomOptions, validateProject, type Pose } from '../src/data/validation';
import { calibrate } from '../src/plan/spatial';

const transform = calibrate({ points: [{ u: 52, v: 761 }, { u: 395, v: 761 }], distanceMeters: 9.12 });
// Ponto dentro do LIVING, olhando para o norte da planta.
const poseLiving: Pose = {
  u: 300, v: 700, cameraHeight: 1.55, headingDeg: 0, pitchDeg: -3, verticalFovDeg: 55,
  confidence: 'baixa', evidence: 'Marcação inicial para teste; nada conferido em campo.',
};

// O arquivo do repositório carrega o trabalho real do usuário e muda a cada marcação.
// Os testes de regra usam uma cópia sem poses, para não depender desse estado.
function semPoses() {
  const project = initialProject();
  project.photos.forEach(photo => { photo.roomId = null; photo.pose = null; photo.status = 'pendente'; });
  return validateProject(project);
}

describe('contrato portátil', () => {
  it('reimporta o arquivo do repositório sem perder nada', () => {
    const project = initialProject();
    expect(project.schemaVersion).toBe(2);
    expect(project.photos).toHaveLength(11);
    expect(parseProject(JSON.stringify(project))).toEqual(project);
  });

  it('mantém as 11 fotos quando nenhuma tem pose', () => {
    const project = semPoses();
    expect(project.photos.every(p => p.pose === null && p.roomId === null && p.status === 'pendente')).toBe(true);
    expect(parseProject(JSON.stringify(project))).toEqual(project);
  });

  it('exige que toda pose gravada caia dentro do cômodo declarado', () => {
    for (const photo of initialProject().photos.filter(p => p.pose)) {
      const room = roomOptions.find(r => r.id === photo.roomId);
      expect(room, `${photo.id} aponta para um ambiente inexistente`).toBeDefined();
      expect(photo.status, `${photo.id} tem pose mas não foi proposta nem confirmada`).not.toBe('pendente');
      expect(photo.pose!.evidence.trim().length, `${photo.id} tem pose sem evidência`).toBeGreaterThan(0);
    }
  });

  it('reimporta calibração, conferência e observações sem perder precisão', () => {
    const project = semPoses();
    const reference = { points: [{ u: 20, v: 30 }, { u: 220, v: 30 }] as [{ u: number; v: number }, { u: number; v: number }], distanceMeters: 3.7 };
    project.calibration = { reference, transform: calibrate(reference), check: { points: [{ u: 40, v: 40 }, { u: 40, v: 240 }], distanceMeters: 3.8 }, status: 'proposto' };
    project.photos[0].observations = 'Revisar a janela; ambiente ainda desconhecido.';
    expect(parseProject(JSON.stringify(project))).toEqual(project);
  });

  it('aceita o arquivo da F0 e o traz para a versão com poses', () => {
    const antigo = { ...structuredClone(semPoses()), schemaVersion: 1 } as any;
    const migrado = validateProject(antigo);
    expect(migrado.schemaVersion).toBe(2);
    expect(migrado.photos.every(p => p.status === 'pendente' && p.pose === null)).toBe(true);
  });

  it('guarda a pose em pixels e a reimporta idêntica', () => {
    const project = semPoses();
    project.photos[0].roomId = 'living';
    project.photos[0].pose = { ...poseLiving };
    project.photos[0].status = 'proposto';
    const voltou = parseProject(JSON.stringify(project));
    expect(voltou.photos[0].pose).toEqual(poseLiving);
    expect(voltou.photos[0].status).toBe('proposto');
  });

  it('permite associar o ambiente antes de saber o ponto', () => {
    const project = semPoses();
    project.photos[0].roomId = 'cozinha';
    expect(parseProject(JSON.stringify(project)).photos[0]).toMatchObject({ roomId: 'cozinha', pose: null, status: 'pendente' });
  });

  it.each([
    ['pose fora do cômodo declarado', (p: any) => { p.photos[0].roomId = 'cozinha'; p.photos[0].pose = { ...poseLiving }; p.photos[0].status = 'proposto'; }],
    ['pose sem ambiente', (p: any) => { p.photos[0].pose = { ...poseLiving }; p.photos[0].status = 'proposto'; }],
    ['ambiente inexistente', (p: any) => { p.photos[0].roomId = 'salao-de-festas'; }],
    ['proposto sem pose', (p: any) => { p.photos[0].roomId = 'living'; p.photos[0].status = 'proposto'; }],
    ['pendente com pose', (p: any) => { p.photos[0].roomId = 'living'; p.photos[0].pose = { ...poseLiving }; }],
    ['azimute de 360 graus', (p: any) => { p.photos[0].roomId = 'living'; p.photos[0].status = 'proposto'; p.photos[0].pose = { ...poseLiving, headingDeg: 360 }; }],
    ['campo de visão absurdo', (p: any) => { p.photos[0].roomId = 'living'; p.photos[0].status = 'proposto'; p.photos[0].pose = { ...poseLiving, verticalFovDeg: 5 }; }],
    ['câmera no teto', (p: any) => { p.photos[0].roomId = 'living'; p.photos[0].status = 'proposto'; p.photos[0].pose = { ...poseLiving, cameraHeight: 3.4 }; }],
    ['pose sem evidência', (p: any) => { p.photos[0].roomId = 'living'; p.photos[0].status = 'proposto'; p.photos[0].pose = { ...poseLiving, evidence: '   ' }; }],
    ['confiança inventada', (p: any) => { p.photos[0].roomId = 'living'; p.photos[0].status = 'proposto'; p.photos[0].pose = { ...poseLiving, confidence: 'altissima' }; }],
    ['planta com pose', (p: any) => { p.plan.roomId = 'living'; }],
    ['versão desconhecida', (p: any) => { p.schemaVersion = 3; }],
    ['unidade trocada', (p: any) => { p.units = 'cm'; }],
    ['foto a menos', (p: any) => { p.photos.pop(); }],
    ['foto duplicada', (p: any) => { p.photos[0] = p.photos[1]; }],
    ['caminho externo', (p: any) => { p.photos[0].path = 'https://example.org/image.png'; }],
    ['planta redimensionada', (p: any) => { p.plan.width = 1; }],
    ['calibração ausente', (p: any) => { delete p.calibration; }],
  ])('rejeita %s e mantém o estado válido', (_label, mutate) => {
    const current = semPoses();
    const before = JSON.stringify(current);
    const invalid = structuredClone(current) as any;
    mutate(invalid);
    expect(() => validateProject(invalid)).toThrow();
    expect(JSON.stringify(semPoses())).toBe(before);
  });

  it('rejeita escala adulterada e coordenadas fora da planta', () => {
    const project = semPoses();
    project.calibration = { reference: { points: [{ u: 0, v: 0 }, { u: 100, v: 0 }], distanceMeters: 2 }, transform: { origin: { u: 0, v: 0 }, metersPerPixel: .04 }, check: null, status: 'proposto' };
    expect(() => validateProject(project)).toThrow(/inconsistente/);
    project.calibration.reference.points[1].u = 99999;
    expect(() => validateProject(project)).toThrow(/fora da planta/);
  });

  it('rejeita sintaxe inválida, nulos e arquivo excessivo', () => {
    for (const text of ['{', 'null', '[]', ' '.repeat(1_000_001)]) expect(() => parseProject(text)).toThrow();
  });
});

describe('pose no mundo', () => {
  it('converte pixels em metros pela mesma origem das paredes', () => {
    const mundo = poseToWorld(poseLiving, transform);
    expect(mundo.x).toBeCloseTo((300 - 52) * transform.metersPerPixel, 9);
    expect(mundo.z).toBeCloseTo((700 - 761) * transform.metersPerPixel, 9);
    expect(mundo.height).toBe(1.55);
  });

  it('deriva o campo horizontal pela proporção da foto', () => {
    // Foto em pé, 1086 x 1448: o horizontal fica menor que o vertical.
    expect(horizontalFov(55, 1086 / 1448)).toBeLessThan(55);
    // Foto deitada: fica maior.
    expect(horizontalFov(55, 1448 / 1086)).toBeGreaterThan(55);
    // Quadrada: igual.
    expect(horizontalFov(55, 1)).toBeCloseTo(55, 9);
  });
});

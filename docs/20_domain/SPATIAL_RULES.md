# Regras espaciais

Fonte normativa: PRD, seção 6. Implementação F0: `src/plan/spatial.ts`.

- Mundo em metros. Y vertical, piso em XZ. Planta em pixels originais, u à direita e v para baixo.
- Origem métrica no ponto A da referência. `s = distânciaMetros / distânciaEuclidianaPixels`, sem deformação por eixo.
- Direta: `x = (u-u0)*s`, `z = (v-v0)*s`.
- Inversa: `u = x/s+u0`, `v = z/s+v0`. A inversa é derivada, não armazenada como estado concorrente.
- Conferência: distância em pixels da outra cota × s; desvio = distância calculada − distância informada; percentual relativo à informada. Não há limiar de confirmação automática.
- Azimute: 0 = −Z; 90 = +X; 180 = +Z; 270 = −X. Vetor `(sin(a),0,-cos(a))`.
- F0 deixa escala nula até entrada explícita; depois estado proposto. Medida informada não equivale a levantamento validado.
- Coordenadas devem estar dentro da planta. Distância deve ser finita e positiva; pontos separados por pelo menos 1 pixel.
- F2 armazenará FOV vertical e calculará horizontal pela proporção da fotografia conforme PRD. Não há pose ou câmera de captura inferida nesta entrega.

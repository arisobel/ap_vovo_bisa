# Problemas observados

- Build reporta módulo 3D maior que 500 kB (cerca de 539 kB minificado, 134 kB gzip). Ele está separado da lógica de planta e catálogo; não há evidência de problema de desempenho, pois FPS não foi medido.
- Verificação visual bloqueada pela ausência de navegador conectado no runtime Browser da sessão. Testes unitários e HTTP não substituem revisão de interface.

Pendências espaciais, ainda não classificadas como defeitos, estão no backlog.
- DORMIT. 1 tem duas portas (parede oeste, 0,69 m; parede sul, 0,66 m). Dois acessos a um dormitório é incomum e a destinação de cada uma não foi confirmada.
- A janela do DORMIT. 1 começa a 4 px do canto norte, deixando um pilar de cerca de 0,11 m. Pode ser limite de resolução do desenho; conferir em campo.
- Detecção automática dos cômodos restantes não é confiável com o método testado. Janelas e portas são vãos na máscara de parede, então o espaço externo vaza para dentro pelo acesso ao terraço e funde os ambientes grandes. Baixar o limiar para capturar os vidros transforma linhas de cota e frentes de armário em paredes falsas, que cortam cômodos ao meio. Os ambientes pequenos do setor oeste foram isolados corretamente e servem como mapa de partida, não como traçado.

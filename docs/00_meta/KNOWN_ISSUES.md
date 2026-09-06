# Problemas observados

- Build reporta módulo 3D maior que 500 kB (cerca de 539 kB minificado, 134 kB gzip). Ele está separado da lógica de planta e catálogo; não há evidência de problema de desempenho, pois FPS não foi medido.
- Verificação visual bloqueada pela ausência de navegador conectado no runtime Browser da sessão. Testes unitários e HTTP não substituem revisão de interface.

Pendências espaciais, ainda não classificadas como defeitos, estão no backlog.

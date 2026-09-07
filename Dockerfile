# Duas etapas: a primeira constrói a visita, a segunda serve arquivos estáticos.
# Não há backend, banco nem autenticação: a imagem publicada é só HTML, JS e imagens.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.visita.config.ts visita.html ./
COPY src ./src
COPY public ./public
# build:visita constrói apenas visita.html. O editor local não entra na imagem.
RUN npm run build:visita && mv dist/visita.html dist/index.html

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

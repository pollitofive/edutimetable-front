# Dockerfile multi-stage:
#   dev   → vite dev server (lo usa el compose local de edutimetable-api)
#   build → compila la SPA; las VITE_* se inyectan en build time, por eso son ARG
#   prod  → nginx sirviendo dist/ (staging/prod)

FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./

RUN npm install -g npm@11.13.0 && rm -f package-lock.json && npm install

EXPOSE 3537

CMD ["npm", "run", "dev"]


FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY ./ /app

ARG VITE_API_URL
ARG VITE_GRAPHQL_URL
ARG VITE_PROJECT_NAME=Edutimetable
ENV VITE_API_URL=$VITE_API_URL \
    VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL \
    VITE_PROJECT_NAME=$VITE_PROJECT_NAME

RUN npm run build


FROM nginx:1.27-alpine AS prod

COPY docker/nginx.prod.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# syntax=docker/dockerfile:1.5

FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package.json

RUN npm install --legacy-peer-deps

COPY . .

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

FROM nginx:1.25-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

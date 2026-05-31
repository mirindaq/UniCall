FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG VITE_API_BASE_URL=http://localhost:8088
ARG VITE_LOGIN_PATH=/login
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_LOGIN_PATH=${VITE_LOGIN_PATH}

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

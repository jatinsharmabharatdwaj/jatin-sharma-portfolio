FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build:web

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server ./server
COPY --from=build /app/dist/trace-lens/browser ./dist/trace-lens/browser
EXPOSE 4000
CMD ["npm", "run", "start:prod"]

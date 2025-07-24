FROM node:22.14.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm clean-install
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:22.14.0-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
ENV PORT=3000
EXPOSE $PORT
CMD ["npm", "run", "serve:ssr:angular"]

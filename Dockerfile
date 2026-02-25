FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --module commonjs --skipLibCheck

FROM node:20-alpine
WORKDIR /app

# Dependencias para Tesseract OCR (necesarias para el worker)
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-spa

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

ARG ENTRYPOINT_CMD="npx prisma migrate deploy && npx prisma db seed && node dist/src/main"
ENV ENTRYPOINT_CMD=${ENTRYPOINT_CMD}

EXPOSE 3000
CMD sh -c "$ENTRYPOINT_CMD"
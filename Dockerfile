# Stage 1: Frontend build
FROM node:20-alpine AS frontend-build
WORKDIR /app/webui
COPY webui/package*.json ./
RUN npm ci
COPY webui/ ./
RUN npm run build

# Stage 2: Backend build
FROM golang:1.25-alpine AS backend-build
WORKDIR /app
RUN apk add --no-cache gcc musl-dev sqlite-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend-build /app/webui/dist ./webui/dist
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags '-extldflags "-static"' -o stoz .

# Stage 3: Final image
FROM alpine:latest
WORKDIR /app
RUN apk add --no-cache ca-certificates sqlite-libs tzdata
COPY --from=backend-build /app/stoz .
RUN mkdir -p /data
EXPOSE 8080
ENV GIN_MODE=release
ENV DB_PATH=/data/stoz.db
ENV LOG_LEVEL=info
ENV HOST_PATH=/host
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:8080/api/v1/health || exit 1
ENTRYPOINT ["/app/stoz"]

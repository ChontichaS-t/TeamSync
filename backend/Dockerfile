FROM golang:1.26.5-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
    && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/create-user ./cmd/create-user

FROM alpine:3.22
RUN apk add --no-cache ca-certificates \
    && addgroup -S teamsync \
    && adduser -S -G teamsync teamsync
WORKDIR /app
COPY --from=build /out/api /app/api
COPY --from=build /out/create-user /app/create-user
USER teamsync
EXPOSE 8080
ENTRYPOINT ["/app/api"]

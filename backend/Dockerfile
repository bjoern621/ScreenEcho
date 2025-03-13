FROM golang:1.24.0 AS go-build
WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . ./

RUN go build -o start-server

# Go build complete

FROM gcr.io/distroless/base-debian12
WORKDIR /app

COPY --from=go-build /app/start-server ./

# Copied binary to distroless image

CMD [ "/app/start-server" ]

EXPOSE 8080
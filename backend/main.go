package main

import (
	"log"
	"net/http"

	"bjoernblessin.de/screenecho/clients"
	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/middleware"
	"bjoernblessin.de/screenecho/rooms"
	"bjoernblessin.de/screenecho/signaling"
	"bjoernblessin.de/screenecho/streams"
)

func main() {
	log.Println("Running...")

	connManager := connection.NewConnectionManager()

	clientManager := clients.NewClientManager(connManager)

	roomManager := rooms.NewRoomManager(clientManager)

	streams.NewStreamManager(clientManager, roomManager)

	signaling.NewSignalingManager(clientManager)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /room/{roomID}/connect", roomManager.HandleConnect)
	mux.HandleFunc("GET /room/generate-id", roomManager.GenerateIDHandler)

	server := &http.Server{
		Addr:    ":8080",
		Handler: middleware.Logging(middleware.CORS(mux)),
	}

	log.Fatal(server.ListenAndServe())
}

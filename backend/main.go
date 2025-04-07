package main

import (
	"log"
	"net/http"

	"bjoernblessin.de/screenecho/clients"
	"bjoernblessin.de/screenecho/connection"
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

	http.HandleFunc("/room/{roomID}/connect", roomManager.HandleConnect)
	// http.HandleFunc("/room/create", rooms.HandleCreate)
	// http.HandleFunc("/room/sdp", signaling.HandleSDPOffer)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

package main

import (
	"log"
	"net/http"

	"bjoernblessin.de/screenecho/client"
	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/endpoints/rooms"
	"bjoernblessin.de/screenecho/streams"
)

func main() {
	log.Println("Running...")

	connManager := connection.NewConnectionManager()

	clientManager := client.NewClientManager()

	roomManager := rooms.NewRoomManager(connManager, clientManager)

	streams.NewStreamManager(connManager, clientManager, roomManager)

	http.HandleFunc("/room/{roomID}/connect", roomManager.HandleConnect)
	// http.HandleFunc("/room/create", rooms.HandleCreate)
	// http.HandleFunc("/room/sdp", signaling.HandleSDPOffer)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

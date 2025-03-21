package main

import (
	"log"
	"net/http"

	"bjoernblessin.de/screenecho/endpoints/rooms"
	"bjoernblessin.de/screenecho/streams"
)

func main() {
	log.Println("Running...")

	streams.Initialize()

	http.HandleFunc("/room/{roomID}/connect", rooms.HandleConnect)
	// http.HandleFunc("/room/create", rooms.HandleCreate)
	// http.HandleFunc("/room/sdp", signaling.HandleSDPOffer)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

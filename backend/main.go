package main

import (
	"log"
	"net/http"
	"bjoernblessin.de/screenecho/endpoints/rooms"
)

func main() {
	log.Println("Running...")

	http.HandleFunc("/room/{roomID}/connect", rooms.HandleConnect)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

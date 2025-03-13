package main

import (
	"log"
	"net/http"
)

func main() {
	log.Println("Running...")

	// http.HandleFunc("/sendmail", endpoints.SendMailHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

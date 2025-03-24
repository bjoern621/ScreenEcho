// Package signaling provides the necessary mechanisms for establishing
// and managing WebRTC (web real-time communication) connections. In the context of WebRTC, signaling
// is the process of coordinating communication between peers. This involves
// the exchange of metadata required to establish and maintain the connection,
// such as session descriptions (SDP) and ICE (Internet Connectivity Establishment) candidates.
//
// The signaling process is needed in the following scenarios:
//   - Session Description Exchange: Peers exchange SDP messages (offer and answer)
//     to negotiate the session parameters. An SDP message contains details such as media type
//     (audio, video, or data), transport protocols, and connection information (IP address and port).
//   - ICE Candidate Exchange: Peers share ICE candidates
//     to determine the best network path for communication. ICE candidates provide potential
//     connection methods based on available network interfaces and NAT traversal techniques.
package signaling

import (
	"log"
	"net/http"

	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/rooms"
	"github.com/gorilla/websocket"
)

func Initialize() {
	// rooms.SubscribeMessage("sdp-offer", handleSPDOffer)
	// rooms.SubscribeMessage("stream-stopped", handleStreamStopped)
}

// handleSPDOffer handles the SDP offer of a client offering a WebRTC connection.
// The server forwards the offer to the requested remote peer.
func handleSPDOffer(room *rooms.Room, conn *websocket.Conn, typedMessage connection.TypedMessage[any]) {

}

// HandleSDPOffer handles the SDP offer of a client offering WebRTC connection.
// The server forwards the offer to all other users in the room.
func HandleSDPOffer(writer http.ResponseWriter, request *http.Request) {
	log.Println("Handling SDP offer...")

	// for {
	// 	messageType, message, err := conn.ReadMessage()
	// 	if err != nil {
	// 		delete(room.connections, conn)
	// 		log.Println("User left the room.")
	// 		return
	// 	}

	// 	// log.Printf("type: %d", messageType)

	// 	log.Println(room.connections)
	// 	room.broadcast(messageType, message, conn)
	// }
}

// HandleSDPAnswer handles the WebSocket connection for a user answering an SDP offer.
// It is called when a user answers an SDP offer.
func HandleSDPAnswer(writer http.ResponseWriter, request *http.Request) {

}

package rooms

import (
	"log"
	"sync"

	"bjoernblessin.de/screenecho/util/assert"
	"github.com/gorilla/websocket"
)

type RoomID string

// Room represents a collection of WebSockets between the server and joined clients of the room.
type Room struct {
	RoomID      RoomID
	connections map[*websocket.Conn]bool
	rw          sync.RWMutex
}

func (room *Room) addConnection(conn *websocket.Conn) {
	log.Println("add")

	room.rw.Lock()
	defer room.rw.Unlock()

	assert.Assert(room.connections[conn] == false, "couldn't add connection because connection is already part of the room")

	room.connections[conn] = true
}

func (room *Room) removeConnection(conn *websocket.Conn) {
	log.Println("remove")

	room.rw.Lock()
	defer room.rw.Unlock()

	assert.Assert(room.connections[conn] == true, "couldn't remove connection because there was no active connection")

	delete(room.connections, conn)
}

// Broadcast sends a websocket message to all clients in the room except for the sender.
// The sender can be nil, effectively broadcasting to all clients.
func (room *Room) Broadcast(msg any, sender *websocket.Conn) { // passing in struct but needing a msg in JSON format
	if _, exists := room.connections[sender]; !exists {
		log.Println("Sender connection not found in the room")
	}

	for conn := range room.connections {

		if conn == sender {
			continue
		}

		if err := conn.WriteJSON(msg); err != nil {
			return
		}
	}
}

func (room *Room) GetClientCount() int {
	return len(room.connections)
}

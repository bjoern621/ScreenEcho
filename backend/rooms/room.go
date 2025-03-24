package rooms

import (
	"log"
	"sync"

	"bjoernblessin.de/screenecho/clients"
	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/util/assert"
)

type RoomID string

// Room holds a collection of joined clients.
type Room struct {
	RoomID         RoomID
	clientIDs      map[clients.ClientID]bool
	clientIDsMutex sync.RWMutex
	clientManager  *clients.ClientManager
}

func NewRoom(roomID RoomID, clientManager *clients.ClientManager) *Room {
	return &Room{
		RoomID:        roomID,
		clientIDs:     make(map[clients.ClientID]bool),
		clientManager: clientManager,
	}
}

func (room *Room) addClient(clientID clients.ClientID) {
	log.Println("add")

	room.clientIDsMutex.Lock()
	defer room.clientIDsMutex.Unlock()

	assert.Assert(room.clientIDs[clientID] == false, "couldn't add client because client already joined the room")

	room.clientIDs[clientID] = true
}

// removeClient removes the client with clientID from the room.
// If the client is not part of the room, the method has no effect.
func (room *Room) removeClient(clientID clients.ClientID) {
	log.Println("remove")

	room.clientIDsMutex.Lock()
	defer room.clientIDsMutex.Unlock()

	delete(room.clientIDs, clientID)
}

// Broadcast sends a websocket message to all clients in the room except for the sender.
// The sender can be nil, effectively broadcasting to all clients.
// See also [connection.SendMessage].
func Broadcast[T any](room *Room, msg connection.TypedMessage[T], senderClientID clients.ClientID) {
	room.clientIDsMutex.Lock()
	defer room.clientIDsMutex.Unlock()

	for clientID := range room.clientIDs {
		if clientID == senderClientID {
			continue
		}

		receiver := room.clientManager.GetClientByID(clientID)
		assert.IsNotNil(receiver)

		clients.SendMessage(receiver, msg)
	}
}

func (room *Room) isEmpty() bool {
	room.clientIDsMutex.RLock()
	defer room.clientIDsMutex.RUnlock()

	return len(room.clientIDs) == 0
}

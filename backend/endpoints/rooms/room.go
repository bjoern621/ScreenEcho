package rooms

import (
	"log"
	"sync"

	"bjoernblessin.de/screenecho/client"
	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/util/assert"
)

type RoomID string

// Room holds a collection of joined clients.
type Room struct {
	RoomID         RoomID
	clientIDs      map[client.ClientID]bool
	clientIDsMutex sync.RWMutex
	clientManager  *client.ClientManager
}

func NewRoom(roomID RoomID, clientManager *client.ClientManager) *Room {
	return &Room{
		RoomID:        roomID,
		clientIDs:     make(map[client.ClientID]bool),
		clientManager: clientManager,
	}
}

func (room *Room) addClient(clientID client.ClientID) {
	log.Println("add")

	room.clientIDsMutex.Lock()
	defer room.clientIDsMutex.Unlock()

	assert.Assert(room.clientIDs[clientID] == false, "couldn't add client because client already joined the room")

	room.clientIDs[clientID] = true
}

func (room *Room) removeClient(clientID client.ClientID) {
	log.Println("remove")

	room.clientIDsMutex.Lock()
	defer room.clientIDsMutex.Unlock()

	assert.Assert(room.clientIDs[clientID] == true, "couldn't remove client because client was not connected to the room")

	delete(room.clientIDs, clientID)
}

// Broadcast sends a websocket message to all clients in the room except for the sender.
// The sender can be nil, effectively broadcasting to all clients.
// See also [connection.SendMessage].
func Broadcast[T any](room *Room, msg connection.TypedMessage[T], senderClientID client.ClientID) {
	room.clientIDsMutex.Lock()
	defer room.clientIDsMutex.Unlock()

	for clientID := range room.clientIDs {
		if clientID == senderClientID {
			continue
		}

		receiver := room.clientManager.GetByID(clientID)
		assert.IsNotNil(receiver)

		client.SendMessage(receiver, msg)
	}
}

func (room *Room) isEmpty() bool {
	room.clientIDsMutex.RLock()
	defer room.clientIDsMutex.RUnlock()

	return len(room.clientIDs) == 0
}

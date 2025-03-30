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

const CLIENT_DISCONNECT_MESSAGE_TYPE = "client-disconnect"

type clientDisconnectMessage struct {
	ClientID string `json:"clientID"`
}

func NewRoom(roomID RoomID, clientManager *clients.ClientManager) *Room {
	return &Room{
		RoomID:        roomID,
		clientIDs:     make(map[clients.ClientID]bool),
		clientManager: clientManager,
	}
}

func (room *Room) addClient(clientID clients.ClientID) {
	room.clientIDsMutex.Lock()
	defer room.clientIDsMutex.Unlock()

	log.Println("client joined room")

	assert.Assert(room.clientIDs[clientID] == false, "couldn't add client because client already joined the room")

	room.clientIDs[clientID] = true
}

// removeClient removes the client with clientID from the room.
// If the client is not part of the room, the method has no effect.
func (room *Room) removeClient(clientID clients.ClientID) {
	room.clientIDsMutex.Lock()
	defer room.clientIDsMutex.Unlock()

	log.Printf("client %s removed from room", clientID)

	delete(room.clientIDs, clientID)
}

// Broadcast sends a websocket message to all clients in the room except for the sender.
// The sender can be nil, effectively broadcasting to all clients.
// See also [connection.SendMessage].
func Broadcast[T any](room *Room, msg connection.TypedMessage[T], senderClientID clients.ClientID) {
	// log.Println("broadcast try")
	room.clientIDsMutex.Lock()
	defer room.clientIDsMutex.Unlock()
	log.Println("broadcast passed")

	for clientID := range room.clientIDs {
		if clientID == senderClientID {
			continue
		}

		log.Printf("receiver client %s", clientID)

		receiver := room.clientManager.GetClientByID(clientID)
		// if receiver == nil {
		// 	continue
		// }
		assert.IsNotNil(receiver)

		clients.SendMessage(receiver, msg)
	}
}

func (room *Room) isEmpty() bool {
	// log.Println("try isEmpty")
	room.clientIDsMutex.RLock()
	defer room.clientIDsMutex.RUnlock()
	log.Println("isEmpty passed")

	return len(room.clientIDs) == 0
}

func (room *Room) sendDisconnectMessageToRemainingClients(clientID clients.ClientID) {
	msg := connection.TypedMessage[clientDisconnectMessage]{
		Type: CLIENT_DISCONNECT_MESSAGE_TYPE,
		Msg: clientDisconnectMessage{
			ClientID: clientID.String(),
		},
	}

	Broadcast(room, msg, clientID)
}

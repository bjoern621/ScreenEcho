// Package rooms maintains a collection of Rooms.
// A Room holds information about connected clients.
// A client is part of a room as long as the client is connected to it.
// A broadcast can be send to a room, this can be used e.g. for signaling purposes in WebRTC connectivity.
package rooms

import (
	"net/http"
	"sync"

	"bjoernblessin.de/screenecho/clients"
	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/util/assert"
)

type RoomManager struct {
	rooms         map[RoomID]*Room // Mapping RoomID <-> Room is redundant here because it's already done in Room struct, but most efficient
	roomsMutex    sync.RWMutex
	clientManager *clients.ClientManager
}

func NewRoomManager(clientManager *clients.ClientManager) *RoomManager {
	return &RoomManager{
		rooms:         make(map[RoomID]*Room),
		clientManager: clientManager,
	}
}

func (rm *RoomManager) createEmptyRoom(roomID RoomID) *Room {
	newRoom := NewRoom(roomID, rm.clientManager)

	rm.roomsMutex.Lock()
	defer rm.roomsMutex.Unlock()

	rm.rooms[roomID] = newRoom

	return newRoom
}

// GetUsersRoom retrieves the room the user with clientID is connected to.
// If no Room is found, the function returns nil.
func (rm *RoomManager) GetUsersRoom(clientID clients.ClientID) *Room {
	rm.roomsMutex.RLock()
	defer rm.roomsMutex.RUnlock()

	for _, room := range rm.rooms {
		for id, _ := range room.clientIDs {
			if id == clientID {
				return room
			}
		}
	}

	return nil
}

// GetByID does exactly that.
// The returned Room may be nil if the room with roomID doesn't exist.
func (rm *RoomManager) GetRoomById(roomID RoomID) *Room {
	return rm.rooms[roomID]
}

// HandleConnect handles an HTTP request to establish a connection to a room.
// The HTTP request is send to the connection package to establish a connection.
// It is the main entry point for connecting clients.
func (rm *RoomManager) HandleConnect(writer http.ResponseWriter, request *http.Request) {
	roomIDString := request.PathValue("roomID")
	if roomIDString == "" {
		return
	}
	roomID := RoomID(roomIDString)

	room := rm.GetRoomById(roomID)
	if room == nil {
		room = rm.createEmptyRoom(roomID)
	}
	assert.Assert(room != nil)

	client, err := rm.clientManager.NewClient(writer, request)
	if err != nil {
		return
	}

	room.addClient(client.ID)

	client.RegisterDisconnectHandler(func() {
		room.removeClient(client.ID)
		if room.isEmpty() {
			rm.deleteRoom(room)
		} else {
			room.sendDisconnectMessageToRemainingClients(client.ID)
		}
	})
}

// deleteRoom removes room from the list of managed rooms if it exists.
func (rm *RoomManager) deleteRoom(room *Room) {
	rm.roomsMutex.Lock()
	defer rm.roomsMutex.Unlock()

	delete(rm.rooms, room.RoomID)
}

const CLIENT_DISCONNECT_MESSAGE_TYPE = "client-disconnect"

type clientDisconnectMessage struct {
	ClientID string `json:"clientID"`
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

// Package rooms maintains a collection of Rooms.
// A Room holds information about connected clients.
// A client is part of a room as long as the client is connected to it.
// A broadcast can be send to a room, this can be used e.g. for signaling purposes in WebRTC connectivity.
package rooms

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"sync"

	"bjoernblessin.de/screenecho/clients"
	"bjoernblessin.de/screenecho/util/assert"
)

type RoomManager struct {
	rooms              map[RoomID]*Room // Mapping RoomID <-> Room is redundant here because it's already done in Room struct, but most efficient
	roomsMutex         sync.RWMutex
	clientManager      *clients.ClientManager
	clientJoinHandlers []func(*Room, *clients.Client)
	clientJoinMutex    sync.RWMutex
}

func NewRoomManager(clientManager *clients.ClientManager) *RoomManager {
	return &RoomManager{
		rooms:         make(map[RoomID]*Room),
		clientManager: clientManager,
	}
}

// createEmptyRoom creates a new empty room with the given roomID.
// There must be no existing room with the given roomID.
// The function is not synchronized, so it must be called with the roomsMutex locked.
func (rm *RoomManager) createEmptyRoom(roomID RoomID) *Room {
	// rm.roomsMutex.Lock()
	// defer rm.roomsMutex.Unlock()

	_, exists := rm.rooms[roomID]
	assert.Assert(!exists, "room with this ID already exists")

	newRoom := NewRoom(roomID, rm.clientManager)

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

// HandleConnect handles an HTTP request to establish a connection to a room.
// The HTTP request is send to the connection package to establish a connection.
// It is the main entry point for connecting clients.
func (rm *RoomManager) HandleConnect(writer http.ResponseWriter, request *http.Request) {
	roomIDString := request.PathValue("roomID")
	if roomIDString == "" {
		return
	}
	roomID := RoomID(roomIDString)

	rm.roomsMutex.Lock()

	room, exists := rm.rooms[roomID]
	if !exists {
		room = rm.createEmptyRoom(roomID)
	}
	assert.Assert(room != nil)

	rm.roomsMutex.Unlock()

	client, err := rm.clientManager.NewClient(writer, request)
	if err != nil {
		return
	}

	room.addClient(client.ID)

	rm.notifyClientJoinHandlers(room, client)

	client.RegisterDisconnectHandler(func() {
		room.removeClient(client.ID)
		if room.isEmpty() {
			rm.deleteRoom(room)
		} else {
			room.sendDisconnectMessageToRemainingClients(client.ID)
		}
	})
}

// deleteRoom removes room from the list of managed rooms.
// room must exist in the list of managed rooms.
func (rm *RoomManager) deleteRoom(room *Room) {
	rm.roomsMutex.Lock()
	defer rm.roomsMutex.Unlock()

	assert.Assert(rm.rooms[room.RoomID] != nil, "room must exist in the list of managed rooms")

	delete(rm.rooms, room.RoomID)
}

// RegisterClientJoinHandler registers a handler function that is called when a client's connection is establisheds.
// There is no RemoveConnectHandler function, so once a handler is registered, it cannot be removed.
func (rm *RoomManager) RegisterClientJoinHandler(handler func(*Room, *clients.Client)) {
	rm.clientJoinMutex.Lock()
	defer rm.clientJoinMutex.Unlock()

	rm.clientJoinHandlers = append(rm.clientJoinHandlers, handler)
}

func (rm *RoomManager) notifyClientJoinHandlers(room *Room, client *clients.Client) {
	rm.clientJoinMutex.RLock()
	defer rm.clientJoinMutex.RUnlock()

	for _, joinHandler := range rm.clientJoinHandlers {
		joinHandler(room, client)
	}
}

type GenerateIDResponse struct {
	RoomID RoomID `json:"roomID"`
}

func (rm *RoomManager) GenerateIDHandler(writer http.ResponseWriter, request *http.Request) {
	rm.roomsMutex.Lock()
	defer rm.roomsMutex.Unlock()

	writer.Header().Set("Access-Control-Allow-Origin", "*")

	maxAttempts := 10
	for range maxAttempts {
		roomID := GenerateRoomID()

		if _, exists := rm.rooms[roomID]; exists {
			continue
		}

		rm.createEmptyRoom(roomID)

		response, err := json.Marshal(GenerateIDResponse{RoomID: roomID})
		assert.IsNil(err, "failed to marshal response")

		writer.WriteHeader(http.StatusOK)
		writer.Write(response)
		return
	}

	writer.WriteHeader(http.StatusServiceUnavailable)
	writer.Write([]byte("Unable to generate a unique room ID, please try again."))
}

// GenerateRoomID creates a random alphanumeric room ID.
func GenerateRoomID() RoomID {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const length = 6

	result := make([]byte, length)
	for i := range length {
		result[i] = charset[rand.Intn(len(charset))]
	}

	return RoomID(result)
}

// Package rooms maintains a collection of Rooms.
// A Room holds information about connected clients.
// A connection is added to a room when a client joins the room and held until the client leaves the room.
// Connections can be used to send bi-directional messages in real-time (milliseconds delay) to which can be subscribed.
// This can be used e.g. for signaling purposes in WebRTC connectivity.
package rooms

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"bjoernblessin.de/screenecho/util/assert"
	"bjoernblessin.de/screenecho/util/strictjson"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

type RoomID string

var (
	rooms      = make(map[RoomID]*Room)
	roomsMutex sync.RWMutex
)

// Room represents a collection of WebSockets between the server and joined clients of the room.
type Room struct {
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

func createRoom(roomID RoomID) *Room {
	newRoom := &Room{
		connections: make(map[*websocket.Conn]bool),
	}

	roomsMutex.Lock()
	rooms[roomID] = newRoom
	roomsMutex.Unlock()

	return newRoom
}

// Room may be nil if the room with roomID doesn't exist.
func GetRoomById(roomID RoomID) *Room {
	return rooms[roomID]
}

// Broadcast sends a websocket message to all clients in the room except for the sender.
// The sender can be nil, effectively broadcasting to all clients.
func (room *Room) Broadcast(messageType int, message []byte, sender *websocket.Conn) {
	for conn := range room.connections {
		if conn == sender {
			continue
		}

		if err := conn.WriteMessage(messageType, message); err != nil {
			return
		}
	}
}

func HandleConnect(writer http.ResponseWriter, request *http.Request) {
	log.Println("handle connect")

	roomIDString := request.PathValue("roomID")
	if roomIDString == "" {
		return
	}
	roomID := RoomID(roomIDString)

	room := GetRoomById(roomID)
	if room == nil {
		room = createRoom(roomID)
	}
	assert.Assert(room != nil)

	conn, err := upgrader.Upgrade(writer, request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	room.addConnection(conn)

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			// WebSocket is closed
			room.removeConnection(conn)
			return
		}

		log.Printf("%s", msg)

		var typedMessage TypedMessageRequest
		err = strictjson.Unmarshal(msg, &typedMessage)
		if err != nil {
			expectedJSON, _ := json.Marshal(TypedMessageRequest{
				Type: "",
				Msg:  nil,
			})

			conn.WriteJSON(TypedMessageResponse{
				Type: "error",
				Msg: ErrorMessage{
					ErrorMessage: fmt.Sprintf("Message had invalid JSON format. %s", err.Error()),
					Expected:     fmt.Sprintf("Expected types like: %s", expectedJSON),
					Actual:       fmt.Sprintf("Types of %s didn't match.", msg),
				},
			})

			continue
		}

		ForwardMessage(room, conn, typedMessage)
	}
}

/// Typed message handling

var (
	messageHandlers      = make(map[MessageType][]MessageHandler)
	messageHandlersMutex sync.RWMutex
)

type MessageType string

type TypedMessageRequest struct {
	Type MessageType     `json:"type"`
	Msg  json.RawMessage `json:"msg"`
}

type TypedMessageResponse struct {
	Type MessageType `json:"type"`
	Msg  any         `json:"msg"` // Allows embedding any type of response
}

type ErrorMessage struct {
	ErrorMessage string `json:"errorMessage"`
	Expected     string `json:"expected,omitempty"`
	Actual       string `json:"actual,omitempty"`
}

type MessageHandler func(*Room, *websocket.Conn, TypedMessageRequest)

// SubscribeMessage allows external packages to subscribe to specific message types.
// There is no limit to the number of message handlers for one message type.
func SubscribeMessage(messageType MessageType, handler MessageHandler) {
	messageHandlersMutex.Lock()
	defer messageHandlersMutex.Unlock()

	messageHandlers[messageType] = append(messageHandlers[messageType], handler)
}

// ForwardMessage forwards a typed message to all handlers subscribed to its type.
func ForwardMessage(room *Room, conn *websocket.Conn, typedMessage TypedMessageRequest) {
	messageHandlersMutex.RLock()
	defer messageHandlersMutex.RUnlock()

	for _, handler := range messageHandlers[typedMessage.Type] {
		go handler(room, conn, typedMessage)
	}
}

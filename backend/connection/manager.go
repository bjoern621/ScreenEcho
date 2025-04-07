package connection

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"slices"
	"sync"

	"bjoernblessin.de/screenecho/util/strictjson"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type MessageType string

type TypedMessage[T any] struct {
	Type MessageType `json:"type"`
	Msg  T           `json:"msg"`
}

type ErrorMessage struct {
	ErrorMessage string `json:"errorMessage"`
	Expected     string `json:"expected,omitempty"`
	Actual       string `json:"actual,omitempty"`
}

type MessageHandlerID uuid.UUID

type messageHandlerWrapper struct {
	id             MessageHandlerID
	messageHandler MessageHandler
}

type MessageHandler func(*Conn, TypedMessage[json.RawMessage])

type ConnectionManager struct {
	messageHandlers      map[MessageType][]messageHandlerWrapper
	messageHandlersMutex sync.RWMutex
	// closeMutex is a mutex used to ensure only one connection close-routine is executed at a time.
	closeMutex sync.Mutex
}

func NewConnectionManager() *ConnectionManager {
	return &ConnectionManager{
		messageHandlers: make(map[MessageType][]messageHandlerWrapper),
	}
}

// TODO CheckOrigin

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

// EstablishWebSocket establishes the WebSocket connection between client and server and listens to send messages.
// It handles incoming messages by forwarding them according to their TypedMessage type.
func (cm *ConnectionManager) EstablishWebSocket(writer http.ResponseWriter, request *http.Request) (*Conn, error) {
	socket, err := upgrader.Upgrade(writer, request, nil)
	if err != nil {
		return nil, err
	}

	conn := &Conn{socket: socket, closeHandlers: make([]func(), 0)}

	go cm.listenToMessages(conn)

	return conn, nil
}

// listenToMessages listens for incoming messages on a WebSocket connection.
// It continuously reads messages from the provided WebSocket connection and processes them.
// If an error occurs while reading a message (e.g., the WebSocket is closed), the function exits.
func (cm *ConnectionManager) listenToMessages(conn *Conn) {
	defer func() {
		// log.Printf("listenToMessages exited, closing socket")
		_ = conn.socket.Close()
	}()

	for {
		_, msg, err := conn.socket.ReadMessage()
		if err != nil {
			// WebSocket is closed
			cm.closeMutex.Lock()
			defer cm.closeMutex.Unlock()

			conn.closeHandlersMutex.RLock()
			defer conn.closeHandlersMutex.RUnlock()

			var waitgroup sync.WaitGroup

			for _, closeHandler := range conn.closeHandlers {
				waitgroup.Add(1)
				go func() {
					defer waitgroup.Done()
					closeHandler()
				}()
			}

			waitgroup.Wait()

			return
		}

		log.Printf("msg received: %s", msg)

		var typedMessage TypedMessage[json.RawMessage]
		err = strictjson.Unmarshal(msg, &typedMessage)
		if err != nil {
			expectedJSON, _ := json.Marshal(TypedMessage[any]{
				Type: "",
				Msg:  nil,
			})

			message := TypedMessage[ErrorMessage]{
				Type: "error",
				Msg: ErrorMessage{
					ErrorMessage: fmt.Sprintf("Message had invalid JSON format. %s", err.Error()),
					Expected:     fmt.Sprintf("Expected types like: %s", expectedJSON),
					Actual:       fmt.Sprintf("Types of %s didn't match.", msg),
				},
			}

			SendMessage(conn, message)

			continue
		}

		cm.forwardMessage(conn, typedMessage)
	}
}

// SubscribeMessage allows external packages to subscribe to specific message types.
//
// The provided handler will be called whenever a message with the specified message type is received.
// Only the "type" field of the message is read; the message data itself is not validated.
//
// Handlers are triggered whenever any client sends a message of the subscribed type.
//
// Multiple handlers can be subscribed to the same message type, and each will be executed when a matching message arrives.
// It is not checked whether a handler is already subscribed, meaning duplicate subscriptions are possible.
func (cm *ConnectionManager) SubscribeMessage(messageType MessageType, handler MessageHandler) MessageHandlerID {
	cm.messageHandlersMutex.Lock()
	defer cm.messageHandlersMutex.Unlock()

	id := MessageHandlerID(uuid.New())
	wrapper := messageHandlerWrapper{
		id:             id,
		messageHandler: handler,
	}

	cm.messageHandlers[messageType] = append(cm.messageHandlers[messageType], wrapper)

	return id
}

// TODO test

// UnsubscribeMessage removes a specific message handler for a given message type.
//
// The provided handler will be called whenever a message with the specified message type is received.
// Only the "type" field of the message is read; the message data itself is not validated.
//
// Handlers are triggered whenever any client sends a message of the subscribed type.
//
// If the handler is found in the list of handlers for the given message type, it is
// removed from the list.
func (cm *ConnectionManager) UnsubscribeMessage(messageType MessageType, handlerID MessageHandlerID) {
	cm.messageHandlersMutex.Lock()
	defer cm.messageHandlersMutex.Unlock()

	wrappersForMessageTyoe := cm.messageHandlers[messageType]
	for i, wrapper := range wrappersForMessageTyoe {
		if wrapper.id == handlerID {
			cm.messageHandlers[messageType] = slices.Delete(wrappersForMessageTyoe, i, i+1)
			break
		}
	}
}

// forwardMessage forwards a typed message to all handlers subscribed to its type.
func (cm *ConnectionManager) forwardMessage(conn *Conn, typedMessage TypedMessage[json.RawMessage]) {
	cm.messageHandlersMutex.RLock()
	defer cm.messageHandlersMutex.RUnlock()

	for _, wrapper := range cm.messageHandlers[typedMessage.Type] {
		go wrapper.messageHandler(conn, typedMessage)
	}
}

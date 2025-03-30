// Package connection provides an abstraction for managing bi-directional, real-time connections.
// The underlying implementation uses WebSocket connections. The primary focus of this package
// is to enable the exchange of strongly-typed messages between endpoints.
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

type Conn struct {
	socket             *websocket.Conn
	closeHandlers      []func()
	closeHandlersMutex sync.RWMutex
}

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
	closeMutex           sync.Mutex
}

func NewConnectionManager() *ConnectionManager {
	return &ConnectionManager{
		messageHandlers: make(map[MessageType][]messageHandlerWrapper),
	}
}

const ERROR_MESSAGE_TYPE = "error"

// TODO CheckOrigin

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

// AddCloseHandler registers a function to be called when the WebSocket connection is closed.
//
// Multiple close handlers can be added, and they will all be executed after the connection was closed.
// However, there is no RemoveCloseHandler function, so once a handler is registered, it cannot be removed.
//
// When the WebSocket connection is closed, no more messages will be read or written.
// The connection is considered invalid, and any pointers to Conn should be freed to avoid memory leaks.
func (conn *Conn) AddCloseHandler(handler func()) {
	conn.closeHandlers = append(conn.closeHandlers, handler)
}

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

			log.Printf("all close handlers finished")

			return
		}

		// log.Printf("msg received: %s", msg)

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

// SendMessage sends a typed message over a WebSocket connection.
//
// Example usage:
//
//	var conn *websocket.Conn
//
//	// Create a typed message
//
//	type InfoMessage struct {
//	    Information string `json:"info"`
//	}
//
//	message := TypedMessage[InfoMessage]{
//	    Type: "info-msg",
//	    Msg:  InfoMessage{Information: "here is your new information"},
//	}
//
//	// Send the message
//
//	err = SendMessage(conn, message)
//	if err != nil {
//	    log.Printf("Failed to send message: %v", err)
//	} else {
//	    log.Println("Message sent successfully")
//	}
func SendMessage[T any](conn *Conn, msg TypedMessage[T]) error {
	// log.Printf("msg sent: %v", msg)

	err := conn.socket.WriteJSON(msg)
	return err
}

// BuildErrorMessage is a helper function that returns an error message with only ErrorMessage set.
func BuildErrorMessage(msg string) TypedMessage[ErrorMessage] {
	return TypedMessage[ErrorMessage]{
		Type: ERROR_MESSAGE_TYPE,
		Msg: ErrorMessage{
			ErrorMessage: msg,
		},
	}
}

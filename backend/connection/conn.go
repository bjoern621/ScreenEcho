package connection

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Conn struct {
	socket             *websocket.Conn
	closeHandlers      []func()
	closeHandlersMutex sync.RWMutex
	// From https://pkg.go.dev/github.com/gorilla/websocket#hdr-Concurrency: Connections support one concurrent reader and one concurrent writer.
	writeMutex sync.Mutex
}

// AddCloseHandler registers a function to be called when the WebSocket connection is closed.
//
// Multiple close handlers can be added, and they will all be executed after the connection was closed.
// However, there is no RemoveCloseHandler function, so once a handler is registered, it cannot be removed.
//
// When the WebSocket connection is closed, no more messages will be read or written.
// The connection is considered invalid, and any pointers to Conn should be freed to avoid invalid state.
func (conn *Conn) AddCloseHandler(handler func()) {
	conn.closeHandlers = append(conn.closeHandlers, handler)
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
	conn.writeMutex.Lock()
	defer conn.writeMutex.Unlock()

	log.Printf("msg sent: %v", msg)

	err := conn.socket.WriteJSON(msg)
	return err
}

// notifyCloseHandlers executes all registered close handlers in parallel,
// waiting for all of them to finish before returning. It temporarily acquires
// a read lock to safely access the list of handlers and uses a wait group
// to track individual handler completion.
func (conn *Conn) notifyCloseHandlers() {
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
}

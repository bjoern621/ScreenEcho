// Package client provides functionality for managing client information.
// This includes general information like a display name but also a (WebSocket) connection.
// Connections can be used to send bi-directional messages in real-time (milliseconds delay) to which can be subscribed.
package clients

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/util/assert"
	"github.com/google/uuid"
)

type ClientManager struct {
	clients      map[ClientID]*Client
	clientsMutex sync.RWMutex
	connManager  *connection.ConnectionManager
}

type MessageHandler func(*Client, connection.TypedMessage[json.RawMessage])

func NewClientManager(connManager *connection.ConnectionManager) *ClientManager {
	return &ClientManager{
		clients:     make(map[ClientID]*Client),
		connManager: connManager,
	}
}

func (cm *ClientManager) NewClient(writer http.ResponseWriter, request *http.Request) (*Client, error) {
	conn, err := cm.connManager.EstablishWebSocket(writer, request)
	if err != nil {
		return nil, err
	}

	var clientID = ClientID(uuid.New())

	client := &Client{ID: clientID, DisplayName: "", conn: conn}

	cm.clientsMutex.Lock()
	defer cm.clientsMutex.Unlock()

	cm.clients[clientID] = client

	client.sendClientID()

	log.Printf("Client %s connected", clientID)

	conn.AddCloseHandler(func() {
		cm.removeClient(clientID)
	})

	return client, nil
}

func (cm *ClientManager) removeClient(clientID ClientID) {
	cm.clientsMutex.Lock()
	defer cm.clientsMutex.Unlock()

	log.Printf("Client %s removed from global", clientID)

	delete(cm.clients, clientID)
}

// GetClientByWebSocket does exactly that.
// The returned Client may be nil if the client with conn doesn't exist.
func (cm *ClientManager) GetClientByWebSocket(conn *connection.Conn) *Client {
	cm.clientsMutex.RLock()
	defer cm.clientsMutex.RUnlock()

	for _, client := range cm.clients {
		if client.conn == conn {
			return client
		}
	}
	return nil
}

// GetClientByID does exactly that.
// The returned Client may be nil if the client with ID doesn't exist.
func (cm *ClientManager) GetClientByID(id ClientID) *Client {
	cm.clientsMutex.RLock()
	defer cm.clientsMutex.RUnlock()

	return cm.clients[id]
}

// SubscribeMessage is a wrapper for [connection.SubscribeMessage].
func (cm *ClientManager) SubscribeMessage(messageType connection.MessageType, handler MessageHandler) connection.MessageHandlerID {
	return cm.connManager.SubscribeMessage(messageType, func(conn *connection.Conn, tm connection.TypedMessage[json.RawMessage]) {
		client := cm.GetClientByWebSocket(conn)
		assert.IsNotNil(client)

		handler(client, tm)
	})
}

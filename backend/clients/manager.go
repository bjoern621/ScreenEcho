// Package client provides functionality for managing client information.
// This includes general information like a display name but also a (WebSocket) connection.
// Connections can be used to send bi-directional messages in real-time (milliseconds delay) to which can be subscribed.
package clients

import (
	"log"
	"net/http"
	"sync"

	"bjoernblessin.de/screenecho/connection"
	"github.com/google/uuid"
)

type ClientManager struct {
	clients      map[ClientID]*Client
	clientsMutex sync.RWMutex
	connManager  *connection.ConnectionManager
}

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

	conn.AddCloseHandler(func() {
		log.Printf("close: remove client from global list")
		cm.removeClient(clientID)
	})

	return client, nil
}

func (cm *ClientManager) removeClient(clientID ClientID) {
	cm.clientsMutex.Lock()
	defer cm.clientsMutex.Unlock()

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
	return cm.clients[id]
}

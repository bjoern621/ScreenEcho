package clients

import (
	"bjoernblessin.de/screenecho/connection"
	"github.com/google/uuid"
)

type ClientID uuid.UUID

type Client struct {
	ID          ClientID
	DisplayName string
	conn        *connection.Conn // conn is always unique to one Client
}

const CLIENT_ID_MESSAGE_TYPE = "client-id"

type clientIDMessage struct {
	ClientID string `json:"clientID"`
}

// sendClientID sends the previously generated UUID to the client.
// The client should only listen to this message type once because the UUID will last until the client leaves the room.
func (client *Client) sendClientID() {
	message := connection.TypedMessage[clientIDMessage]{
		Type: CLIENT_ID_MESSAGE_TYPE,
		Msg:  clientIDMessage{ClientID: uuid.UUID(client.ID).String()},
	}

	SendMessage(client, message)
}

// SendMessage sends a typed message to the server using the client's WebSocket connection.
// The function encodes the typed message into the respective JSON-encoding.
// SendMessage may fail without error.
// See also [connection.SendMessage].
func SendMessage[T any](client *Client, msg connection.TypedMessage[T]) {
	_ = connection.SendMessage(client.conn, msg)
}

// RegisterDisconnectHandler registers a handler function that is called when the client's connection is closed.
// This allows for cleanup operations.
func (client *Client) RegisterDisconnectHandler(handler func()) {
	client.conn.AddCloseHandler(handler)
}

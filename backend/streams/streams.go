// Package streams manages active streams within rooms, tracks their lifecycle,
// and informs clients in the room when needed.
package streams

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"slices"

	"bjoernblessin.de/screenecho/client"
	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/endpoints/rooms"
	"bjoernblessin.de/screenecho/util/assert"
	"bjoernblessin.de/screenecho/util/strictjson"
)

type StreamInfo struct {
	clientID     client.ClientID
	previewImage []byte
}

type StreamManager struct {
	activeStreams      map[rooms.RoomID][]*StreamInfo
	activeStreamsMutex sync.RWMutex
	clientMananger     *client.ClientManager
	roomManager        *rooms.RoomManager
}

func NewStreamManager(connManager *connection.ConnectionManager, clientManager *client.ClientManager, roomManager *rooms.RoomManager) *StreamManager {
	sm := &StreamManager{
		activeStreams:  make(map[rooms.RoomID][]*StreamInfo),
		clientMananger: clientManager,
		roomManager:    roomManager,
	}

	connManager.SubscribeMessage("stream-started", sm.handleStreamStarted)
	connManager.SubscribeMessage("stream-stopped", sm.handleStreamStopped)

	return sm
}

// Init initializes the stream-related message subscriptions.
// It subscribes to the "stream-started" and "stream-stopped" messages
// and associates them with their respective handlers.
// func Init() {
// 	connection.SubscribeMessage("stream-started", handleStreamStarted)
// 	connection.SubscribeMessage("stream-stopped", handleStreamStopped)
// }

func (sm *StreamManager) handleStreamStarted(conn *connection.Conn, typedMessage connection.TypedMessage[json.RawMessage]) {
	type StreamStartedMessage struct {
		Name    string
		Quality string
	}

	var message StreamStartedMessage
	err := strictjson.Unmarshal(typedMessage.Msg, &message)
	if err != nil {
		errorMsg := connection.TypedMessage[connection.ErrorMessage]{
			Type: "error",
			Msg: connection.ErrorMessage{
				ErrorMessage: fmt.Sprintf("Message had invalid JSON format. %v", err),
			},
		}

		connection.SendMessage(conn, errorMsg)
		return
	}

	log.Printf("Stream started:")

	// TODO check if stream info already present

	client := sm.clientMananger.GetByWebSocket(conn)
	assert.IsNotNil(client)

	room := sm.roomManager.GetUsersRoom(client.ID)
	assert.IsNotNil(room)

	sm.activeStreamsMutex.Lock()
	defer sm.activeStreamsMutex.Unlock()

	sm.activeStreams[room.RoomID] = append(sm.activeStreams[room.RoomID], &StreamInfo{clientID: client.ID, previewImage: nil})

	rooms.Broadcast(room, typedMessage, client.ID)
}

func (sm *StreamManager) handleStreamStopped(conn *connection.Conn, typedMessage connection.TypedMessage[json.RawMessage]) {
	log.Printf("Stream stopped ")

	// TODO check if stream info was present / remove was successful

	client := sm.clientMananger.GetByWebSocket(conn)
	assert.IsNotNil(client)

	room := sm.roomManager.GetUsersRoom(client.ID)
	assert.IsNotNil(room)

	sm.activeStreamsMutex.Lock()
	defer sm.activeStreamsMutex.Unlock()

	streamsInRoom := sm.activeStreams[room.RoomID]
	for i, stream := range streamsInRoom {
		if stream.clientID == client.ID {
			sm.activeStreams[room.RoomID] = slices.Delete(streamsInRoom, i, i+1)
			break
		}
	}

	rooms.Broadcast(room, typedMessage, client.ID)
}

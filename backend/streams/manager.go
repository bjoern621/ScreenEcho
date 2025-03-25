// Package streams manages active streams within rooms, tracks their lifecycle,
// and informs clients in the room when needed.
package streams

import (
	"encoding/json"
	"fmt"
	"sync"

	"slices"

	"bjoernblessin.de/screenecho/clients"
	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/rooms"
	"bjoernblessin.de/screenecho/util/assert"
	"bjoernblessin.de/screenecho/util/strictjson"
)

type StreamInfo struct {
	clientID     clients.ClientID
	previewImage []byte
}

type StreamManager struct {
	// Holds the actives streams per room.
	// activeStreams[roomID] is not set if there are no active streams in the room.
	activeStreams      map[rooms.RoomID][]*StreamInfo
	activeStreamsMutex sync.RWMutex
	clientMananger     *clients.ClientManager
	roomManager        *rooms.RoomManager
}

func NewStreamManager(clientManager *clients.ClientManager, roomManager *rooms.RoomManager) *StreamManager {
	sm := &StreamManager{
		activeStreams:  make(map[rooms.RoomID][]*StreamInfo),
		clientMananger: clientManager,
		roomManager:    roomManager,
	}

	clientManager.SubscribeMessage("stream-started", sm.handleStreamStarted)
	clientManager.SubscribeMessage("stream-stopped", sm.handleStreamStopped)

	return sm
}

func (sm *StreamManager) handleStreamStarted(client *clients.Client, typedMessage connection.TypedMessage[json.RawMessage]) {
	type StreamStartedMessage struct {
		ClientID string `json:"clientID"`
	}

	var message StreamStartedMessage
	err := strictjson.Unmarshal(typedMessage.Msg, &message)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("Message had invalid JSON format. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	room := sm.roomManager.GetUsersRoom(client.ID)
	assert.IsNotNil(room)

	err = sm.addClientsStream(client.ID, room)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("You already have an active stream. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	client.RegisterDisconnectHandler(func() {
		sm.deleteClientsStream(client.ID, room)
	})

	rooms.Broadcast(room, typedMessage, client.ID)
}

func (sm *StreamManager) handleStreamStopped(client *clients.Client, typedMessage connection.TypedMessage[json.RawMessage]) {
	// TODO check if stream info was present / remove was successful (before broadcasting)

	room := sm.roomManager.GetUsersRoom(client.ID)
	assert.IsNotNil(room)

	sm.deleteClientsStream(client.ID, room)

	rooms.Broadcast(room, typedMessage, client.ID)
}

// addClientsStream adds a new stream for the given client in the specified room.
// If the client already has an active stream in the room, an error is returned.
func (sm *StreamManager) addClientsStream(clientID clients.ClientID, room *rooms.Room) error {
	if sm.activeStreamsContainsClientsStream(room.RoomID, clientID) {
		return fmt.Errorf("Client with ID %v already has an active stream in room %v", clientID, room)
	}

	sm.activeStreamsMutex.Lock()
	defer sm.activeStreamsMutex.Unlock()

	sm.activeStreams[room.RoomID] = append(sm.activeStreams[room.RoomID], &StreamInfo{clientID: clientID, previewImage: nil})

	return nil
}

// activeStreamsContainsClientsStream checks if a client already has an active stream in the given room.
// Returns true if the client has an active stream, otherwise false.
func (sm *StreamManager) activeStreamsContainsClientsStream(roomID rooms.RoomID, clientID clients.ClientID) bool {
	sm.activeStreamsMutex.RLock()
	defer sm.activeStreamsMutex.RUnlock()

	return slices.ContainsFunc(sm.activeStreams[roomID], func(streamInfo *StreamInfo) bool {
		return streamInfo.clientID == clientID
	})
}

// deleteClientsStream removes the stream associated with the given clientID from the specified room.
// If the client does not have an active stream in the room, the function has no effect.
func (sm *StreamManager) deleteClientsStream(clientID clients.ClientID, room *rooms.Room) {
	sm.activeStreamsMutex.Lock()
	defer sm.activeStreamsMutex.Unlock()

	streamsInRoom := sm.activeStreams[room.RoomID]
	for i, stream := range streamsInRoom {
		if stream.clientID == clientID {
			sm.activeStreams[room.RoomID] = slices.Delete(streamsInRoom, i, i+1)
			break
		}
	}

	// Delete room entry in activeStreams map if no more active streams in the room
	if len(sm.activeStreams[room.RoomID]) == 0 {
		delete(sm.activeStreams, room.RoomID)
	}
}

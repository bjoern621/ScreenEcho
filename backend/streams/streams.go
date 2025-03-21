// Package streams manages active streams within rooms, tracks their lifecycle,
// and informs clients in the room when needed.
package streams

import (
	"fmt"
	"log"
	"sync"

	"slices"

	"bjoernblessin.de/screenecho/endpoints/rooms"
	"bjoernblessin.de/screenecho/util/strictjson"
	"github.com/gorilla/websocket"
)

type StreamInfo struct {
	conn         *websocket.Conn
	previewImage []byte
}

var (
	activeStreams      = make(map[rooms.RoomID][]*StreamInfo)
	activeStreamsMutex sync.RWMutex
)

// Initialize initializes the stream-related message subscriptions.
// It subscribes to the "stream-started" and "stream-stopped" messages
// and associates them with their respective handlers.
func Initialize() {
	rooms.SubscribeMessage("stream-started", handleStreamStarted)
	rooms.SubscribeMessage("stream-stopped", handleStreamStopped)
}

func handleStreamStarted(room *rooms.Room, conn *websocket.Conn, typedMessage rooms.TypedMessageRequest) {
	type streamStartedMessage struct {
		Name    string
		Quality string
	}

	var message streamStartedMessage
	err := strictjson.Unmarshal(typedMessage.Msg, &message)
	if err != nil {
		conn.WriteJSON(rooms.TypedMessageResponse{
			Type: "error",
			Msg: rooms.ErrorMessage{
				ErrorMessage: fmt.Sprintf("Message had invalid JSON format. %s", err.Error()),
			},
		})
		return
	}

	log.Printf("Stream started:")

	activeStreamsMutex.Lock()
	activeStreams[room.RoomID] = append(activeStreams[room.RoomID], &StreamInfo{conn: conn, previewImage: nil})
	activeStreamsMutex.Unlock()

	room.Broadcast(typedMessage, conn)
}

func handleStreamStopped(room *rooms.Room, conn *websocket.Conn, typedMessage rooms.TypedMessageRequest) {
	log.Printf("Stream stopped ")

	activeStreamsMutex.Lock()
	defer activeStreamsMutex.Unlock()

	streamsInRoom := activeStreams[room.RoomID]
	for i, stream := range streamsInRoom {
		if stream.conn == conn {
			activeStreams[room.RoomID] = slices.Delete(streamsInRoom, i, i+1)
			break
		}
	}

	room.Broadcast(typedMessage, conn)
}

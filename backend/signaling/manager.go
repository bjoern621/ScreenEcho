// Package signaling provides the necessary mechanisms for establishing
// and managing WebRTC (web real-time communication) connections. In the context of WebRTC, signaling
// is the process of coordinating communication between peers. This involves
// the exchange of metadata required to establish and maintain the connection,
// such as session descriptions (SDP) and ICE (Internet Connectivity Establishment) candidates.
package signaling

import (
	"encoding/json"
	"fmt"

	"bjoernblessin.de/screenecho/clients"
	"bjoernblessin.de/screenecho/connection"
	"bjoernblessin.de/screenecho/util/strictjson"
	"github.com/google/uuid"
)

const SDP_OFFER_MESSAGE_TYPE = "sdp-offer"
const SDP_ANSWER_MESSAGE_TYPE = "sdp-answer"
const ICE_CANDIDATE_MESSAGE_TYPE = "new-ice-candidate"

type SignalingManager struct {
	clientManager *clients.ClientManager
}

func NewSignalingManager(clientManager *clients.ClientManager) *SignalingManager {
	sm := &SignalingManager{
		clientManager: clientManager,
	}

	clientManager.SubscribeMessage(SDP_OFFER_MESSAGE_TYPE, sm.handleSDPOffer)
	clientManager.SubscribeMessage(SDP_ANSWER_MESSAGE_TYPE, sm.handleSDPAnswer)
	clientManager.SubscribeMessage(ICE_CANDIDATE_MESSAGE_TYPE, sm.handleICECandidate)

	return sm
}

// handleSPDOffer handles the SDP offer of a client offering a WebRTC connection.
// The server forwards the offer to the requested remote peer.
func (sm *SignalingManager) handleSDPOffer(client *clients.Client, typedMessage connection.TypedMessage[json.RawMessage]) {
	type ClientSDPOfferMessage struct {
		CalleeClientID string          `json:"calleeClientID"`
		Offer          json.RawMessage `json:"offer"`
	}

	var msg ClientSDPOfferMessage
	err := strictjson.Unmarshal(typedMessage.Msg, &msg)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("Message had invalid JSON format. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	calleeClientID, err := uuid.Parse(msg.CalleeClientID)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("calleeClientID is not a valid UUID. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	calleeClient := sm.clientManager.GetClientByID(clients.ClientID(calleeClientID))
	if calleeClient == nil {
		errorMsg := connection.BuildErrorMessage("Callee client not found.")
		clients.SendMessage(client, errorMsg)
		return
	}

	// SDP offer is valid

	type ServerSDPOfferMessage struct {
		CallerClientID string          `json:"callerClientID"`
		Offer          json.RawMessage `json:"offer"`
	}

	clients.SendMessage(calleeClient, connection.TypedMessage[ServerSDPOfferMessage]{
		Type: SDP_OFFER_MESSAGE_TYPE,
		Msg: ServerSDPOfferMessage{
			CallerClientID: client.ID.String(),
			Offer:          msg.Offer,
		},
	})
}

// handleSDPAnswer handles SDP answer of a user answering an SDP offer.
// The server forwards the answer to the caller.
func (sm *SignalingManager) handleSDPAnswer(client *clients.Client, typedMessage connection.TypedMessage[json.RawMessage]) {
	type SDPAnswerMessage struct {
		CallerClientID string          `json:"callerClientID"`
		Answer         json.RawMessage `json:"answer"`
	}

	var msg SDPAnswerMessage
	err := strictjson.Unmarshal(typedMessage.Msg, &msg)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("Message had invalid JSON format. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	callerClientID, err := uuid.Parse(msg.CallerClientID)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("callerClientID is not a valid UUID. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	callerClient := sm.clientManager.GetClientByID(clients.ClientID(callerClientID))
	if callerClient == nil {
		errorMsg := connection.BuildErrorMessage("Caller client not found.")
		clients.SendMessage(client, errorMsg)
		return
	}

	clients.SendMessage(callerClient, typedMessage)
}

// handleICECandidate processes an ICE candidate message from a client and forwards it to the intended remote client.
// The functions validates the incoming message and sends a modified message to the remote client.
func (sm *SignalingManager) handleICECandidate(client *clients.Client, typedMessage connection.TypedMessage[json.RawMessage]) {
	type ICEMessage struct {
		RemoteClientID string          `json:"remoteClientID"`
		Candidate      json.RawMessage `json:"candidate"`
	}

	var msg ICEMessage
	err := strictjson.Unmarshal(typedMessage.Msg, &msg)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("Message had invalid JSON format. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	remoteClientID, err := uuid.Parse(msg.RemoteClientID)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("remoteClientID is not a valid UUID. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	receiverClient := sm.clientManager.GetClientByID(clients.ClientID(remoteClientID))
	if receiverClient == nil {
		errorMsg := connection.BuildErrorMessage("Remote client not found.")
		clients.SendMessage(client, errorMsg)
		return
	}

	type ServerSDPOfferMessage struct {
		CallerClientID string          `json:"callerClientID"`
		Offer          json.RawMessage `json:"offer"`
	}

	clients.SendMessage(receiverClient, connection.TypedMessage[ICEMessage]{
		// TODO Type: SDP_OFFER_MESSAGE_TYPE,
		Type: ICE_CANDIDATE_MESSAGE_TYPE,
		Msg: ICEMessage{
			// Change remoteClientID to sender client's ID
			RemoteClientID: client.ID.String(),
			Candidate:      msg.Candidate,
		},
	})
}

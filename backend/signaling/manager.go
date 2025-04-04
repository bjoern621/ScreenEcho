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
)

const SDP_OFFER_MESSAGE_TYPE = "sdp-offer"
const SDP_ANSWER_MESSAGE_TYPE = "sdp-answer"

type SignalingManager struct {
	clientManager *clients.ClientManager
}

func NewSignalingManager(clientManager *clients.ClientManager) *SignalingManager {
	sm := &SignalingManager{
		clientManager: clientManager,
	}

	clientManager.SubscribeMessage(SDP_OFFER_MESSAGE_TYPE, sm.handleSDPOffer)
	clientManager.SubscribeMessage(SDP_ANSWER_MESSAGE_TYPE, sm.handleSDPAnswer)

	return sm
}

// handleSPDOffer handles the SDP offer of a client offering a WebRTC connection.
// The server forwards the offer to the requested remote peer.
func (sm *SignalingManager) handleSDPOffer(client *clients.Client, typedMessage connection.TypedMessage[json.RawMessage]) {
	type ClientSDPOfferMessage struct {
		CalleeClientID clients.ClientID `json:"calleeClientID"`
		Offer          json.RawMessage  `json:"offer"`
	}

	var msg ClientSDPOfferMessage
	err := strictjson.Unmarshal(typedMessage.Msg, &msg)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("Message had invalid JSON format. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	calleeClient := sm.clientManager.GetClientByID(msg.CalleeClientID)
	if calleeClient == nil {
		errorMsg := connection.BuildErrorMessage("Callee client not found.")
		clients.SendMessage(client, errorMsg)
		return
	}

	// SDP offer is valid

	type ServerSDPOfferMessage struct {
		CallerClientID clients.ClientID `json:"callerClientID"`
		Offer          json.RawMessage  `json:"offer"`
	}

	clients.SendMessage(calleeClient, connection.TypedMessage[ServerSDPOfferMessage]{
		Type: SDP_OFFER_MESSAGE_TYPE,
		Msg: ServerSDPOfferMessage{
			CallerClientID: client.ID,
			Offer:          msg.Offer,
		},
	})
}

// handleSDPAnswer handles SDP answer of a user answering an SDP offer.
// The server forwards the answer to the caller.
func (sm *SignalingManager) handleSDPAnswer(client *clients.Client, typedMessage connection.TypedMessage[json.RawMessage]) {
	type SDPAnswerMessage struct {
		CallerClientID clients.ClientID `json:"callerClientID"`
		Answer         json.RawMessage  `json:"answer"`
	}

	var msg SDPAnswerMessage
	err := strictjson.Unmarshal(typedMessage.Msg, &msg)
	if err != nil {
		errorMsg := connection.BuildErrorMessage(fmt.Sprintf("Message had invalid JSON format. %v", err))
		clients.SendMessage(client, errorMsg)
		return
	}

	callerClient := sm.clientManager.GetClientByID(msg.CallerClientID)
	if callerClient == nil {
		errorMsg := connection.BuildErrorMessage("Caller client not found.")
		clients.SendMessage(client, errorMsg)
		return
	}

	clients.SendMessage(callerClient, typedMessage)
}

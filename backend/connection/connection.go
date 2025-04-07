// Package connection provides an abstraction for managing bi-directional, real-time connections.
// The underlying implementation uses WebSocket connections. The primary focus of this package
// is to enable the exchange of strongly-typed messages between endpoints.
package connection

const ERROR_MESSAGE_TYPE = "error"

// BuildErrorMessage is a helper function that returns an error message with only ErrorMessage set.
func BuildErrorMessage(msg string) TypedMessage[ErrorMessage] {
	return TypedMessage[ErrorMessage]{
		Type: ERROR_MESSAGE_TYPE,
		Msg: ErrorMessage{
			ErrorMessage: msg,
		},
	}
}

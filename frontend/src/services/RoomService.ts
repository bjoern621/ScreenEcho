import * as Assert from "../util/Assert";

// Represents the currently active WebSocket connection to the server.
// The WebSocket connection state may be anything.
let roomSocket: WebSocket | undefined;

export function connectToRoom(roomID: string): Error | undefined {
    if (roomSocket != undefined) {
        return new Error("Socket is already connected.");
    }

    roomSocket = new WebSocket(
        "ws://localhost:8080/room/" + roomID + "/connect"
    );

    roomSocket.onmessage = event => {
        console.log("response form server: " + event.data);

        const typedMessage: TypedMessage<unknown> = JSON.parse(event.data);

        // Notify all subscribers for this message type
        const handlers = messageHandlers.get(typedMessage.type);
        if (handlers) {
            handlers.forEach(handler => handler(typedMessage));
        }
    };

    roomSocket.onclose = () => {
        roomSocket = undefined;
    };
}

export function closeActiveConnection() {
    Assert.assert(roomSocket);

    roomSocket.close();
}

// Typed messages

export type MessageHandler = (typedMessage: TypedMessage<unknown>) => void;

const messageHandlers: Map<MessageType, MessageHandler[]> = new Map();

type MessageType = string;

export type TypedMessage<T = unknown> = {
    type: MessageType;
    msg: T;
};

export type ErrorMessage = {
    errorMessage: string;
    expected?: string;
    actual?: string;
};

export function sendMessage<T>(message: TypedMessage<T>) {
    Assert.assert(roomSocket);

    roomSocket.send(JSON.stringify(message));
}

/**
 * Subscribe to a specific message type.
 */
export function subscribeMessage(
    messageType: MessageType,
    handler: MessageHandler
): void {
    if (!messageHandlers.has(messageType)) {
        messageHandlers.set(messageType, []);
    }

    const handlers = messageHandlers.get(messageType);
    Assert.assert(handlers);

    handlers.push(handler);
}

/**
 * Unsubscribe from a specific message type.
 * The handler must be subscribed to the message type.
 */
export function unsubscribeMessage(
    messageType: MessageType,
    handler: MessageHandler
): void {
    const handlers = messageHandlers.get(messageType);
    Assert.assert(handlers);
    Assert.assert(handlers.includes(handler));

    const index = handlers.indexOf(handler);
    Assert.assert(index != -1);

    handlers.splice(index, 1);
}

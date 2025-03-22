import * as Assert from "../util/Assert";

export type MessageHandler = (typedMessage: TypedMessage<unknown>) => void;

export type MessageType = string;

export type TypedMessage<T = unknown> = {
    type: MessageType;
    msg: T;
};

export type ErrorMessage = {
    errorMessage: string;
    expected?: string;
    actual?: string;
};

export class RoomService {
    // Represents the currently active WebSocket connection to the server.
    // The WebSocket connection state may be anything.
    private roomSocket: WebSocket | undefined;

    private readonly messageHandlers: Map<MessageType, MessageHandler[]> =
        new Map();

    public connectToRoom(roomID: string): Error | undefined {
        if (this.roomSocket != undefined) {
            return new Error("Socket is already connected.");
        }

        this.roomSocket = new WebSocket(
            "ws://localhost:8080/room/" + roomID + "/connect"
        );

        this.roomSocket.onmessage = event => {
            console.log("response form server: " + event.data);

            if (typeof event.data !== "string") {
                console.error("Invalid message data type:", typeof event.data);
                return;
            }
            const typedMessage: TypedMessage<unknown> = JSON.parse(
                event.data
            ) as TypedMessage<unknown>;

            // Notify all subscribers for this message type
            const handlers = this.messageHandlers.get(typedMessage.type);
            if (handlers) {
                handlers.forEach(handler => handler(typedMessage));
            }
        };
    }

    /**
     * Closes the currently active WebSocket connection if it exists and is open.
     *
     * @returns {boolean} `true` if the connection was successfully closed or was already closed, and `false` if the connection is still in the process of being established.
     */
    public closeActiveConnection(): boolean {
        Assert.assert(this.roomSocket);

        switch (this.roomSocket.readyState) {
            case WebSocket.CONNECTING:
                return false;
            case WebSocket.OPEN:
                this.roomSocket.close();
                this.roomSocket = undefined;
                break;
            case WebSocket.CLOSING:
            case WebSocket.CLOSED:
                this.roomSocket = undefined;
                break;
            default:
                Assert.never();
        }

        return true;
    }

    public sendMessage<T>(message: TypedMessage<T>) {
        Assert.assert(this.roomSocket);

        this.roomSocket.send(JSON.stringify(message));
    }

    /**
     * Subscribe to a specific message type.
     */
    public subscribeMessage(
        messageType: MessageType,
        handler: MessageHandler
    ): void {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }

        const handlers = this.messageHandlers.get(messageType);
        Assert.assert(handlers);

        handlers.push(handler);
    }

    /**
     * Unsubscribe from a specific message type.
     * The handler must be subscribed to the message type.
     */
    public unsubscribeMessage(
        messageType: MessageType,
        handler: MessageHandler
    ): void {
        const handlers = this.messageHandlers.get(messageType);
        Assert.assert(handlers);
        Assert.assert(handlers.includes(handler));

        const index = handlers.indexOf(handler);
        Assert.assert(index != -1);

        handlers.splice(index, 1);
    }
}

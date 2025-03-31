import {
    CLIENT_DISCONNECT_MESSAGE_TYPE,
    ClientDisconnectMessage,
    ClientID,
    RoomService,
    TypedMessage,
} from "./RoomService";

type StreamMessage = {
    clientID: ClientID;
};

type StreamStartedMessage = StreamMessage;
type StreamStoppedMessage = StreamMessage;

const STREAM_STARTED_MESSAGE_TYPE: string = "stream-started";
const STREAM_STOPPED_MESSAGE_TYPE: string = "stream-stopped";

const STREAMS_AVAILABLE_MESSAGE_TYPE: string = "streams-available";

type StreamsAvailableMessage = {
    clientIDs: ClientID[];
};

/**
 * The `StreamsService` class is responsible for managing stream-related operations
 * within a room. It handles subscribing to and sending stream
 * start/stop messages, and processing incoming stream events.
 */
export class StreamsService {
    private readonly roomService: RoomService;

    /**
     * A map that holds the currently active streams in the connected room.
     */
    private readonly activeStreams: Map<ClientID, boolean> = new Map();
    private listeners: ((streams: ClientID[]) => void)[] = [];

    /**
     * Initializes the StreamsService by subscribing to stream-related messages.
     */
    public constructor(roomService: RoomService) {
        this.roomService = roomService;

        roomService.subscribeMessage(STREAM_STARTED_MESSAGE_TYPE, message =>
            this.handleStreamStarted(
                message as TypedMessage<StreamStartedMessage>
            )
        );
        roomService.subscribeMessage(STREAM_STOPPED_MESSAGE_TYPE, message =>
            this.handleStreamStopped(
                message as TypedMessage<StreamStoppedMessage>
            )
        );
        roomService.subscribeMessage(CLIENT_DISCONNECT_MESSAGE_TYPE, message =>
            this.handleClientDisconnect(
                message as TypedMessage<ClientDisconnectMessage>
            )
        );
        roomService.subscribeMessage(STREAMS_AVAILABLE_MESSAGE_TYPE, message =>
            this.handleStreamsAvailable(
                message as TypedMessage<StreamsAvailableMessage>
            )
        );
    }

    /**
     * Clears the current active streams and sets the new active streams based on the provided message.
     */
    private handleStreamsAvailable(
        message: TypedMessage<StreamsAvailableMessage>
    ): void {
        this.activeStreams.clear();

        for (const clientID of message.msg.clientIDs) {
            this.activeStreams.set(clientID, true);
        }
        this.notifyListeners();
    }

    public sendStreamStartedMessage() {
        const streamStarted: TypedMessage<StreamStartedMessage> = {
            type: STREAM_STARTED_MESSAGE_TYPE,
            msg: {
                clientID: this.roomService.getLocalClientID(),
            },
        };

        this.roomService.sendMessage(streamStarted);
    }

    private handleStreamStarted(
        typedMessage: TypedMessage<StreamStartedMessage>
    ): void {
        const clientID = typedMessage.msg.clientID;

        if (!this.activeStreams.has(clientID)) {
            this.activeStreams.set(clientID, true);
            this.notifyListeners();
        }
    }

    public sendStreamStoppedMessage() {
        const streamStopped: TypedMessage<StreamStoppedMessage> = {
            type: STREAM_STOPPED_MESSAGE_TYPE,
            msg: {
                clientID: this.roomService.getLocalClientID(),
            },
        };

        this.roomService.sendMessage(streamStopped);
    }

    private handleStreamStopped(
        typedMessage: TypedMessage<StreamStoppedMessage>
    ): void {
        const clientID = typedMessage.msg.clientID;

        this.deleteStreamIfExists(clientID);
    }

    public subscribe(listener: (streams: ClientID[]) => void): void {
        this.listeners.push(listener);
    }

    public unsubscribe(listener: (streams: ClientID[]) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    public getActiveStreams(): ClientID[] {
        return Array.from(this.activeStreams.keys());
    }

    /**
     * Notifies all registered listeners with the current list of active streams.
     */
    private notifyListeners() {
        const streams = this.getActiveStreams();
        this.listeners.forEach(listener => listener(streams));
    }

    private handleClientDisconnect(
        typedMessage: TypedMessage<ClientDisconnectMessage>
    ): void {
        const clientID = typedMessage.msg.clientID;

        this.deleteStreamIfExists(clientID);
    }

    private deleteStreamIfExists(clientID: ClientID): void {
        if (this.activeStreams.has(clientID)) {
            this.activeStreams.delete(clientID);
            this.notifyListeners();
        }
    }
}

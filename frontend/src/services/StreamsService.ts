import { RoomService, TypedMessage } from "./RoomService";

type StreamStartedMessage = {
    clientID: string;
};

/**
 * The `StreamsService` class is responsible for managing stream-related operations
 * within a room. It handles subscribing to and sending stream
 * start/stop messages, and processing incoming stream events.
 */
export class StreamsService {
    private readonly STREAM_STARTED_MESSAGE_TYPE: string = "stream-started";
    private readonly STREAM_STOPPED_MESSAGE_TYPE: string = "stream-stopped";

    private readonly roomService: RoomService;

    /**
     * Initializes the StreamsService by subscribing to stream-related messages.
     */
    public constructor(roomService: RoomService) {
        this.roomService = roomService;

        roomService.subscribeMessage(
            this.STREAM_STARTED_MESSAGE_TYPE,
            message =>
                this.handleStreamStarted(
                    message as TypedMessage<StreamStartedMessage>
                )
        );
        roomService.subscribeMessage(
            this.STREAM_STOPPED_MESSAGE_TYPE,
            message => this.handleStreamStopped(message)
        );
    }

    public fetchCurrentStreams() {}

    public sendStreamStartedMessage() {
        const streamStarted: TypedMessage<StreamStartedMessage> = {
            type: this.STREAM_STARTED_MESSAGE_TYPE,
            msg: {
                clientID: this.roomService.getLocalClientID(),
            },
        };

        this.roomService.sendMessage(streamStarted);
    }

    private handleStreamStarted(
        typedMessage: TypedMessage<StreamStartedMessage>
    ): void {
        console.log("handled");

        console.log(typedMessage);

        // throw new Error("Function not implemented.");
    }

    public sendStreamStoppedMessage() {
        const streamStopped: TypedMessage<unknown> = {
            type: this.STREAM_STOPPED_MESSAGE_TYPE,
            msg: {},
        };

        this.roomService.sendMessage(streamStopped);
    }

    private handleStreamStopped(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _typedMessage: TypedMessage<unknown>
    ): void {
        console.log("peer ended a stream");

        // throw new Error("Function not implemented.");
    }
}

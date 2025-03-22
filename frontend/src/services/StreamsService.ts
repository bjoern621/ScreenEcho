import { RoomService, TypedMessage } from "./RoomService";

type StreamStartedMessage = {
    Quality: string;
    Name: string;
};

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
                Name: "my super stream",
                Quality: "1440p 120hz",
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

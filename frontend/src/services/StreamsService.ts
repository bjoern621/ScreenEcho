import * as RoomService from "../services/RoomService";
import { TypedMessage } from "../services/RoomService";
// import * as Assert from "../util/Assert";

const STREAM_STARTED_MESSAGE_TYPE: string = "stream-started";
const STREAM_STOPPED_MESSAGE_TYPE: string = "stream-stopped";

/**
 * Initializes the StreamsService by subscribing to stream-related messages.
 */
export function Init() {
    RoomService.subscribeMessage(
        STREAM_STARTED_MESSAGE_TYPE,
        handleStreamStarted as RoomService.MessageHandler
    );
    RoomService.subscribeMessage(
        STREAM_STOPPED_MESSAGE_TYPE,
        handleStreamStopped
    );
}

type StreamStartedMessage = {
    Quality: string;
    Name: string;
};

export function sendStreamStartedMessage() {
    const streamStarted: TypedMessage<StreamStartedMessage> = {
        type: STREAM_STARTED_MESSAGE_TYPE,
        msg: {
            Name: "my super stream",
            Quality: "1440p 120hz",
        },
    };

    RoomService.sendMessage(streamStarted);
}

function handleStreamStarted(
    typedMessage: TypedMessage<StreamStartedMessage>
): void {
    console.log("handled");

    console.log(typedMessage);

    // throw new Error("Function not implemented.");
}

export function sendStreamStoppedMessage() {
    const streamStopped: TypedMessage<unknown> = {
        type: STREAM_STOPPED_MESSAGE_TYPE,
        msg: {},
    };

    RoomService.sendMessage(streamStopped);
}

function handleStreamStopped(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _typedMessage: TypedMessage<unknown>
): void {
    console.log("peer ended a stream");

    // throw new Error("Function not implemented.");
}

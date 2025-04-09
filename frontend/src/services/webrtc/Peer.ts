import { TypedMessage } from "../RoomService";

export type StreamStats = {
    codec: string;
    frameWidth: number | undefined;
    frameHeight: number | undefined;
    framesPerSecond: number | undefined;
    jitter: number | undefined;
};

/**
 * Represents a Peer responsible for establishing and managing a WebRTC connection.
 * This class handles session negotiation, ICE candidates, and media track handling
 * for a remote client.
 */
export interface Peer {
    /**
     * Establishes a WebRTC connection with the remote peer associated with this peer.
     * `mediaStream` is the local media stream that will be sent to the remote peer.
     * `start` can be called multiple times if needed (e.g. the local stream changes).
     * If `mediaStream` is `undefined`, the peer will only receive media tracks.
     */
    start(mediaStream: MediaStream | undefined): void;

    /**
     * This method is called when an SDP message, that is specific to this peer, is received.
     */
    onSDPMessageReceived(msg: TypedMessage<unknown>): Promise<void>;

    /**
     * This method is called when an ICE candidate message, that is specific to this peer, is received.
     */
    onICECandidateReceived(msg: TypedMessage<unknown>): Promise<void>;

    /**
     * Sets a callback function that will be invoked whenever a new media track is received from the remote peer.
     * The callback receives the MediaStream containing the newly received track.
     */
    setTrackReceivedCallback(callback: (stream: MediaStream) => void): void;

    /**
     * Gets the current stats for a specific media track from the WebRTC connection.
     * The promise will never reject.
     * The caller must assure that the track is valid and belongs to this peer connection.
     */
    getStats(): Promise<StreamStats>;
}

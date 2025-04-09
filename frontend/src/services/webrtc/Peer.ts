import { TypedMessage } from "../RoomService";

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

    setTrackReceivedCallback(callback: (stream: MediaStream) => void): void;
}

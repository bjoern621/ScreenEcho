import { TypedMessage } from "../RoomService";

/**
 * Represents a Peer responsible for establishing and managing a WebRTC connection.
 * This class handles session negotiation, ICE candidates, and media track handling
 * for a remote client.
 */
export interface Peer {
    /**
     * Establishes a WebRTC connection with the remote peer associated with this peer.
     */
    makeCall(): void;

    /**
     * Adds all media tracks from the `mediaStream` to the peer connection.
     * The remote client may receive these tracks.
     */
    setLocalStream(mediaStream: MediaStream): void;

    /**
     * This method is called when an SDP message, that is specific to this peer, is received.
     */
    onSDPMessageReceived(msg: TypedMessage<unknown>): Promise<void>;

    /**
     * This method is called when an ICE candidate message, that is specific to this peer, is received.
     */
    onICECandidateReceived(msg: TypedMessage<unknown>): Promise<void>;
}

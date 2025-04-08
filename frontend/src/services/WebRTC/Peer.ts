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
}

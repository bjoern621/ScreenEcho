export interface Peer {
    /**
     * Establishes a WebRTC connection with a remote peer identified by the given `clientID`.
     */
    makeCall(): void;
    setLocalStream(mediaStream: MediaStream): void;
}

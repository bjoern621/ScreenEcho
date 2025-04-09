import { assert } from "../../util/Assert";
import { IObservable, Observable } from "../../util/observer/Observable";
import { Observer } from "../../util/observer/Observer";
import { ClientID, RoomService, TypedMessage } from "../RoomService";
import { Peer } from "./Peer";
import { PerfectPeer } from "./PerfectPeer";

export const NEW_ICE_CANDIDATE_MESSAGE_TYPE: string = "new-ice-candidate";
export const SDP_MESSAGE_TYPE: string = "sdp-message";

export type NEWIceCandidateMessage = {
    remoteClientID: ClientID;
    candidate: RTCIceCandidateInit;
};

export type SDPMessage = {
    remoteClientID: ClientID;
    description: RTCSessionDescriptionInit;
};

export class WebRTCService
    implements IObservable<{ clientID: ClientID; stream: MediaStream }>
{
    private readonly roomService: RoomService;

    private readonly peers: Map<ClientID, Peer> = new Map();

    private readonly remoteStreamObservable: IObservable<{
        clientID: ClientID;
        stream: MediaStream;
    }> = new Observable<{ clientID: ClientID; stream: MediaStream }>();

    // The local stream is saved here, so it can be added to new peer connections later.
    private localStream: MediaStream | undefined = undefined;

    public constructor(roomService: RoomService) {
        this.roomService = roomService;

        this.forwardSDPMessageToRespectivePeer();
        this.forwardICECandidateToRespectivePeer();
    }

    /**
     * Sets up a subscription to forward ICE candidates to their respective peer connections.
     *
     * This method subscribes to ICE candidate messages from the room service and routes them
     * to the appropriate peer connection. When a new ICE candidate message is received,
     * it checks if the targeted peer exists in the peers collection and forwards
     * the candidate information to that peer's handler.
     */
    private forwardICECandidateToRespectivePeer() {
        this.roomService.subscribeMessage(
            NEW_ICE_CANDIDATE_MESSAGE_TYPE,
            message => {
                const msg = message as TypedMessage<NEWIceCandidateMessage>;

                if (!this.peers.has(msg.msg.remoteClientID)) {
                    return;
                }

                void this.peers
                    .get(msg.msg.remoteClientID)!
                    .onICECandidateReceived(msg);
            }
        );
    }

    /**
     * Sets up a subscription to SDP (Session Description Protocol) messages from the room service
     * and forwards them to the appropriate peer connection.
     *
     * This may be called even if the peer connection is not yet setup.
     * The peer connection will be setup when the first SDP message is received.
     */
    private forwardSDPMessageToRespectivePeer() {
        this.roomService.subscribeMessage(SDP_MESSAGE_TYPE, message => {
            const msg = message as TypedMessage<SDPMessage>;

            if (!this.peers.has(msg.msg.remoteClientID)) {
                // A remote peer is trying to connect to us.
                this.setupPeer(msg.msg.remoteClientID);
            }

            void this.peers
                .get(msg.msg.remoteClientID)!
                .onSDPMessageReceived(msg);
        });
    }

    /**
     * Initiates a WebRTC call to a specified peer.
     */
    public establishConnectionWithPeer(clientID: ClientID) {
        assert(!this.peers.has(clientID), "Connection to peer already exists");

        this.setupPeer(clientID);
    }

    /**
     * Sets up a new peer connection for the specified remote client ID.
     * This is called just before the local client makes a call to a remote client.
     * It is also called when a remote client wants to connect to the local client.
     */
    private setupPeer(remoteClientID: ClientID) {
        assert(!this.peers.has(remoteClientID), "Peer already exists");

        const peer: Peer = new PerfectPeer(this.roomService, remoteClientID);
        this.peers.set(remoteClientID, peer);

        peer.setTrackReceivedCallback(stream => {
            this.notify({ clientID: remoteClientID, stream });
        });

        peer.start(this.localStream);
    }

    /**
     * Returns whether a peer connection exists for the specified client ID.
     * This includes connections that are in the process of being established.
     */
    public hasPeerConnection(clientID: ClientID): boolean {
        return this.peers.has(clientID);
    }

    /**
     * Sets the local media stream for all connected peers.
     */
    public setLocalStream(stream: MediaStream): void {
        this.localStream = stream;

        // TODO it may happen that the local stream is set in a peer connection where the remote client doesnt want to view the stream.
        // In this case, we should not set the local stream for that peer connection.
        // ? Local stream should be set, if at least one remote is watching / wants to watch the stream. ?

        // Iterate over all peers and set the local stream for each one
        this.peers.forEach(peer => {
            peer.start(stream);
        });
    }

    public subscribe(
        observer: Observer<{ clientID: ClientID; stream: MediaStream }>
    ): void {
        this.remoteStreamObservable.subscribe(observer);
    }

    public unsubscribe(
        observer: Observer<{ clientID: ClientID; stream: MediaStream }>
    ): void {
        this.remoteStreamObservable.unsubscribe(observer);
    }

    public notify(data: { clientID: ClientID; stream: MediaStream }): void {
        this.remoteStreamObservable.notify(data);
    }
}

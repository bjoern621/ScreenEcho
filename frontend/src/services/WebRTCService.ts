import { assert } from "../util/Assert";
import { IObservable, Observable } from "../util/observer/Observable";
import { Observer } from "../util/observer/Observer";
import { ClientID, RoomService, TypedMessage } from "./RoomService";
import { Peer } from "./WebRTC/Peer";
import { PerfectPeer } from "./WebRTC/PerfectPeer";

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

const CONNECTION_REQUEST_MESSAGE_TYPE: string = "connection-request";

type ConnectionRequestMessage = {
    remoteClientID: ClientID;
};

export class WebRTCService
    implements IObservable<{ clientID: ClientID; stream: MediaStream }>
{
    private readonly roomService: RoomService;

    private readonly peers: Map<ClientID, Peer> = new Map();

    private readonly observable: IObservable<{
        clientID: ClientID;
        stream: MediaStream;
    }> = new Observable<{ clientID: ClientID; stream: MediaStream }>();

    public constructor(roomService: RoomService) {
        this.roomService = roomService;

        // TODO timeout test (comment out)

        roomService.subscribeMessage(
            CONNECTION_REQUEST_MESSAGE_TYPE,
            message => {
                this.handleConnectionRequest(
                    message as TypedMessage<ConnectionRequestMessage>
                );
            }
        );

        this.forwardSDPMessageToRespectivePeer();
        this.forwardICECandidateToRespectivePeer();
    }

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

    private forwardSDPMessageToRespectivePeer() {
        this.roomService.subscribeMessage(SDP_MESSAGE_TYPE, message => {
            const msg = message as TypedMessage<SDPMessage>;

            if (!this.peers.has(msg.msg.remoteClientID)) {
                return;
            }

            void this.peers
                .get(msg.msg.remoteClientID)!
                .onSDPMessageReceived(msg);
        });
    }

    /**
     * Handles an incoming connection request from a remote client.
     * The remote client previously set up a peer connection and is now ready to establish a call.
     */
    private handleConnectionRequest(
        msg: TypedMessage<ConnectionRequestMessage>
    ): void {
        if (!this.peers.has(msg.msg.remoteClientID)) {
            this.setupPeer(msg.msg.remoteClientID);
        }
        this.establishConnectionWithPeer(msg.msg.remoteClientID);
    }

    // TODO perfect peer receiving messages that are not for them (differnet remote clientID)
    // TODO calling makeCall twice

    /**
     * Initiates a WebRTC call to a specified peer.
     * If a connection with the peer already exists, it uses the existing connection to make the call.
     * Otherwise, it sets up a new peer connection and sends a connection request.
     */
    public establishConnectionWithPeer(clientID: ClientID) {
        if (this.peers.has(clientID)) {
            this.peers.get(clientID)!.makeCall();
        } else {
            this.setupPeer(clientID);

            this.sendConnectionRequest(clientID);
        }
    }

    private sendConnectionRequest(clientID: ClientID) {
        const connectionRequestMessage: TypedMessage<ConnectionRequestMessage> =
            {
                type: CONNECTION_REQUEST_MESSAGE_TYPE,
                msg: {
                    remoteClientID: clientID,
                },
            };
        this.roomService.sendMessage(connectionRequestMessage);
    }

    public setupPeer(clientID: ClientID) {
        assert(!this.peers.has(clientID), "Peer already exists");

        const peer: Peer = new PerfectPeer(this.roomService, clientID);
        this.peers.set(clientID, peer);
    }

    /**
     * Returns whether a peer connection exists for the specified client ID.
     * This includes connections that are in the process of being established.
     */
    public hasPeerConnection(clientID: ClientID): boolean {
        return this.peers.has(clientID);
    }

    public subscribe(
        observer: Observer<{ clientID: ClientID; stream: MediaStream }>
    ): void {
        this.observable.subscribe(observer);
    }

    public unsubscribe(
        observer: Observer<{ clientID: ClientID; stream: MediaStream }>
    ): void {
        this.observable.unsubscribe(observer);
    }

    public notify(data: { clientID: ClientID; stream: MediaStream }): void {
        this.observable.notify(data);
    }
}

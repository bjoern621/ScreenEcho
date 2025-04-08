import { assert } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import { IObservable, Observable } from "../util/observer/Observable";
import { Observer } from "../util/observer/Observer";
import { ClientID, RoomService, TypedMessage } from "./RoomService";
import { Peer } from "./WebRTC/Peer";
import { PerfectPeer } from "./WebRTC/PerfectPeer";

const SDP_OFFER_MESSAGE_TYPE: string = "sdp-offer";
const SDP_ANSWER_MESSAGE_TYPE: string = "sdp-answer";
const NEW_ICE_CANDIDATE_MESSAGE_TYPE: string = "new-ice-candidate";

type ClientSDPOfferMessage = {
    calleeClientID: ClientID;
    offer: RTCSessionDescriptionInit;
};

type ServerSDPOfferMessage = {
    callerClientID: ClientID;
    offer: RTCSessionDescriptionInit;
};

type SDPAnswerMessage = {
    callerClientID: ClientID;
    answer: RTCSessionDescriptionInit;
};

type NEWIceCandidateMessage = {
    remoteClientID: ClientID;
    candidate: RTCIceCandidateInit;
};

const RTCConfig: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
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

    private localStream: MediaStream | undefined = undefined;

    public constructor(roomService: RoomService) {
        this.roomService = roomService;

        // TODO timeout test (comment out)
        roomService.subscribeMessage(SDP_OFFER_MESSAGE_TYPE, message => {
            void this.handleSDPOffer(
                message as TypedMessage<ServerSDPOfferMessage>
            );
        });
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

    /**
     * Establishes a WebRTC connection with a remote peer identified by the given `clientID`.
     * This method handles the creation of an RTCPeerConnection, negotiation of SDP offers/answers,
     * and the exchange of ICE candidates. It also manages local media tracks and listens for
     * remote media streams.
     */
    public makePerfectCall(clientID: ClientID) {
        assert(this.peers.has(clientID), "Peer doesn't exist");

        this.peers.get(clientID)!.makeCall();
    }

    public setupPeer(clientID: ClientID) {
        assert(!this.peers.has(clientID), "Peer already exists");

        const peer: Peer = new PerfectPeer(this.roomService, clientID);
        this.peers.set(clientID, peer);
    }

    public setLocalStream(stream: MediaStream) {
        this.localStream = stream;
        // this.localStream.getTracks().forEach(track => {
        //     console.log("Adding track: ", track);
        //     this.peers.forEach(peer => {
        //         peer.addTrack(track, this.localStream!);
        //     });
        // });
    }

    /**
     * Returns whether a peer connection exists for the specified client ID.
     * This includes connections that are in the process of being established.
     */
    public hasPeerConnection(clientID: ClientID): boolean {
        return this.peers.has(clientID);
    }

    // TODO rename to addRemoteStream / addRemoteTrack
    public addLocalStream(clientID: ClientID, stream: MediaStream) {
        assert(
            this.peers.has(clientID),
            "Peer connection does not exist for this client ID"
        );

        // this.peers.get(clientID)!.addTrack(stream.getTracks()[0], stream);
    }

    private async handleSDPOffer(
        typedMessage: TypedMessage<ServerSDPOfferMessage>
    ) {
        assert(
            !this.peers.has(typedMessage.msg.callerClientID),
            "Peer already exists"
        );

        console.log("Received offer");

        const peer = new RTCPeerConnection(RTCConfig);

        peer.onnegotiationneeded = () => {
            console.log("Negotiation needed 2");
        };

        peer.ontrack = event => {
            console.log("callee Received remote track");

            const [remoteStream] = event.streams;
            this.notify({
                clientID: typedMessage.msg.callerClientID,
                stream: remoteStream,
            });
        };

        // TODO
        // this.localStream.getTracks().forEach(track => {
        //     console.log("Adding track: ", track);
        //     peer.addTrack(track, this.localStream!);
        // });

        // this.listenToRemoteICECandidates(peer, typedMessage.msg.callerClientID);
        this.gatherICECandidates(peer, typedMessage.msg.callerClientID);

        const remoteDesc = new RTCSessionDescription(typedMessage.msg.offer);
        await peer.setRemoteDescription(remoteDesc);

        const answer: RTCSessionDescriptionInit = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        const answerMessage: TypedMessage<SDPAnswerMessage> = {
            type: SDP_ANSWER_MESSAGE_TYPE,
            msg: {
                callerClientID: typedMessage.msg.callerClientID,
                answer: answer,
            },
        };
        this.roomService.sendMessage(answerMessage);

        this.peers.set(typedMessage.msg.callerClientID, peer);

        peer.onconnectionstatechange = () => {
            console.log(peer.connectionState);
        };
    }

    /**
     * Initiates a WebRTC call to the specified client by creating an offer and sending it
     * through the signaling service. Listens for an SDP answer to establish the connection.
     */
    public async makeCall(clientID: ClientID) {
        assert(!this.peers.has(clientID), "Peer already exists");

        console.log("Making call");

        const peer = new RTCPeerConnection(RTCConfig);

        peer.onnegotiationneeded = async () => {
            console.log("Negotiation needed");

            await this.makeCall(clientID);
            return;
        };

        peer.ontrack = event => {
            console.log("caller Received remote track");

            const [remoteStream] = event.streams;
            this.notify({ clientID, stream: remoteStream });
        };

        // this.listenToRemoteICECandidates(peer, clientID);
        this.gatherICECandidates(peer, clientID);

        peer.addTransceiver("video", { direction: "sendrecv" });
        peer.addTransceiver("audio", { direction: "sendrecv" });

        // Create a PeerConnection with no streams, but force a audio and video line.
        const offer: RTCSessionDescriptionInit = await peer.createOffer({
            // offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await peer.setLocalDescription(offer);

        const offerMessage: TypedMessage<ClientSDPOfferMessage> = {
            type: SDP_OFFER_MESSAGE_TYPE,
            msg: {
                calleeClientID: clientID,
                offer: offer,
            },
        };
        this.roomService.sendMessage(offerMessage);

        this.roomService.subscribeMessage(SDP_ANSWER_MESSAGE_TYPE, message => {
            void (async () => {
                console.log("Received answer");

                const msg = message as TypedMessage<SDPAnswerMessage>;
                const remoteDesc = new RTCSessionDescription(msg.msg.answer);
                await peer.setRemoteDescription(remoteDesc);
            })();
        });

        this.peers.set(clientID, peer);

        peer.onconnectionstatechange = () => {
            console.log(peer.connectionState);
        };
    }

    private gatherICECandidates(
        peer: RTCPeerConnection,
        remoteClientID: ClientID
    ) {
        peer.onicecandidate = event => {
            if (event.candidate) {
                const iceCandidateMessage: TypedMessage<NEWIceCandidateMessage> =
                    {
                        type: NEW_ICE_CANDIDATE_MESSAGE_TYPE,
                        msg: {
                            remoteClientID: remoteClientID,
                            candidate: event.candidate.toJSON(),
                        },
                    };
                this.roomService.sendMessage(iceCandidateMessage);
            } else {
                /* There are no more candidates coming during this negotiation */
                console.log("ICE candidate gathering finished");
            }
        };
    }
}

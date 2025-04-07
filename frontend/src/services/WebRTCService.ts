import { assert } from "../util/Assert";
import { IObservable, Observable } from "../util/observer/observable";
import { Observer } from "../util/observer/Observer";
import { ClientID, RoomService, TypedMessage } from "./RoomService";

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

    // private readonly peers: Map<ClientID, RTCPeerConnection> = new Map();

    private localStream: MediaStream | undefined = undefined;

    private readonly observable: IObservable<{
        clientID: ClientID;
        stream: MediaStream;
    }> = new Observable<{ clientID: ClientID; stream: MediaStream }>();

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

    private async handleSDPOffer(
        typedMessage: TypedMessage<ServerSDPOfferMessage>
    ) {
        console.log("Received offer");

        // assert(
        //     !this.peers.has(typedMessage.msg.callerClientID),
        //     "Peer already exists"
        // );

        assert(
            this.localStream,
            "Local stream must be set before handling an offer"
        );

        const peer = new RTCPeerConnection(RTCConfig);

        // TODO
        this.localStream.getTracks().forEach(track => {
            console.log("Adding track: ", track);
            peer.addTrack(track, this.localStream!);
        });

        this.listenToRemoteICECandidates(peer, typedMessage.msg.callerClientID);
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

        // this.peers.set(typedMessage.msg.callerClientID, peer);

        peer.onconnectionstatechange = () => {
            console.log(peer.connectionState);
        };
    }

    /**
     * Initiates a WebRTC call to the specified client by creating an offer and sending it
     * through the signaling service. Listens for an SDP answer to establish the connection.
     */
    public async makeCall(clientID: ClientID) {
        console.log("Making call");

        // assert(!this.peers.has(clientID), "Peer already exists");

        const peer = new RTCPeerConnection(RTCConfig);

        this.listenToRemoteICECandidates(peer, clientID);
        this.gatherICECandidates(peer, clientID);

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

        // this.peers.set(clientID, peer);

        peer.onconnectionstatechange = () => {
            console.log(peer.connectionState);
        };

        peer.ontrack = event => {
            const [remoteStream] = event.streams;
            console.log(remoteStream);
            this.notify({ clientID, stream: remoteStream });
            // this.listeners.forEach(listener => {
            //     listener(clientID, remoteStream);
            // });
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

    private listenToRemoteICECandidates(
        peer: RTCPeerConnection,
        remoteClientID: ClientID
    ) {
        this.roomService.subscribeMessage(
            NEW_ICE_CANDIDATE_MESSAGE_TYPE,
            message => {
                void (async () => {
                    const msg = message as TypedMessage<NEWIceCandidateMessage>;

                    if (msg.msg.remoteClientID !== remoteClientID) {
                        return;
                    }

                    const candidate = new RTCIceCandidate(msg.msg.candidate);
                    await peer.addIceCandidate(candidate);
                })();
            }
        );
    }

    public setLocalStream(mediaStream: MediaStream | undefined) {
        this.localStream = mediaStream;
    }
}

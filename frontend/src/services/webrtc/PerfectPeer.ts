import errorAsValue from "../../util/ErrorAsValue";
import { ClientID, RoomService, TypedMessage } from "../RoomService";
import { Peer } from "./Peer";
import {
    SDPMessage,
    SDP_MESSAGE_TYPE,
    NEWIceCandidateMessage,
    NEW_ICE_CANDIDATE_MESSAGE_TYPE,
} from "./WebRTCService";

const RTCConfig: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

export class PerfectPeer implements Peer {
    private peerConnection!: RTCPeerConnection;

    private readonly roomService: RoomService;

    private readonly remoteClientID: ClientID;

    private makingOffer: boolean = false;

    private ignoreOffer = false;
    private isSettingRemoteAnswerPending = false;
    private readonly polite: boolean;

    private trackReceivedCallback: ((stream: MediaStream) => void) | undefined =
        undefined;

    public constructor(roomService: RoomService, remoteClientID: ClientID) {
        this.roomService = roomService;
        this.remoteClientID = remoteClientID;

        this.polite = this.roomService.getLocalClientID() < remoteClientID;

        this.setupPeerConnection();
        this.handleIncomingTracks();
        this.handleNegotiationNeeded();
        this.handleIncomingICECandidates();
    }

    private setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection(RTCConfig);
    }

    private handleIncomingTracks() {
        this.peerConnection.ontrack = ({ track, streams }) => {
            console.log(track.getSettings().aspectRatio);
            console.log(track.getSettings().frameRate);
            console.log(track.getSettings().width);

            if (streams.length != 1) {
                return;
            }

            if (this.trackReceivedCallback) {
                this.trackReceivedCallback(streams[0]);
            }
        };
    }

    private handleNegotiationNeeded() {
        this.peerConnection.onnegotiationneeded = async () => {
            console.log("Negotiation needed");

            this.makingOffer = true;

            const [, err] = await errorAsValue(
                this.peerConnection.setLocalDescription()
            );
            if (err) {
                console.error("Error setting local description:", err);
            } else {
                console.log("here");

                const descriptionMessage: TypedMessage<SDPMessage> = {
                    type: SDP_MESSAGE_TYPE,
                    msg: {
                        remoteClientID: this.remoteClientID,
                        description: this.peerConnection.localDescription!,
                    },
                };
                this.roomService.sendMessage(descriptionMessage);
            }

            this.makingOffer = false;
        };
    }

    private handleIncomingICECandidates() {
        this.peerConnection.onicecandidate = event => {
            if (event.candidate) {
                const iceCandidateMessage: TypedMessage<NEWIceCandidateMessage> =
                    {
                        type: NEW_ICE_CANDIDATE_MESSAGE_TYPE,
                        msg: {
                            remoteClientID: this.remoteClientID,
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

    private async handleRemoteSDPMessage(msg: TypedMessage<SDPMessage>) {
        console.log(this.remoteClientID + " received SDP message");

        const readyForOffer =
            !this.makingOffer &&
            (this.peerConnection.signalingState === "stable" ||
                this.isSettingRemoteAnswerPending);
        const offerCollision =
            msg.msg.description.type === "offer" && !readyForOffer;

        this.ignoreOffer = !this.polite && offerCollision;
        if (this.ignoreOffer) {
            return;
        }

        this.isSettingRemoteAnswerPending =
            msg.msg.description.type === "answer";
        const [,] = await errorAsValue(
            this.peerConnection.setRemoteDescription(msg.msg.description)
        );
        this.isSettingRemoteAnswerPending = false;
        if (msg.msg.description.type === "offer") {
            await this.peerConnection.setLocalDescription();

            const descriptionMessage: TypedMessage<SDPMessage> = {
                type: SDP_MESSAGE_TYPE,
                msg: {
                    remoteClientID: this.remoteClientID,
                    description: this.peerConnection.localDescription!,
                },
            };
            this.roomService.sendMessage(descriptionMessage);
        }

        const remoteDesc = new RTCSessionDescription(msg.msg.description);
        const [,] = await errorAsValue(
            this.peerConnection.setRemoteDescription(remoteDesc)
        );
    }

    private async handleRemoteICECandidate(
        msg: TypedMessage<NEWIceCandidateMessage>
    ) {
        if (msg.msg.remoteClientID !== this.remoteClientID) {
            return;
        }

        const candidate = new RTCIceCandidate(msg.msg.candidate);
        const [, err] = await errorAsValue(
            this.peerConnection.addIceCandidate(candidate)
        );
        if (err) {
            if (!this.ignoreOffer) {
                console.error("Error adding ICE candidate:", err);
            }
        }
    }

    public async onSDPMessageReceived(
        msg: TypedMessage<unknown>
    ): Promise<void> {
        await this.handleRemoteSDPMessage(msg as TypedMessage<SDPMessage>);
    }

    public async onICECandidateReceived(
        msg: TypedMessage<unknown>
    ): Promise<void> {
        await this.handleRemoteICECandidate(
            msg as TypedMessage<NEWIceCandidateMessage>
        );
    }

    public start(mediaStream: MediaStream | undefined): void {
        console.log("Making perfect call");

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
                console.log("Adding track: ", track);
                this.peerConnection.addTrack(track, mediaStream);
            });
        } else {
            this.peerConnection.addTransceiver("video", {
                direction: "recvonly",
            });
            this.peerConnection.addTransceiver("audio", {
                direction: "recvonly",
            });
        }
    }

    public setTrackReceivedCallback(
        callback: (stream: MediaStream) => void
    ): void {
        this.trackReceivedCallback = callback;
    }
}

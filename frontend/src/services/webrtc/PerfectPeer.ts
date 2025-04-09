import { never } from "../../util/Assert";
import errorAsValue from "../../util/ErrorAsValue";
import { ClientID, RoomService, TypedMessage } from "../RoomService";
import { Peer, StreamStats } from "./Peer";
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
        this.peerConnection.ontrack = ({ streams }) => {
            console.log("Track received:", streams[0]);

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
            this.makingOffer = true;

            const [, err] = await errorAsValue(
                this.peerConnection.setLocalDescription()
            );
            if (err) {
                console.error("Error setting local description:", err);
            } else {
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
            }
        };
    }

    private async handleRemoteSDPMessage(msg: TypedMessage<SDPMessage>) {
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

        // const remoteDesc = new RTCSessionDescription(msg.msg.description);
        // const [,] = await errorAsValue(
        //     this.peerConnection.setRemoteDescription(remoteDesc)
        // );
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
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
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

    public async getStats(): Promise<StreamStats> {
        const [stats, err] = await errorAsValue(this.peerConnection.getStats());
        if (err) {
            never(
                "There is no RTCRtpSender or RTCRtpReceiver whose track matches the specified selector, or selector matches more than one sender or receiver. " +
                    err.message
            );
        }

        const streamStats: StreamStats = {
            codec: "",
            frameWidth: undefined,
            frameHeight: undefined,
            framesPerSecond: undefined,
            jitter: undefined,
        };

        stats.forEach((report: RTCStats) => {
            if (report.type === "codec") {
                streamStats.codec = (report as unknown as RTCRtpCodec).mimeType;
            } else if (
                report.type === "inbound-rtp" &&
                (report as RTCRtpStreamStats).kind === "video"
            ) {
                const inboundReport = report as RTCInboundRtpStreamStats;

                streamStats.frameWidth = inboundReport.frameWidth;
                streamStats.frameHeight = inboundReport.frameHeight;
                streamStats.framesPerSecond = inboundReport.framesPerSecond;
                streamStats.jitter = inboundReport.jitter;
            }
        });

        return streamStats;
    }
}

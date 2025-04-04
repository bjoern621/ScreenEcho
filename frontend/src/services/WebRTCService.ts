import { assert } from "../util/Assert";
import { ClientID, RoomService, TypedMessage } from "./RoomService";

const SDP_OFFER_MESSAGE_TYPE: string = "sdp-offer";
const SDP_ANSWER_MESSAGE_TYPE: string = "sdp-answer";

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

const RTCConfig: RTCConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302",
        },
    ],
};

export class WebRTCService {
    private readonly roomService: RoomService;

    private readonly peers: Map<ClientID, RTCPeerConnection> = new Map();

    public constructor(roomService: RoomService) {
        this.roomService = roomService;

        roomService.subscribeMessage(
            SDP_OFFER_MESSAGE_TYPE,
            message =>
                void this.handleSDPOffer(
                    message as TypedMessage<ServerSDPOfferMessage>
                )
        );
    }

    private async handleSDPOffer(
        typedMessage: TypedMessage<ServerSDPOfferMessage>
    ) {
        console.log("Received offer");

        assert(
            !this.peers.has(typedMessage.msg.callerClientID),
            "Peer already exists"
        );

        const peer = new RTCPeerConnection(RTCConfig);

        this.peers.set(typedMessage.msg.callerClientID, peer);

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
    }

    /**
     * Initiates a WebRTC call to the specified client by creating an offer and sending it
     * through the signaling service. Listens for an SDP answer to establish the connection.
     */
    public async makeCall(clientID: ClientID) {
        console.log("Making call");

        assert(!this.peers.has(clientID), "Peer already exists");

        const peer = new RTCPeerConnection(RTCConfig);

        this.peers.set(clientID, peer);

        const offer: RTCSessionDescriptionInit = await peer.createOffer();
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
                const msg = message as TypedMessage<SDPAnswerMessage>;
                const remoteDesc = new RTCSessionDescription(msg.msg.answer);
                await peer.setRemoteDescription(remoteDesc);
            })();
        });
    }
}

// export function reuqe() {}

// export class WebRTCService {
//     private peer1: RTCPeerConnection = new RTCPeerConnection(RTCConfig);
//     private signalingSocket: WebSocket = new WebSocket(
//         "ws://localhost:8080/sdp"
//     );

//     // export function attachMediaTrack(track: MediaStreamTrack) {
//     //     peer1.addTrack(track);
//     // }

//     // type SDPMessage = {
//     //     offer?: RTCSessionDescriptionInit;
//     //     answer?: RTCSessionDescriptionInit;
//     // };

//     /**
//      * Makes a call to the server to establish a WebRTC connection.
//      */
//     public async makeCall() {
//         console.log("Making call");

//         // peer1 = new RTCPeerConnection(RTCConfig);
//         const offer: RTCSessionDescriptionInit = await this.peer1.createOffer();
//         await this.peer1.setLocalDescription(offer);

//         // signalingSocket = new WebSocket("ws://localhost:8080/sdp");
//         // const signalingSocket: WebSocket = new WebSocket("ws://localhost:8080/sdp");

//         this.signalingSocket.onopen = () =>
//             this.signalingSocket.send(JSON.stringify({ offer: offer }));

//         this.signalingSocket.onmessage = async event => {
//             console.log("here");
//             const data = JSON.parse(event.data);

//             if (data.answer) {
//                 console.log("Received answer");

//                 const answer: RTCSessionDescriptionInit = data.answer;

//                 const remoteDesc = new RTCSessionDescription(answer);
//                 await this.peer1.setRemoteDescription(remoteDesc);
//             }
//         };
//     }

//     public listenToJoiningUsers() {
//         // const peer2 = new RTCPeerConnection(RTCConfig);
//         const dwadwa = 4;
//         console.log(dwadwa);

//         // const signalingSocket: WebSocket = new WebSocket("ws://localhost:8080/sdp");
//         console.log("a");

//         this.signalingSocket.addEventListener("message", async event => {
//             console.log("abc " + event.data);
//             console.log(event.data.offer);

//             const data = JSON.parse(event.data);
//             console.log(data.offer);

//             if (data.offer) {
//                 console.log("Received offer");

//                 const offer: RTCSessionDescriptionInit = data.offer;

//                 console.log(offer);

//                 const remoteDesc = new RTCSessionDescription(offer);
//                 console.log(remoteDesc);

//                 await this.peer1.setRemoteDescription(remoteDesc);

//                 const answer: RTCSessionDescriptionInit =
//                     await this.peer1.createAnswer();
//                 await this.peer1.setLocalDescription(answer);

//                 this.signalingSocket.send(JSON.stringify({ answer: answer }));
//             }
//         });

//         // this.signalingSocket.onmessage = async event => {

//         // };
//     }

//     // async function onCreateOfferSuccess(desc) {
//     //     console.log(`Offer from pc1\nsdp: ${desc.sdp}`);
//     //     try {
//     //         await localPeer.setLocalDescription(desc);
//     //     } catch (e) {
//     //         onCatch(e);
//     //     }

//     //     try {
//     //         await remotePeer.setRemoteDescription(desc);
//     //     } catch (e) {
//     //         onCatch(e);
//     //     }

//     //     try {
//     //         const answer = await remotePeer.createAnswer();
//     //         await onCreateAnswerSuccess(answer);
//     //     } catch (e) {
//     //         onCatch(e);
//     //     }
//     // }

//     // function gotRemoteStream(e) {
//     //     if (remoteVideo.srcObject !== e.streams[0]) {
//     //         remoteVideo.srcObject = e.streams[0];
//     //     }
//     // }

//     // async function onCreateAnswerSuccess(desc) {
//     //     try {
//     //         await remotePeer.setLocalDescription(desc);
//     //     } catch (e) {
//     //         onCatch(e);
//     //     }

//     //     try {
//     //         await localPeer.setRemoteDescription(desc);
//     //     } catch (e) {
//     //         onCatch(e);
//     //     }
//     // }
// }

import { useParams } from "react-router";
import StreamView from "../StreamView/StreamView";
import css from "./Room.module.scss";
import ControlMenu from "../ControlMenu/ControlMenu";
import { useRef } from "react";
import * as Assert from "../../util/Assert";
import InactiveStreams from "../InactiveStreams/InactiveStreams";
import { RoomService } from "../../services/RoomService";
import { StreamsService } from "../../services/StreamsService";
import { useStreams } from "../../hooks/useStreams";
import { WebRTCService } from "../../services/webrtc/WebRTCService";

export default function Room() {
    const { roomID } = useParams();

    const roomServiceRef = useRef<RoomService | undefined>(undefined);
    if (!roomServiceRef.current) {
        Assert.assert(
            roomID,
            "roomID can't be undefined because then it's routed to 404"
        );

        roomServiceRef.current = new RoomService(roomID);
    }

    const streamsServiceRef = useRef<StreamsService | undefined>(undefined);
    if (!streamsServiceRef.current) {
        streamsServiceRef.current = new StreamsService(roomServiceRef.current);
    }

    const webrtcServiceRef = useRef<WebRTCService | undefined>(undefined);
    if (!webrtcServiceRef.current) {
        webrtcServiceRef.current = new WebRTCService(roomServiceRef.current);
    }

    const { streams, setLocalStream, setBeingWatched, isLocalStreamActive } =
        useStreams(streamsServiceRef.current, webrtcServiceRef.current);

    return (
        <div className={css.container}>
            Room: {roomID}
            {streams.length == 0 ? (
                <div className={css.noActiveStreams}>
                    <img
                        src="/src/assets/sad.png"
                        alt="Sad face emoji"
                        style={{ width: "75px" }}
                    />
                    Aktuell teilt niemand seinen Bildschirm. <br />
                    Teile deinen Bildschirm über das Menü unten!
                </div>
            ) : (
                <>
                    <div className={css.activeStreamsContainer}>
                        <div className={css.activeStreams}>
                            {streams.map(stream =>
                                stream.isBeingWatched ? (
                                    <StreamView
                                        key={stream.clientID}
                                        videoSrc={stream.srcObject}
                                        onHideStream={() => {
                                            setBeingWatched(
                                                stream.clientID,
                                                false
                                            );
                                        }}
                                        remoteClientID={stream.clientID}
                                        webrtcService={
                                            webrtcServiceRef.current!
                                        }
                                    />
                                ) : null
                            )}
                        </div>
                    </div>
                    <InactiveStreams
                        streams={streams}
                        setBeingWatched={clientID => {
                            setBeingWatched(clientID, true);
                        }}
                    ></InactiveStreams>
                </>
            )}
            <ControlMenu
                isStreaming={isLocalStreamActive}
                onStartStream={(captureStream: MediaStream) => {
                    setLocalStream(captureStream);

                    Assert.assert(streamsServiceRef.current);
                    streamsServiceRef.current.sendStreamStartedMessage();

                    Assert.assert(webrtcServiceRef.current);
                    webrtcServiceRef.current.setLocalStream(captureStream);
                }}
                onEndStream={() => {
                    setLocalStream(undefined);

                    Assert.assert(streamsServiceRef.current);
                    streamsServiceRef.current.sendStreamStoppedMessage();

                    Assert.assert(webrtcServiceRef.current);
                    // webrtcServiceRef.current.setLocalStream(undefined);
                }}
            ></ControlMenu>
        </div>
    );
}

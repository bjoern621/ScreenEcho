import { useParams } from "react-router";
import StreamView from "../StreamView/StreamView";
import css from "./Room.module.scss";
import ControlMenu from "../ControlMenu/ControlMenu";
import { useRef } from "react";
import * as Assert from "../../util/Assert";
import InactiveStreams from "../InactiveStreams/InactiveStreams";
import { RoomService } from "../../services/RoomService";
import { StreamsService } from "../../services/StreamsService";
import { LOCAL_STREAM_ID, useStreams } from "../../hooks/useStreams";

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

        // const webrtc = new WebRTCService(streamsServiceRef.current);
        // webrtc.startCall(
    }

    const { streams, setLocalStream } = useStreams(streamsServiceRef.current);

    return (
        <div className={css.container}>
            Room: {roomID}
            {streams.size == 0 ? (
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
                            {Array.from(streams.values()).map(stream =>
                                stream.isBeingWatched ? (
                                    <StreamView
                                        key={stream.clientID}
                                        videoSrc={stream.srcObject}
                                    />
                                ) : null
                            )}
                        </div>
                    </div>
                    <InactiveStreams streams={streams}></InactiveStreams>
                </>
            )}
            <ControlMenu
                isStreaming={streams.has(LOCAL_STREAM_ID)}
                onStartStream={(captureStream: MediaStream) => {
                    setLocalStream(captureStream);

                    Assert.assert(streamsServiceRef.current);
                    streamsServiceRef.current.sendStreamStartedMessage();
                }}
                onEndStream={() => {
                    setLocalStream(undefined);

                    Assert.assert(streamsServiceRef.current);
                    streamsServiceRef.current.sendStreamStoppedMessage();
                }}
            ></ControlMenu>
        </div>
    );
}

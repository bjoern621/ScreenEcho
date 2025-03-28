import { useParams } from "react-router";
import StreamView from "../StreamView/StreamView";
import css from "./Room.module.scss";
import ControlMenu from "../ControlMenu/ControlMenu";
import { useRef, useState } from "react";
import * as Assert from "../../util/Assert";
import InactiveStreams from "../InactiveStreams/InactiveStreams";
import { RoomService } from "../../services/RoomService";
import { StreamsService } from "../../services/StreamsService";
import { useStreams } from "../../hooks/useStreams";

export default function Room() {
    const { roomID } = useParams();
    const [localStreamActive, setLocalStreamActive] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [streamSrcObject, setSrcObject] = useState<MediaStream | null>(null);

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

    const { streams } = useStreams(streamsServiceRef.current);

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
                                    />
                                ) : null
                            )}
                        </div>
                    </div>
                    <InactiveStreams streams={streams}></InactiveStreams>
                </>
            )}
            <ControlMenu
                isStreaming={localStreamActive}
                onStartStream={(captureStream: MediaStream) => {
                    setLocalStreamActive(true);
                    setSrcObject(captureStream);
                }}
                onEndStream={() => {
                    setLocalStreamActive(false);
                    setSrcObject(null);
                }}
                streamsService={streamsServiceRef.current}
            ></ControlMenu>
        </div>
    );
}

import { useParams } from "react-router";
import StreamView from "../StreamView/StreamView";
import css from "./Room.module.scss";
import ControlMenu from "../ControlMenu/ControlMenu";
import { useEffect, useState } from "react";
import * as Assert from "../../util/Assert";
import InactiveStreams from "../InactiveStreams/InactiveStreams";
import { RoomService } from "../../services/RoomService";
import { StreamsService } from "../../services/StreamsService";

export type Stream = {
    ClientID: string;
    isBeingWatched: boolean;
    SrcObject: MediaStream;
};

export default function Room() {
    const { roomID } = useParams();
    const [localStreamActive, setLocalStreamActive] = useState<boolean>(false);
    const [streamSrcObject, setSrcObject] = useState<MediaStream | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [streams, _setStreams] = useState<Stream[]>([
        { ClientID: "1", isBeingWatched: true, SrcObject: new MediaStream() },
        { ClientID: "2", isBeingWatched: false, SrcObject: new MediaStream() },
        { ClientID: "3", isBeingWatched: true, SrcObject: new MediaStream() },
        { ClientID: "4", isBeingWatched: true, SrcObject: new MediaStream() },
        { ClientID: "5", isBeingWatched: true, SrcObject: new MediaStream() },
        { ClientID: "6", isBeingWatched: true, SrcObject: new MediaStream() },
    ]);

    useEffect(() => {
        console.log("room loaded");

        Assert.assert(
            roomID,
            "roomID can't be undefined because then it's routed to 404"
        );

        const roomService = new RoomService();
        roomService.connectToRoom(roomID);

        const streamsService = new StreamsService(roomService);
        streamsService.fetchCurrentStreams();

        return () => {
            roomService.closeActiveConnection();
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // function watchStream(clickedStream: Stream) {
    //     setStreams(prevStreams =>
    //         prevStreams.map(stream =>
    //             stream.ClientID === clickedStream.ClientID
    //                 ? { ...stream, isBeingWatched: true }
    //                 : stream
    //         )
    //     );
    // }

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
                    Starte jetzt deinen eigenen Stream über das Menü unten!
                </div>
            ) : (
                <>
            <div className={css.activeStreamsContainer}>
                <div className={css.activeStreams}>
                    {streams.map(stream =>
                        stream.isBeingWatched ? (
                            <StreamView
                                key={stream.ClientID}
                                videoSrc={stream.SrcObject}
                            />
                        ) : null
                    )}
                </div>
            </div>
            <InactiveStreams streams={streams}></InactiveStreams>
                </>
            )}
            {/* <StreamView videoSrc={streamSrcObject}></StreamView> */}
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
            ></ControlMenu>
        </div>
    );
}

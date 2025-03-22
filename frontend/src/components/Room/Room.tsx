import { useParams } from "react-router";
import StreamView from "../StreamView/StreamView";
import css from "./Room.module.css";
import ControlMenu from "../ControlMenu/ControlMenu";
import { useEffect, useState } from "react";
import * as RoomService from "../../services/RoomService";
import * as Assert from "../../util/Assert";

export default function Room() {
    const { roomID } = useParams();
    const [streamActive, setStreamActive] = useState<boolean>(false);
    const [streamSrcObject, setSrcObject] = useState<MediaStream | null>(null);

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

    // (testing only)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function getStreams(): string[] {
        return ["udo", "peter", "max"];
    }

    return (
        <div className={css.container}>
            Room: {roomID}
            <StreamView videoSrc={streamSrcObject}></StreamView>
            <ControlMenu
                isStreaming={streamActive}
                onStartStream={(captureStream: MediaStream) => {
                    setStreamActive(true);
                    setSrcObject(captureStream);
                }}
                onEndStream={() => {
                    setStreamActive(false);
                    setSrcObject(null);
                }}
            ></ControlMenu>
        </div>
    );
}

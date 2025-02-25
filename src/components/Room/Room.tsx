import { useParams } from "react-router";
import StreamView from "../StreamView/StreamView";
import css from "./Room.module.css";
import ControlMenu from "../ControlMenu/ControlMenu";
import { useState } from "react";

export default function Room() {
    let { roomNumber } = useParams();
    const [streamActive, setStreamActive] = useState<boolean>(false);
    const [streamSrcObject, setSrcObject] = useState<MediaStream | null>(null);

    function getStreams(): string[] {
        return ["udo", "peter", "max"];
    }

    return (
        <div className={css.container}>
            Room: {roomNumber}
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

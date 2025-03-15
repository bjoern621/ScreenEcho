import { useRef } from "react";
import css from "./StreamView.module.scss";

interface StreamViewProps {
    videoSrc: MediaProvider | null;
}

export default function StreamView(props: StreamViewProps) {
    const videoElem = useRef<HTMLVideoElement>(null);

    if (videoElem.current !== null) {
        videoElem.current.srcObject = props.videoSrc;
    }

    return (
        <div className={css.container}>
            <video autoPlay ref={videoElem} className={css.video}></video>
        </div>
    );
}

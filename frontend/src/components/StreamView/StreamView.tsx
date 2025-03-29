import { useRef } from "react";
import css from "./StreamView.module.scss";

interface StreamViewProps {
    videoSrc: MediaProvider | undefined;
}

export default function StreamView(props: StreamViewProps) {
    const videoElem = useRef<HTMLVideoElement>(null);

    if (videoElem.current) {
        videoElem.current.srcObject = props.videoSrc ?? null;
    }

    return (
        <div className={css.container}>
            {props.videoSrc ? (
                <video autoPlay ref={videoElem} className={css.video}></video>
            ) : (
                <div className={css.loadingContainer}>
                    <span>Loading video stream...</span>
                </div>
            )}
        </div>
    );
}

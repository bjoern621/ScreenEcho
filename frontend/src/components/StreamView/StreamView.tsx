import { useEffect, useRef } from "react";
import css from "./StreamView.module.scss";
import { assert } from "../../util/Assert";

interface StreamViewProps {
    videoSrc: MediaProvider | undefined;
}

export default function StreamView(props: StreamViewProps) {
    const videoElem = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        assert(videoElem.current);
        videoElem.current.srcObject = props.videoSrc ?? null;
    }, [props.videoSrc]);

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

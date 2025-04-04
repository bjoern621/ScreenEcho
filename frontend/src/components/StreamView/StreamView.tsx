import { useEffect, useRef } from "react";
import css from "./StreamView.module.scss";
import hideIcon from "../../assets/icons8-expand-arrow-64.png";

interface StreamViewProps {
    videoSrc: MediaProvider | undefined;
}

export default function StreamView(props: StreamViewProps) {
    const videoElem = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!videoElem.current) return;

        videoElem.current.srcObject = props.videoSrc ?? null;
    }, [props.videoSrc]);

    return (
        <>
            <div className={css.container}>
                {props.videoSrc ? (
                    <video
                        autoPlay
                        ref={videoElem}
                        className={css.video}
                    ></video>
                ) : (
                    <div className={css.loadingContainer}>
                        <span>Loading video stream...</span>
                    </div>
                )}

                <div className={css.overlay}>
                    <div
                        className={`${css.streamerDisplayName} ${css.overlayElement}`}
                    >
                        test name
                    </div>
                    <div
                        className={`${css.streamQuality} ${css.overlayElement}`}
                    >
                        1080p@50fps
                    </div>
                    <button
                        className={`${css.hideStreamButton} tooltip-on-hover`}
                    >
                        <img src={hideIcon} alt="" />
                        <span className="tooltip top">Stream ausblenden</span>
                    </button>
                </div>
            </div>
        </>
    );
}

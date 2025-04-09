import { useEffect, useRef } from "react";
import css from "./StreamView.module.scss";
import hideIcon from "../../assets/icons8-expand-arrow-64.png";
import { useStreamStats } from "../../hooks/useStreamStats";
import { ClientID } from "../../services/RoomService";
import { WebRTCService } from "../../services/webrtc/WebRTCService";

interface StreamViewProps {
    videoSrc: MediaStream | undefined;
    onHideStream: () => void;
    webrtcService: WebRTCService;
    remoteClientID: ClientID;
}

export default function StreamView(props: StreamViewProps) {
    const videoElem = useRef<HTMLVideoElement>(null);

    const { stats: streamStats } = useStreamStats(
        props.webrtcService,
        props.remoteClientID
    );

    useEffect(() => {
        if (!videoElem.current) return;

        videoElem.current.srcObject = props.videoSrc ?? null;
    }, [props.videoSrc]);

    return (
        <>
            <div className={css.container}>
                {props.videoSrc && props.videoSrc.active ? (
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
                        {props.remoteClientID}
                    </div>
                    <div
                        className={`${css.streamQuality} ${css.overlayElement}`}
                    >
                        {streamStats?.frameHeight}p@
                        {streamStats?.framesPerSecond}fps
                    </div>
                    <button
                        className={`${css.hideStreamButton} tooltip-on-hover`}
                        onClick={() => props.onHideStream()}
                    >
                        <img src={hideIcon} alt="" />
                        <span className="tooltip top">Stream ausblenden</span>
                    </button>
                </div>
            </div>
        </>
    );
}

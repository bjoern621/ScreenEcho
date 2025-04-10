import { useEffect, useRef } from "react";
import css from "./StreamView.module.scss";
import { useStreamStats } from "../../hooks/useStreamStats";
import { ClientID } from "../../services/RoomService";
import { WebRTCService } from "../../services/webrtc/WebRTCService";
import FullscreenIcon from "../../assets/icons8-full-screen.svg?react";
import ArrowDown from "../../assets/icons8-expand-arrow.svg?react";
import { LOCAL_STREAM_ID } from "../../hooks/useStreams";

interface StreamViewProps {
    videoSrc: MediaStream | undefined;
    onHideStream: () => void;
    webrtcService: WebRTCService;
    clientID: ClientID;
}

export default function StreamView(props: StreamViewProps) {
    const videoElem = useRef<HTMLVideoElement>(null);

    const { stats: streamStats } = useStreamStats(
        props.webrtcService,
        props.clientID
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
                    <div className={css.streamerDisplayName}>
                        {props.clientID === LOCAL_STREAM_ID
                            ? "Dein Stream"
                            : props.clientID}
                    </div>

                    {streamStats ? (
                        <div className={css.streamQuality}>
                            {streamStats?.frameHeight}p@
                            {streamStats?.framesPerSecond}fps
                        </div>
                    ) : null}

                    <button
                        className={`${css.hideStreamButton} tooltip-on-hover`}
                        onClick={() => props.onHideStream()}
                    >
                        <ArrowDown></ArrowDown>
                        <span className="tooltip top">Stream ausblenden</span>
                    </button>

                    <button
                        onClick={() =>
                            void videoElem.current!.requestFullscreen()
                        }
                        className={`${css.fullscreenButton} tooltip-on-hover`}
                    >
                        <FullscreenIcon></FullscreenIcon>
                        <span className="tooltip top">Vollbild</span>
                    </button>
                </div>
            </div>
        </>
    );
}

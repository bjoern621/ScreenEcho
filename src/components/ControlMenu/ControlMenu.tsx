import { useRef } from "react";
import css from "./ControlMenu.module.css";
import advance from "/src/assets/icons8-advance-64.png";

interface ControlMenuProps {
    /** Toggles whether the start or stop streaming button is displayed. */
    isStreaming: boolean;
    onStartStream: (captureStream: MediaStream) => void;
    onEndStream: () => void;
}

const streamOptions: DisplayMediaStreamOptions = {
    video: {
        displaySurface: "monitor",
        frameRate: 120,
        width: 1920,
        height: 1080,
    },
    audio: false,
};

export default function ControlMenu(props: ControlMenuProps) {
    const tracks = useRef<MediaStreamTrack[]>([]);

    function startCapture(): void {
        navigator.mediaDevices
            .getDisplayMedia(streamOptions)
            .catch(err => console.log(err))
            .then((result: MediaStream | void) => {
                if (result === undefined) {
                    console.warn("hmm");
                    return;
                }

                let captureStream: MediaStream = result;

                if (captureStream.getTracks().length != 1) {
                    console.warn(
                        "Mutiple MediaStreamTracks detected. There should only ever be one."
                    );
                }

                tracks.current = captureStream.getTracks();

                tracks.current.forEach((track: MediaStreamTrack) => {
                    track.onended = (_ev: Event) => stopCapture();
                });

                props.onStartStream(captureStream);
            });
    }

    function stopCapture(): void {
        tracks.current.forEach((track: MediaStreamTrack) => {
            track.stop();
        });
        tracks.current = [];

        props.onEndStream();
    }

    return (
        <>
            <div className={css.container}>
                <button
                    className={
                        props.isStreaming ? css.stopButton : css.shareButton
                    }
                    onClick={
                        props.isStreaming
                            ? () => stopCapture()
                            : () => startCapture()
                    }
                >
                    {props.isStreaming ? (
                        <span>Teilen beenden</span>
                    ) : (
                        <span>Bildschirm teilen</span>
                    )}
                    {/* <img src={advance} /> */}
                </button>
            </div>
        </>
    );
}

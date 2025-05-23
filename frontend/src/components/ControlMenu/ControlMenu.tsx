import { useRef } from "react";
import css from "./ControlMenu.module.scss";
import errorAsValue from "../../util/ErrorAsValue";

type ControlMenuProps = {
    /** Toggles whether the start or stop streaming button is displayed. */
    isStreaming: boolean;
    onStartStream: (captureStream: MediaStream) => void;
    onEndStream: () => void;
};

const streamOptions: DisplayMediaStreamOptions = {
    video: {
        displaySurface: "monitor",
        frameRate: 120,
        width: 2560,
        height: 1440,
    },
    audio: true,
};

export default function ControlMenu(props: ControlMenuProps) {
    const tracks = useRef<MediaStreamTrack[]>([]);

    async function startCapture(): Promise<void> {
        const [captureStream, err] = await errorAsValue(
            navigator.mediaDevices.getDisplayMedia(streamOptions)
        );
        if (err) {
            console.warn(err);
            return;
        }

        if (captureStream.getTracks().length != 1) {
            console.warn(
                "Mutiple MediaStreamTracks detected. There should only ever be one."
            );
        }

        tracks.current = captureStream.getTracks();

        tracks.current.forEach((track: MediaStreamTrack) => {
            track.onended = () => stopCapture();
        });

        props.onStartStream(captureStream);
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
                </button>
            </div>
        </>
    );
}

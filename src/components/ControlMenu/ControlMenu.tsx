import css from "./ControlMenu.module.css";
import advance from "/src/assets/icons8-advance-64.png";

export default function ControlMenu() {
    async function startCapture(): Promise<void> {
        await navigator.mediaDevices.getDisplayMedia({
            audio: false,
            video: true,
        });
    }

    return (
        <>
            <div className={css.container}>
                <button
                    className={css.shareButton}
                    onClick={() => startCapture()}
                >
                    <span>Bildschirm teilen</span>
                    <img src={advance} />
                </button>
            </div>
        </>
    );
}

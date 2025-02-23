import css from "./ControlMenu.module.css";
import advance from "/src/assets/icons8-advance-64.png";

export default function ControlMenu() {
    return (
        <>
            <div className={css.container}>
                <button className={css.shareButton}>
                    <span>Bildschirm teilen</span>
                    <img src={advance} />
                </button>
            </div>
        </>
    );
}

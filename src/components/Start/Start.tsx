import ControlMenu from "../ControlMenu/ControlMenu";
import css from "./Start.module.css";

export default function Start() {
    return (
        <>
            <div className={css.container}>
                <div className={css.header}>
                    <h2>Screen Echo</h2>
                </div>
                <div className={css.roomCreateOrJoin}>
                    <p className={css.centerText}>Teile deinen Bildschirm</p>
                    <ControlMenu></ControlMenu>
                    <p className={css.centerText}>oder trete einem Raum bei</p>
                    <div
                        style={{
                            backgroundColor: "var(--grey-7)",
                            height: "40px",
                            width: "300px",
                            justifySelf: "center",
                        }}
                    ></div>
                </div>
                <div className={css.scrollForMore}>
                    <span>Scrolle für mehr Informationen</span>
                    <img src="/src/assets/icons8-expand-arrow-64.png" alt="" />
                </div>
            </div>
        </>
    );
}

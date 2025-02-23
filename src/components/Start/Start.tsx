import ControlMenu from "../ControlMenu/ControlMenu";
import "./Start.css";

export default function Start() {
    return (
        <>
            <div className="container">
                <div className="header">
                    <h2>Screen Echo</h2>
                </div>
                <div className="room-create-or-join">
                    <p className="center-text">Teile deinen Bildschirm</p>
                    <ControlMenu></ControlMenu>
                    <p className="center-text">oder trete einem Raum bei</p>
                    <div
                        style={{
                            backgroundColor: "var(--grey-7)",
                            height: "40px",
                            width: "300px",
                            justifySelf: "center",
                        }}
                    ></div>
                </div>
                <div>
                    <p className="scroll-for-more">
                        Scrolle für mehr Informationen
                    </p>
                </div>
            </div>
        </>
    );
}

import { Link, useNavigate } from "react-router";
import ControlMenu from "../ControlMenu/ControlMenu";
import css from "./Start.module.css";
import { never } from "../../util/Assert";
import errorAsValue from "../../util/ErrorAsValue";

type RoomIDResponse = {
    roomID: string;
};

export default function Start() {
    const navigate = useNavigate();

    async function openRoomPage(roomID: string) {
        await navigate(`/room/${roomID}`);
    }

    async function openRandomRoom() {
        const [response, err] = await errorAsValue(
            fetch("http://localhost:8080/room/generate-id")
        );

        if (err) {
            console.error("Error fetching room ID:", err);
            return;
        }

        if (!response.ok) {
            console.error("Error fetching room ID:", response.statusText);
            return;
        }

        const [responseData, err2] = await errorAsValue<RoomIDResponse>(
            response.json() as Promise<RoomIDResponse>
        );

        console.log(response);

        if (err2) {
            console.error("Error parsing room ID response:", err2);
            return;
        }

        const newRoomID = responseData.roomID;

        console.log("New room ID:", newRoomID);

        await openRoomPage(newRoomID);
    }

    return (
        <>
            {import.meta.env.MODE} &gt; {import.meta.env.VITE_BACKEND_HOST}:
            {import.meta.env.VITE_BACKEND_PORT}
            <br></br>
            hey
            <div className={css.container}>
                <div className={css.header}>
                    <h2>Screen Echo</h2>
                </div>
                <div className={css.roomCreateOrJoin}>
                    <p className={css.centerText}>Teile deinen Bildschirm</p>
                    <ControlMenu
                        isStreaming={false}
                        onEndStream={never}
                        onStartStream={() => void openRandomRoom()}
                    ></ControlMenu>
                    <p className={css.centerText}>oder trete einem Raum bei</p>
                    <div className={css.joinContainer}>
                        <input
                            type="text"
                            maxLength={6}
                            className={css.roomNumberInput}
                        />
                        <Link to={"/room/1234"}>
                            <button className={css.joinButton}>
                                Beitreten
                            </button>
                        </Link>
                    </div>
                </div>
                <div className={css.scrollForMore}>
                    <span>Scrolle für mehr Informationen</span>
                    <img src="/src/assets/icons8-expand-arrow-64.png" alt="" />
                </div>
            </div>
        </>
    );
}

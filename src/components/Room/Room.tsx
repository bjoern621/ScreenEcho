import { useParams } from "react-router";
import StreamView from "../StreamView/StreamView";
import css from "./Room.module.css";
import ControlMenu from "../ControlMenu/ControlMenu";

export default function Room() {
    let { roomNumber } = useParams();

    return (
        <div className={css.container}>
            Room: {roomNumber}
            <StreamView></StreamView>
            <ControlMenu></ControlMenu>
        </div>
    );
}

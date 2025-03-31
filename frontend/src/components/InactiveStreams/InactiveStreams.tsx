import { Stream } from "../../hooks/useStreams";
import { ClientID } from "../../services/RoomService";
import css from "./InactiveStreams.module.scss";

interface InactiveStreamsProps {
    streams: Map<ClientID, Stream>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function InactiveStreams(props: InactiveStreamsProps) {
    return <button className={css.button}>Show inactive streams</button>;
}

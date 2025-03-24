import { Stream } from "../Room/Room";
import css from "./InactiveStreams.module.scss";

interface InactiveStreamsProps {
    streams: Stream[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function InactiveStreams(props: InactiveStreamsProps) {
    return <button className={css.button}>Show inactive streams</button>;
}

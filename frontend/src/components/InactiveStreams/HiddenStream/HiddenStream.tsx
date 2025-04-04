import css from "./HiddenStream.module.scss";

interface HiddenStreamProps {
    streamId: string;
    onRestore: (id: string) => void;
}

export default function HiddenStream(props: HiddenStreamProps) {
    const handleRestore = () => {
        props.onRestore(props.streamId);
    };

    return (
        <div className={css.hiddenStream}>
            <p>Stream {props.streamId} is currently hidden.</p>
            <button onClick={handleRestore}>Restore Stream</button>
        </div>
    );
}

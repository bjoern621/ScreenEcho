import { Stream } from "../../hooks/useStreams";
import { ClientID } from "../../services/RoomService";
import { assert } from "../../util/Assert";
import HiddenStream from "./HiddenStream/HiddenStream";
import css from "./InactiveStreams.module.scss";
import { useRef } from "react";

type InactiveStreamsProps = {
    streams: Stream[];
    setBeingWatched: (clientID: ClientID) => void;
};

export default function InactiveStreams(props: InactiveStreamsProps) {
    const modal = useRef<HTMLDialogElement>(null);

    const hiddenStreamsCount = Array.from(props.streams.values()).filter(
        stream => !stream.isBeingWatched
    ).length;

    return (
        <>
            <button
                className={css.button}
                onClick={() => {
                    assert(modal.current);
                    modal.current.showModal();
                }}
            >
                Zeige ausgeblendete Streams ({hiddenStreamsCount})
            </button>
            <dialog className={css.dialog} ref={modal}>
                <div className={css.dialogContent}>
                    <button
                        className={css.button}
                        onClick={() => {
                            assert(modal.current);
                            modal.current.close();
                        }}
                    >
                        Zurück
                    </button>
                    <div className={css.inactiveStreamsContainer}>
                        {props.streams.map(stream =>
                            stream.isBeingWatched ? null : (
                                <HiddenStream
                                    key={stream.clientID}
                                    streamId={stream.clientID}
                                    onRestore={() => {
                                        props.setBeingWatched(stream.clientID);
                                    }}
                                ></HiddenStream>
                            )
                        )}
                    </div>
                </div>
            </dialog>
        </>
    );
}

import { createPortal } from "react-dom";
import { Stream } from "../../hooks/useStreams";
import { ClientID } from "../../services/RoomService";
import css from "./InactiveStreams.module.scss";
import { useState } from "react";

type InactiveStreamsProps = {
    streams: Map<ClientID, Stream>;
};

export default function InactiveStreams(props: InactiveStreamsProps) {
    const [showInactiveStreams, setShowInactiveStreams] = useState(false);

    return (
        <>
            <button
                className={css.button}
                onClick={() => setShowInactiveStreams(!showInactiveStreams)}
            >
                Show inactive streams
            </button>
            {createPortal(
                showInactiveStreams && (
                    <div className={css.inactiveStreamsContainer}>
                        {Array.from(props.streams.values()).map(stream =>
                            stream.isBeingWatched ? null : stream.clientID
                        )}
                    </div>
                ),
                document.body
            )}
        </>
    );
}

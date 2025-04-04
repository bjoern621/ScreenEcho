import { createPortal } from "react-dom";
import { Stream } from "../../hooks/useStreams";
import { ClientID } from "../../services/RoomService";
import css from "./InactiveStreams.module.scss";
import { useState } from "react";

type InactiveStreamsProps = {
    streams: Map<ClientID, Stream>;
    setBeingWatched: (clientID: ClientID) => void;
};

export default function InactiveStreams(props: InactiveStreamsProps) {
    const [showInactiveStreams, setShowInactiveStreams] = useState(false);

    const hiddenStreamsCount = Array.from(props.streams.values()).filter(
        stream => !stream.isBeingWatched
    ).length;

    return (
        <>
            <button
                className={css.button}
                onClick={() => setShowInactiveStreams(true)}
            >
                Zeige ausgeblendete Streams ({hiddenStreamsCount})
            </button>
            {createPortal(
                showInactiveStreams && (
                    <div className={css.inactiveStreamsContainer}>
                        <button
                            className={css.button}
                            onClick={() => setShowInactiveStreams(false)}
                        >
                            Zurück
                        </button>
                        <div></div>
                        {Array.from(props.streams.values()).map(stream =>
                            stream.isBeingWatched ? null : (
                                <span
                                    key={stream.clientID}
                                    onClick={() =>
                                        props.setBeingWatched(stream.clientID)
                                    }
                                >
                                    stream.clientID
                                </span>
                            )
                        )}
                    </div>
                ),
                document.body
            )}
        </>
    );
}

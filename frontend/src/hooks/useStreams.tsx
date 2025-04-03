import { useEffect, useState } from "react";
import { StreamsService } from "../services/StreamsService";
import { ClientID } from "../services/RoomService";

export type Stream = {
    clientID: ClientID;
    isBeingWatched: boolean;
    /**
     * The srcObject of the stream to display in a video element.
     * `undefined` if no WEBRTC connection is established yet.
     */
    srcObject: MediaStream | undefined;
};

export const LOCAL_STREAM_ID = "localStream";

/**
 * Hook to manage and update the state of available streams.
 */
export const useStreams = (streamsService: StreamsService) => {
    // Containts the currently active streams in the room.
    const [streams, setStreams] = useState<Map<ClientID, Stream>>(new Map());

    useEffect(() => {
        /**
         * Updates the streams state with the active streams from the StreamsService.
         *
         * Previous streams are removed from the state if they are no longer available.
         * New streams are added to the state with `isBeingWatched: true`.
         * Remaining streams and the state of the local stream is preserved.
         *
         * The order of the streams is not guaranteed.
         */
        const handleActiveStreamsUpdate = (streamClientIDs: ClientID[]) => {
            setStreams(prevStreams => {
                const updatedStreams = new Map<ClientID, Stream>();

                // Add the local stream if it exists
                const localStream = prevStreams.get(LOCAL_STREAM_ID);
                if (localStream) {
                    updatedStreams.set(LOCAL_STREAM_ID, localStream);
                }

                // Add new or use existing streams (implicitly remove old ones)
                streamClientIDs.forEach(clientID => {
                    const existingStream = prevStreams.get(clientID);

                    if (existingStream) {
                        updatedStreams.set(clientID, {
                            clientID,
                            isBeingWatched: existingStream.isBeingWatched,
                            srcObject: existingStream.srcObject,
                        });
                    } else {
                        updatedStreams.set(clientID, {
                            clientID,
                            isBeingWatched: true,
                            srcObject: undefined,
                        });
                    }
                });

                return updatedStreams;
            });
        };

        streamsService.subscribe(handleActiveStreamsUpdate);

        return () => {
            streamsService.unsubscribe(handleActiveStreamsUpdate);
        };
    }, [streamsService]);

    /**
     * Updates the local media stream in the streams state.
     * stream can be set as the local stream, or `undefined` to clear it.
     */
    const setLocalStream = (mediaStream: MediaStream | undefined) => {
        setStreams(prevStreams => {
            const updatedStreams = new Map(prevStreams);

            if (!mediaStream) {
                updatedStreams.delete(LOCAL_STREAM_ID);
            } else {
                updatedStreams.set(LOCAL_STREAM_ID, {
                    clientID: LOCAL_STREAM_ID,
                    isBeingWatched: true,
                    srcObject: mediaStream,
                });
            }

            return updatedStreams;
        });
    };
    return { streams, setLocalStream };
};

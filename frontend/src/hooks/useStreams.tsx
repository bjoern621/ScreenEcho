import { useEffect, useState } from "react";
import { StreamsService } from "../services/StreamsService";
import { ClientID } from "../services/RoomService";
import { WebRTCService } from "../services/WebRTCService";

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
export const useStreams = (
    streamsService: StreamsService,
    webrtcService: WebRTCService
) => {
    /**
     * Containts the currently active streams in the room.
     * The order of the streams is not guaranteed.
     */
    const [streams, setStreams] = useState<Stream[]>([]);

    useEffect(() => {
        /**
         * Updates the streams state with the new `MediaStream` received from the `WebRTCService`.
         * The stream is identified by its clientID.
         *
         * If the `MediaStream` exists in the state, it will be updated with the new stream.
         * If the `MediaStream` does not exist, it will not be added to the state.
         */
        const handleNewTrack = (data: {
            clientID: ClientID;
            stream: MediaStream;
        }) => {
            setStreams(prevStreams =>
                prevStreams.map(existingStream =>
                    existingStream.clientID === data.clientID
                        ? { ...existingStream, srcObject: data.stream }
                        : existingStream
                )
            );
        };

        webrtcService.subscribe(handleNewTrack);

        return () => {
            webrtcService.unsubscribe(handleNewTrack);
        };
    }, [webrtcService]);

    useEffect(() => {
        /**
         * Updates the streams state with the active streams from the StreamsService.
         *
         * Previous streams are removed from the state if they are no longer available.
         * Remaining streams and the state of the local stream is preserved.
         */
        const handleActiveStreamsUpdate = (streamClientIDs: ClientID[]) => {
            setStreams((prevStreams: Stream[]) => {
                const streamClientIDsSet = new Set(streamClientIDs);

                // Keep still active streams and the local stream
                const updatedStreams = prevStreams.filter(stream => {
                    streamClientIDsSet.delete(stream.clientID);

                    return (
                        streamClientIDsSet.has(stream.clientID) ||
                        stream.clientID === LOCAL_STREAM_ID
                    );
                });

                // streamClientIDsSet now contains only the new streams, i.e. the streams that are in streamClientIDs but not in prevStreams.
                // Add new streams to the state
                streamClientIDsSet.forEach(clientID => {
                    updatedStreams.push({
                        clientID,
                        isBeingWatched: false,
                        srcObject: undefined,
                    });
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
     * `mediaStream` can be set as the local stream, or `undefined` to clear it.
     */
    const setLocalStream = (mediaStream: MediaStream | undefined) => {
        setStreams(prevStreams => {
            const updatedStreams = prevStreams.filter(
                stream => stream.clientID !== LOCAL_STREAM_ID
            );

            if (mediaStream) {
                updatedStreams.push({
                    clientID: LOCAL_STREAM_ID,
                    isBeingWatched: true,
                    srcObject: mediaStream,
                });
            }

            return updatedStreams;
        });
    };

    const setBeingWatched = (clientID: ClientID, isBeingWatched: boolean) => {
        setStreams(prevStreams => {
            const updatedStreams = prevStreams.map(stream => {
                if (stream.clientID === clientID) {
                    // const streamWithRTCConnection =
                    // checkIfRTCConnectionMustChange(stream, isBeingWatched);
                    return { ...stream, isBeingWatched };
                }

                return stream;
            });

            return updatedStreams;
        });

        // Manage the RTC connection

        if (clientID === LOCAL_STREAM_ID) {
            return;
        }

        if (isBeingWatched) {
            // Create a new RTC connection if being watched and no active RTC connection exists
            webrtcService.makePerfectCall(clientID);

            // setTimeout(() => {
            //     console.log("sending my own stream to the other client");

            //     const s = streams.find(
            //         stream => stream.clientID === LOCAL_STREAM_ID
            //     )?.srcObject;

            //     assert(s, "Local stream not found");

            //     webrtcService.addLocalStream(clientID, s);
            // }, 5000);
        } else if (
            !isBeingWatched &&
            webrtcService.hasPeerConnection(clientID)
        ) {
            // Close the RTC connection if not being watched and an active RTC connection exists
            console.log("wiil close peer connection (with cooldown)");

            // webrtcService.closePeerConnection(clientID);
        }
    };

    return { streams, setLocalStream, setBeingWatched };
};

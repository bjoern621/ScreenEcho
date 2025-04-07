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
    peerConnection: RTCPeerConnection | undefined;
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
        const handleNewTrack = (
            clientID: ClientID,
            remoteStream: MediaStream
        ) => {
            setStreams(prevStreams =>
                prevStreams.map(stream =>
                    stream.clientID === clientID
                        ? { ...stream, srcObject: remoteStream }
                        : stream
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
                        peerConnection: undefined,
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
                    peerConnection: undefined,
                });
            }

            return updatedStreams;
        });
    };

    const setBeingWatched = async (
        clientID: ClientID,
        isBeingWatched: boolean
    ) => {
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

        // TODO
        if (isBeingWatched && clientID !== LOCAL_STREAM_ID) {
            // Start the stream and create a new peer connection
            await webrtcService.makeCall(clientID);
        }
    };

    return { streams, setLocalStream, setBeingWatched };
};

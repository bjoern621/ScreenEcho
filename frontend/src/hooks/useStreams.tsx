import { useEffect, useState } from "react";
import { StreamsService } from "../services/StreamsService";

export type Stream = {
    clientID: string;
    isBeingWatched: boolean;
    srcObject: MediaStream | undefined;
};

export const useStreams = (streamsService: StreamsService) => {
    const [streams, setStreams] = useState<Stream[]>([]);

    useEffect(() => {
        setStreams(
            streamsService.fetchCurrentStreams().map((stream: string) => ({
                clientID: stream,
                isBeingWatched: true,
                srcObject: undefined,
            }))
        );

        const handleActiveStreamsUpdate = (streams: string[]) => {
            setStreams(
                streams.map((stream: string) => ({
                    clientID: stream,
                    isBeingWatched: true,
                    srcObject: undefined,
                }))
            );
        };

        streamsService.subscribe(handleActiveStreamsUpdate);

        return () => {
            streamsService.unsubscribe(handleActiveStreamsUpdate);
        };
    }, [streamsService]);

    return { streams };
};

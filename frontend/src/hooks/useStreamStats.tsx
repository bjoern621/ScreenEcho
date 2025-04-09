import { useEffect, useState } from "react";
import { ClientID } from "../services/RoomService";
import { WebRTCService } from "../services/webrtc/WebRTCService";
import { StreamStats } from "../services/webrtc/Peer";

const UPDATE_INTERVAL_MILLISECONDS = 1000;

export const useStreamStats = (
    webrtcService: WebRTCService,
    clientID: ClientID
) => {
    const [stats, setStats] = useState<StreamStats>();

    useEffect(() => {
        const updateStateWithCurrentStats = async () => {
            if (!webrtcService.hasPeerConnection(clientID)) {
                return;
            }

            const newStats = await webrtcService.getStats(clientID);

            console.log("New stats:", newStats);

            // console.log("Current stats:", currentStats);

            // assert(
            //     newStats.size === 1,
            //     "There should be only one RTCStatsReport"
            // );

            setStats(() => newStats);
        };

        const interval = setInterval(async () => {
            await updateStateWithCurrentStats();
        }, UPDATE_INTERVAL_MILLISECONDS);

        return () => {
            clearInterval(interval);
        };
    }, [clientID, webrtcService]);

    return { stats };
};

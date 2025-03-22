import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import { initDarkmode } from "./services/DarkmodeService.ts";
import { BrowserRouter, Route, Routes } from "react-router";
import Start from "./components/Start/Start.tsx";
import Room from "./components/Room/Room.tsx";
import PageNotFound from "./components/PageNotFound/PageNotFound.tsx";
import * as StreamsService from "./services/StreamsService.ts";

initDarkmode();
StreamsService.Init(); // may be better suited in Room.tsx

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Start />} />
                <Route path="room/:roomID" element={<Room />} />
                <Route path="*" element={<PageNotFound />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
);

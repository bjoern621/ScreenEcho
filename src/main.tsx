import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./components/App/App.tsx";
import { initDarkmode } from "./services/DarkmodeService.ts";
import { BrowserRouter, Route, Routes } from "react-router";
import Start from "./components/Start/Start.tsx";

initDarkmode();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Start />} />
            </Routes>
            <App />
        </BrowserRouter>
    </StrictMode>
);

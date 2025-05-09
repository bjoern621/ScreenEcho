import { useState } from "react";
import reactLogo from "/src/assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { toggleDarkmode } from "../../services/DarkmodeService";

function App() {
    const [count, setCount] = useState(0);

    return (
        <>
            <button onClick={toggleDarkmode}>Darkmode toggle</button>
            <div className="test">
                <a href="https://vite.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                    <img
                        src={reactLogo}
                        className="logo react"
                        alt="React logo"
                    />
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <button onClick={() => setCount(count => count + 1)}>
                    count is {count}
                </button>
                <p>
                    Edit <code>src/App.tsx</code> and save to test HMR<br></br>{" "}
                    Mache ich brwo
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
            <div className="read-the-docs">heyllo</div>
        </>
    );
}

export default App;

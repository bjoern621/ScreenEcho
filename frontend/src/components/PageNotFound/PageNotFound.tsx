import { Link } from "react-router";
import "./PageNotFound.module.css";

export default function PageNotFound() {
    return (
        <div className="not-found-container">
            <h1 className="not-found-title">404</h1>
            <p className="not-found-message">
                Oops! The page you are looking for does not exist.
            </p>
            <Link to="/" className="home-link">
                Go to Home
            </Link>
        </div>
    );
}

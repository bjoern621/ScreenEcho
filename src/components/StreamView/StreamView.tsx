import css from "./StreamView.module.css";

export default function StreamView() {
    return (
        <div className={css.container}>
            preview
            <video></video>
        </div>
    );
}

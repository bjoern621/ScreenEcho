const localStorageDarkmodeKey: string = "darkmode-enabled";
const darkmodeClassName: string = "dark";
let isDarkmode: boolean = false;

/**
 * Toggles darkmode class on document.body appropriately.
 */
export function toggleDarkmode() {
    setDarkmode(!isDarkmode);
}

function setDarkmode(enableDarkmode: boolean) {
    isDarkmode = enableDarkmode;
    document.body.classList.toggle(darkmodeClassName, enableDarkmode);
    localStorage.setItem(localStorageDarkmodeKey, String(enableDarkmode));
}

/**
 * Initializes the darkmode state. Uses the local storage entry and prefers-color-scheme as an alternative.
 */
export function initDarkmode() {
    let darkmodeStorage: string | null = localStorage.getItem(
        localStorageDarkmodeKey
    );

    let shouldSetDarkmode: boolean;
    if (darkmodeStorage === null) {
        shouldSetDarkmode = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;
    } else {
        shouldSetDarkmode = darkmodeStorage === "true";
    }

    setDarkmode(shouldSetDarkmode);
}

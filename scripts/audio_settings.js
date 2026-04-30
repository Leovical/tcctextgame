const VOLUME_KEY = "game_volume";

export function getGameVolume() {
    const v = localStorage.getItem(VOLUME_KEY);
    return v !== null ? parseFloat(v) : 0.2;
}

export function setGameVolume(value) {

    const newVolume = Math.min(1, Math.max(0, value));
    localStorage.setItem(VOLUME_KEY, newVolume);

    document.querySelectorAll("audio").forEach(audio => {
        if (audio.id === "sfx-power") {
            audio.volume = 0.8;
        } else {
            audio.volume = newVolume;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("settings-modal");
    const openBtn = document.querySelector(".settings-button");
    const closeBtn = document.getElementById("settings-close");
    const slider = document.getElementById("volume-slider");

    if (!modal || !openBtn || !closeBtn || !slider) return;

    const savedVolume = getGameVolume();
    setGameVolume(savedVolume);
    slider.value = savedVolume;

    openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
    slider.addEventListener("input", (e) => setGameVolume(parseFloat(e.target.value)));
});
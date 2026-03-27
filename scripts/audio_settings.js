const VOLUME_KEY = "game_volume";

function getGameVolume() {
    const v = localStorage.getItem(VOLUME_KEY);
    return v !== null ? parseFloat(v) : 0.2;
}

function setGameVolume(value) {
    localStorage.setItem(VOLUME_KEY, value);
    document.querySelectorAll("audio").forEach(a => {
        if (a.id === "sfx-power") {
            a.volume = 0.8; 
        } else {
            a.volume = value;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("settings-modal");
    const openBtn = document.querySelector(".settings-button");
    const closeBtn = document.getElementById("settings-close");
    const slider = document.getElementById("volume-slider");

    const currentVol = getGameVolume();

    document.querySelectorAll("audio").forEach(a => {
        if (a.id === "sfx-power") {
            a.volume = 0.8;
        } else {
            a.volume = currentVol;
        }
    });

    if (slider) {
        slider.value = currentVol;

        openBtn?.addEventListener("click", () => {
            modal?.classList.remove("hidden");
        });

        closeBtn?.addEventListener("click", () => {
            modal?.classList.add("hidden");
        });

        slider.addEventListener("input", e => {
            setGameVolume(parseFloat(e.target.value));
        });
    }
});
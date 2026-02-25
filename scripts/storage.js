import { POWER_KEY } from './config.js';

export function getGlobalPowerState() {
    return localStorage.getItem(POWER_KEY) === "on";
}

export function setGlobalPowerState(isOn) {
    localStorage.setItem(POWER_KEY, isOn ? "on" : "off");
}

export function getGuestId() {
    return localStorage.getItem("guest_id");
}

export function setGuestId(id) {
    if (id && id !== "null" && id !== "undefined") {
        localStorage.setItem("guest_id", id);
    }
}

export function getAuthToken() {
    return localStorage.getItem('auth_token');
}
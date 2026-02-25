import { getGlobalPowerState, setGlobalPowerState } from './storage.js';

export class PowerManager {
    constructor(options = {}) {
        this.powerBtnContainer = options.powerBtnContainer;
        this.powerBtnButton = this.powerBtnContainer?.querySelector('.button');
        this.powerLed = options.powerLed;
        this.mobilePowerBtn = options.mobilePowerBtn;
        this.screenArea = options.screenArea;
        this.audioLoop = options.audioLoop;

        this.sfxPower = options.sfxPower;
        if (typeof this.sfxPower === 'string') {
            this.sfxPower = new Audio(this.sfxPower);
        } else if (!this.sfxPower) {
            this.sfxPower = new Audio('audio/startup_button.mp3');
        }

        this.onPowerOn = options.onPowerOn || (() => { });
        this.onPowerOff = options.onPowerOff || (() => { });

        this.isPoweredOn = getGlobalPowerState();
    }

    init() {
        if (this.isPoweredOn) {
            this.restorePoweredOnState();
        } else {
            this.restorePoweredOffState();
        }
        this.bindEvents();
    }

    bindEvents() {
        this.powerBtnContainer?.addEventListener('click', () => this.togglePower());
        this.mobilePowerBtn?.addEventListener('click', () => this.togglePower());
    }

    togglePower() {
        this.isPoweredOn ? this.turnOff() : this.turnOn();
    }

    turnOn() {
        if (this.isPoweredOn) return;
        this.isPoweredOn = true;
        setGlobalPowerState(true);

        this.powerBtnButton?.classList.add('clicked');
        setTimeout(() => this.powerBtnButton?.classList.remove('clicked'), 150);

        this.powerLed?.classList.add('on');
        if (this.mobilePowerBtn) this.mobilePowerBtn.style.display = 'none';

        this.screenArea.classList.remove('screen-off', 'screen-shutting-down');
        this.screenArea.classList.add('screen-on');

        void this.screenArea.offsetWidth;
        this.screenArea.classList.add('screen-turning-on');

        this.sfxPower.currentTime = 0;
        this.sfxPower.play().catch(() => { });

        setTimeout(() => {
            this.screenArea.classList.remove('screen-turning-on');
        }, 1100);

        setTimeout(() => {
            if (this.isPoweredOn) {
                if (this.audioLoop) {
                    this.audioLoop.volume = 0.2;
                    this.audioLoop.play().catch(() => { });
                }
                this.onPowerOn();
            }
        }, 1200);
    }

    turnOff() {
        if (!this.isPoweredOn) return;
        this.isPoweredOn = false;
        setGlobalPowerState(false);

        this.powerBtnButton?.classList.add('clicked');
        setTimeout(() => this.powerBtnButton?.classList.remove('clicked'), 150);

        this.powerLed?.classList.remove('on');
        if (this.mobilePowerBtn) this.mobilePowerBtn.style.display = '';

        this.screenArea.classList.remove('screen-on');
        this.screenArea.classList.add('screen-shutting-down');

        setTimeout(() => {
            this.screenArea.classList.remove('screen-shutting-down');
            this.screenArea.classList.add('screen-off');
        }, 500);

        this.audioLoop?.pause();
        if (this.audioLoop) this.audioLoop.currentTime = 0;

        this.onPowerOff();
    }

    restorePoweredOnState() {
        this.powerLed?.classList.add('on');
        this.screenArea.classList.remove('screen-off', 'screen-shutting-down');
        this.screenArea.classList.add('screen-on');
        if (this.mobilePowerBtn) this.mobilePowerBtn.style.display = 'none';
        if (this.audioLoop) {
            this.audioLoop.volume = 0.2;
            this.audioLoop.play().catch(() => { });
        }
        this.onPowerOn();
    }

    restorePoweredOffState() {
        this.powerLed?.classList.remove('on');
        this.screenArea.classList.remove('screen-on', 'screen-turning-on', 'screen-shutting-down');
        this.screenArea.classList.add('screen-off');
        if (this.mobilePowerBtn) this.mobilePowerBtn.style.display = '';
        this.audioLoop?.pause();
        if (this.audioLoop) this.audioLoop.currentTime = 0;
        this.onPowerOff();
    }
}
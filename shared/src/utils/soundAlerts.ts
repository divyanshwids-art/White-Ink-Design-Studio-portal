/**
 * Sound Alerts Utility using Web Audio API
 * Generates continuous alarms, chimes, and notification sounds without external audio dependencies.
 */

class SoundAlertService {
  private audioCtx: AudioContext | null = null;
  private alarmInterval: any = null;
  private isAlarmPlaying = false;

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
      return null;
    }
  }

  /**
   * Play a single pleasant beep / chime sound
   */
  public playBeep(freq = 880, type: OscillatorType = 'sine', duration = 0.25, volume = 0.3) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      console.warn('Failed to play beep:', err);
    }
  }

  /**
   * Play a multi-tone pleasant chime
   */
  public playChime() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playBeep(freq, 'sine', 0.4, 0.25);
      }, index * 120);
    });
  }

  /**
   * Start a continuous alarm loop (rings until stopAlarm is called)
   */
  public startContinuousAlarm(pattern: 'timer' | 'checkin' = 'timer') {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    const ring = () => {
      if (!this.isAlarmPlaying) return;
      if (pattern === 'timer') {
        // High attention dual-beep pattern
        this.playBeep(880, 'triangle', 0.15, 0.35);
        setTimeout(() => {
          if (this.isAlarmPlaying) this.playBeep(1174.66, 'triangle', 0.2, 0.35);
        }, 180);
      } else {
        // Periodic check-in 3-tone chime
        this.playBeep(659.25, 'sine', 0.2, 0.3);
        setTimeout(() => {
          if (this.isAlarmPlaying) this.playBeep(830.61, 'sine', 0.2, 0.3);
        }, 150);
        setTimeout(() => {
          if (this.isAlarmPlaying) this.playBeep(987.77, 'sine', 0.3, 0.3);
        }, 300);
      }
    };

    ring();
    this.alarmInterval = setInterval(ring, pattern === 'timer' ? 1200 : 2000);
  }

  /**
   * Stop any actively playing continuous alarm
   */
  public stopAlarm() {
    this.isAlarmPlaying = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  public isPlaying(): boolean {
    return this.isAlarmPlaying;
  }
}

export const soundAlerts = new SoundAlertService();

// Signal notification sound utility with volume control and distinct sounds

let audioContext: AudioContext | null = null;
let audioEnabled = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Enable audio playback - must be called from a user gesture (click/tap)
 * Returns true if audio was successfully enabled
 */
export async function enableAudio(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    audioEnabled = true;
    console.log('Audio context enabled');
    return true;
  } catch (err) {
    console.error('Failed to enable audio:', err);
    return false;
  }
}

/**
 * Check if audio has been enabled via user gesture
 */
export function isAudioEnabled(): boolean {
  return audioEnabled;
}

/**
 * Play alert beep with configurable volume and type
 * @param volume - Volume level from 0.0 to 1.0 (default 0.7)
 * @param type - 'signal' for new signals (ascending), 'outcome' for outcomes (descending)
 */
export function playAlertBeep(volume: number = 0.7, type: 'signal' | 'outcome' = 'signal') {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (type === 'signal') {
      // New signal: ascending pleasant chime (880Hz -> 1108Hz -> 1318Hz)
      playChime(ctx, [880, 1108.73, 1318.51], clampedVolume);
    } else {
      // Outcome: descending completion tone (660Hz -> 523Hz -> 440Hz)
      playChime(ctx, [660, 523.25, 440], clampedVolume);
    }

    console.log(`Alert beep played: ${type}, volume: ${clampedVolume}`);
  } catch (err) {
    console.error('Error playing alert beep:', err);
  }
}

function playChime(ctx: AudioContext, frequencies: number[], volume: number) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  
  // Set frequencies at intervals
  oscillator.frequency.setValueAtTime(frequencies[0], ctx.currentTime);
  oscillator.frequency.setValueAtTime(frequencies[1], ctx.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(frequencies[2], ctx.currentTime + 0.2);

  // Volume envelope with configurable peak
  gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.4);
}

/**
 * Play a short test beep to confirm audio is working
 */
export function playTestBeep(volume: number = 0.7) {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const clampedVolume = Math.max(0, Math.min(1, volume));

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5

    gainNode.gain.setValueAtTime(clampedVolume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);

    console.log('Test beep played');
    return true;
  } catch (err) {
    console.error('Error playing test beep:', err);
    return false;
  }
}

/**
 * Legacy function for backward compatibility
 */
export function playSignalSound() {
  playAlertBeep(0.7, 'signal');
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return Promise.resolve('denied');
  }

  return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      tag: 'signal-notification'
    });
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

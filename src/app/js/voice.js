/** Voice input with Web Speech API, permission states, and recording feedback */

const MIC_STATES = {
  ready: { badge: 'Microphone Ready', status: 'Tap the microphone when you\'re ready to speak' },
  listening: { badge: 'Listening', status: 'Speak naturally — we\'re capturing your words' },
  denied: { badge: 'Permission Denied', status: 'Microphone access was blocked' },
  'not-detected': { badge: 'Microphone Not Detected', status: 'No microphone found on this device' },
  unsupported: { badge: 'Voice Not Supported', status: 'Your browser does not support speech recognition' },
};

let recognition = null;
let isListening = false;
let timerInterval = null;
let secondsElapsed = 0;
let onTranscriptUpdate = null;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setMicState(state) {
  const badge = document.getElementById('mic-state-badge');
  const badgeText = document.getElementById('mic-state-text');
  const status = document.getElementById('voice-status');
  const help = document.getElementById('mic-permission-help');
  const micBtn = document.getElementById('mic-button');
  const waveform = document.getElementById('waveform');
  const timer = document.getElementById('recording-timer');
  const rings = document.querySelectorAll('.mic-ring');

  const config = MIC_STATES[state] || MIC_STATES.ready;

  if (badge) {
    badge.dataset.state = state;
    badge.setAttribute('aria-live', 'polite');
  }
  if (badgeText) badgeText.textContent = config.badge;
  if (status) {
    status.textContent = config.status;
    status.classList.toggle('listening', state === 'listening');
  }

  if (help) {
    const showHelp = state === 'denied' || state === 'not-detected' || state === 'unsupported';
    help.classList.toggle('hidden', !showHelp);
    if (state === 'denied') {
      help.textContent = 'Enable microphone access in your browser settings, then refresh this page and try again.';
    } else if (state === 'not-detected') {
      help.textContent = 'Connect a microphone or use text input instead.';
    } else if (state === 'unsupported') {
      help.textContent = 'Try Chrome, Edge, or Safari — or switch to text input.';
    }
  }

  if (micBtn) {
    micBtn.classList.toggle('is-recording', state === 'listening');
    micBtn.setAttribute(
      'aria-label',
      state === 'listening' ? 'Stop recording' : 'Start recording'
    );
  }

  rings.forEach((ring) => ring.classList.toggle('active', state === 'listening'));

  if (waveform) waveform.classList.toggle('active', state === 'listening');

  if (timer) {
    timer.classList.toggle('hidden', state !== 'listening');
    if (state !== 'listening') timer.textContent = '00:00';
  }
}

function startTimer() {
  secondsElapsed = 0;
  const timer = document.getElementById('recording-timer');
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsElapsed += 1;
    if (timer) timer.textContent = formatTime(secondsElapsed);
  }, 1000);
  if (timer) timer.textContent = '00:00';
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function updateTranscription(text, isFinal) {
  const el = document.getElementById('transcription-text');
  if (!el) return;

  if (text) {
    el.textContent = text;
    el.classList.remove('empty');
  } else {
    el.textContent = 'Your words will appear here as you speak...';
    el.classList.add('empty');
  }

  if (onTranscriptUpdate) onTranscriptUpdate(text, isFinal);
}

function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setMicState('unsupported');
    return null;
  }

  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';

  let finalTranscript = '';

  rec.onstart = () => {
    isListening = true;
    setMicState('listening');
    startTimer();
  };

  rec.onend = () => {
    isListening = false;
    stopTimer();
    if (recognition) setMicState('ready');
  };

  rec.onerror = (event) => {
    isListening = false;
    stopTimer();

    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      setMicState('denied');
    } else if (event.error === 'audio-capture') {
      setMicState('not-detected');
    } else if (event.error !== 'aborted') {
      setMicState('ready');
    }
  };

  rec.onresult = (event) => {
    let interim = '';

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += `${transcript} `;
      } else {
        interim += transcript;
      }
    }

    const combined = (finalTranscript + interim).trim();
    updateTranscription(combined, !interim);
  };

  return rec;
}

async function checkMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setMicState('unsupported');
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    setMicState('ready');
    return true;
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      setMicState('denied');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      setMicState('not-detected');
    } else {
      setMicState('ready');
    }
    return false;
  }
}

function toggleRecording() {
  if (!recognition) return;

  if (isListening) {
    recognition.stop();
    return;
  }

  try {
    recognition.start();
  } catch {
    /* already started */
  }
}

export function getVoiceTranscript() {
  const el = document.getElementById('transcription-text');
  if (!el || el.classList.contains('empty')) return '';
  return el.textContent.trim();
}

export function initVoice(callback) {
  onTranscriptUpdate = callback;
  recognition = initRecognition();

  const micBtn = document.getElementById('mic-button');
  if (micBtn) {
    micBtn.addEventListener('click', toggleRecording);
  }

  updateTranscription('', false);

  if (recognition) {
    checkMicrophoneAccess();
  }
}

export function stopVoice() {
  if (recognition && isListening) {
    recognition.stop();
  }
  stopTimer();
}

export function resetVoiceTranscript() {
  updateTranscription('', false);
}

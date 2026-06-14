/** Voice input (stable Web Speech API wrapper — flicker fixed) */

const MIC_STATES = {
  ready: {
    badge: "Microphone Ready",
    status: "Tap the microphone when you're ready to speak",
  },
  listening: {
    badge: "Listening",
    status: "Speak naturally — we're capturing your words",
  },
  denied: {
    badge: "Permission Denied",
    status: "Microphone access was blocked",
  },
  "not-detected": {
    badge: "Microphone Not Detected",
    status: "No microphone found",
  },
  unsupported: {
    badge: "Voice Not Supported",
    status: "Speech recognition not supported",
  },
};

let recognition = null;
let isListening = false;

// 🔥 control flags (THIS FIXES FLICKER)
let manualStop = false;
let restartLock = false;

let timerInterval = null;
let seconds = 0;

let onTranscriptUpdate = null;
let finalTranscript = "";

// ---------------- UI ----------------

function setMicState(state) {
  const badge = document.getElementById("mic-state-text");
  const status = document.getElementById("voice-status");
  const btn = document.getElementById("mic-button");
  const waveform = document.getElementById("waveform");
  const timer = document.getElementById("recording-timer");

  const ui = MIC_STATES[state] || MIC_STATES.ready;

  if (badge) badge.textContent = ui.badge;
  if (status) status.textContent = ui.status;

  if (btn) btn.classList.toggle("is-recording", state === "listening");
  if (waveform) waveform.classList.toggle("active", state === "listening");

  if (timer) {
    timer.classList.toggle("hidden", state !== "listening");
  }
}

// ---------------- TIMER ----------------

function startTimer() {
  seconds = 0;
  const timer = document.getElementById("recording-timer");

  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    seconds++;

    if (timer) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      timer.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ---------------- SPEECH ENGINE ----------------

function createRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setMicState("unsupported");
    return null;
  }

  const rec = new SpeechRecognition();

  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";

  rec.onstart = () => {
    isListening = true;
    setMicState("listening");
    startTimer();
  };

  rec.onerror = (event) => {
    console.error("Speech error:", event.error);

    if (event.error === "not-allowed") {
      manualStop = true;
      setMicState("denied");
    }

    if (event.error === "audio-capture") {
      manualStop = true;
      setMicState("not-detected");
    }
  };

  // 🔥 FIXED onend (NO MORE FLICKER LOOP)
  rec.onend = () => {
    isListening = false;
    stopTimer();

    // If user stopped → do nothing
    if (manualStop) return;

    // 🔥 prevent restart spam
    if (restartLock) return;

    restartLock = true;

    setTimeout(() => {
      try {
        recognition.start();
      } catch (e) {}

      // release lock after restart window
      setTimeout(() => {
        restartLock = false;
      }, 500);
    }, 600);
  };

  rec.onresult = (event) => {
    let interim = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += text + " ";
      } else {
        interim += text;
      }
    }

    const combined = (finalTranscript + interim).trim();

    const el = document.getElementById("transcription-text");
    if (el) {
      el.textContent = combined || "Listening...";
      el.classList.remove("empty");
    }

    if (onTranscriptUpdate) {
      onTranscriptUpdate(combined, true);
    }
  };

  return rec;
}

// ---------------- CONTROL ----------------

function toggleRecording() {
  if (!recognition) return;

  // STOP
  if (isListening) {
    manualStop = true;

    try {
      recognition.stop();
    } catch (e) {}

    return;
  }

  // START
  manualStop = false;
  restartLock = false;

  navigator.mediaDevices
    ?.getUserMedia({ audio: true })
    .then(() => {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.warn("Already started");
        }
      }, 250);
    })
    .catch((err) => {
      console.error("Mic permission error:", err);
      setMicState("denied");
    });
}

// ---------------- PUBLIC API ----------------

export function getVoiceTranscript() {
  const el = document.getElementById("transcription-text");
  return el?.textContent?.trim() || "";
}

export function initVoice(callback) {
  onTranscriptUpdate = callback;
  recognition = createRecognition();

  const btn = document.getElementById("mic-button");

  if (btn) {
    btn.addEventListener("click", toggleRecording);
  }

  setMicState("ready");
}

export function stopVoice() {
  manualStop = true;

  if (recognition && isListening) {
    try {
      recognition.stop();
    } catch (e) {}
  }

  stopTimer();
}

export function resetVoiceTranscript() {
  finalTranscript = "";

  const el = document.getElementById("transcription-text");
  if (el) {
    el.textContent = "Your words will appear here as you speak...";
    el.classList.add("empty");
  }
}
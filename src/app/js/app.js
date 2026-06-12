import { PROCESSING_MESSAGES } from './constants.js';
import { classifyText, renderResults } from './results.js';
import { getVoiceTranscript, initVoice, resetVoiceTranscript, stopVoice } from './voice.js';

const VIEWS = {
  landing: 'view-landing',
  assessment: 'view-assessment',
  voice: 'view-voice',
  processing: 'view-processing',
  results: 'view-results',
};

let processingMessageIndex = 0;
let processingMessageTimer = null;
let lastInputText = '';

function showView(viewKey) {
  Object.values(VIEWS).forEach((id) => {
    document.getElementById(id)?.classList.remove('active');
  });

  document.getElementById(VIEWS[viewKey])?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateFlowNav(viewKey);

  if (viewKey === 'voice') {
    resetVoiceTranscript();
  }
  if (viewKey !== 'voice') {
    stopVoice();
  }
}

function updateFlowNav(activeKey) {
  document.querySelectorAll('.flow-nav .btn').forEach((btn) => {
    const isActive = btn.dataset.view === activeKey || btn.dataset.flow === activeKey;
    btn.classList.toggle('active-flow', isActive);
  });
}

function getAssessmentText() {
  const textarea = document.getElementById('assessment-input');
  return textarea?.value.trim() || '';
}

function syncVoiceToAssessment(text) {
  const textarea = document.getElementById('assessment-input');
  if (textarea && text) {
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
  }
}

function setProcessingMessage(index) {
  const el = document.getElementById('processing-text');
  if (!el) return;

  el.textContent = PROCESSING_MESSAGES[index];
  el.classList.remove('is-shimmer');
  void el.offsetWidth;
  el.classList.add('is-shimmer');
}

function startProcessingMessages() {
  processingMessageIndex = 0;
  setProcessingMessage(0);

  clearInterval(processingMessageTimer);
  processingMessageTimer = setInterval(() => {
    processingMessageIndex = (processingMessageIndex + 1) % PROCESSING_MESSAGES.length;
    setProcessingMessage(processingMessageIndex);
  }, 1800);
}

function stopProcessingMessages() {
  clearInterval(processingMessageTimer);
  processingMessageTimer = null;
}

async function startProcessing(fromVoice = false) {
  let text = fromVoice ? getVoiceTranscript() : getAssessmentText();

  if (!text && fromVoice) {
    text = getAssessmentText();
  }

  if (!text.trim()) {
    const textarea = document.getElementById('assessment-input');
    textarea?.focus();
    return;
  }

  lastInputText = text;
  showView('processing');
  startProcessingMessages();

  try {
    const result = await classifyText(text);
    stopProcessingMessages();
    renderResults(result, text);
    showView('results');
  } catch (err) {
    stopProcessingMessages();
    console.error(err);
    showView('assessment');
  }
}

function initNavigation() {
  document.querySelectorAll('[data-view]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showView(el.dataset.view);
    });
  });

  document.querySelectorAll('[data-flow]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const flow = el.dataset.flow;

      if (flow === 'processing') {
        const fromVoice = document.getElementById('view-voice')?.classList.contains('active');
        if (fromVoice) {
          syncVoiceToAssessment(getVoiceTranscript());
        }
        startProcessing(fromVoice);
        return;
      }

      if (flow === 'results') {
        import('./constants.js').then(({ mockClassification }) => {
          lastInputText = getAssessmentText() || 'I have been feeling overwhelmed and stressed lately.';
          renderResults(mockClassification(lastInputText), lastInputText);
          showView('results');
        });
        return;
      }

      showView(flow);
    });
  });
}

function initCharCounter() {
  const textarea = document.getElementById('assessment-input');
  const counter = document.getElementById('char-count');
  if (!textarea || !counter) return;

  const max = parseInt(textarea.getAttribute('maxlength'), 10);

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = `${len.toLocaleString()} / ${max.toLocaleString()}`;
    counter.classList.remove('warning', 'limit');
    if (len > max * 0.9) counter.classList.add('warning');
    if (len >= max) counter.classList.add('limit');
  });
}

function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.step-card, .feature-card').forEach((el) => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCharCounter();
  initMobileNav();
  initScrollReveal();
  initVoice((text) => syncVoiceToAssessment(text));
});

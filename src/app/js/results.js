import {
  detectThemes,
  EXPLANATIONS,
  getCategoryColor,
  getRiskLevel,
  normalizeKey,
  RECOMMENDATIONS,
} from './constants.js';

function pct(value) {
  return `${Math.round(value)}%`;
}

export function renderResults(data, sourceText) {
  const primaryKey = normalizeKey(data.primary_key || data.primary);
  const confidence = data.confidence;
  const scores = data.scores || [];
  const color = getCategoryColor(primaryKey);
  const risk = getRiskLevel(primaryKey, confidence);
  const themes = detectThemes(sourceText);

  const labelEl = document.getElementById('primary-prediction-label');
  const confEl = document.getElementById('primary-prediction-confidence');
  const summaryEl = document.getElementById('primary-prediction-summary');
  const cardEl = document.getElementById('primary-prediction-card');
  const riskEl = document.getElementById('risk-badge');
  const scrollEl = document.getElementById('classification-scroll');
  const explanationEl = document.getElementById('explanation-text');
  const recommendationsEl = document.getElementById('recommendations-list');
  const themesEl = document.getElementById('theme-tags');

  if (labelEl) labelEl.textContent = data.primary;
  if (confEl) {
    confEl.textContent = pct(confidence);
    confEl.style.color = color;
  }
  if (summaryEl) {
    summaryEl.textContent = `Your response most closely aligns with ${data.primary}. Review the full breakdown below for all nine categories.`;
  }
  if (cardEl) {
    cardEl.style.borderColor = `${color}33`;
    cardEl.style.boxShadow = `0 8px 40px ${color}18`;
  }

  if (riskEl) {
    riskEl.className = `risk-badge ${risk.level}`;
    riskEl.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      ${risk.label}`;
  }

  if (scrollEl) {
    scrollEl.innerHTML = scores
      .map((item, index) => {
        const key = normalizeKey(item.label_key || item.label);
        const itemColor = getCategoryColor(key);
        const isPrimary = index === 0;
        return `
          <div class="classification-item${isPrimary ? ' is-primary' : ''}" role="listitem">
            <span class="classification-rank">${index + 1}</span>
            <span class="classification-dot" style="background:${itemColor}"></span>
            <span class="classification-label">${item.label}</span>
            <div class="classification-bar-track">
              <div class="classification-bar-fill" style="width:${item.confidence}%;background:${itemColor}"></div>
            </div>
            <span class="classification-score">${pct(item.confidence)}</span>
          </div>`;
      })
      .join('');
    scrollEl.setAttribute('role', 'list');
    scrollEl.setAttribute('aria-label', 'Classification breakdown ranked by confidence');
  }

  if (explanationEl) {
    explanationEl.textContent = EXPLANATIONS[primaryKey] || EXPLANATIONS.stress;
  }

  if (recommendationsEl) {
    const recs = RECOMMENDATIONS[primaryKey] || RECOMMENDATIONS.stress;
    recommendationsEl.innerHTML = recs.map((r) => `<li>${r}</li>`).join('');
  }

  if (themesEl) {
    themesEl.innerHTML = themes
      .map((t) => `<span class="theme-tag">${t}</span>`)
      .join('');
  }
}

export async function classifyText(text) {
  const { mockClassification } = await import('./constants.js');
  
  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status === 503) {
      console.warn('Model unavailable — using demo classification.');
      return mockClassification(text);
    }

    throw new Error('Classification request failed');
  } catch (err) {
    console.warn('API unreachable — using demo classification.', err);
    return mockClassification(text);
  }
}

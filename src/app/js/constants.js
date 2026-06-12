/** Category display config — aligned with models/mental_health_classifier/ labels */

export const CATEGORIES = [
  { key: 'normal', label: 'Normal', color: 'var(--cat-normal)' },
  { key: 'depression', label: 'Depression', color: 'var(--cat-depression)' },
  { key: 'suicidal', label: 'Suicidal', color: 'var(--cat-suicidal)' },
  { key: 'burnout', label: 'Burnout', color: 'var(--cat-burnout)' },
  { key: 'loneliness', label: 'Loneliness', color: 'var(--cat-loneliness)' },
  { key: 'anxiety', label: 'Anxiety', color: 'var(--cat-anxiety)' },
  { key: 'bipolar', label: 'Bipolar', color: 'var(--cat-bipolar)' },
  { key: 'stress', label: 'Stress', color: 'var(--cat-stress)' },
  { key: 'personality disorder', label: 'Personality Disorder', color: 'var(--cat-personality)' },
];

export const CATEGORY_COLORS = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.color])
);

export const PROCESSING_MESSAGES = [
  'Analyzing your response...',
  'Identifying emotional patterns...',
  'Generating insights...',
];

export const EXPLANATIONS = {
  normal: 'Your responses suggest a generally balanced emotional state. Continue monitoring your wellbeing and maintain healthy routines.',
  depression: 'Your language patterns may indicate signs of low mood or persistent sadness. Speaking with a counselor could provide helpful support.',
  suicidal: 'Your responses contain language that may indicate distress. Please reach out to a crisis helpline or mental health professional immediately.',
  burnout: 'Your responses suggest exhaustion and depletion, often linked to prolonged stress or overwork. Rest and professional support may help.',
  loneliness: 'Your responses reflect feelings of isolation or disconnection. Reaching out to trusted people or support groups may be beneficial.',
  anxiety: 'Your responses suggest elevated worry or nervousness. Grounding techniques and professional guidance can help manage these feelings.',
  bipolar: 'Your language may reflect mood fluctuation patterns. A clinical evaluation is recommended for accurate understanding.',
  stress: 'Your responses indicate elevated stress, particularly around pressure and difficulty relaxing. Stress-management strategies may help.',
  'personality disorder': 'Your responses contain patterns that warrant thoughtful follow-up with a qualified mental health professional.',
};

export const RECOMMENDATIONS = {
  normal: [
    'Continue regular self-check-ins to monitor your emotional wellbeing',
    'Maintain sleep, exercise, and social connection habits',
    'Use this tool periodically as a wellness awareness check',
  ],
  depression: [
    'Consider speaking with a counselor or therapist about persistent low mood',
    'Maintain a daily routine with small, achievable goals',
    'Stay connected with people you trust, even when it feels difficult',
    'Explore campus or community mental health resources',
  ],
  suicidal: [
    'Contact a crisis helpline or emergency services immediately if you are in danger',
    'Reach out to a trusted person right now — you do not have to face this alone',
    'Remove access to means of self-harm if possible and seek professional help',
    'National crisis lines are available 24/7 in most countries',
  ],
  burnout: [
    'Prioritize rest and set boundaries around work or study demands',
    'Take regular breaks and disconnect from stressors when possible',
    'Speak with a supervisor, counselor, or doctor about sustained exhaustion',
    'Practice recovery activities that restore your energy',
  ],
  loneliness: [
    'Reach out to one person you trust, even with a brief message',
    'Explore community groups, clubs, or volunteer opportunities',
    'Consider counseling to work through feelings of isolation',
    'Limit social media if it increases feelings of disconnection',
  ],
  anxiety: [
    'Practice daily breathing or grounding exercises for 10 minutes',
    'Identify triggers and break worries into manageable steps',
    'Consider speaking with a mental health professional about persistent anxiety',
    'Reduce caffeine and establish a calming bedtime routine',
  ],
  bipolar: [
    'Seek evaluation from a qualified mental health professional',
    'Track mood patterns over time to share with a clinician',
    'Maintain consistent sleep and daily routines',
    'Avoid self-diagnosis — professional assessment is important',
  ],
  stress: [
    'Practice daily mindfulness or breathing exercises for 10–15 minutes',
    'Establish a consistent sleep schedule and wind-down routine',
    'Consider speaking with a mental health professional about ongoing stress',
    'Break large tasks into smaller, manageable steps',
  ],
  'personality disorder': [
    'Seek guidance from a qualified mental health professional for evaluation',
    'Avoid self-labeling based on screening results alone',
    'Explore therapeutic approaches recommended by a licensed clinician',
    'Use this result as a starting point for conversation, not a diagnosis',
  ],
};

export const THEME_KEYWORDS = {
  'Work & Pressure': ['work', 'job', 'deadline', 'boss', 'overwhelm', 'burnout', 'shift'],
  'Sleep & Rest': ['sleep', 'insomnia', 'tired', 'exhausted', 'rest', 'night'],
  'Worry & Anxiety': ['worry', 'anxious', 'nervous', 'panic', 'fear', 'stress'],
  'Low Mood': ['sad', 'depressed', 'hopeless', 'empty', 'cry', 'down'],
  'Isolation': ['alone', 'lonely', 'isolated', 'nobody', 'disconnect'],
  'Relationships': ['friend', 'family', 'partner', 'relationship', 'argument'],
  'Self-worth': ['worthless', 'failure', 'hate myself', 'not enough', 'guilty'],
};

export function normalizeKey(label) {
  return String(label || '').trim().toLowerCase();
}

export function getCategoryColor(labelKey) {
  return CATEGORY_COLORS[normalizeKey(labelKey)] || 'var(--color-cerulean)';
}

export function detectThemes(text) {
  const lower = String(text || '').toLowerCase();
  const themes = [];

  Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
    if (keywords.some((kw) => lower.includes(kw))) {
      themes.push(theme);
    }
  });

  return themes.length ? themes : ['General emotional expression'];
}

export function getRiskLevel(primaryKey, confidence) {
  if (primaryKey === 'suicidal' && confidence >= 40) {
    return { level: 'high', label: 'Immediate Attention Recommended' };
  }
  if (primaryKey === 'suicidal' || (primaryKey !== 'normal' && confidence >= 70)) {
    return { level: 'high', label: `Elevated ${formatLabel(primaryKey)} Indicators` };
  }
  if (primaryKey !== 'normal' && confidence >= 45) {
    return { level: 'moderate', label: `Moderate ${formatLabel(primaryKey)} Indicators` };
  }
  return { level: 'low', label: 'Low Concern Indicators' };
}

export function formatLabel(key) {
  const match = CATEGORIES.find((c) => c.key === normalizeKey(key));
  return match ? match.label : String(key).replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Demo scores when API/model unavailable */
export function mockClassification(text) {
  const lower = String(text || '').toLowerCase();
  let primary = 'stress';
  if (/suicid|kill myself|end it|want to die/.test(lower)) primary = 'suicidal';
  else if (/depress|sad|hopeless|empty/.test(lower)) primary = 'depression';
  else if (/anx|worry|panic|nervous/.test(lower)) primary = 'anxiety';
  else if (/alone|lonely|isolated/.test(lower)) primary = 'loneliness';
  else if (/burnout|exhausted|drained/.test(lower)) primary = 'burnout';
  else if (/bipolar|mood swing|manic/.test(lower)) primary = 'bipolar';
  else if (/personality|borderline|narciss/.test(lower)) primary = 'personality disorder';
  else if (/normal|fine|okay|good|happy/.test(lower)) primary = 'normal';

  const primaryConfidence = primary === 'normal' ? 55 + Math.random() * 20 : 65 + Math.random() * 25;
  const remaining = 100 - primaryConfidence;
  const others = CATEGORIES.filter((c) => c.key !== primary);
  const weights = others.map(() => Math.random());
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const scores = CATEGORIES.map((cat) => {
    if (cat.key === primary) {
      return {
        label: cat.label,
        label_key: cat.key,
        confidence: Math.round(primaryConfidence * 10) / 10,
      };
    }
    const idx = others.findIndex((o) => o.key === cat.key);
    const share = (weights[idx] / weightSum) * remaining;
    return {
      label: cat.label,
      label_key: cat.key,
      confidence: Math.round(share * 10) / 10,
    };
  });

  scores.sort((a, b) => b.confidence - a.confidence);
  const top = scores[0];

  return {
    primary: top.label,
    primary_key: top.label_key,
    confidence: top.confidence,
    scores,
    _mock: true,
  };
}

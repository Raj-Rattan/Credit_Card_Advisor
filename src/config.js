export const API_CONFIG = {
  baseURL: 'https://api.deepinfra.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-6gIE9fFe34LVDCEcvQlMR9QBshfcbcE0IocWdmM0rA42ymAG'  // Using DeepInfra API key
  }
};

// Available models for recommendation
export const AI_MODELS = {
  CHAT: 'deepinfra/deepseek-llm-67b-chat',
  RECOMMENDATIONS: 'deepinfra/deepseek-llm-67b-chat'
};

export const CARD_CATEGORIES = [
  'travel',
  'dining',
  'shopping',
  'groceries',
  'entertainment',
  'fuel',
  'bills',
  'healthcare',
  'education'
];

export const BENEFIT_TYPES = [
  'cashback',
  'travel_points',
  'rewards',
  'lounge_access',
  'insurance',
  'zero_fees'
]; 
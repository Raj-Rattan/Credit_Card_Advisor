import React, { useState, useEffect } from 'react';
import { CreditCard, Sparkles } from 'lucide-react';
import ChatInterface from './ChatInterface';
import CardRecommendations from './CardRecommendations';
import { API_CONFIG, AI_MODELS } from '../config';

const CreditCardAdvisor = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [userData, setUserData] = useState({
    monthlyIncome: null,
    spendingHabits: [],
    preferredBenefits: null,
    existingCards: [],
    creditScore: null
  });

  useEffect(() => {
    // Initialize chat with welcome message
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm your personal credit card advisor. I'll help you find the perfect credit card based on your needs and spending habits. Let's get started! 🚀\n\nWhat's your approximate monthly income?"
      }
    ]);
  }, []);

  const handleSendMessage = async (message) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: message }]);
  
    try {
      const updatedUserData = { ...userData };
      let nextQuestion = '';
      let shouldGenerateRecommendations = false;
  
      if (!updatedUserData.monthlyIncome) {
        const income = parseFloat(message.replace(/[^0-9.]/g, ''));
        if (!isNaN(income)) {
          updatedUserData.monthlyIncome = income;
          nextQuestion = 'Great! What are your main spending categories? (e.g., travel, dining, shopping)';
        } else {
          nextQuestion = 'Please enter a valid number for your monthly income.';
        }
      } else if (updatedUserData.spendingHabits.length === 0) {
        updatedUserData.spendingHabits = message.toLowerCase().split(',').map(h => h.trim());
        nextQuestion = 'What is your most preferred benefit? (e.g., cashback, travel points)';
      } else if (!updatedUserData.preferredBenefits) {
        updatedUserData.preferredBenefits = message.toLowerCase();
        nextQuestion = 'What is your approximate credit score?';
      } else if (!updatedUserData.creditScore) {
        const score = parseInt(message);
        if (!isNaN(score)) {
          updatedUserData.creditScore = score;
          shouldGenerateRecommendations = true;
          nextQuestion = "Thanks! I'm now generating your personalized credit card recommendations...";
        } else {
          nextQuestion = 'Please enter a valid number for your credit score.';
        }
      }
  
      setUserData(updatedUserData);
      
      // Use AI to generate a more personalized response if we have some data
      if (updatedUserData.monthlyIncome && !shouldGenerateRecommendations) {
        try {
          const aiResponse = await generateAIResponse(updatedUserData, nextQuestion);
          nextQuestion = aiResponse || nextQuestion;
        } catch (error) {
          console.error('Error generating AI response:', error);
          // Fall back to the default question if AI fails
        }
      }
  
      setMessages(prev => [...prev, { role: 'assistant', content: nextQuestion }]);
  
      if (shouldGenerateRecommendations) {
        const recommendations = await fetchRecommendations(updatedUserData);
        setRecommendations(recommendations);
        setShowRecommendations(true);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I apologize, but I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI response using DeepSeek API
  const generateAIResponse = async (userData, defaultQuestion) => {
    try {
      const currentState = Object.entries(userData)
        .filter(([key, value]) => value !== null && (Array.isArray(value) ? value.length > 0 : true))
        .map(([key, value]) => {
          if (key === 'monthlyIncome') return `Monthly Income: ₹${value}`;
          if (key === 'spendingHabits') return `Spending Categories: ${value.join(', ')}`;
          if (key === 'preferredBenefits') return `Preferred Benefits: ${value}`;
          if (key === 'creditScore') return `Credit Score: ${value}`;
          return null;
        })
        .filter(Boolean)
        .join('\n');

      const prompt = `
You are a helpful credit card advisor assistant. Based on the following user information:

${currentState}

Generate a friendly, personalized response to continue the conversation. 
If asking the next question, make it sound natural and conversational.
Keep your response concise and friendly.`;

      const response = await fetch(`${API_CONFIG.baseURL}/v1/inference/${AI_MODELS.CHAT}`, {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify({
          input: {
            messages: [
              { role: 'system', content: 'You are a helpful credit card advisor assistant.' },
              { role: 'user', content: prompt }
            ]
          },
          stream: false,
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI response');
      }

      const data = await response.json();
      return data.output?.choices?.[0]?.message?.content || defaultQuestion;
    } catch (error) {
      console.error('Error calling DeepSeek API:', error);
      return defaultQuestion; // Fall back to default question
    }
  };

  // Fetch recommendations from backend API with AI enhancement
  const fetchRecommendations = async (userData) => {
    try {
      // First get base recommendations from our backend
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      
      const baseRecommendations = await response.json();
      
      // Use DeepSeek API to enhance the recommendations with personalized reasons
      const enhancedRecommendations = await enhanceRecommendationsWithAI(baseRecommendations, userData);
      
      // Rerank recommendations using AI insights
      const rerankedRecommendations = await reRankRecommendations(enhancedRecommendations, userData);
      
      return rerankedRecommendations;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  };
  
  // Re-rank recommendations based on AI insights
  const reRankRecommendations = async (recommendations, userData) => {
    try {
      const userProfile = `
Monthly Income: ₹${userData.monthlyIncome}
Spending Categories: ${userData.spendingHabits.join(', ')}
Preferred Benefits: ${userData.preferredBenefits}
Credit Score: ${userData.creditScore}
`;

      const cardsInfo = recommendations.map(card => `
Card Name: ${card.name}
Issuer: ${card.issuer}
Annual Fee: ₹${card.annual_fee}
Reward Type: ${card.reward_type}
Reward Rate: ${card.reward_rate}
Categories: ${Array.isArray(card.categories) ? card.categories.join(', ') : JSON.parse(card.categories).join(', ')}
Special Perks: ${Array.isArray(card.special_perks) ? card.special_perks.join(', ') : JSON.parse(card.special_perks).join(', ')}
Reasons: ${card.reasons.join(', ')}
`).join('\n');

      const prompt = `
Based on the following user profile:
${userProfile}

And these credit card options:
${cardsInfo}

Analyze the suitability of each card for this specific user. Rank the cards in order of relevance, where 1 is the most suitable.
For each card, assign a relevance score from 1-100 based on how well it matches the user's profile, spending habits, and preferences.

Format the output as a JSON array of objects, where each object contains the card name and relevance score. Example:
[
  {"name": "Card Name 1", "score": 95},
  {"name": "Card Name 2", "score": 82},
  {"name": "Card Name 3", "score": 70}
]
`;

      const response = await fetch(`${API_CONFIG.baseURL}/v1/inference/${AI_MODELS.RECOMMENDATIONS}`, {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify({
          input: {
            messages: [
              { role: 'system', content: 'You are a credit card recommendation expert who carefully analyzes user profiles to provide personalized card rankings.' },
              { role: 'user', content: prompt }
            ]
          },
          stream: false,
          max_tokens: 500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error('Failed to re-rank recommendations with AI');
      }

      const data = await response.json();
      let rankingData;
      
      try {
        // Extract the JSON from the response content
        const content = data.output?.choices?.[0]?.message?.content || '';
        // Find the JSON part (between [ and ])
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        rankingData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (error) {
        console.error('Error parsing AI ranking response:', error);
        return recommendations; // Return original recommendations if parsing fails
      }
      
      if (!rankingData || !Array.isArray(rankingData)) {
        return recommendations; // Return original recommendations if no valid ranking
      }
      
      // Create a map of card names to their AI-assigned scores
      const scoreMap = new Map(rankingData.map(item => [item.name, item.score]));
      
      // Add AI scores to recommendations
      const scoredRecommendations = recommendations.map(card => ({
        ...card,
        ai_score: scoreMap.get(card.name) || 50 // Default score if not found
      }));
      
      // Sort by AI score, descending
      return scoredRecommendations.sort((a, b) => b.ai_score - a.ai_score);
    } catch (error) {
      console.error('Error re-ranking recommendations:', error);
      return recommendations; // Return original recommendations if re-ranking fails
    }
  };
  
  // Enhance recommendations with AI-generated personalized reasons
  const enhanceRecommendationsWithAI = async (recommendations, userData) => {
    try {
      const userProfile = `
Monthly Income: ₹${userData.monthlyIncome}
Spending Categories: ${userData.spendingHabits.join(', ')}
Preferred Benefits: ${userData.preferredBenefits}
Credit Score: ${userData.creditScore}
`;

      const cardsInfo = recommendations.map(card => `
Card Name: ${card.name}
Issuer: ${card.issuer}
Annual Fee: ₹${card.annual_fee}
Reward Type: ${card.reward_type}
Reward Rate: ${card.reward_rate}
Categories: ${Array.isArray(card.categories) ? card.categories.join(', ') : JSON.parse(card.categories).join(', ')}
Special Perks: ${Array.isArray(card.special_perks) ? card.special_perks.join(', ') : JSON.parse(card.special_perks).join(', ')}
`).join('\n');

      const prompt = `
Based on the following user profile:
${userProfile}

And these credit card options:
${cardsInfo}

For each card, generate 3-5 highly personalized reasons why this specific card would be good for this specific user. 
Focus on matching the card benefits to the user's spending habits, income level, and preferences. 
Be specific about how each card's features address the user's particular needs.

Format the output as a JSON array of arrays, where each inner array contains the reasons for one card in the same order as provided. Example:
[
  ["Perfect match for dining and travel spending patterns", "Premium airport lounge access suits your travel needs", "High reward rate maximizes your monthly spending", "No foreign transaction fees ideal for international trips"],
  ["5% cashback on groceries optimizes your regular spending", "Zero annual fee great for your budget preferences", "Easy approval with your credit score", "24/7 customer service"]
]
`;

      const response = await fetch(`${API_CONFIG.baseURL}/v1/inference/${AI_MODELS.RECOMMENDATIONS}`, {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify({
          input: {
            messages: [
              { role: 'system', content: 'You are a credit card recommendation expert who provides detailed, personalized analysis.' },
              { role: 'user', content: prompt }
            ]
          },
          stream: false,
          max_tokens: 800,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enhance recommendations with AI');
      }

      const data = await response.json();
      let personalizedReasons;
      
      try {
        // Extract the JSON from the response content
        const content = data.output?.choices?.[0]?.message?.content || '';
        // Find the JSON part (between [ and ])
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        personalizedReasons = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (error) {
        console.error('Error parsing AI response as JSON:', error);
        // If parsing fails, use a fallback approach
        personalizedReasons = recommendations.map(() => [
          "Great match for your spending habits",
          "Excellent rewards structure",
          "Good value for annual fee"
        ]);
      }

      // Combine the base recommendations with the personalized reasons
      return recommendations.map((card, index) => {
        const reasons = personalizedReasons && personalizedReasons[index] 
          ? personalizedReasons[index] 
          : [
              "Great match for your spending habits",
              "Excellent rewards structure",
              "Good value for annual fee"
            ];
        
        return {
          ...card,
          reasons: reasons
        };
      });
    } catch (error) {
      console.error('Error enhancing recommendations:', error);
      // Return the original recommendations if enhancement fails
      return recommendations;
    }
  };

  const handleRestart = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm your personal credit card advisor. I'll help you find the perfect credit card based on your needs and spending habits. Let's get started! 🚀\n\nWhat's your approximate monthly income?"
      }
    ]);
    setShowRecommendations(false);
    setRecommendations([]);
    setUserData({
      monthlyIncome: null,
      spendingHabits: [],
      preferredBenefits: null,
      existingCards: [],
      creditScore: null
    });
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      {/* Header with animated gradient border */}
      <div className="text-center mb-10 relative">
        <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 opacity-20 blur-xl animate-pulse"></div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <CreditCard className="text-blue-600" size={32} />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 inline-block text-transparent bg-clip-text">
              Credit Card Advisor
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Find your perfect credit card match with our AI-powered recommendation engine
          </p>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
            <Sparkles className="text-yellow-400 animate-pulse" size={20} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300">
        {!showRecommendations ? (
          <div className="h-[600px]">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <CardRecommendations
            recommendations={recommendations}
            onRestart={handleRestart}
          />
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>© 2025 Credit Card Advisor. All recommendations are personalized based on your profile.</p>
      </div>
    </div>
  );
};

export default CreditCardAdvisor;
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { creditCardService, recommendationService } from './database/services.js';
import { testConnection } from './database/config.js';
import dotenv from 'dotenv';
import twilioService from './services/twilio.js';

// Load environment variables
dotenv.config();

// Set development mode for testing
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Global flag to track if we're using mock data
let useMockData = process.env.NODE_ENV === 'development';

// Test database connection on startup
testConnection().then(isConnected => {
  if (!isConnected) {
    console.warn('Database connection failed. Running in mock mode.');
    useMockData = true;
  } else {
    console.log('Database connected successfully.');
    useMockData = false;
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mockMode: useMockData
  });
});

// API endpoint: Get recommendations
app.post('/api/recommendations', async (req, res) => {
  try {
    const userData = req.body;
    console.log('Received user data:', userData);

    // Validate user data
    if (!userData.monthlyIncome || !userData.creditScore) {
      return res.status(400).json({ error: 'Missing required user data' });
    }

    // If in mock mode, generate mock recommendations
    if (useMockData) {
      console.log('Using mock data for recommendations');
      const mockCards = generatePersonalizedMockCards(userData);
      return res.json(mockCards);
    }

    try {
      // Get eligible cards from database
      const eligibleCards = await creditCardService.getEligibleCards({
        monthlyIncome: userData.monthlyIncome,
        creditScore: userData.creditScore,
        spendingCategories: userData.spendingHabits || [],
        preferredBenefits: userData.preferredBenefits
      });
      
      console.log('Eligible cards:', eligibleCards);

      // Score and rank cards
      const scoredCards = eligibleCards.map(card => {
        let score = 0;
        
        // Income score
        if (card.min_income <= userData.monthlyIncome) score += 20;
        
        // Category matching score
        const matchingCategories = JSON.parse(card.categories).filter(cat => 
          userData.spendingHabits?.includes(cat)
        );
        score += matchingCategories.length * 15;
        
        // Benefits preference score
        if (userData.preferredBenefits === 'cashback' && card.reward_type === 'Cashback') score += 25;
        if (userData.preferredBenefits === 'travel_points' && card.reward_type === 'Points') score += 25;

        // Calculate yearly rewards
        const averageMonthlySpend = Math.min(userData.monthlyIncome * 0.4, 50000); // 40% of income or max 50k
        const yearlySpend = averageMonthlySpend * 12;
        let yearly_rewards = card.reward_type === 'Cashback' 
          ? Math.floor(yearlySpend * 0.02) 
          : Math.floor(yearlySpend * 0.015);

        // Generate reasons
        const reasons = [];
        if (userData.preferredBenefits === 'cashback' && card.reward_type === 'Cashback') {
          reasons.push('High cashback rewards match your preference');
        }
        if (userData.spendingHabits?.some(cat => JSON.parse(card.categories).includes(cat))) {
          reasons.push('Excellent rewards on your spending categories');
        }
        if (card.annual_fee === 0) {
          reasons.push('Zero annual fee');
        }
        const perks = JSON.parse(card.special_perks);
        if (perks.length > 0) {
          reasons.push(`Premium perks: ${perks[0]}`);
        }

        return { ...card, score, yearly_rewards, reasons };
      });

      // Get top 5 recommendations instead of just 3 to give the AI more options
      const topRecommendations = scoredCards
        .filter(card => card.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      console.log('Top recommendations:', topRecommendations);
      res.json(topRecommendations);
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // If database error occurred, fall back to mock data
      console.log('Database error, falling back to mock data');
      const mockCards = generatePersonalizedMockCards(userData);
      return res.json(mockCards);
    }
  } catch (error) {
    console.error('Error in /api/recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations', 
      details: error.message 
    });
  }
});

// API endpoint: Get card by ID
app.get('/api/cards/:id', async (req, res) => {
  try {
    const card = await creditCardService.getCardById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (error) {
    console.error('Error in /api/cards/:id:', error);
    res.status(500).json({ error: 'Failed to fetch card', details: error.message });
  }
});

// API endpoint: Compare cards
app.post('/api/compare-cards', async (req, res) => {
  try {
    const { cardIds } = req.body;
    
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: 'Invalid card IDs. Please provide an array of card IDs.' });
    }
    
    console.log('Comparing cards with IDs:', cardIds);
    
    // If in mock mode, return mock comparison data
    if (useMockData) {
      console.log('Using mock data for card comparison');
      const mockComparisonData = generateMockComparisonData(cardIds);
      return res.json(mockComparisonData);
    }
    
    let comparisonResults;
    try {
      comparisonResults = await recommendationService.compareCards(cardIds);
    } catch (dbError) {
      console.error('Database error in card comparison:', dbError);
      console.log('Falling back to mock comparison data');
      comparisonResults = generateMockComparisonData(cardIds);
    }
    
    if (!comparisonResults || comparisonResults.length === 0) {
      return res.status(404).json({ error: 'No cards found for comparison' });
    }
    
    // Add additional comparison metrics
    const enhancedResults = comparisonResults.map(card => {
      // Calculate cost-to-benefit ratio
      const annualCost = card.annual_fee || 0;
      const estimatedYearlyBenefit = card.reward_type === 'Cashback' 
        ? Math.floor(360000 * 0.02) // Assuming 30k monthly spend with 2% average cashback
        : Math.floor(360000 * 0.015); // Assuming 30k monthly spend with 1.5% value for points
      
      return {
        ...card,
        estimated_yearly_benefit: estimatedYearlyBenefit,
        cost_benefit_ratio: annualCost > 0 ? (estimatedYearlyBenefit / annualCost).toFixed(2) : 'Infinite',
        overall_score: calculateOverallScore(card)
      };
    });
    
    res.json(enhancedResults);
  } catch (error) {
    console.error('Error in /api/compare-cards:', error);
    res.status(500).json({ error: 'Failed to compare cards', details: error.message });
  }
});

// API endpoint: Send WhatsApp message with template
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { phoneNumber, variables, templateSid } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const message = await twilioService.sendWhatsAppMessage(
      phoneNumber,
      templateSid,
      variables || {}
    );
    
    res.json({
      success: true,
      messageSid: message.sid,
      status: message.status
    });
  } catch (error) {
    console.error('Error in /api/whatsapp/send:', error);
    res.status(500).json({
      error: 'Failed to send WhatsApp message',
      details: error.message
    });
  }
});

// API endpoint: Send credit card recommendations via WhatsApp
app.post('/api/whatsapp/send-recommendations', async (req, res) => {
  try {
    const { phoneNumber, cardIds } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ error: 'Card IDs are required' });
    }
    
    // Get card details if they're not already in the request
    let cards = req.body.cards;
    
    if (!cards) {
      try {
        // Try to get cards from database
        cards = await creditCardService.getCardsByIds(cardIds);
      } catch (error) {
        console.error('Error fetching card details:', error);
        
        // Use mock data in development mode
        if (useMockData) {
          cards = generateMockComparisonData(cardIds);
        } else {
          throw error;
        }
      }
    }
    
    const message = await twilioService.sendCardRecommendations(phoneNumber, cards);
    
    res.json({
      success: true,
      messageSid: message.sid,
      status: message.status
    });
  } catch (error) {
    console.error('Error in /api/whatsapp/send-recommendations:', error);
    res.status(500).json({
      error: 'Failed to send recommendations via WhatsApp',
      details: error.message
    });
  }
});

// Helper function to generate mock comparison data
function generateMockComparisonData(cardIds) {
  return cardIds.map((id, index) => {
    // Create mock data with some variation
    const baseAnnualFee = 500 + (index * 250);
    const baseRewardRate = (1.5 + (index * 0.25)).toFixed(1);
    
    return {
      card_id: parseInt(id),
      name: `Credit Card ${id}`,
      issuer: ["HDFC Bank", "ICICI Bank", "SBI Card", "Axis Bank"][index % 4],
      joining_fee: 1000,
      annual_fee: baseAnnualFee,
      reward_type: index % 2 === 0 ? "Cashback" : "Points",
      reward_rate: index % 2 === 0 ? `${baseRewardRate}%` : `${baseRewardRate}X`,
      min_income: 500000 + (index * 100000),
      min_credit_score: 700 + (index * 20),
      special_perks: JSON.stringify([
        "Airport lounge access",
        "Fuel surcharge waiver",
        "Movie ticket discounts",
        "Dining privileges"
      ].slice(0, 2 + index % 3)),
      categories: JSON.stringify([
        "travel",
        "dining",
        "shopping",
        "entertainment",
        "groceries"
      ].slice(0, 2 + index % 4))
    };
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});

// Helper function to generate personalized mock cards based on user input
function generatePersonalizedMockCards(userData) {
  const { monthlyIncome, creditScore, spendingHabits, preferredBenefits } = userData;
  
  // Base set of cards
  const allMockCards = [
    {
      id: 1,
      name: "HDFC Diners Club Black",
      issuer: "HDFC Bank",
      joining_fee: 10000,
      annual_fee: 10000,
      reward_type: "Points",
      reward_rate: "5-10%",
      min_income: 1800000,
      min_credit_score: 750,
      special_perks: JSON.stringify(["Airport lounge access", "Golf privileges"]),
      categories: JSON.stringify(["travel", "dining"]),
      apply_link: "https://www.hdfcbank.com/",
      card_image: "hdfc_diners_black.jpg"
    },
    {
      id: 2,
      name: "SBI Card PRIME",
      issuer: "SBI Card",
      joining_fee: 2999,
      annual_fee: 2999,
      reward_type: "Points",
      reward_rate: "2-5%",
      min_income: 600000,
      min_credit_score: 700,
      special_perks: JSON.stringify(["Fuel surcharge waiver", "Movie ticket discounts"]),
      categories: JSON.stringify(["fuel", "entertainment"]),
      apply_link: "https://www.sbicard.com/",
      card_image: "sbi_prime.jpg"
    },
    {
      id: 3,
      name: "ICICI Amazon Pay Credit Card",
      issuer: "ICICI Bank",
      joining_fee: 0,
      annual_fee: 0,
      reward_type: "Cashback",
      reward_rate: "1-5%",
      min_income: 300000,
      min_credit_score: 650,
      special_perks: JSON.stringify(["Amazon Prime membership", "No-cost EMI"]),
      categories: JSON.stringify(["shopping", "bills"]),
      apply_link: "https://www.icicibank.com/",
      card_image: "icici_amazon.jpg"
    },
    {
      id: 4,
      name: "Axis Bank Flipkart Credit Card",
      issuer: "Axis Bank",
      joining_fee: 500,
      annual_fee: 500,
      reward_type: "Cashback",
      reward_rate: "1.5-5%",
      min_income: 250000,
      min_credit_score: 650,
      special_perks: JSON.stringify(["Flipkart vouchers", "Welcome points"]),
      categories: JSON.stringify(["shopping", "groceries"]),
      apply_link: "https://www.axisbank.com/",
      card_image: "axis_flipkart.jpg"
    },
    {
      id: 5,
      name: "Standard Chartered Manhattan Card",
      issuer: "Standard Chartered",
      joining_fee: 999,
      annual_fee: 999,
      reward_type: "Cashback",
      reward_rate: "1-3%",
      min_income: 180000,
      min_credit_score: 600,
      special_perks: JSON.stringify(["Dining discounts", "Movie offers"]),
      categories: JSON.stringify(["dining", "entertainment"]),
      apply_link: "https://www.sc.com/in/",
      card_image: "sc_manhattan.jpg"
    },
    {
      id: 6,
      name: "Citi PremierMiles Card",
      issuer: "Citibank",
      joining_fee: 3000,
      annual_fee: 3000,
      reward_type: "Points",
      reward_rate: "4-10 miles per ₹100",
      min_income: 750000,
      min_credit_score: 720,
      special_perks: JSON.stringify(["Complimentary lounge access", "Travel insurance"]),
      categories: JSON.stringify(["travel", "international"]),
      apply_link: "https://www.citibank.co.in/",
      card_image: "citi_premiermiles.jpg"
    },
    {
      id: 7,
      name: "HSBC Visa Platinum Card",
      issuer: "HSBC",
      joining_fee: 1000,
      annual_fee: 1000,
      reward_type: "Points",
      reward_rate: "2 points per ₹100",
      min_income: 500000,
      min_credit_score: 680,
      special_perks: JSON.stringify(["Fuel surcharge waiver", "Extended warranty"]),
      categories: JSON.stringify(["fuel", "shopping"]),
      apply_link: "https://www.hsbc.co.in/",
      card_image: "hsbc_platinum.jpg"
    },
    {
      id: 8,
      name: "Kotak Urbane Card",
      issuer: "Kotak Mahindra Bank",
      joining_fee: 700,
      annual_fee: 700,
      reward_type: "Cashback",
      reward_rate: "1-2%",
      min_income: 300000,
      min_credit_score: 650,
      special_perks: JSON.stringify(["1+1 movie tickets", "Dining discounts"]),
      categories: JSON.stringify(["entertainment", "dining"]),
      apply_link: "https://www.kotak.com/",
      card_image: "kotak_urbane.jpg"
    }
  ];
  
  // Filter cards based on income and credit score
  let eligibleCards = allMockCards.filter(card => 
    card.min_income <= monthlyIncome && 
    card.min_credit_score <= creditScore
  );
  
  // If no cards match, relax the criteria a bit
  if (eligibleCards.length === 0) {
    eligibleCards = allMockCards.filter(card => 
      card.min_income <= monthlyIncome * 1.2 || 
      card.min_credit_score <= creditScore + 50
    );
  }
  
  // If still no cards, return a subset of all cards
  if (eligibleCards.length === 0) {
    eligibleCards = allMockCards.slice(0, 3);
  }
  
  // Score cards based on user preferences
  const scoredCards = eligibleCards.map(card => {
    let score = 0;
    const cardCategories = JSON.parse(card.categories);
    
    // Income score - higher score if income is well above minimum
    if (card.min_income <= monthlyIncome) {
      score += 20;
      if (card.min_income <= monthlyIncome * 0.5) {
        score += 10; // Extra points if income is much higher than minimum
      }
    }
    
    // Category matching score
    const matchingCategories = cardCategories.filter(cat => 
      spendingHabits?.includes(cat)
    );
    score += matchingCategories.length * 15;
    
    // Benefits preference score
    if (preferredBenefits === 'cashback' && card.reward_type === 'Cashback') score += 25;
    if (preferredBenefits === 'travel_points' && card.reward_type === 'Points') score += 25;
    
    // Calculate yearly rewards based on spending habits
    const averageMonthlySpend = monthlyIncome * 0.3; // Assume 30% of income is spent on card
    const yearlySpend = averageMonthlySpend * 12;
    let yearly_rewards = card.reward_type === 'Cashback' 
      ? Math.floor(yearlySpend * 0.02) 
      : Math.floor(yearlySpend * 0.015);
    
    // Generate personalized reasons
    const reasons = [];
    
    // Reason based on reward type preference
    if (preferredBenefits === 'cashback' && card.reward_type === 'Cashback') {
      reasons.push('High cashback rewards match your preference');
    } else if (preferredBenefits === 'travel_points' && card.reward_type === 'Points') {
      reasons.push('Excellent travel rewards program');
    }
    
    // Reason based on spending categories
    if (matchingCategories.length > 0) {
      const categories = matchingCategories.join(' and ');
      reasons.push(`Great rewards on ${categories} spending`);
    }
    
    // Reason based on annual fee
    if (card.annual_fee === 0) {
      reasons.push('Zero annual fee');
    } else if (card.annual_fee < monthlyIncome * 0.01) {
      reasons.push('Low annual fee relative to your income');
    }
    
    // Reason based on special perks
    const perks = JSON.parse(card.special_perks);
    if (perks.length > 0) {
      reasons.push(`Premium perks: ${perks[0]}`);
    }
    
    return { 
      ...card, 
      score, 
      yearly_rewards,
      reasons
    };
  });
  
  // Sort by score and take top 3
  return scoredCards
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Helper function to calculate overall score for a card
function calculateOverallScore(card) {
  try {
    let score = 0;
    
    // Reward value score (0-40 points)
    const estimatedYearlyBenefit = card.estimated_yearly_benefit || 
      (card.reward_type === 'Cashback' ? Math.floor(360000 * 0.02) : Math.floor(360000 * 0.015));
    
    score += Math.min(40, (estimatedYearlyBenefit / 10000) * 40);
    
    // Annual fee score (0-30 points)
    const annualFee = card.annual_fee || 0;
    const feeScore = annualFee === 0 ? 30 : (1 - (annualFee / 15000)) * 30;
    score += Math.max(0, feeScore);
    
    // Special perks score (0-30 points)
    const perks = Array.isArray(card.special_perks) 
      ? card.special_perks 
      : (typeof card.special_perks === 'string' ? JSON.parse(card.special_perks) : []);
    
    score += Math.min(30, perks.length * 10);
    
    // Cap the score at 100
    return Math.min(100, Math.round(score));
  } catch (error) {
    console.error('Error calculating score:', error);
    return 70; // Default fallback score
  }
} 
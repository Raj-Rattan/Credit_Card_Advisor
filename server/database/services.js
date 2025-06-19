import pool, { testConnection } from './config.js';

// Customer Services
export const customerService = {
  async createCustomer({ name, email, phone, creditScore }) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO customers (name, email, phone, credit_score) VALUES (?, ?, ?, ?)',
        [name, email, phone, creditScore]
      );
      return result.insertId;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  async getCustomerByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM customers WHERE email = ?',
      [email]
    );
    return rows[0];
  },

  async updateCustomerCreditScore(customerId, creditScore) {
    try {
      await pool.execute(
        'UPDATE customers SET credit_score = ? WHERE id = ?',
        [creditScore, customerId]
      );
      return true;
    } catch (error) {
      console.error('Error updating credit score:', error);
      throw error;
    }
  }
};

// Existing Cards Services
export const existingCardService = {
  async addExistingCard(customerId, cardName) {
    try {
      await pool.execute(
        'INSERT INTO existing_cards (customer_id, card_name) VALUES (?, ?)',
        [customerId, cardName]
      );
      return true;
    } catch (error) {
      console.error('Error adding existing card:', error);
      throw error;
    }
  },

  async getExistingCards(customerId) {
    try {
      const [rows] = await pool.execute(
        'SELECT card_name FROM existing_cards WHERE customer_id = ?',
        [customerId]
      );
      return rows.map(row => row.card_name);
    } catch (error) {
      console.error('Error getting existing cards:', error);
      throw error;
    }
  }
};

// Customer Preferences Services
export const preferenceService = {
  async savePreferences(customerId, preferences) {
    try {
      await pool.execute(
        'INSERT INTO customer_preferences (customer_id, spending_categories, preferred_benefits) VALUES (?, ?, ?)',
        [customerId, JSON.stringify(preferences.spendingCategories), preferences.preferredBenefits]
      );
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  },

  async getPreferences(customerId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM customer_preferences WHERE customer_id = ?',
        [customerId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting preferences:', error);
      throw error;
    }
  }
};

// Credit Card Services
export const creditCardService = {
  async getAllCards() {
    try {
      const [rows] = await pool.execute('SELECT * FROM credit_cards');
      return rows;
    } catch (error) {
      console.error('Error getting all cards:', error);
      return [];
    }
  },

  async getCardById(cardId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM credit_cards WHERE card_id = ?',
        [cardId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting card by ID:', error);
      // Return mock card if database fails
      return getMockCardById(cardId);
    }
  },

  async getEligibleCards({ monthlyIncome, creditScore, spendingCategories, preferredBenefits }) {
    try {
      // Format spending categories for SQL query
      const categoryPattern = spendingCategories && spendingCategories.length > 0 
        ? `%${spendingCategories.join('%')}%` 
        : '%';
      
      const [rows] = await pool.execute(
        `SELECT * FROM credit_cards 
         WHERE min_income <= ? 
         AND min_credit_score <= ?
         AND (categories LIKE ? OR reward_type = ?)`,
        [
          monthlyIncome,
          creditScore,
          categoryPattern,
          preferredBenefits || ''
        ]
      );
      
      if (rows && rows.length > 0) {
        return rows;
      } else {
        // If no results or database error, return mock data
        throw new Error('No eligible cards found or database error');
      }
    } catch (error) {
      console.error('Error getting eligible cards:', error);
      // Return mock data instead of throwing error
      return getMockCards();
    }
  },

  // Get cards by IDs
  getCardsByIds: async (cardIds) => {
    try {
      if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
        throw new Error('No card IDs provided');
      }
      
      // Convert all IDs to numbers for consistency
      const numericIds = cardIds.map(id => parseInt(id));
      
      // Create placeholders for SQL query
      const placeholders = numericIds.map(() => '?').join(',');
      
      const [rows] = await pool.query(
        `SELECT * FROM credit_cards WHERE card_id IN (${placeholders})`,
        numericIds
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting cards by IDs:', error);
      throw error;
    }
  }
};

// Recommendation Services
export const recommendationService = {
  async saveRecommendation(customerId, cardId, reasons) {
    try {
      await pool.execute(
        'INSERT INTO recommendations (customer_id, card_id, reasons) VALUES (?, ?, ?)',
        [customerId, cardId, JSON.stringify(reasons)]
      );
      return true;
    } catch (error) {
      console.error('Error saving recommendation:', error);
      throw error;
    }
  },

  async getCustomerRecommendations(customerId) {
    try {
      const [rows] = await pool.execute(
        `SELECT r.*, c.* 
         FROM recommendations r 
         JOIN credit_cards c ON r.card_id = c.id 
         WHERE r.customer_id = ?`,
        [customerId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting customer recommendations:', error);
      throw error;
    }
  },

  async compareCards(cardIds) {
    try {
      // Handle single card ID or array of IDs
      const ids = Array.isArray(cardIds) ? cardIds : [cardIds];
      
      if (ids.length === 0) {
        return [];
      }
      
      // Format the query with the right number of placeholders
      const placeholders = ids.map(() => '?').join(',');
      const query = `SELECT * FROM credit_cards WHERE card_id IN (${placeholders})`;
      
      const [rows] = await pool.execute(query, ids);
      
      if (rows && rows.length > 0) {
        return rows;
      } else {
        // If no results, return mock data for those IDs
        throw new Error('No cards found for comparison');
      }
    } catch (error) {
      console.error('Error comparing cards:', error);
      // Return mock data for the requested card IDs
      return getMockCardsForComparison(cardIds);
    }
  }
};

// Feedback Services
export const feedbackService = {
  async saveFeedback(recommendationId, rating, comments) {
    try {
      await pool.execute(
        'INSERT INTO customer_feedback (recommendation_id, rating, comments) VALUES (?, ?, ?)',
        [recommendationId, rating, comments]
      );
      return true;
    } catch (error) {
      console.error('Error saving feedback:', error);
      throw error;
    }
  },

  async getFeedbackByRecommendation(recommendationId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM customer_feedback WHERE recommendation_id = ?',
        [recommendationId]
      );
      return rows;
    } catch (error) {
      console.error('Error getting feedback:', error);
      throw error;
    }
  },

  async getAverageRating(cardId) {
    try {
      const [rows] = await pool.execute(
        `SELECT AVG(f.rating) as average_rating 
         FROM customer_feedback f 
         JOIN recommendations r ON f.recommendation_id = r.id 
         WHERE r.card_id = ?`,
        [cardId]
      );
      return rows[0]?.average_rating || 0;
    } catch (error) {
      console.error('Error getting average rating:', error);
      throw error;
    }
  }
};

// Mock data functions for fallback when database is unavailable
function getMockCards() {
  return [
    {
      card_id: 1,
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
      card_id: 2,
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
      card_id: 3,
      name: "ICICI Amazon Pay Credit Card",
      issuer: "ICICI Bank",
      joining_fee: 500,
      annual_fee: 500,
      reward_type: "Cashback",
      reward_rate: "1-5% on Amazon",
      min_income: 300000,
      min_credit_score: 650,
      special_perks: JSON.stringify(["Amazon Prime benefits", "Fuel surcharge waiver"]),
      categories: JSON.stringify(["shopping", "online"]),
      apply_link: "https://www.icicibank.com/",
      card_image: "icici_amazon.jpg"
    }
  ];
}

function getMockCardById(cardId) {
  const mockCards = getMockCards();
  return mockCards.find(card => card.card_id === parseInt(cardId)) || null;
}

// Function to get mock cards for comparison based on provided IDs
function getMockCardsForComparison(cardIds) {
  const mockCards = getMockCards();
  const ids = Array.isArray(cardIds) ? cardIds : [cardIds];
  
  // Filter mock cards based on the requested IDs
  return mockCards.filter(card => ids.includes(card.card_id) || ids.includes(String(card.card_id)));
} 
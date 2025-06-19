import twilio from 'twilio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Twilio configuration
const accountSid = 'ACbf2700e3a5511a33c39d8473e8cedd9d';
const authToken = 'aa68dceb5c74dc923c8edda89c8cbbc1';
const client = twilio(accountSid, authToken);

// WhatsApp configuration
const FROM_WHATSAPP_NUMBER = 'whatsapp:+14155238886';
const DEFAULT_TEMPLATE_SID = 'HXb5b62575e6e4ff6129ad7c8efe1f983e';

/**
 * Send a WhatsApp message using Twilio
 * @param {string} to - Recipient's phone number (with country code but without 'whatsapp:' prefix)
 * @param {string} templateSid - Content template SID (optional, uses default if not provided)
 * @param {Object} variables - Template variables (optional)
 * @returns {Promise} - Twilio message object
 */
export const sendWhatsAppMessage = async (to, templateSid = DEFAULT_TEMPLATE_SID, variables = {}) => {
  try {
    // Format the phone number for WhatsApp
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    // Default content variables if not provided
    const contentVariables = Object.keys(variables).length > 0 
      ? JSON.stringify(variables)
      : undefined;
    
    // Create message configuration
    const messageConfig = {
      from: FROM_WHATSAPP_NUMBER,
      to: formattedTo,
      contentSid: templateSid,
    };
    
    // Add content variables if they exist
    if (contentVariables) {
      messageConfig.contentVariables = contentVariables;
    }
    
    // Send the message
    const message = await client.messages.create(messageConfig);
    
    console.log(`WhatsApp message sent with SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};

/**
 * Send a WhatsApp message with card recommendations
 * @param {string} to - Recipient's phone number
 * @param {Array} cards - Array of recommended credit cards
 * @returns {Promise} - Twilio message object
 */
export const sendCardRecommendations = async (to, cards) => {
  try {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      throw new Error('No card recommendations to send');
    }
    
    // Create a message with the top recommendations
    let message = "Your Top Credit Card Recommendations:\n\n";
    
    cards.slice(0, 3).forEach((card, index) => {
      message += `${index + 1}. ${card.name} (${card.issuer})\n`;
      message += `   • Annual Fee: ₹${card.annual_fee}\n`;
      message += `   • Rewards: ${card.reward_rate}\n`;
      message += `   • Est. Annual Value: ₹${card.yearly_rewards || 'N/A'}\n\n`;
    });
    
    message += "Visit our website to apply or compare more options!";
    
    // Send the message directly without using a template
    const sentMessage = await client.messages.create({
      from: FROM_WHATSAPP_NUMBER,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      body: message
    });
    
    console.log(`WhatsApp recommendations sent with SID: ${sentMessage.sid}`);
    return sentMessage;
  } catch (error) {
    console.error('Error sending WhatsApp recommendations:', error);
    throw error;
  }
};

export default {
  sendWhatsAppMessage,
  sendCardRecommendations
}; 
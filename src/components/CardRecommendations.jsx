import React, { useState, useEffect } from 'react';
import { Star, CreditCard, Gift, ArrowRight, RefreshCw, Award, CheckCircle, Zap, BarChart2, Send, Brain } from 'lucide-react';
import CardComparison from './CardComparison';
import axios from 'axios';

// Helper function to safely parse JSON or return the original value if it's already an array
const safeJsonParse = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  
  try {
    return typeof value === 'string' ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return [];
  }
};

const CardRecommendations = ({ recommendations, onRestart }) => {
  // Process recommendations to ensure each card has a card_id
  const [processedRecommendations, setProcessedRecommendations] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // Ensure each card has a valid card_id
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      const processed = recommendations.map((card, index) => {
        // Ensure card_id exists (use existing id, card_id, or generate one)
        return {
          ...card,
          card_id: card.card_id || card.id || index + 1
        };
      });
      setProcessedRecommendations(processed);
    }
  }, [recommendations]);
  
  const handleCardSelect = (card) => {
    console.log('Card selected:', card);
    setSelectedCards(prev => {
      // If card is already selected, remove it
      if (prev.some(c => c.card_id === card.card_id)) {
        console.log('Removing card from selection:', card.card_id);
        return prev.filter(c => c.card_id !== card.card_id);
      }
      // Otherwise add it (up to 3 cards)
      else if (prev.length < 3) {
        console.log('Adding card to selection:', card.card_id);
        return [...prev, card];
      }
      // If already 3 cards selected, replace the first one
      else {
        console.log('Replacing first card with:', card.card_id);
        return [...prev.slice(1), card];
      }
    });
  };
  
  const handleCompare = () => {
    console.log('handleCompare called');
    console.log('Current selectedCards:', selectedCards);
    console.log('Available processedRecommendations:', processedRecommendations);
    
    // If user has already manually selected at least 2 cards, use those
    if (selectedCards.length >= 2) {
      console.log('Comparing manually selected cards:', selectedCards.map(card => card.card_id));
      setShowComparison(true);
    } 
    // Otherwise, automatically select top 3-5 cards for comparison
    else {
      // Determine how many cards to compare (3-5 based on available recommendations)
      const numToCompare = Math.min(5, Math.max(3, processedRecommendations.length));
      
      // Get top cards based on ranking (which is their order in the array)
      const topCards = processedRecommendations.slice(0, numToCompare);
      
      console.log(`Automatically comparing top ${numToCompare} cards:`, topCards.map(card => card.card_id));
      console.log('Top cards data:', topCards);
      
      // Set selected cards and show comparison in one go
      setSelectedCards(topCards);
      // Wait a moment to ensure the state has been updated
      setTimeout(() => {
        setShowComparison(true);
      }, 10);
    }
  };
  
  // Create a function to handle closing the comparison modal
  const handleCloseComparison = () => {
    setShowComparison(false);
    console.log('Comparison modal closed');
  };
  
  // Add this function alongside other handler functions
  const handleShareViaWhatsApp = async () => {
    try {
      // If no cards are selected, use the top 3 cards
      const cardsToShare = selectedCards.length >= 2 
        ? selectedCards 
        : processedRecommendations.slice(0, 3);
      
      if (cardsToShare.length === 0) {
        alert("No cards available to share");
        return;
      }
      
      // Ask for phone number
      const phoneNumber = prompt("Enter your WhatsApp number with country code (e.g., +919999000000):");
      
      if (!phoneNumber) {
        console.log('Phone number not provided');
        return;
      }
      
      // Validate phone number format (basic validation)
      if (!/^\+\d{10,15}$/.test(phoneNumber)) {
        alert("Please enter a valid phone number with country code (e.g., +919999000000)");
        return;
      }
      
      const cardIds = cardsToShare.map(card => card.card_id);
      
      // Call the API to send WhatsApp message
      const response = await axios.post('/api/whatsapp/send-recommendations', {
        phoneNumber,
        cardIds,
        cards: cardsToShare // Send the card data directly
      });
      
      console.log('WhatsApp response:', response.data);
      
      if (response.data.success) {
        alert("Recommendations sent via WhatsApp! You'll receive a message shortly.");
      } else {
        alert("Failed to send WhatsApp message. Please try again later.");
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      alert("Error sending WhatsApp message. Please try again later.");
    }
  };
  
  return (
    <div className="py-8 px-4 md:px-8">
      <div className="text-center mb-10">
        <div className="inline-block mb-3 bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-sm font-medium animate-pulse">
          Results Ready
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-3">
          Your Personalized Card Recommendations
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-4">
          Based on your profile and preferences, we've selected these credit cards that best match your needs
        </p>
        
        {/* Prominent Compare Button */}
        <button
          onClick={handleCompare}
          className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center mx-auto"
        >
          <BarChart2 className="mr-2" size={20} />
          Compare Top Recommendations
        </button>
        
        {/* WhatsApp Sharing Button */}
        <button
          onClick={handleShareViaWhatsApp}
          className="mt-4 ml-4 bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
        >
          <Send className="mr-2" size={20} />
          Share via WhatsApp
        </button>
        
        {/* Card selection UI */}
        <div className="flex flex-col items-center justify-center mt-6 border-t border-gray-200 pt-6">
          <div className="text-sm text-gray-600 mb-3">
            Or manually select 2-3 specific cards to compare:
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-2">
              {[0, 1, 2].map(index => (
                <div 
                  key={index}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                    ${index < selectedCards.length 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-500'}`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
          
          {selectedCards.length > 0 && (
          <button
            onClick={handleCompare}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600"
          >
            <BarChart2 size={16} />
              Compare {selectedCards.length} Selected Cards
          </button>
          )}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {processedRecommendations.map((card, index) => (
          <div
            key={card.card_id}
            className={`bg-white rounded-xl shadow-lg overflow-hidden border transition-all duration-300 transform hover:-translate-y-1
              ${selectedCards.some(c => c.card_id === card.card_id) 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-100 hover:shadow-xl'}`}
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            {/* Card header with ranking badge and selection checkbox */}
            <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="absolute top-3 right-3 flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300 mr-1" />
                <span className="font-bold text-sm">Rank #{index + 1}</span>
              </div>
              
              {/* Only show AI Score if it exists and is a number */}
              {card.ai_score && !isNaN(card.ai_score) && (
                <div className="absolute top-12 right-3 flex items-center bg-purple-100 text-purple-700 backdrop-blur-sm rounded-full px-3 py-1 mt-1">
                  <Brain className="w-4 h-4 text-purple-500 mr-1" />
                  <span className="font-bold text-sm">AI Score: {card.ai_score}</span>
                </div>
              )}
              
              {/* Selection checkbox */}
              <div className="absolute top-3 left-3">
                <button
                  onClick={() => handleCardSelect(card)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors group relative
                    ${selectedCards.some(c => c.card_id === card.card_id)
                      ? 'bg-white text-blue-500'
                      : 'bg-white/20 text-white hover:bg-white/40'}`}
                  aria-label={selectedCards.some(c => c.card_id === card.card_id) ? "Deselect card" : "Select card for comparison"}
                >
                  {selectedCards.some(c => c.card_id === card.card_id) ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <div className="w-3 h-3 rounded-sm border-2 border-current" />
                  )}
                  
                  {/* Helper tooltip */}
                  <div className="hidden group-hover:block absolute left-0 top-full mt-2 w-48 bg-black bg-opacity-80 text-white text-xs rounded py-1 px-2 z-10">
                    {selectedCards.some(c => c.card_id === card.card_id) 
                      ? "Click to remove from comparison" 
                      : "Click to add to comparison"}
                  </div>
                </button>
              </div>
              
              <div className="flex items-start">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg mr-4">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    {card.name}
                  </h3>
                  <p className="text-blue-100">{card.issuer}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Estimated rewards section */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-700 flex items-center">
                    <Award className="w-4 h-4 text-blue-500 mr-2" />
                    Annual Rewards
                  </h4>
                  <span className="text-xs text-gray-500">Estimated</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ₹{card.yearly_rewards?.toLocaleString()}
                </p>
              </div>
              
              {/* Key features */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <CheckCircle className="w-4 h-4 text-blue-500 mr-2" />
                  Key Features
                </h4>
                <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Annual Fee</span>
                    <span className="font-medium">₹{card.annual_fee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rewards</span>
                    <span className="font-medium">{card.reward_rate}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                    <span className="text-sm text-gray-600">Min Income</span>
                    <span className="font-medium">₹{(card.min_income / 100000).toFixed(0)}L</span>
                  </div>
                </div>
              </div>

              {/* Why this card section */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <Zap className="w-4 h-4 text-blue-500 mr-2" />
                  <span>Why This Card Is Perfect For You</span>
                  <span className="ml-1 text-purple-500 text-xs">
                    <Brain className="w-3 h-3 inline-block" />
                  </span>
                </h4>
                <ul className="space-y-2">
                  {safeJsonParse(card.reasons).map((reason, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-600 flex items-start bg-white p-2 rounded-lg border border-gray-100"
                    >
                      <Gift className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Special perks */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">
                  Special Perks
                </h4>
                <div className="flex flex-wrap gap-2">
                  {safeJsonParse(card.special_perks).map((perk, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full border border-blue-100"
                    >
                      {perk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Apply button */}
              <a
                href={card.apply_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center py-3 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center font-medium"
              >
                <span>Apply Now</span> <ArrowRight className="inline ml-2" size={18} />
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <button
          onClick={onRestart}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Start Over
        </button>
      </div>
      
      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-10 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
          <details>
            <summary className="text-sm text-gray-500 cursor-pointer">Debug Info</summary>
            <div className="mt-2 text-xs text-gray-600 font-mono overflow-x-auto">
              <div>
                <strong>Selected Cards:</strong> {selectedCards.length} cards
                <pre>{JSON.stringify(selectedCards.map(c => ({ id: c.card_id, name: c.name })), null, 2)}</pre>
              </div>
              <div className="mt-2">
                <strong>Show Comparison:</strong> {showComparison ? 'true' : 'false'}
              </div>
              <div className="mt-2">
                <button 
                  onClick={() => console.log({ selectedCards, processedRecommendations, showComparison })} 
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                >
                  Log State
                </button>
                <button 
                  onClick={() => {
                    const topCards = processedRecommendations.slice(0, 3);
                    setSelectedCards(topCards);
                    console.log('Manually set top cards:', topCards);
                  }} 
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs ml-2"
                >
                  Set Top 3
                </button>
                <button 
                  onClick={() => setShowComparison(true)} 
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs ml-2"
                >
                  Show Modal
                </button>
              </div>
            </div>
          </details>
        </div>
      )}
      
      {/* Card comparison modal */}
      {showComparison && (
        <CardComparison 
          key={`comparison-${selectedCards.map(c => c.card_id).join('-')}`}
          cards={selectedCards} 
          onClose={handleCloseComparison} 
        />
      )}
    </div>
  );
};

export default CardRecommendations; 
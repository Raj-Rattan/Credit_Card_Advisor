import React, { useState, useEffect, useRef } from 'react';
import { X, Award, DollarSign, Percent, BarChart, Zap, AlertCircle, Check, ArrowDown, CreditCard, Star, Info, Shield, Gift, Share2, Send } from 'lucide-react';
import axios from 'axios';

// Helper function to safely parse JSON
const safeJsonParse = (value) => {
  if (Array.isArray(value)) return value;
  try {
    return typeof value === 'string' ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return [];
  }
};

const CardComparison = ({ cards, onClose }) => {
  console.log('CardComparison component rendering with cards:', cards);
  
  const [comparisonData, setComparisonData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'detailed', 'visual'
  const [bestCard, setBestCard] = useState(null);
  const [isTopRecommendations, setIsTopRecommendations] = useState(false);
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Set isMounted to false when the component unmounts
  useEffect(() => {
    return () => {
      console.log('CardComparison component unmounting');
      isMounted.current = false;
    };
  }, []);
  
  // Process cards to ensure each has a valid card_id
  useEffect(() => {
    console.log('CardComparison useEffect for processing cards triggered', cards);
    if (cards && cards.length > 0) {
      console.log('Processing cards for comparison:', cards.length, 'cards');
      const processedCards = cards.map((card, index) => ({
        ...card,
        card_id: card.card_id || card.id || index + 1
      }));
      console.log('Processed cards:', processedCards);
      if (isMounted.current) {
      setComparisonData(processedCards);
        
        // Determine if these are the top recommendations (cards are in sequence from 0)
        const cardIds = processedCards.map(card => card.card_id);
        console.log('Card IDs for isTopRecommendations check:', cardIds);
        const isSequential = cardIds.every((id, index) => id === index + 1);
        console.log('isSequential:', isSequential, 'cards.length >= 3:', processedCards.length >= 3);
        setIsTopRecommendations(isSequential && processedCards.length >= 3);
      }
    } else {
      console.warn('No cards provided to CardComparison component');
    }
  }, [cards]);
  
  // Fetch enhanced comparison data from the API
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!isMounted.current) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const cardIds = comparisonData.map(card => card.card_id);
        console.log('Fetching comparison data for card IDs:', cardIds);
        
        if (!cardIds.length) {
          console.log('No card IDs to compare, skipping API call');
          return;
        }
        
        const response = await fetch('/api/compare-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardIds })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          throw new Error(`Failed to fetch comparison data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Comparison API response:', data);
        
        if (data && data.length > 0 && isMounted.current) {
          setComparisonData(data);
        } else {
          console.warn('Empty comparison data returned from API');
          // Keep using the original cards data
        }
      } catch (error) {
        console.error('Error fetching comparison data:', error);
        if (isMounted.current) {
        setError(`Failed to fetch detailed comparison data: ${error.message}`);
        }
        // Keep using the original cards data
      } finally {
        if (isMounted.current) {
        setIsLoading(false);
        }
      }
    };
    
    if (comparisonData.length >= 2) {
      fetchComparisonData();
    }
  }, [comparisonData.length]);
  
  // Calculate additional metrics and determine best card
  useEffect(() => {
    if (comparisonData.length >= 2) {
      const enhancedData = comparisonData.map(card => {
        // Calculate estimated yearly benefit if not already provided
        const averageMonthlySpend = 30000;
        const yearlySpend = averageMonthlySpend * 12;
        const estimated_yearly_benefit = card.estimated_yearly_benefit || (card.reward_type === 'Cashback' 
          ? Math.floor(yearlySpend * 0.02) 
          : Math.floor(yearlySpend * 0.015));
        
        // Calculate cost-benefit ratio
        const cost_benefit_ratio = card.annual_fee > 0 
          ? (estimated_yearly_benefit / card.annual_fee).toFixed(2) 
          : 'N/A';
        
        // Calculate overall score based on multiple factors
        let overallScore = 0;
        
        // Reward value score (0-40 points)
        overallScore += (estimated_yearly_benefit / 10000) * 40;
        if (overallScore > 40) overallScore = 40;
        
        // Annual fee score (0-30 points)
        const feeScore = card.annual_fee === 0 ? 30 : (1 - (card.annual_fee / 15000)) * 30;
        overallScore += Math.max(0, feeScore);
        
        // Special perks score (0-30 points)
        const perks = safeJsonParse(card.special_perks);
        overallScore += Math.min(30, perks.length * 10);
        
        // Cap the score at 100
        overallScore = Math.min(100, Math.round(overallScore));
        
        return { 
          ...card, 
          estimated_yearly_benefit,
          cost_benefit_ratio,
          overall_score: overallScore
        };
      });
      
      setComparisonData(enhancedData);
      
      // Determine the best overall card
      const bestCardIndex = enhancedData.reduce(
        (maxIndex, card, currentIndex, array) => 
          card.overall_score > array[maxIndex].overall_score ? currentIndex : maxIndex, 
        0
      );
      
      setBestCard(enhancedData[bestCardIndex]);
    }
  }, [comparisonData.length]);
  
  const features = [
    { key: 'name', label: 'Card Name', icon: <CreditCard className="w-4 h-4 text-blue-500" /> },
    { key: 'issuer', label: 'Issuer' },
    { key: 'joining_fee', label: 'Joining Fee', format: (value) => `₹${value.toLocaleString()}`, icon: <DollarSign className="w-4 h-4 text-green-500" /> },
    { key: 'annual_fee', label: 'Annual Fee', format: (value) => `₹${value.toLocaleString()}`, icon: <DollarSign className="w-4 h-4 text-red-500" /> },
    { key: 'reward_type', label: 'Reward Type', icon: <Award className="w-4 h-4 text-purple-500" /> },
    { key: 'reward_rate', label: 'Reward Rate', icon: <Percent className="w-4 h-4 text-green-500" /> },
    { key: 'estimated_yearly_benefit', label: 'Est. Annual Rewards', format: (value) => `₹${value?.toLocaleString() || 'N/A'}`, icon: <BarChart className="w-4 h-4 text-blue-500" /> },
    { key: 'cost_benefit_ratio', label: 'Value Ratio', format: (value) => value || 'N/A', icon: <Zap className="w-4 h-4 text-yellow-500" /> },
    { key: 'min_income', label: 'Min Income', format: (value) => `₹${(value / 100000).toFixed(0)}L` },
    { key: 'min_credit_score', label: 'Min Credit Score' },
    { key: 'special_perks', label: 'Special Perks', format: (value) => safeJsonParse(value).join(', ') },
  ];
  
  // Additional detailed features for the detailed comparison tab
  const detailedFeatures = [
    { key: 'joining_fee', label: 'Joining Fee', format: (value) => `₹${value.toLocaleString()}`, icon: <DollarSign className="w-4 h-4 text-green-500" />, type: 'fee', best: 'lowest' },
    { key: 'annual_fee', label: 'Annual Fee', format: (value) => `₹${value.toLocaleString()}`, icon: <DollarSign className="w-4 h-4 text-red-500" />, type: 'fee', best: 'lowest' },
    { key: 'estimated_yearly_benefit', label: 'Est. Annual Rewards', format: (value) => `₹${value?.toLocaleString() || 'N/A'}`, icon: <BarChart className="w-4 h-4 text-blue-500" />, type: 'benefit', best: 'highest' },
    { key: 'cost_benefit_ratio', label: 'Value Ratio', format: (value) => value || 'N/A', icon: <Zap className="w-4 h-4 text-yellow-500" />, type: 'ratio', best: 'highest' },
    { key: 'reward_rate', label: 'Reward Rate', icon: <Percent className="w-4 h-4 text-green-500" />, type: 'text' },
    { key: 'special_perks', label: 'Special Perks', format: (value) => {
      const perks = safeJsonParse(value);
      return (
        <div className="flex flex-col space-y-1">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-center">
              <Check size={14} className="text-green-500 mr-1" />
              <span>{perk}</span>
            </div>
          ))}
        </div>
      );
    }, type: 'perks' },
  ];
  
  // Categories for visual comparison
  const scoreCategories = [
    { key: 'reward_value', label: 'Reward Value', icon: <Award className="w-4 h-4" /> },
    { key: 'annual_cost', label: 'Annual Cost', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'perks_value', label: 'Perks & Benefits', icon: <Gift className="w-4 h-4" /> },
    { key: 'overall_score', label: 'Overall Score', icon: <Star className="w-4 h-4" /> }
  ];
  
  // Calculate category scores for each card
  const getScoreForCategory = (card, category) => {
    try {
    switch(category.key) {
      case 'reward_value':
        return Math.min(100, Math.round((card.estimated_yearly_benefit / 10000) * 100));
      case 'annual_cost':
        return Math.max(0, Math.min(100, Math.round((1 - card.annual_fee / 15000) * 100)));
      case 'perks_value':
        const perks = safeJsonParse(card.special_perks);
        return Math.min(100, perks.length * 25);
      case 'overall_score':
        return card.overall_score || 0;
      default:
          return 0;
      }
    } catch (error) {
      console.error(`Error calculating score for category ${category.key}:`, error);
        return 0;
    }
  };

  const handleShareViaWhatsApp = async () => {
    try {
      setIsLoading(true);
      
      // Ask for phone number
      const phoneNumber = prompt("Enter your WhatsApp number with country code (e.g., +919999000000):");
      
      if (!phoneNumber) {
        console.log('Phone number not provided');
        setIsLoading(false);
        return;
      }
      
      // Validate phone number format (basic validation)
      if (!/^\+\d{10,15}$/.test(phoneNumber)) {
        alert("Please enter a valid phone number with country code (e.g., +919999000000)");
        setIsLoading(false);
        return;
      }
      
      const cardIds = comparisonData.map(card => card.card_id);
      
      // Call the API to send WhatsApp message
      const response = await axios.post('/api/whatsapp/send-recommendations', {
        phoneNumber,
        cardIds,
        cards: comparisonData // Send the card data directly to avoid another DB query
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
    } finally {
      setIsLoading(false);
    }
  };

  // Safety check to prevent rendering errors
  if (!cards || cards.length === 0) {
    console.error("CardComparison received no cards to display");
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Card Comparison</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <p>No cards selected for comparison.</p>
            <p className="text-sm mt-2">Please select at least 2 cards and try again.</p>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
            <h2 className="text-2xl font-bold text-gray-800">Compare Credit Cards</h2>
              {isTopRecommendations && (
                <p className="text-blue-600 text-sm font-medium mt-1">
                  Showing your top recommended cards based on your profile
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
          
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading comparison data...</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
              <AlertCircle className="text-red-500 w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700">{error}</p>
                <p className="text-sm text-red-600 mt-1">Using basic comparison data instead.</p>
              </div>
            </div>
          )}
          
          {/* Tab navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button 
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'detailed' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
              onClick={() => setActiveTab('detailed')}
            >
              Detailed Comparison
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'visual' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800'}`}
              onClick={() => setActiveTab('visual')}
            >
              Visual Comparison
            </button>
          </div>

          {comparisonData.length > 0 ? (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="p-4 text-left bg-gray-50">Features</th>
                        {comparisonData.map((card) => (
                          <th key={card.card_id} className="p-4 text-left bg-gray-50">
                            <div className="flex items-center">
                              {bestCard && bestCard.card_id === card.card_id && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mr-2 flex items-center">
                                  <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                                  Best Pick
                                </span>
                              )}
                              {card.name}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((feature) => (
                        <tr key={feature.key} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-semibold text-gray-700 flex items-center">
                            {feature.icon && <span className="mr-2">{feature.icon}</span>}
                            {feature.label}
                          </td>
                          {comparisonData.map((card) => {
                            // Highlight the best value in each row
                            let isHighlighted = false;
                            
                            if (feature.key === 'annual_fee' && card[feature.key] === Math.min(...comparisonData.map(c => c[feature.key]))) {
                              isHighlighted = true;
                            } else if (feature.key === 'estimated_yearly_benefit' && card[feature.key] === Math.max(...comparisonData.map(c => c[feature.key] || 0))) {
                              isHighlighted = true;
                            } else if (feature.key === 'cost_benefit_ratio' && card[feature.key] !== 'N/A' && 
                                      parseFloat(card[feature.key]) === Math.max(...comparisonData
                                        .map(c => c[feature.key] === 'N/A' ? 0 : parseFloat(c[feature.key] || 0)))) {
                              isHighlighted = true;
                            }
                            
                            return (
                              <td 
                                key={`${card.card_id}-${feature.key}`} 
                                className={`p-4 ${isHighlighted ? 'bg-green-50 font-medium text-green-700' : ''}`}
                              >
                                {feature.format && card[feature.key] !== undefined
                                  ? feature.format(card[feature.key])
                                  : card[feature.key] || 'N/A'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Detailed Comparison Tab */}
              {activeTab === 'detailed' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {detailedFeatures.map((feature) => (
                    <div key={feature.key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                        {feature.icon && <span className="mr-2">{feature.icon}</span>}
                        <h3 className="font-medium text-gray-700">{feature.label}</h3>
                      </div>
                      
                      <div className="p-4">
                        {comparisonData.map((card) => {
                          // Determine if this is the best value for this feature
                          let isBest = false;
                          
                          if (feature.best === 'lowest' && card[feature.key] === Math.min(...comparisonData.map(c => c[feature.key]))) {
                            isBest = true;
                          } else if (feature.best === 'highest') {
                            const values = comparisonData.map(c => {
                              if (feature.key === 'cost_benefit_ratio' && c[feature.key] === 'N/A') return 0;
                              return c[feature.key] || 0;
                            });
                            const maxValue = Math.max(...values);
                            if (card[feature.key] === maxValue || 
                                (feature.key === 'cost_benefit_ratio' && card[feature.key] !== 'N/A' && parseFloat(card[feature.key]) === maxValue)) {
                              isBest = true;
                            }
                          }
                          
                          return (
                            <div 
                              key={`${card.card_id}-${feature.key}`}
                              className={`mb-3 p-3 rounded-lg ${isBest ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-gray-700">
                                  {card.name}
                                </span>
                                {isBest && (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center">
                                    <Check className="w-3 h-3 mr-1" />
                                    Best
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-lg font-semibold">
                                {feature.format && card[feature.key] !== undefined
                                  ? (typeof feature.format === 'function' 
                                      ? feature.format(card[feature.key])
                                      : feature.format)
                                  : card[feature.key] || 'N/A'}
                              </div>
                              
                              {feature.type === 'fee' && card[feature.key] > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Effective monthly: ₹{Math.round(card[feature.key] / 12).toLocaleString()}/mo
                                </div>
                              )}
                              
                              {feature.type === 'benefit' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Effective monthly: ₹{Math.round((card[feature.key] || 0) / 12).toLocaleString()}/mo
                                </div>
                              )}
                              
                              {feature.type === 'ratio' && card[feature.key] !== 'N/A' && (
                                <div className="text-xs text-gray-500 mt-1">
                                  For every ₹1 paid in fees, you get ₹{card[feature.key]} in rewards
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Visual Comparison Tab */}
              {activeTab === 'visual' && (
                <div className="space-y-8">
                  {/* Overall score cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {comparisonData.map((card) => (
                      <div 
                        key={`score-${card.card_id}`}
                        className={`bg-white rounded-lg border overflow-hidden shadow ${bestCard && bestCard.card_id === card.card_id ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-gray-200'}`}
                      >
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold">{card.name}</h3>
                            {bestCard && bestCard.card_id === card.card_id && (
                              <span className="bg-yellow-300 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                                <Star className="w-3 h-3 mr-1 fill-yellow-800" />
                                Best Overall
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="flex items-center justify-center mb-4">
                            <div className="relative w-32 h-32">
                              {/* Circular progress indicator */}
                              <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle 
                                  cx="50" cy="50" r="45" 
                                  fill="none" 
                                  stroke="#e5e7eb" 
                                  strokeWidth="8"
                                />
                                <circle 
                                  cx="50" cy="50" r="45" 
                                  fill="none" 
                                  stroke={card.overall_score >= 80 ? "#10b981" : card.overall_score >= 60 ? "#3b82f6" : "#f59e0b"}
                                  strokeWidth="8"
                                  strokeDasharray={`${card.overall_score * 2.83} 283`}
                                  strokeLinecap="round"
                                  transform="rotate(-90 50 50)"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <span className="text-3xl font-bold">{card.overall_score}</span>
                                  <span className="text-sm text-gray-500 block">/100</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {scoreCategories.slice(0, 3).map((category) => (
                              <div key={`${card.card_id}-${category.key}`}>
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center text-sm text-gray-600">
                                    {category.icon}
                                    <span className="ml-1">{category.label}</span>
                                  </div>
                                  <span className="text-sm font-medium">
                                    {getScoreForCategory(card, category)}/100
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{width: `${getScoreForCategory(card, category)}%`}}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between">
                              <div>
                                <div className="text-sm text-gray-500">Annual Fee</div>
                                <div className="font-semibold">₹{card.annual_fee.toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Est. Annual Reward</div>
                                <div className="font-semibold text-green-600">₹{(card.estimated_yearly_benefit || 0).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Recommendation summary */}
                  {bestCard && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mt-8">
                      <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                        <Info className="w-5 h-5 text-blue-500 mr-2" />
                        Our Recommendation
                      </h3>
                      <p className="text-gray-700 mb-4">
                        Based on our analysis, the <span className="font-semibold">{bestCard.name}</span> offers the best overall value with {bestCard.overall_score}/100 points.
                        {bestCard.annual_fee === 0 ? 
                          " It has no annual fee and " : 
                          ` Its annual fee of ₹${bestCard.annual_fee.toLocaleString()} is offset by `}
                        an estimated ₹{(bestCard.estimated_yearly_benefit || 0).toLocaleString()} in annual rewards.
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {safeJsonParse(bestCard.special_perks).map((perk, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full"
                          >
                            {perk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No cards selected for comparison
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={handleShareViaWhatsApp}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
              disabled={isLoading}
            >
              <Send className="w-4 h-4 mr-2" />
              Share via WhatsApp
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardComparison; 
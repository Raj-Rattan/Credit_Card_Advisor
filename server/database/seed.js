import pool from './config.js';

const creditCards = [
  {
    name: "HDFC Regalia Gold",
    issuer: "HDFC Bank",
    joining_fee: 2500,
    annual_fee: 2500,
    reward_type: "Points",
    reward_rate: "4 points per Rs. 150",
    min_income: 600000,
    min_credit_score: 750,
    special_perks: JSON.stringify([
      "Airport lounge access",
      "Concierge services",
      "Dining privileges",
      "Travel insurance",
      "Golf program"
    ]),
    categories: JSON.stringify(["travel", "dining", "premium"]),
    apply_link: "https://www.hdfcbank.com/regalia-gold",
    card_image: "/images/regalia-gold.png"
  },
  {
    name: "SBI SimplyClick",
    issuer: "SBI Card",
    joining_fee: 499,
    annual_fee: 499,
    reward_type: "Cashback",
    reward_rate: "5% on online spending",
    min_income: 200000,
    min_credit_score: 700,
    special_perks: JSON.stringify([
      "Online shopping rewards",
      "Movie ticket discounts",
      "Fuel surcharge waiver",
      "Welcome benefits"
    ]),
    categories: JSON.stringify(["online", "entertainment"]),
    apply_link: "https://www.sbicard.com/simplyclick",
    card_image: "/images/simplyclick.png"
  },
  {
    name: "ICICI Amazon Pay",
    issuer: "ICICI Bank",
    joining_fee: 0,
    annual_fee: 500,
    reward_type: "Cashback",
    reward_rate: "5% on Amazon, 2% others",
    min_income: 300000,
    min_credit_score: 700,
    special_perks: JSON.stringify([
      "Amazon Prime benefits",
      "Fuel surcharge waiver",
      "No joining fee",
      "Welcome benefits"
    ]),
    categories: JSON.stringify(["online", "fuel"]),
    apply_link: "https://www.icicibank.com/amazon-pay",
    card_image: "/images/amazon-pay.png"
  },
  {
    name: "Axis Magnus",
    issuer: "Axis Bank",
    joining_fee: 12500,
    annual_fee: 12500,
    reward_type: "Points",
    reward_rate: "12 Edge Miles per Rs. 200",
    min_income: 1500000,
    min_credit_score: 750,
    special_perks: JSON.stringify([
      "Golf privileges",
      "Airport transfers",
      "Priority Pass",
      "Concierge services",
      "Travel insurance"
    ]),
    categories: JSON.stringify(["travel", "premium"]),
    apply_link: "https://www.axisbank.com/magnus",
    card_image: "/images/magnus.png"
  },
  {
    name: "Kotak 811",
    issuer: "Kotak Bank",
    joining_fee: 0,
    annual_fee: 0,
    reward_type: "Cashback",
    reward_rate: "1% on all spends",
    min_income: 150000,
    min_credit_score: 650,
    special_perks: JSON.stringify([
      "Zero annual fee",
      "Fuel surcharge waiver",
      "Welcome benefits"
    ]),
    categories: JSON.stringify(["basic", "fuel"]),
    apply_link: "https://www.kotak.com/811",
    card_image: "/images/kotak-811.png"
  },
  {
    name: "HDFC MoneyBack",
    issuer: "HDFC Bank",
    joining_fee: 500,
    annual_fee: 500,
    reward_type: "Cashback",
    reward_rate: "2% on groceries, fuel",
    min_income: 250000,
    min_credit_score: 700,
    special_perks: JSON.stringify([
      "Grocery cashback",
      "Fuel rewards",
      "Welcome benefits"
    ]),
    categories: JSON.stringify(["groceries", "fuel"]),
    apply_link: "https://www.hdfcbank.com/moneyback",
    card_image: "/images/moneyback.png"
  },
  {
    name: "ICICI Coral",
    issuer: "ICICI Bank",
    joining_fee: 500,
    annual_fee: 500,
    reward_type: "Points",
    reward_rate: "2 points per Rs. 100",
    min_income: 300000,
    min_credit_score: 700,
    special_perks: JSON.stringify([
      "Movie tickets",
      "Dining offers",
      "Welcome benefits"
    ]),
    categories: JSON.stringify(["entertainment", "dining"]),
    apply_link: "https://www.icicibank.com/coral",
    card_image: "/images/coral.png"
  },
  {
    name: "SBI Prime",
    issuer: "SBI Card",
    joining_fee: 2999,
    annual_fee: 2999,
    reward_type: "Points",
    reward_rate: "5 points per Rs. 100 on travel",
    min_income: 500000,
    min_credit_score: 750,
    special_perks: JSON.stringify([
      "Travel insurance",
      "Lounge access",
      "Concierge services",
      "Welcome benefits"
    ]),
    categories: JSON.stringify(["travel"]),
    apply_link: "https://www.sbicard.com/prime",
    card_image: "/images/prime.png"
  },
  {
    name: "Amex Platinum",
    issuer: "American Express",
    joining_fee: 60000,
    annual_fee: 60000,
    reward_type: "Points",
    reward_rate: "5 Membership Rewards per Rs. 100",
    min_income: 2000000,
    min_credit_score: 800,
    special_perks: JSON.stringify([
      "Airport lounge access",
      "Hotel status upgrades",
      "Concierge services",
      "Travel insurance",
      "Golf program"
    ]),
    categories: JSON.stringify(["travel", "premium", "luxury"]),
    apply_link: "https://www.americanexpress.com/platinum",
    card_image: "/images/platinum.png"
  },
  {
    name: "Citi Prestige",
    issuer: "Citi Bank",
    joining_fee: 15000,
    annual_fee: 15000,
    reward_type: "Points",
    reward_rate: "4 ThankYou points per Rs. 100",
    min_income: 1200000,
    min_credit_score: 750,
    special_perks: JSON.stringify([
      "Airport lounge access",
      "Hotel status upgrades",
      "Concierge services",
      "Travel insurance",
      "Golf program"
    ]),
    categories: JSON.stringify(["travel", "premium"]),
    apply_link: "https://www.citibank.com/prestige",
    card_image: "/images/prestige.png"
  }
];

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    // Clear existing data
    await pool.execute('DELETE FROM credit_cards');
    
    // Insert new credit cards
    for (const card of creditCards) {
      await pool.execute(
        `INSERT INTO credit_cards (
          name, issuer, joining_fee, annual_fee, reward_type, reward_rate,
          min_income, min_credit_score, special_perks, categories, apply_link, card_image
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          card.name,
          card.issuer,
          card.joining_fee,
          card.annual_fee,
          card.reward_type,
          card.reward_rate,
          card.min_income,
          card.min_credit_score,
          card.special_perks,
          card.categories,
          card.apply_link,
          card.card_image
        ]
      );
    }
    
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit();
  }
};

seedDatabase(); 
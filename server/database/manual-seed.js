import mysql from 'mysql2/promise';

const seedDatabase = async () => {
  let connection;
  try {
    // Create connection
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: null, // No password
      database: 'credit_card_recommendations'
    });
    
    console.log('Connected to database. Starting seeding...');
    
    // Clear existing data
    await connection.execute('DELETE FROM credit_cards');
    
    // Insert sample credit cards
    const sampleCards = [
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
          "Dining privileges"
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
          "Movie ticket discounts"
        ]),
        categories: JSON.stringify(["online", "entertainment"]),
        apply_link: "https://www.sbicard.com/simplyclick",
        card_image: "/images/simplyclick.png"
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
          "Concierge services"
        ]),
        categories: JSON.stringify(["travel", "premium", "luxury"]),
        apply_link: "https://www.americanexpress.com/platinum",
        card_image: "/images/platinum.png"
      }
    ];
    
    // Insert each card
    for (const card of sampleCards) {
      await connection.execute(
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
      console.log(`Inserted card: ${card.name}`);
    }
    
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
    console.log('Database connection closed');
  }
};

// Run the seeding function
seedDatabase(); 
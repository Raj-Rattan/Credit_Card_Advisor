-- Create database
CREATE DATABASE IF NOT EXISTS credit_card_recommendations;
USE credit_card_recommendations;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    monthly_income DECIMAL(12,2) NOT NULL,
    credit_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create existing_cards table
CREATE TABLE IF NOT EXISTS existing_cards (
    existing_card_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    card_name VARCHAR(100) NOT NULL,
    issuer VARCHAR(50) NOT NULL,
    card_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);

-- Create customer_preferences table
CREATE TABLE IF NOT EXISTS customer_preferences (
    preference_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    spending_categories JSON NOT NULL,
    preferred_benefits VARCHAR(50) NOT NULL,
    fee_preference VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);

-- Create credit_cards table
CREATE TABLE IF NOT EXISTS credit_cards (
    card_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    issuer VARCHAR(50) NOT NULL,
    joining_fee DECIMAL(10,2) NOT NULL,
    annual_fee DECIMAL(10,2) NOT NULL,
    reward_type VARCHAR(20) NOT NULL,
    reward_rate VARCHAR(100) NOT NULL,
    min_income DECIMAL(12,2) NOT NULL,
    min_credit_score INT,
    special_perks JSON NOT NULL,
    categories JSON NOT NULL,
    apply_link VARCHAR(255),
    card_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
    recommendation_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    card_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    reasons JSON NOT NULL,
    yearly_rewards DECIMAL(10,2) NOT NULL,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES credit_cards(card_id) ON DELETE CASCADE
);

-- Create customer_feedback table
CREATE TABLE IF NOT EXISTS customer_feedback (
    feedback_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    recommendation_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(recommendation_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_customer_income ON customers(monthly_income);
CREATE INDEX idx_customer_credit_score ON customers(credit_score);
CREATE INDEX idx_card_issuer ON credit_cards(issuer);
CREATE INDEX idx_card_min_income ON credit_cards(min_income);
CREATE INDEX idx_card_min_credit_score ON credit_cards(min_credit_score);
CREATE INDEX idx_recommendation_score ON recommendations(score); 
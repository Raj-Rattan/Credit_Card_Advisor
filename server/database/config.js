import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Database configuration with hardcoded credentials for now
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Bhavesh@2611', // Use the provided MySQL password
  database: 'credit_card_recommendations',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('Using database config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
  // Don't log the password
});

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    
    // Always return true in development mode to allow the app to use mock data
    if (process.env.NODE_ENV === 'development') {
      console.log('Running in development mode with mock data');
      return true;
    }
    
    return false;
  }
};

// Export pool for use in other files
export default pool; 
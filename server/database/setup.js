import { createConnection } from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const setupDatabase = async () => {
  let connection;
  
  try {
    // Create connection without database
    connection = await createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Bhavesh@2611' // Use the provided MySQL password
    });

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split and execute each statement
    const statements = schema
      .split(';')
      .filter(statement => statement.trim())
      .map(statement => statement + ';');

    for (const statement of statements) {
      await connection.query(statement);
    }

    console.log('Database schema created successfully!');

    // Import and run seed script
    const { seedDatabase } = await import('./seed.js');
    await seedDatabase();

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

setupDatabase(); 
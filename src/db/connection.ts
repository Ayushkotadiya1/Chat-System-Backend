import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sequelize database connection instance
 * Configured with connection pooling and SSL support
 */
export const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'chatbot_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // use false for local/dev, set true in prod with valid CA
    },
  },
});

/**
 * Test database connection
 * @returns Promise<boolean> - True if connection successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
}

/**
 * Initialize database with all models and associations
 * Creates tables if they don't exist
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Import models to register them
    await import('../models/User');
    await import('../models/ChatSession');
    await import('../models/Message');

    // Sync all models with database (creates tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized successfully');

    // Create default admin user if not exists
    await createDefaultAdmin();
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Create default admin user if it doesn't exist
 */
async function createDefaultAdmin(): Promise<void> {
  try {
    const User = (await import('../models/User')).default;
    const bcrypt = require('bcryptjs');

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const [admin, created] = await User.findOrCreate({
      where: { username: adminUsername },
      defaults: {
        username: adminUsername,
        passwordHash: hashedPassword,
        role: 'admin',
      },
    });

    if (created) {
      console.log(`✅ Default admin user created: ${adminUsername}`);
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
  }
}

require('dotenv').config();

//import new modules
const pool = require("./config/db");
const cloudinary = require("./config/cloudinary");
const { upload, uploadToCloudinary } = require("./config/upload");
const { requireAuth } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");

//old import statements
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcrypt');
const path = require("path");
const app = express();
app.set('trust proxy', 1);

//temp
console.log(process.env.DATABASE_URL);

// Create tables on startup
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        datetime TEXT NOT NULL,
        notes TEXT,
        payment_method TEXT NOT NULL,
        location TEXT,
        image_url TEXT,
        image_public_id TEXT,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add user_id column if it doesn't exist (for existing tables)
    try {
      await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`);
    } catch (err) {
      // Column might already exist
    }

    console.log('Database initialized');
    await createDemoUser();
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Create demo user if not exists
async function createDemoUser() {
  try {
    const password_hash = await bcrypt.hash('Demo@Journal2026', 10);
    const result = await pool.query('SELECT id FROM users WHERE username = $1', ['demo']);
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (name, username, password_hash) VALUES ($1, $2, $3)',
        ['Demo User', 'demo', password_hash]
      );
      console.log('Demo user created');
    } else {
      await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [password_hash, 'demo']);
    }
  } catch (err) {
    console.error('Error creating demo user:', err);
  }
}

initDB();

// Session middleware
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

// Auth Routes

// Get user profile stats
app.get('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT id, name, username, created_at FROM users WHERE id = $1', [req.session.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const statsResult = await pool.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1',
      [req.session.userId]
    );

    res.json({
      user: userResult.rows[0],
      stats: {
        transactionCount: parseInt(statsResult.rows[0].count),
        totalSpent: parseFloat(statsResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Transaction Routes (protected)



// Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get(['/dashboard', '/profile', '/about', '/transactions', '/add-transaction'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Transaction Journal running on port ${PORT}`);
});
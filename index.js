require('dotenv').config();

//import new modules
const pool = require("./config/db");
const cloudinary = require("./config/cloudinary");
const { upload, uploadToCloudinary } = require("./config/upload");
const { requireAuth } = require("./middleware/auth");
const authRoutes = require("./routes/auth");

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

// Delete image from Cloudinary
async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Error deleting from Cloudinary:', err);
  }
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/api/auth", authRoutes);

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

// Get all transactions (newest first)
app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const params = [req.session.userId];

    if (search && search.trim()) {
      query += ' AND (title ILIKE $2 OR notes ILIKE $3 OR location ILIKE $4)';
      const searchTerm = '%' + search.trim() + '%';
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY datetime DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction by ID
app.get('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create new transaction
app.post('/api/transactions', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, amount, datetime, notes, payment_method, location, other_payment_method } = req.body;

    if (!title || !amount || !datetime || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine final payment method
    let final_payment_method = payment_method;
    if (payment_method === 'Other') {
      if (!other_payment_method || !other_payment_method.trim()) {
        return res.status(400).json({ error: 'Payment method name is required when Other is selected' });
      }
      final_payment_method = other_payment_method.trim();
    }

    // Check for duplicate within last 5 seconds
    const duplicateCheck = await pool.query(
      `SELECT id FROM transactions
       WHERE user_id = $1 AND title = $2 AND amount = $3 AND datetime = $4
       AND created_at > NOW() - INTERVAL '5 seconds'`,
      [req.session.userId, title, parseFloat(amount), datetime]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Duplicate transaction detected' });
    }

    let image_url = null;
    let image_public_id = null;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file);
      image_url = uploadResult.url;
      image_public_id = uploadResult.public_id;
    }

    const result = await pool.query(
      `INSERT INTO transactions (title, amount, datetime, notes, payment_method, location, image_url, image_public_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, parseFloat(amount), datetime, notes || '', final_payment_method, location || '', image_url, image_public_id, req.session.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.rows[0];

    if (transaction.image_public_id) {
      await deleteFromCloudinary(transaction.image_public_id);
    }

    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Update transaction
app.put('/api/transactions/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, amount, datetime, notes, payment_method, location, other_payment_method } = req.body;

    // Check if transaction exists and belongs to user
    const existingResult = await pool.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.session.userId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const existing = existingResult.rows[0];

    if (!title || !amount || !datetime || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine final payment method
    let final_payment_method = payment_method;
    if (payment_method === 'Other') {
      if (!other_payment_method || !other_payment_method.trim()) {
        return res.status(400).json({ error: 'Payment method name is required when Other is selected' });
      }
      final_payment_method = other_payment_method.trim();
    }

    let image_url = existing.image_url;
    let image_public_id = existing.image_public_id;

    // If a new image is uploaded, delete the old one and use the new one
    if (req.file) {
      if (existing.image_public_id) {
        await deleteFromCloudinary(existing.image_public_id);
      }
      const uploadResult = await uploadToCloudinary(req.file);
      image_url = uploadResult.url;
      image_public_id = uploadResult.public_id;
    }

    const result = await pool.query(
      `UPDATE transactions
       SET title = $1, amount = $2, datetime = $3, notes = $4, payment_method = $5, location = $6, image_url = $7, image_public_id = $8
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [title, parseFloat(amount), datetime, notes || '', final_payment_method, location || '', image_url, image_public_id, req.params.id, req.session.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

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
// restart trigger
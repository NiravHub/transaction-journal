const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { upload, uploadToCloudinary } = require("../config/upload");
const { getTransactions } = require("../controllers/transactionController");
const cloudinary = require("../config/cloudinary");


// Delete image from Cloudinary
async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Error deleting from Cloudinary:', err);
  }
} 

// Get all transactions (newest first)
router.get("/", requireAuth, getTransactions);

// Get single transaction by ID
router.get('/:id', requireAuth, async (req, res) => {
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
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
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

// Update transaction
router.put('/:id', requireAuth, upload.single('image'), async (req, res) => {
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

// Delete transaction
router.delete('/:id', requireAuth, async (req, res) => {
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

module.exports = router;
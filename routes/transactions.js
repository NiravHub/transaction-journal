const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { upload, uploadToCloudinary } = require("../config/upload");
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
} = require("../controllers/transactionController");
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
router.get("/:id", requireAuth, getTransactionById);

// Create new transaction
router.post(
  "/",
  requireAuth,
  upload.single("image"),
  createTransaction
);

// Update transaction
router.put(
  "/:id",
  requireAuth,
  upload.single("image"),
  updateTransaction
);

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
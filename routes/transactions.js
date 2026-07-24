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
  deleteTransaction,
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
router.delete("/:id", requireAuth, deleteTransaction);

module.exports = router;
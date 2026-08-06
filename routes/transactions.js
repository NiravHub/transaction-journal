const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const { upload } = require("../config/upload");
const { validateTransactionMiddleware } = require("../validators/transactionValidator");

const {
  getTransactions,
  getAvailableYears,
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
    console.error("Error deleting from Cloudinary:", err);
  }
}

// Get all transactions (newest first)
router.get("/", requireAuth, getTransactions);

// Get available years for transactions
router.get("/years", requireAuth, getAvailableYears);

// Get single transaction by ID
router.get("/:id", requireAuth, getTransactionById);

// Create new transaction
router.post(
  "/",
  requireAuth,
  upload.single("image"),
  validateTransactionMiddleware,
  createTransaction
);

// Update transaction
router.put(
  "/:id",
  requireAuth,
  upload.single("image"),
  validateTransactionMiddleware,
  updateTransaction
);

// Delete transaction
router.delete("/:id", requireAuth, deleteTransaction);

module.exports = router;
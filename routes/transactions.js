const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { upload, uploadToCloudinary } = require("../config/upload");

// Get all transactions (newest first)
router.get("/api/transactions", requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = "SELECT * FROM transactions WHERE user_id = $1";
    const params = [req.session.userId];

    if (search && search.trim()) {
      query += " AND (title ILIKE $2 OR notes ILIKE $3 OR location ILIKE $4)";
      const searchTerm = "%" + search.trim() + "%";
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY datetime DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Get single transaction by ID
router.get("/api/transactions/:id", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.session.userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

// Create new transaction
router.post(
  "/api/transactions",
  requireAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        title,
        amount,
        datetime,
        notes,
        payment_method,
        location,
        other_payment_method,
      } = req.body;

      if (!title || !amount || !datetime || !payment_method) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Determine final payment method
      let final_payment_method = payment_method;
      if (payment_method === "Other") {
        if (!other_payment_method || !other_payment_method.trim()) {
          return res.status(400).json({
            error: "Payment method name is required when Other is selected",
          });
        }
        final_payment_method = other_payment_method.trim();
      }

      // Check for duplicate within last 5 seconds
      const duplicateCheck = await pool.query(
        `SELECT id FROM transactions
       WHERE user_id = $1 AND title = $2 AND amount = $3 AND datetime = $4
       AND created_at > NOW() - INTERVAL '5 seconds'`,
        [req.session.userId, title, parseFloat(amount), datetime],
      );
      if (duplicateCheck.rows.length > 0) {
        return res
          .status(409)
          .json({ error: "Duplicate transaction detected" });
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
        [
          title,
          parseFloat(amount),
          datetime,
          notes || "",
          final_payment_method,
          location || "",
          image_url,
          image_public_id,
          req.session.userId,
        ],
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  },
);
module.exports = router;
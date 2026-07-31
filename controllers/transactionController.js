const pool = require("../config/db");
const cloudinary = require("../config/cloudinary");
const { uploadToCloudinary } = require("../config/upload");

// Delete image from Cloudinary
async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Error deleting from Cloudinary:", err);
  }
}

// Get transactions for the logged-in user
async function getTransactions(req, res) {
  try {
    const {
      search,
      transactionType,
      paymentMethod,
      month,
      year
    } = req.query;

    let params = [req.session.userId];
    let conditions = ["user_id = $1"];

    // Search
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        `(title ILIKE $${params.length + 1}
          OR notes ILIKE $${params.length + 2}
          OR location ILIKE $${params.length + 3})`
      );
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Transaction Type
    if (transactionType && transactionType !== "all") {
      conditions.push(`transaction_type = $${params.length + 1}`);
      params.push(transactionType);
    }

    // Payment Method
    if (paymentMethod && paymentMethod !== "all") {

      if (paymentMethod === "other") {

        conditions.push(`
          payment_method NOT IN (
            'GPay',
            'Paytm',
            'BHIM',
            'POP UPI'
          )
        `);

      } else {

        conditions.push(`payment_method = $${params.length + 1}`);
        params.push(paymentMethod);
      }
    }

    // Month
    if (month && month !== "all") {
      conditions.push(
        `EXTRACT(MONTH FROM datetime::timestamp) = $${params.length + 1}`
      );
      params.push(Number(month));
    }

    // Year
    if (year && year !== "all") {
      conditions.push(
        `EXTRACT(YEAR FROM datetime::timestamp) = $${params.length + 1}`
      );
      params.push(Number(year));
    }

    const query = `
      SELECT *
      FROM transactions
      WHERE ${conditions.join(" AND ")}
      ORDER BY datetime::timestamp DESC
    `;

    console.log(query);
    console.log(params);
    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      error: "Failed to fetch transactions"
    });
  }
}

// Get available years for the logged-in user
async function getAvailableYears(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT DISTINCT
        EXTRACT(YEAR FROM datetime::timestamp) AS year
      FROM transactions
      WHERE user_id = $1
      ORDER BY year DESC;
      `,
      [req.session.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching years:", error);
    res.status(500).json({
      error: "Failed to fetch years"
    });
  }
}

// Get single transaction by ID
async function getTransactionById(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.session.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Transaction not found",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({
      error: "Failed to fetch transaction",
    });
  }
}

// Create new transaction
async function createTransaction(req, res) {
  try {
    const {
      title,
      amount,
      transaction_type,
      datetime,
      notes,
      payment_method,
      location,
      other_payment_method,
    } = req.body;

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
       WHERE user_id = $1
      AND title = $2
      AND amount = $3
      AND transaction_type = $4
      AND payment_method = $5
      AND created_at > NOW() - INTERVAL '5 seconds'`,
      [
        req.session.userId,
        title,
        parseFloat(amount),
        transaction_type,
        final_payment_method,
      ],
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ error: "Duplicate transaction detected" });
    }

    let image_url = null;
    let image_public_id = null;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file);
      image_url = uploadResult.url;
      image_public_id = uploadResult.public_id;
    }

    const result = await pool.query(
      `INSERT INTO transactions
(title, amount, transaction_type, datetime, notes, payment_method, location, image_url, image_public_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        title,
        parseFloat(amount),
        transaction_type,
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
}

// Update transaction
async function updateTransaction(req, res) {
  try {
    const {title,amount,transaction_type,datetime,notes,payment_method,location,other_payment_method,month} = req.body;

    // Check if transaction exists and belongs to user
    const existingResult = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.session.userId],
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const existing = existingResult.rows[0];

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
       SET
      title = $1,
      amount = $2,
      transaction_type = $3,
      datetime = $4,
      notes = $5,
      payment_method = $6,
      location = $7,
      image_url = $8,
      image_public_id = $9

      WHERE id = $10
      AND user_id = $11
       RETURNING *`,
      [
        title,
        parseFloat(amount),
        transaction_type,
        datetime,
        notes || "",
        final_payment_method,
        location || "",
        image_url,
        image_public_id,
        req.params.id,
        req.session.userId,
      ],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ error: "Failed to update transaction" });
  }
}

// Delete transaction
async function deleteTransaction(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.session.userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const transaction = result.rows[0];

    if (transaction.image_public_id) {
      await deleteFromCloudinary(transaction.image_public_id);
    }

    await pool.query("DELETE FROM transactions WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
}

module.exports = {
  getTransactions,
  getAvailableYears,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
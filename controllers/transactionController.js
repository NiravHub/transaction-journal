const pool = require("../config/db");
const cloudinary = require("../config/cloudinary");
const { uploadToCloudinary } = require("../config/upload");

// Delete image from Cloudinary
async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Error deleting from Cloudinary:', err);
  }
}

// Get transactions for the logged-in user
async function getTransactions(req, res) {
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
}

module.exports = {
  getTransactions,
};
const pool = require("../config/db");

async function getProfile(req, res) {
  try {
    const userResult = await pool.query(
      "SELECT id, name, username, created_at FROM users WHERE id = $1",
      [req.session.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const statsResult = await pool.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = $1",
      [req.session.userId]
    );

    res.json({
      user: userResult.rows[0],
      stats: {
        transactionCount: parseInt(statsResult.rows[0].count),
        totalSpent: parseFloat(statsResult.rows[0].total),
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
}

module.exports = {
  getProfile,
};
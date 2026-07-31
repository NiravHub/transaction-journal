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
  `
  SELECT
    COUNT(*) AS count,

    COALESCE(
        SUM(
            CASE
                WHEN transaction_type = 'spent'
                THEN amount
                ELSE 0
            END
        ),
        0
    ) AS total_spent,

    COALESCE(
        SUM(
            CASE
                WHEN transaction_type = 'received'
                THEN amount
                ELSE 0
            END
        ),
        0
    ) AS total_received

FROM transactions
WHERE user_id = $1;
  `,
  [req.session.userId]
);

const paymentMethodResult = await pool.query(
  `
  SELECT
    payment_method,
    SUM(amount) AS total_amount,
    COUNT(*) AS transaction_count
  FROM transactions
  WHERE
    user_id = $1
    AND transaction_type = 'spent'
  GROUP BY payment_method
  ORDER BY total_amount DESC;
  `,
  [req.session.userId]
);

    res.json({
  user: userResult.rows[0],

  stats: {
    transactionCount: parseInt(statsResult.rows[0].count),
    totalSpent: parseFloat(statsResult.rows[0].total_spent),
    totalReceived: parseFloat(statsResult.rows[0].total_received),
  },

  paymentMethods: paymentMethodResult.rows,
});
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
}

module.exports = {
  getProfile,
};
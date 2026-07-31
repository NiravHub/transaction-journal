
//validates transaction data for required fields and constraints
function validateTransaction(data) {
  const errors = [];

  const {
    title,
    amount,
    datetime,
    payment_method,
    notes,
    location,
    other_payment_method,
  } = data;

  // Title
  if (!title || !title.trim()) {
    errors.push("Title is required.");
  } else if (title.trim().length > 100) {
    errors.push("Title cannot exceed 100 characters.");
  }

  // Amount
  if (amount === undefined || amount === null || amount === "") {
    errors.push("Amount is required.");
  } else if (isNaN(amount) || Number(amount) <= 0) {
    errors.push("Amount must be greater than 0.");
  }

  // Date & Time
  if (!datetime) {
    errors.push("Date and time are required.");
  }

  // Payment Method
  // Payment Method is required only for Spent transactions
  if (data.transaction_type === "spent") {
  if (!payment_method) {
    errors.push("Payment method is required.");
  }

  if (
    payment_method === "Other" &&
    (!other_payment_method || !other_payment_method.trim())
  ) {
    errors.push("Please enter a custom payment method.");
  }
  }

  // Notes
  if (notes && notes.length > 1000) {
    errors.push("Notes cannot exceed 1000 characters.");
  }

  // Location
  if (location && location.length > 255) {
    errors.push("Location cannot exceed 255 characters.");
  }

  return errors;
}

// Middleware to validate transaction data
function validateTransactionMiddleware(req, res, next) {
  const errors = validateTransaction(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors,
    });
  }

  next();
}

module.exports = {
  validateTransaction,
  validateTransactionMiddleware,
};
# 💳 Transaction Journal

A modern web application to record, organize, and manage personal transactions with notes, screenshots, payment methods, and location details.

Instead of searching through screenshots, bank statements, or payment apps, Transaction Journal lets you save everything related to a transaction in one place.

---

## ✨ Features

- 📊 Dashboard with transaction statistics
- ➕ Dedicated Add Transaction page
- 📜 View transactions grouped by month
- 🔍 Search transactions instantly
- 📝 Add notes for every transaction
- 📷 Upload payment screenshots/receipts
- 💳 Store payment method
- 📍 Save transaction location
- 👤 User authentication
- 📱 Responsive modern UI
- ☁️ Cloudinary image storage
- 🗄️ PostgreSQL database

---

## 🖼️ Pages

### Dashboard
- Overview of your account
- Total transactions
- Total amount spent
- Quick navigation

### Add Transaction
Record a new transaction with:
- Title
- Amount
- Date & Time
- Payment Method
- Location
- Notes
- Receipt Screenshot

### Transactions
- Month-wise grouping
- Search by title, notes or location
- View complete transaction details
- Edit/Delete transactions

### Profile
- User information
- Member since
- Account details

### About
Information about the application and its purpose.

---

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- Vanilla JavaScript

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL

### Image Storage
- Cloudinary

### Authentication
- Express Session
- bcrypt

### Deployment
- Railway
- GitHub

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/NiravHub/transaction-journal.git
```

### Go into the project

```bash
cd transaction-journal
```

### Install dependencies

```bash
npm install
```

### Create a `.env` file

```env
DATABASE_URL=your_database_url

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

SESSION_SECRET=your_secret
```

### Start the application

```bash
npm start
```

Open:

```
http://localhost:3000
```

---

## 📂 Project Structure

```
transaction-journal/
│
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   └── about.html
│
├── index.js
├── package.json
├── .env
└── README.md
```

---

## 💡 Why I Built This

Many payments are forgotten after a few days.

I wanted a simple application where I could store:

- transaction details
- payment screenshots
- notes
- locations
- payment methods

Everything stays organized and can be searched later instead of scrolling through gallery screenshots or payment history.

---

## 🔮 Future Improvements

- 💸 Spent / Received transaction types
- 📈 Income vs Expense dashboard
- 📊 Charts & Analytics
- 📅 Calendar view
- 🏷️ Categories
- 📤 Export to PDF/Excel
- 🔔 Payment reminders
- 🌙 Dark/Light mode
- 📱 Progressive Web App (PWA)
- 👥 Multi-user support

---

## 👨‍💻 Author

**Nirav Panwala**

GitHub: https://github.com/NiravHub

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub.

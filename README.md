# 💰 SmartKhata

### Digital Credit & Payment Management System

SmartKhata is a modern web-based financial management application designed to help users easily track money they need to receive, money they need to pay, transactions, payments, due dates, and financial activity in one place.

The goal of SmartKhata is to provide a simple and organized digital alternative to traditional credit/udhari notebooks.

---

## ✨ Features

- 📊 **Dashboard**
  - Total money to receive
  - Total money to pay
  - Pending amount
  - Overdue amount
  - Recent transactions
  - Upcoming payments

- 👥 **People Management**
  - Add and manage people
  - Maintain person-wise financial records

- 💳 **Transaction Management**
  - Create credit and debit transactions
  - Set transaction amounts
  - Add due dates
  - Add descriptions
  - Edit transactions
  - Delete transactions
  - Track transaction status

- 💸 **Payment Management**
  - Record payments
  - Support partial payments
  - Track remaining balances
  - Maintain payment history
  - Payment methods

- 🔔 **Reminders**
  - Track upcoming payments
  - Identify overdue transactions

- 📈 **Reports**
  - Financial summaries
  - Credit and debit analysis
  - Transaction insights

- 🔐 **Authentication**
  - User registration
  - Login
  - Secure user sessions
  - Email verification

- 📱 **Responsive UI**
  - Desktop
  - Tablet
  - Mobile

---

## 🛠️ Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Vite

### Backend & Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

### Development Tools

- Git
- GitHub
- VS Code

---

## 🏗️ Project Structure

```text
smartkhata/
│
├── css/
│   ├── dashboard.css
│   ├── payments.css
│   ├── people.css
│   ├── reminders.css
│   ├── reports.css
│   ├── style.css
│   └── transactions.css
│
├── js/
│   ├── auth.js
│   ├── dashboard.js
│   ├── main.js
│   ├── payments.js
│   ├── people.js
│   ├── reminders.js
│   ├── reports.js
│   ├── supabase.js
│   └── transactions.js
│
├── public/
│   ├── auth/
│   │   └── callback.html
│   ├── dashboard.html
│   ├── login.html
│   ├── payments.html
│   ├── people.html
│   ├── register.html
│   ├── reminders.html
│   ├── reports.html
│   └── transactions.html
│
├── index.html
├── package.json
├── package-lock.json
├── .gitignore
└── README.md

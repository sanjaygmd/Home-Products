# Home-Products E-Commerce Marketplace

A comprehensive, full-stack multi-vendor e-commerce marketplace platform built with React, Node.js, Express, and PostgreSQL. It features robust role-based access control for Admins, Sellers, and Customers, along with advanced analytics, inventory management, and logistics integrations.

## 🚀 Key Features

### Admin Role
*   **Dynamic Financial Dashboard:** Real-time, API-driven sales reports and analytics with dynamic time-range filtering (Daily, Weekly, Monthly, Quarterly, Half-Yearly, Annual).
*   **Seller Management:** Complete administrative control over seller accounts, including the ability to activate, block, or unblock sellers directly from the directory interface.
*   **Inventory Oversight:** "Admin-as-Owner" model for marketplace inventory, allowing robust tracking and oversight of all products.

### Seller Role
*   **Dedicated Seller Dashboard:** Secure portal for sellers to manage their listings, restricted to display only their own created products.
*   **Order Fulfillment:** Integration with Shiprocket logistics for managing shipping pickup locations, tracking product dispatch, and generating accurate inventory metrics.
*   **Advanced UI/UX:** High-performance, non-blocking image preview transitions using Framer Motion for product details.

### Customer Role
*   **Shopping Cart & Checkout:** Seamless browsing, cart management, and order placement.
*   **Real-time Notifications:** Email and SMS notifications (via Nodemailer and Twilio) for real-time order updates.
*   **Secure Access:** Session management and role-based routing to ensure strict data separation.

## 🛠️ Tech Stack

### Frontend (`/client`)
*   **Framework:** React 19 + Vite
*   **Styling:** Tailwind CSS 4, Material-UI (MUI)
*   **Animations:** Framer Motion
*   **Data Visualization:** Recharts
*   **Routing:** React Router v7
*   **HTTP Client:** Axios

### Backend (`/server`)
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** PostgreSQL (`pg`)
*   **Authentication:** JWT (`jsonwebtoken`), bcrypt
*   **Notifications:** Nodemailer, Twilio
*   **Other:** CORS, Cookie Parser, Dotenv

## 📁 Project Structure

```
.
├── client/                 # React frontend code
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend code
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   └── package.json
├── schemas.sql             # Complete PostgreSQL database schema
└── README.md
```

## ⚙️ Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **PostgreSQL** (Installed and running locally or via cloud)
*   **Git**

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sanjaygmd/Home-Products.git
   cd Home-Products
   ```

2. **Database Setup:**
   * Create a PostgreSQL database for the project.
   * Execute the provided `schemas.sql` file to create the necessary tables and relationships.
     ```bash
     psql -U your_username -d your_database_name -f schemas.sql
     ```

3. **Install Backend Dependencies:**
   ```bash
   cd server
   npm install
   ```

4. **Install Frontend Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

## 🔐 Environment Variables

Create a `.env` file in the `server/` directory and configure the following required variables:

```env
# Server Configuration
PORT=5000

# Database Configuration (PostgreSQL)
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name

# JWT Authentication
JWT_SECRET=your_jwt_secret_key

# Third-party Integrations (Optional/Required based on usage)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

*(Note: Depending on the specific services like Shiprocket or EmailJS, you may need to add additional keys to the `.env` files in both the `server` and `client` directories.)*

## 🏃‍♂️ Running the Application

To run both the backend and frontend development servers concurrently:

1. **Start the Backend Server:**
   ```bash
   cd server
   npm run start
   ```
   *(Server typically runs on `http://localhost:5000`)*

2. **Start the Frontend Development Server (in a new terminal):**
   ```bash
   cd client
   npm run dev
   ```
   *(Frontend typically runs on `http://localhost:5173`)*

## 🛡️ Authentication & Routing

The application implements robust, role-based protection for routes:
*   `AuthContext` manages the global session and normalizes user roles (`customer`, `seller`, `admin`).
*   `ProtectedRoute` components enforce strict role authorization, ensuring users cannot access unauthorized dashboards or data.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

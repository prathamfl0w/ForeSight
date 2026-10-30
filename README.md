# Inventory Reorder Point & Demand Forecasting Tool

A small-business inventory management application that predicts **when to reorder stock** using historical sales demand instead of fixed low-stock thresholds.

Two products with the same stock quantity may have very different reorder requirements depending on how quickly they sell. This project uses sales velocity, demand variation, current stock, and supplier lead time to generate intelligent reorder recommendations.

## Project Phases

### Phase 1 – Browser-Based Prototype

Built using HTML, CSS, and JavaScript with LocalStorage.

**Features:**
- Add and manage inventory products.
- Record sales and automatically reduce stock.
- Store products and sales using LocalStorage.
- Calculate average daily demand and standard deviation.
- Calculate safety stock and reorder points.
- Estimate days of stock remaining.
- Generate suggested order quantities.
- Classify products as `REORDER_NOW`, `LOW`, or `OK`.
- Change forecasting windows (7, 14, 30, and 60 days).
- Load demonstration data and view inventory statistics.

### Phase 2 – Full-Stack MERN Application

Upgraded into a full-stack application with a React frontend, Express backend, and MongoDB database.

**Features:**
- User registration and login.
- JWT authentication and protected routes.
- MongoDB-based inventory and sales storage.
- Complete product CRUD operations.
- Product image uploads using Multer.
- Sales recording with automatic stock updates.
- User-specific inventory and sales records.
- Server-side demand forecasting.
- Interactive React dashboard with reorder alerts.
- Search, filtering, and sorting of inventory.
- Persistent data across sessions.

## Technology Stack

| Phase 1 | Phase 2 |
|---|---|
| HTML5 | React 18 |
| CSS3 | Vite |
| JavaScript | Node.js |
| LocalStorage | Express.js |
| | MongoDB Atlas |
| | Mongoose |
| | JWT & bcryptjs |
| | Multer |

## Forecasting Logic

The forecasting engine analyses daily sales over a selected historical window. Days without sales are counted as zero.

**1. Average Daily Demand**
```text
avgDailyDemand = mean(daily sales)
```

**2. Safety Stock**
```text
safetyStock = z × demandStdDev × √leadTimeDays
```
Default `z = 1.65`.

**3. Reorder Point**
```text
reorderPoint =
(avgDailyDemand × leadTimeDays) + safetyStock
```

**4. Days of Stock Left**
```text
daysOfStockLeft =
currentStock / avgDailyDemand
```

**5. Suggested Order Quantity**
```text
max(0, ceil(
  avgDailyDemand × (leadTimeDays + reviewPeriodDays)
  + safetyStock - currentStock
))
```

Inventory is classified as:

- `REORDER_NOW`: Stock is at or below the reorder point.
- `LOW`: Stock is within 25% above the reorder point.
- `OK`: Sufficient stock is available.

## Project Structure

```text
inventory-forecast/
│
├── phase1/
│   ├── index.html
│   ├── css/
│   └── js/
│       ├── storage.js
│       ├── forecast.js
│       ├── app.js
│       └── demo-data.js
│
├── server/
│   ├── config/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── uploads/
│   ├── seed.js
│   └── server.js
│
├── client/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── styles.css
│
└── README.md
```

## How to Run

### Phase 1
1. Open the `phase1` folder in VS Code.
2. Run `index.html` using Live Server.
3. Click **Load Demo Data** to explore the prototype.

### Phase 2

**Prerequisites:** Node.js, npm, and a MongoDB Atlas account.

1. Clone the repository:
```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

2. Install backend dependencies:
```bash
cd server
npm install
```

3. Configure `server/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

4. Seed demonstration data:
```bash
node seed.js
```

5. Start the backend:
```bash
npm run dev
```

6. Open another terminal and start the frontend:
```bash
cd client
npm install
npm run dev
```

7. Open local URL provided by Vite in your browser.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get user details |
| GET, POST | `/api/products` | View and add products |
| GET, PATCH, DELETE | `/api/products/:id` | Manage products |
| GET, POST | `/api/sales` | View and record sales |
| DELETE | `/api/sales/:id` | Delete a sale |
| GET | `/api/inventory/forecast` | Generate inventory forecasts |

Protected endpoints require JWT authentication.

## Team Contributions

This project is developed by a three-member team.

| Member | Contribution |
| Pratham | Frontend development, interface and styling |
| Akshit | Database, backend and forecasting calculations |
| Agrim | API integration, application flow and demonstration data |

Individual contributions are maintained through GitHub commits and branches.

## Future Improvements

- Automated reorder notifications.
- Supplier integration and purchase order generation.
- Machine learning-based demand prediction.
- Seasonal demand analysis.
- Inventory analytics and report generation.

## Project Goal

The goal is to replace traditional static low-stock alerts with demand-based reorder decisions, helping small businesses manage inventory efficiently, avoid stockouts, and make better purchasing decisions.

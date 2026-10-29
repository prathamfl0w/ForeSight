# Inventory Reorder Point & Demand Forecasting Tool - API Reference

## Authentication Flow

This API uses stateless **JSON Web Tokens (JWT)** for authentication.

1. **Obtain Token:**
   - Register a new account via `POST /api/auth/register` or log into an existing account via `POST /api/auth/login`.
   - The response contains `{ "token": "<jwt-token-string>", "user": { ... } }`.

2. **Send Protected Requests:**
   - Include the JWT in the `Authorization` HTTP header with the `Bearer` scheme on every subsequent request:
     ```http
     Authorization: Bearer <jwt-token-string>
     ```

3. **Multi-Tenant Scoping:**
   - Every product, sale record, and forecast calculation is scoped directly to `req.user._id`. Users cannot view, modify, or corrupt each other's data.

---

## Endpoints Summary Table

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check and server status |
| `POST` | `/api/auth/register` | No | Create user account and receive JWT |
| `POST` | `/api/auth/login` | No | Login with email/password and receive JWT |
| `GET` | `/api/auth/me` | Yes | Retrieve current logged-in user profile |
| `GET` | `/api/products` | Yes | List user's products with optional search and category filters |
| `POST` | `/api/products` | Yes | Create product (`multipart/form-data` with optional image file) |
| `GET` | `/api/products/:id` | Yes | Fetch single product by id |
| `PATCH` | `/api/products/:id` | Yes | Update product details or upload a new image |
| `DELETE` | `/api/products/:id` | Yes | Delete product and cascade-delete its sales records |
| `POST` | `/api/sales` | Yes | Record a sale and decrement current stock |
| `GET` | `/api/sales` | Yes | List sales records with optional product, day, and limit filters |
| `DELETE` | `/api/sales/:id` | Yes | Delete sale record and return units to stock |
| `GET` | `/api/inventory/forecast` | Yes | Core reorder forecast and inventory demand analytics |

---

## Detailed Endpoint Documentation

### 1. Health Check
- **Route:** `GET /api/health`
- **Auth Required:** No
- **Success Response (200 OK):**
  ```json
  {
    "status": "ok",
    "time": "2026-10-29T11:45:00.000Z"
  }
  ```

---

### 2. Register User
- **Route:** `POST /api/auth/register`
- **Auth Required:** No
- **Request Body (JSON):**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "password123"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6720d52b1b3b1f1a10000001",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```
- **Likely Error Responses:**
  - `400 Bad Request`: `{"message": "Please provide all required fields"}`
  - `400 Bad Request`: `{"message": "Email is already registered"}`

---

### 3. Login User
- **Route:** `POST /api/auth/login`
- **Auth Required:** No
- **Request Body (JSON):**
  ```json
  {
    "email": "demo@example.com",
    "password": "password123"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6720d52b1b3b1f1a10000001",
      "name": "Demo Admin",
      "email": "demo@example.com"
    }
  }
  ```
- **Likely Error Responses:**
  - `400 Bad Request`: `{"message": "Please provide email and password"}`
  - `401 Unauthorized`: `{"message": "Invalid email or password"}`

---

### 4. Get Current User Profile
- **Route:** `GET /api/auth/me`
- **Auth Required:** Yes (`Bearer <token>`)
- **Success Response (200 OK):**
  ```json
  {
    "user": {
      "id": "6720d52b1b3b1f1a10000001",
      "name": "Demo Admin",
      "email": "demo@example.com"
    }
  }
  ```
- **Likely Error Responses:**
  - `401 Unauthorized`: `{"message": "Not authorised, no token"}`
  - `401 Unauthorized`: `{"message": "Session expired, please log in again"}`

---

### 5. Get Products
- **Route:** `GET /api/products`
- **Auth Required:** Yes
- **Query Parameters (optional):**
  - `search`: Filter by name or SKU (case-insensitive substring)
  - `category`: Filter by category name
- **Success Response (200 OK):**
  ```json
  {
    "count": 1,
    "products": [
      {
        "_id": "6720d52b1b3b1f1a10000010",
        "name": "Organic Roasted Coffee Beans (1kg)",
        "sku": "COF-ROAST-1K",
        "category": "Beverages",
        "currentStock": 25,
        "leadTimeDays": 14,
        "unitCost": 650,
        "imageUrl": "",
        "owner": "6720d52b1b3b1f1a10000001",
        "createdAt": "2026-10-29T11:45:00.000Z",
        "updatedAt": "2026-10-29T11:45:00.000Z"
      }
    ]
  }
  ```

---

### 6. Create Product
- **Route:** `POST /api/products`
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `name` (string, required)
  - `sku` (string, required)
  - `category` (string, optional, default: `"Uncategorised"`)
  - `currentStock` (number, optional, default: `0`)
  - `leadTimeDays` (number, optional, default: `7`, min: `1`)
  - `unitCost` (number, optional, default: `0`)
  - `image` (binary file, optional, `.jpg`, `.jpeg`, `.png`, `.webp`, max 2MB)
- **Success Response (201 Created):**
  ```json
  {
    "product": {
      "_id": "6720d52b1b3b1f1a10000020",
      "name": "French Press (800ml)",
      "sku": "PRS-800-SS",
      "category": "Equipment",
      "currentStock": 40,
      "leadTimeDays": 7,
      "unitCost": 950,
      "imageUrl": "/uploads/image-1714000123-999.jpg",
      "owner": "6720d52b1b3b1f1a10000001",
      "createdAt": "2026-10-29T11:46:00.000Z",
      "updatedAt": "2026-10-29T11:46:00.000Z"
    }
  }
  ```
- **Likely Error Responses:**
  - `400 Bad Request`: `{"message": "Product name is required"}`
  - `400 Bad Request`: `{"message": "You already have a product with that SKU"}`
  - `400 Bad Request`: `{"message": "Image must be smaller than 2MB"}`

---

### 7. Get Single Product
- **Route:** `GET /api/products/:id`
- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  {
    "product": {
      "_id": "6720d52b1b3b1f1a10000010",
      "name": "Organic Roasted Coffee Beans (1kg)",
      "sku": "COF-ROAST-1K",
      "currentStock": 25,
      "leadTimeDays": 14,
      "unitCost": 650,
      "imageUrl": ""
    }
  }
  ```
- **Likely Error Responses:**
  - `404 Not Found`: `{"message": "Product not found"}`

---

### 8. Update Product
- **Route:** `PATCH /api/products/:id`
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Form Fields (any subset):** `name`, `sku`, `category`, `currentStock`, `leadTimeDays`, `unitCost`, `image`
- **Success Response (200 OK):**
  ```json
  {
    "product": {
      "_id": "6720d52b1b3b1f1a10000010",
      "name": "Organic Roasted Coffee Beans (1kg)",
      "sku": "COF-ROAST-1K",
      "currentStock": 35,
      "leadTimeDays": 14,
      "unitCost": 680
    }
  }
  ```
- **Likely Error Responses:**
  - `404 Not Found`: `{"message": "Product not found"}`
  - `400 Bad Request`: `{"message": "currentStock must be a non-negative number"}`

---

### 9. Delete Product
- **Route:** `DELETE /api/products/:id`
- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  {
    "message": "Product deleted",
    "deletedSales": 52
  }
  ```
- **Likely Error Responses:**
  - `404 Not Found`: `{"message": "Product not found"}`

---

### 10. Record a Sale
- **Route:** `POST /api/sales`
- **Auth Required:** Yes
- **Request Body (JSON):**
  ```json
  {
    "productId": "6720d52b1b3b1f1a10000010",
    "quantity": 5,
    "saleDate": "2026-10-29"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "sale": {
      "_id": "6720d52b1b3b1f1a10000055",
      "product": "6720d52b1b3b1f1a10000010",
      "quantity": 5,
      "saleDate": "2026-10-29T00:00:00.000Z",
      "owner": "6720d52b1b3b1f1a10000001"
    },
    "product": {
      "_id": "6720d52b1b3b1f1a10000010",
      "name": "Organic Roasted Coffee Beans (1kg)",
      "currentStock": 20
    }
  }
  ```
- **Likely Error Responses:**
  - `400 Bad Request`: `{"message": "Only 3 units in stock"}`
  - `400 Bad Request`: `{"message": "Sale date cannot be in the future"}`
  - `404 Not Found`: `{"message": "Product not found"}`

---

### 11. Get Sales Records
- **Route:** `GET /api/sales`
- **Auth Required:** Yes
- **Query Parameters (optional):**
  - `productId`: Filter sales for a specific product ID
  - `days`: Filter sales occurring within the last N days
  - `limit`: Number of records to return (default: `100`)
- **Success Response (200 OK):**
  ```json
  {
    "count": 1,
    "sales": [
      {
        "_id": "6720d52b1b3b1f1a10000055",
        "product": {
          "_id": "6720d52b1b3b1f1a10000010",
          "name": "Organic Roasted Coffee Beans (1kg)",
          "sku": "COF-ROAST-1K"
        },
        "quantity": 5,
        "saleDate": "2026-10-29T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 12. Delete Sale Record
- **Route:** `DELETE /api/sales/:id`
- **Auth Required:** Yes
- **Success Response (200 OK):**
  ```json
  {
    "message": "Sale deleted",
    "product": {
      "_id": "6720d52b1b3b1f1a10000010",
      "name": "Organic Roasted Coffee Beans (1kg)",
      "currentStock": 25
    }
  }
  ```
- **Likely Error Responses:**
  - `404 Not Found`: `{"message": "Sale record not found"}`

---

### 13. Get Inventory Forecast & Demand Analytics
- **Route:** `GET /api/inventory/forecast`
- **Auth Required:** Yes
- **Query Parameters (all optional):**
  - `windowDays`: Number of historical days to inspect (default: `30`, min: `1`, max: `365`)
  - `z`: Standard normal service level constant (default: `1.65` for 95% service level, range: `0` to `4`)
  - `reviewPeriodDays`: Days between inventory review orders (default: `14`, min: `0`, max: `365`)
  - `status`: Filter by status (`REORDER_NOW`, `LOW`, `OK`)
  - `sort`: Ordering method (`urgency` [default] or `name`)
- **Success Response (200 OK):**
  ```json
  {
    "generatedAt": "2026-10-29T11:45:00.000Z",
    "windowDays": 30,
    "params": {
      "z": 1.65,
      "reviewPeriodDays": 14
    },
    "summary": {
      "totalProducts": 6,
      "needReorder": 2,
      "low": 1,
      "ok": 3,
      "totalSuggestedOrderValue": 12450.5
    },
    "items": [
      {
        "productId": "6720d52b1b3b1f1a10000010",
        "name": "Organic Roasted Coffee Beans (1kg)",
        "sku": "COF-ROAST-1K",
        "category": "Beverages",
        "imageUrl": "",
        "unitCost": 650,
        "currentStock": 25,
        "leadTimeDays": 14,
        "avgDailyDemand": 4.29,
        "demandStdDev": 1.74,
        "safetyStock": 10.74,
        "reorderPoint": 70.80,
        "daysOfStockLeft": 5.83,
        "suggestedOrderQty": 106,
        "status": "REORDER_NOW",
        "salesCountInWindow": 26
      }
    ]
  }
  ```
- **Likely Error Responses:**
  - `400 Bad Request`: `{"message": "Invalid windowDays: must be an integer between 1 and 365"}`
  - `400 Bad Request`: `{"message": "Invalid z: must be a number between 0 and 4"}`
  - `400 Bad Request`: `{"message": "Invalid status: must be REORDER_NOW, LOW, or OK"}`


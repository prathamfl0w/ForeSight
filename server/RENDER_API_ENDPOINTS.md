# ForeSight Deployed API Endpoints (Render)

This reference lists all production API endpoints deployed on Render.

> **Base URL Format:** `https://<YOUR-RENDER-APP-NAME>.onrender.com`  
> *(Replace `<YOUR-RENDER-APP-NAME>` with your Render service name, e.g. `foresight-api`)*

---

## Quick Reference Summary Table

| # | HTTP Method | Endpoint Path | Full Deployed URL | Auth Required | Description |
|---|---|---|---|---|---|
| 1 | `GET` | `/api/health` | `https://<YOUR-APP>.onrender.com/api/health` | No | Server status & uptime check |
| 2 | `POST` | `/api/auth/register` | `https://<YOUR-APP>.onrender.com/api/auth/register` | No | Register new user account |
| 3 | `POST` | `/api/auth/login` | `https://<YOUR-APP>.onrender.com/api/auth/login` | No | Log in and receive JWT token |
| 4 | `GET` | `/api/auth/me` | `https://<YOUR-APP>.onrender.com/api/auth/me` | **Bearer Token** | Retrieve logged-in user profile |
| 5 | `GET` | `/api/products` | `https://<YOUR-APP>.onrender.com/api/products` | **Bearer Token** | Get all user products (supports search & filter) |
| 6 | `POST` | `/api/products` | `https://<YOUR-APP>.onrender.com/api/products` | **Bearer Token** | Create product (`multipart/form-data`) |
| 7 | `GET` | `/api/products/:id` | `https://<YOUR-APP>.onrender.com/api/products/:id` | **Bearer Token** | Get single product by ID |
| 8 | `PATCH`| `/api/products/:id` | `https://<YOUR-APP>.onrender.com/api/products/:id` | **Bearer Token** | Update existing product |
| 9 | `DELETE`| `/api/products/:id`| `https://<YOUR-APP>.onrender.com/api/products/:id` | **Bearer Token** | Delete product & cascade-delete its sales |
| 10| `POST` | `/api/sales` | `https://<YOUR-APP>.onrender.com/api/sales` | **Bearer Token** | Log sale & automatically decrement stock |
| 11| `GET` | `/api/sales` | `https://<YOUR-APP>.onrender.com/api/sales` | **Bearer Token** | View sales history with date filters |
| 12| `DELETE`| `/api/sales/:id` | `https://<YOUR-APP>.onrender.com/api/sales/:id` | **Bearer Token** | Delete sale & restore stock |
| 13| `GET` | `/api/inventory/forecast`| `https://<YOUR-APP>.onrender.com/api/inventory/forecast` | **Bearer Token** | **Graded core**: Reorder point & demand forecast |

---

## Authentication Instructions

For all endpoints marked with **Bearer Token**:
1. First, call `POST https://<YOUR-APP>.onrender.com/api/auth/login`.
2. Copy the `token` string from the JSON response.
3. In every protected request, add this HTTP Header:
   ```http
   Authorization: Bearer <your-jwt-token>
   ```

---

## Detailed Endpoint Documentation

### 1. Health Check
* **Method:** `GET`
* **URL:** `https://<YOUR-APP>.onrender.com/api/health`
* **Headers:** None
* **Sample Success Response (200 OK):**
  ```json
  {
    "status": "ok",
    "time": "2026-10-30T10:15:00.000Z"
  }
  ```

---

### 2. User Registration
* **Method:** `POST`
* **URL:** `https://<YOUR-APP>.onrender.com/api/auth/register`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "name": "Alex Morgan",
    "email": "alex@example.com",
    "password": "password123"
  }
  ```
* **Sample Success Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "6720d52b1b3b1f1a10000001",
      "name": "Alex Morgan",
      "email": "alex@example.com"
    }
  }
  ```

---

### 3. User Login
* **Method:** `POST`
* **URL:** `https://<YOUR-APP>.onrender.com/api/auth/login`
* **Headers:** `Content-Type: application/json`
* **Request Body (Demo Account):**
  ```json
  {
    "email": "demo@example.com",
    "password": "password123"
  }
  ```
* **Sample Success Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "6720d52b1b3b1f1a10000001",
      "name": "Demo Admin",
      "email": "demo@example.com"
    }
  }
  ```

---

### 4. Get Current User Profile
* **Method:** `GET`
* **URL:** `https://<YOUR-APP>.onrender.com/api/auth/me`
* **Headers:** `Authorization: Bearer <token>`
* **Sample Success Response (200 OK):**
  ```json
  {
    "user": {
      "id": "6720d52b1b3b1f1a10000001",
      "name": "Demo Admin",
      "email": "demo@example.com"
    }
  }
  ```

---

### 5. List All Products
* **Method:** `GET`
* **URL:** `https://<YOUR-APP>.onrender.com/api/products`
* **Optional Query Parameters:**
  * `?search=Coffee` (search by name or SKU)
  * `?category=Beverages`
* **Headers:** `Authorization: Bearer <token>`
* **Sample Success Response (200 OK):**
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
        "owner": "6720d52b1b3b1f1a10000001"
      }
    ]
  }
  ```

---

### 6. Create New Product
* **Method:** `POST`
* **URL:** `https://<YOUR-APP>.onrender.com/api/products`
* **Headers:** `Authorization: Bearer <token>`
* **Content-Type:** `multipart/form-data`
* **Form Data Fields:**
  * `name`: `Cold Brew Blend (500g)`
  * `sku`: `COF-CLD-500`
  * `category`: `Beverages`
  * `currentStock`: `40`
  * `leadTimeDays`: `7`
  * `unitCost`: `420`
  * `image`: *(optional image file: .png, .jpg, max 2MB)*
* **Sample Success Response (201 Created):**
  ```json
  {
    "product": {
      "_id": "6720d52b1b3b1f1a10000020",
      "name": "Cold Brew Blend (500g)",
      "sku": "COF-CLD-500",
      "category": "Beverages",
      "currentStock": 40,
      "leadTimeDays": 7,
      "unitCost": 420,
      "imageUrl": "/uploads/image-1714000123-999.jpg"
    }
  }
  ```

---

### 7. Get Product by ID
* **Method:** `GET`
* **URL:** `https://<YOUR-APP>.onrender.com/api/products/<productId>`
* **Headers:** `Authorization: Bearer <token>`
* **Sample Success Response (200 OK):**
  ```json
  {
    "product": {
      "_id": "6720d52b1b3b1f1a10000010",
      "name": "Organic Roasted Coffee Beans (1kg)",
      "sku": "COF-ROAST-1K",
      "currentStock": 25
    }
  }
  ```

---

### 8. Update Product
* **Method:** `PATCH`
* **URL:** `https://<YOUR-APP>.onrender.com/api/products/<productId>`
* **Headers:** `Authorization: Bearer <token>`
* **Content-Type:** `multipart/form-data` (or JSON)
* **Body:** Fields to update (e.g. `{ "currentStock": 35 }`)
* **Sample Success Response (200 OK):**
  ```json
  {
    "product": {
      "_id": "6720d52b1b3b1f1a10000010",
      "name": "Organic Roasted Coffee Beans (1kg)",
      "currentStock": 35
    }
  }
  ```

---

### 9. Delete Product (Cascading)
* **Method:** `DELETE`
* **URL:** `https://<YOUR-APP>.onrender.com/api/products/<productId>`
* **Headers:** `Authorization: Bearer <token>`
* **Sample Success Response (200 OK):**
  ```json
  {
    "message": "Product deleted",
    "deletedSales": 26
  }
  ```

---

### 10. Record a Sale (Auto-decrements Stock)
* **Method:** `POST`
* **URL:** `https://<YOUR-APP>.onrender.com/api/sales`
* **Headers:**
  * `Authorization: Bearer <token>`
  * `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "productId": "6720d52b1b3b1f1a10000010",
    "quantity": 2,
    "saleDate": "2026-10-30"
  }
  ```
* **Sample Success Response (201 Created):**
  ```json
  {
    "sale": {
      "_id": "6720e52b1b3b1f1a10000099",
      "product": "6720d52b1b3b1f1a10000010",
      "quantity": 2,
      "saleDate": "2026-10-30T00:00:00.000Z"
    },
    "product": {
      "_id": "6720d52b1b3b1f1a10000010",
      "name": "Organic Roasted Coffee Beans (1kg)",
      "currentStock": 23
    }
  }
  ```

---

### 11. View Sales Records
* **Method:** `GET`
* **URL:** `https://<YOUR-APP>.onrender.com/api/sales`
* **Optional Query Parameters:**
  * `?days=30` (sales within the last 30 days)
  * `?limit=50`
  * `?productId=<productId>`
* **Headers:** `Authorization: Bearer <token>`
* **Sample Success Response (200 OK):**
  ```json
  {
    "count": 1,
    "sales": [
      {
        "_id": "6720e52b1b3b1f1a10000099",
        "product": {
          "_id": "6720d52b1b3b1f1a10000010",
          "name": "Organic Roasted Coffee Beans (1kg)",
          "sku": "COF-ROAST-1K"
        },
        "quantity": 2,
        "saleDate": "2026-10-30T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 12. Delete Sale Record (Restores Stock)
* **Method:** `DELETE`
* **URL:** `https://<YOUR-APP>.onrender.com/api/sales/<saleId>`
* **Headers:** `Authorization: Bearer <token>`
* **Sample Success Response (200 OK):**
  ```json
  {
    "message": "Sale deleted",
    "product": {
      "_id": "6720d52b1b3b1f1a10000010",
      "currentStock": 25
    }
  }
  ```

---

### 13. Inventory Forecast & Demand Analytics (Centrepiece)
* **Method:** `GET`
* **URL:** `https://<YOUR-APP>.onrender.com/api/inventory/forecast`
* **Optional Query Parameters:**
  * `?windowDays=30` (Analysis window: 7, 14, 30, or 60 days)
  * `?status=REORDER_NOW` (Filter by `REORDER_NOW`, `LOW`, or `OK`)
  * `?sort=urgency` (Sort by `urgency` or `name`)
  * `?z=1.65` (Service level constant for 95%)
  * `?reviewPeriodDays=14`
* **Headers:** `Authorization: Bearer <token>`
* **Sample Success Response (200 OK):**
  ```json
  {
    "generatedAt": "2026-10-30T10:15:00.000Z",
    "windowDays": 30,
    "params": {
      "z": 1.65,
      "reviewPeriodDays": 14
    },
    "summary": {
      "totalProducts": 6,
      "needReorder": 3,
      "low": 0,
      "ok": 3,
      "totalSuggestedOrderValue": 184050
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


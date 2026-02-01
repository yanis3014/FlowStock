# FlowStock API Specifications

## Introduction

This document defines the complete RESTful API specifications for all FlowStock microservices. All APIs follow REST principles, use JSON for request/response bodies, and implement JWT-based authentication.

### API Version

| Version | Date | Description | Author |
|---------|------|-------------|--------|
| 1.0 | 2026-01-21 | Initial API specifications | Winston (Architect) |

### Base URL Structure

```
Production:  https://api.flowstock.io/v1
Staging:     https://api-staging.flowstock.io/v1
Development: http://localhost:3000/api/v1
```

### Common Patterns

#### Authentication

All endpoints (except `/auth/*`) require JWT authentication:

```http
Authorization: Bearer <jwt_token>
```

#### Standard Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-21T22:00:00Z",
    "request_id": "uuid"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-21T22:00:00Z",
    "request_id": "uuid"
  }
}
```

#### Pagination

List endpoints support pagination:

```http
GET /products?page=1&limit=20&sort=created_at&order=desc
```

**Paginated Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

#### Rate Limiting

- **Normal tier**: 100 requests/minute
- **Premium tier**: 200 requests/minute
- **Premium Plus tier**: 500 requests/minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1674334800
```

---

## 1. Authentication Service (`/auth`)

### POST /auth/register

Create a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Cafe Paris",
  "industry": "cafe"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "owner"
    },
    "tenant": {
      "id": "uuid",
      "company_name": "Cafe Paris",
      "slug": "cafe-paris"
    },
    "subscription": {
      "tier": "normal",
      "status": "trial",
      "trial_ends_at": "2026-02-21T22:00:00Z"
    },
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 900
  }
}
```

**Errors**:
- `400 BAD_REQUEST`: Invalid input (weak password, invalid email)
- `409 CONFLICT`: Email already exists

---

### POST /auth/login

Authenticate user and get tokens.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "owner"
    },
    "tenant": {
      "id": "uuid",
      "company_name": "Cafe Paris",
      "slug": "cafe-paris"
    },
    "subscription": {
      "tier": "premium",
      "status": "active"
    },
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 900
  }
}
```

**Errors**:
- `401 UNAUTHORIZED`: Invalid credentials
- `403 FORBIDDEN`: Account inactive

---

### POST /auth/refresh

Refresh access token using refresh token.

**Request**:
```json
{
  "refresh_token": "refresh_token"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "access_token": "new_jwt_token",
    "expires_in": 900
  }
}
```

---

### POST /auth/logout

Invalidate refresh token.

**Request**: Empty body

**Response** (204 No Content)

---

### POST /auth/forgot-password

Request password reset email.

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
```

---

### POST /auth/reset-password

Reset password with token from email.

**Request**:
```json
{
  "token": "reset_token",
  "new_password": "NewSecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

---

## 2. Products Service (`/products`)

### GET /products

List all products with filtering and pagination.

**Query Parameters**:
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)
- `search` (string): Search by name or SKU
- `location_id` (uuid): Filter by location
- `supplier_id` (uuid): Filter by supplier
- `low_stock` (boolean): Only show low stock items
- `sort` (string): Sort field (default: created_at)
- `order` (string): asc/desc (default: desc)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sku": "COFFEE-001",
      "name": "Arabica Coffee Beans",
      "description": "Premium arabica beans",
      "unit": "kg",
      "quantity": 45.5,
      "min_quantity": 10,
      "location": {
        "id": "uuid",
        "name": "Main Warehouse"
      },
      "supplier": {
        "id": "uuid",
        "name": "Coffee Supplier Inc"
      },
      "purchase_price": 12.50,
      "selling_price": 25.00,
      "lead_time_days": 7,
      "is_active": true,
      "stock_status": "ok", // "ok", "low", "critical"
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-20T15:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### GET /products/:id

Get single product details.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sku": "COFFEE-001",
    "name": "Arabica Coffee Beans",
    "description": "Premium arabica beans",
    "unit": "kg",
    "quantity": 45.5,
    "min_quantity": 10,
    "location": { ... },
    "supplier": { ... },
    "purchase_price": 12.50,
    "selling_price": 25.00,
    "lead_time_days": 7,
    "is_active": true,
    "stock_status": "ok",
    "recent_movements": [
      {
        "id": "uuid",
        "movement_type": "purchase",
        "quantity_change": 50,
        "created_at": "2026-01-20T10:00:00Z"
      }
    ],
    "prediction": {
      "predicted_stockout_date": "2026-02-15T00:00:00Z",
      "confidence_score": 0.87,
      "days_remaining": 25
    },
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-01-20T15:30:00Z"
  }
}
```

**Errors**:
- `404 NOT_FOUND`: Product not found

---

### POST /products

Create new product.

**Request**:
```json
{
  "sku": "COFFEE-002",
  "name": "Robusta Coffee Beans",
  "description": "Strong robusta beans",
  "unit": "kg",
  "quantity": 30,
  "min_quantity": 15,
  "location_id": "uuid",
  "supplier_id": "uuid",
  "purchase_price": 10.00,
  "selling_price": 20.00,
  "lead_time_days": 5
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": { ... } // Full product object
}
```

**Errors**:
- `400 BAD_REQUEST`: Invalid input
- `409 CONFLICT`: SKU already exists

---

### PUT /products/:id

Update existing product.

**Request**: Same as POST (all fields optional)

**Response** (200 OK):
```json
{
  "success": true,
  "data": { ... } // Updated product object
}
```

---

### DELETE /products/:id

Soft delete product (sets is_active = false).

**Response** (204 No Content)

---

### POST /products/import

Import products from CSV file.

**Request** (multipart/form-data):
```
file: products.csv
```

**CSV Format**:
```csv
sku,name,description,unit,quantity,min_quantity,location_name,supplier_name,purchase_price,selling_price
COFFEE-001,Arabica Coffee,Premium beans,kg,50,10,Main Warehouse,Coffee Inc,12.50,25.00
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "failed": 5,
    "errors": [
      {
        "row": 3,
        "sku": "INVALID-SKU",
        "error": "Duplicate SKU"
      }
    ]
  }
}
```

---

### GET /products/:id/history

Get stock movement history for product.

**Query Parameters**:
- `page`, `limit`: Pagination
- `start_date`, `end_date`: Date range filter
- `movement_type`: Filter by type

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "movement_type": "purchase",
      "quantity_change": 50,
      "quantity_before": 20,
      "quantity_after": 70,
      "user": {
        "id": "uuid",
        "name": "John Doe"
      },
      "notes": "Received from supplier",
      "created_at": "2026-01-20T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

## 3. Sales Service (`/sales`)

### POST /sales

Record manual sale.

**Request**:
```json
{
  "product_id": "uuid",
  "quantity_sold": 5,
  "unit_price": 25.00,
  "sale_date": "2026-01-21T14:30:00Z",
  "location_id": "uuid"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "product_id": "uuid",
    "quantity_sold": 5,
    "unit_price": 25.00,
    "total_amount": 125.00,
    "sale_date": "2026-01-21T14:30:00Z",
    "source": "manual",
    "created_at": "2026-01-21T14:35:00Z"
  }
}
```

---

### POST /sales/import

Import sales from CSV.

**Request** (multipart/form-data):
```
file: sales.csv
```

**CSV Format**:
```csv
product_sku,quantity_sold,unit_price,sale_date
COFFEE-001,5,25.00,2026-01-21
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "imported": 120,
    "failed": 3,
    "errors": [ ... ]
  }
}
```

---

### POST /sales/sync

Sync sales from payment terminal (Premium+ only).

**Request**:
```json
{
  "terminal_id": "POS-001",
  "start_date": "2026-01-20T00:00:00Z",
  "end_date": "2026-01-21T23:59:59Z"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "synced": 45,
    "duplicates_skipped": 2
  }
}
```

**Errors**:
- `403 FORBIDDEN`: Feature not available in current subscription tier

---

### GET /sales

List sales with filtering.

**Query Parameters**:
- `page`, `limit`: Pagination
- `product_id`: Filter by product
- `start_date`, `end_date`: Date range
- `location_id`: Filter by location

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product": {
        "id": "uuid",
        "sku": "COFFEE-001",
        "name": "Arabica Coffee"
      },
      "quantity_sold": 5,
      "unit_price": 25.00,
      "total_amount": 125.00,
      "sale_date": "2026-01-21T14:30:00Z",
      "source": "manual",
      "created_at": "2026-01-21T14:35:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

## 4. Predictions Service (`/predictions`) - Premium+ Only

### GET /predictions

Get AI predictions for all products.

**Query Parameters**:
- `confidence_min` (float): Minimum confidence score (0-1)
- `days_ahead` (int): Prediction horizon in days

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "product": {
        "id": "uuid",
        "sku": "COFFEE-001",
        "name": "Arabica Coffee",
        "current_quantity": 45.5
      },
      "predicted_stockout_date": "2026-02-15T00:00:00Z",
      "confidence_score": 0.87,
      "days_remaining": 25,
      "predicted_quantity_at_date": 0,
      "recommendation": "Order in 10 days",
      "model_version": "v1.2.3",
      "prediction_date": "2026-01-21T22:00:00Z"
    }
  ]
}
```

---

### GET /predictions/:product_id

Get prediction for specific product.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "product": { ... },
    "predicted_stockout_date": "2026-02-15T00:00:00Z",
    "confidence_score": 0.87,
    "days_remaining": 25,
    "prediction_timeline": [
      {
        "date": "2026-01-22",
        "predicted_quantity": 44.2
      },
      {
        "date": "2026-01-23",
        "predicted_quantity": 42.8
      }
      // ... daily predictions
    ],
    "factors": [
      {
        "name": "average_daily_consumption",
        "value": 1.8,
        "importance": 0.65
      },
      {
        "name": "trend",
        "value": "increasing",
        "importance": 0.25
      }
    ],
    "model_version": "v1.2.3",
    "prediction_date": "2026-01-21T22:00:00Z"
  }
}
```

---

### POST /predictions/retrain

Trigger manual model retraining (admin only).

**Request**:
```json
{
  "product_ids": ["uuid1", "uuid2"], // Optional, all if empty
  "force": false // Force even if recent training exists
}
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "queued",
    "estimated_duration_minutes": 15
  }
}
```

---

### GET /predictions/metrics

Get ML model performance metrics (Premium+ only).

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "overall_accuracy": 0.86,
    "precision": 0.84,
    "recall": 0.88,
    "f1_score": 0.86,
    "last_training_date": "2026-01-21T02:00:00Z",
    "model_version": "v1.2.3",
    "products_evaluated": 45,
    "predictions_validated": 120
  }
}
```

---

## 5. Orders Service (`/orders`)

### GET /orders/recommendations

Get AI-generated order recommendations (Premium+ only).

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product": {
        "id": "uuid",
        "sku": "COFFEE-001",
        "name": "Arabica Coffee",
        "current_quantity": 12.5
      },
      "supplier": {
        "id": "uuid",
        "name": "Coffee Inc"
      },
      "recommended_quantity": 50,
      "estimated_cost": 625.00,
      "urgency": "high", // "low", "medium", "high", "critical"
      "reasoning": "Current stock (12.5kg) will run out in 7 days based on average consumption of 1.8kg/day. Recommended order of 50kg will last approximately 28 days.",
      "confidence_score": 0.87,
      "order_by_date": "2026-01-24T00:00:00Z",
      "created_at": "2026-01-21T22:00:00Z"
    }
  ]
}
```

---

### POST /orders

Create new order.

**Request**:
```json
{
  "supplier_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 50,
      "unit_price": 12.50
    }
  ],
  "expected_delivery_date": "2026-01-28T00:00:00Z",
  "notes": "Urgent order"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "ORD-20260121-000001",
    "supplier": { ... },
    "status": "draft",
    "items": [ ... ],
    "total_amount": 625.00,
    "expected_delivery_date": "2026-01-28T00:00:00Z",
    "created_at": "2026-01-21T22:00:00Z"
  }
}
```

---

### POST /orders/:id/approve

Approve order (change status to approved).

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "approved_by": {
      "id": "uuid",
      "name": "John Doe"
    },
    "approved_at": "2026-01-21T22:05:00Z"
  }
}
```

---

### POST /orders/:id/send

Send order to supplier (change status to sent).

**Request**:
```json
{
  "send_email": true,
  "email_to": "supplier@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "sent",
    "sent_at": "2026-01-21T22:10:00Z"
  }
}
```

---

### POST /orders/:id/receive

Mark order as received and integrate stock.

**Request**:
```json
{
  "actual_delivery_date": "2026-01-27T14:00:00Z",
  "items_received": [
    {
      "product_id": "uuid",
      "quantity_received": 50
    }
  ],
  "notes": "All items received in good condition"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "received",
    "actual_delivery_date": "2026-01-27T14:00:00Z",
    "stock_updated": true
  }
}
```

---

## 6. Invoices Service (`/invoices`) - Premium Plus Only

### POST /invoices/upload

Upload invoice photo for OCR extraction.

**Request** (multipart/form-data):
```
file: invoice.jpg
order_id: uuid (optional)
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "uploaded",
    "photo_url": "https://storage.googleapis.com/...",
    "order_id": "uuid",
    "created_at": "2026-01-27T15:00:00Z"
  }
}
```

---

### POST /invoices/:id/extract

Trigger OCR extraction (automatic after upload).

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "extracting",
    "job_id": "uuid",
    "estimated_duration_seconds": 10
  }
}
```

---

### GET /invoices/:id

Get invoice with extracted data.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "extracted",
    "invoice_number": "INV-2026-001",
    "supplier": {
      "id": "uuid",
      "name": "Coffee Inc"
    },
    "invoice_date": "2026-01-27",
    "total_amount": 625.00,
    "photo_url": "https://...",
    "ocr_confidence_score": 0.92,
    "extracted_items": [
      {
        "product_name": "Arabica Coffee Beans",
        "matched_product_id": "uuid",
        "quantity": 50,
        "unit_price": 12.50,
        "total": 625.00,
        "confidence": 0.95
      }
    ],
    "created_at": "2026-01-27T15:00:00Z"
  }
}
```

---

### POST /invoices/:id/verify

Verify invoice against order.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "verified",
    "verification_result": {
      "matches": true,
      "discrepancies": [
        {
          "field": "unit_price",
          "expected": 12.50,
          "actual": 12.75,
          "difference": 0.25,
          "severity": "minor"
        }
      ]
    }
  }
}
```

---

### POST /invoices/:id/integrate

Integrate invoice data into stock (after verification).

**Request**:
```json
{
  "approve_discrepancies": true,
  "notes": "Price difference approved"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "integrated",
    "stock_movements_created": [
      {
        "product_id": "uuid",
        "quantity_change": 50,
        "movement_id": "uuid"
      }
    ],
    "integrated_at": "2026-01-27T15:30:00Z"
  }
}
```

---

### POST /invoices/:id/manual-entry

Manually enter invoice data if OCR fails.

**Request**:
```json
{
  "invoice_number": "INV-2026-001",
  "supplier_id": "uuid",
  "invoice_date": "2026-01-27",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 50,
      "unit_price": 12.50
    }
  ],
  "total_amount": 625.00
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "extracted",
    "source": "manual_entry"
  }
}
```

---

## 7. Formulas Service (`/formulas`)

### GET /formulas/predefined

Get list of predefined formulas (available to all users).

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Average Consumption",
      "description": "Calculate average daily consumption over last 30 days",
      "formula_expression": "AVG(VENTES_30J) / 30",
      "variables_used": ["VENTES_30J"],
      "example_result": "1.8 kg/day"
    },
    {
      "id": "uuid",
      "name": "Stock Safety",
      "description": "Calculate safety stock level",
      "formula_expression": "AVG(VENTES_30J) / 30 * DELAI_LIVRAISON * 1.5",
      "variables_used": ["VENTES_30J", "DELAI_LIVRAISON"]
    }
  ]
}
```

---

### POST /formulas

Create custom formula.

**Request**:
```json
{
  "name": "My Custom Formula",
  "description": "Calculate when to reorder",
  "formula_expression": "IF(STOCK_ACTUEL < VENTES_7J / 7 * 3, 'COMMANDER', 'OK')"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Custom Formula",
    "description": "Calculate when to reorder",
    "formula_type": "custom",
    "formula_expression": "IF(STOCK_ACTUEL < VENTES_7J / 7 * 3, 'COMMANDER', 'OK')",
    "variables_used": ["STOCK_ACTUEL", "VENTES_7J"],
    "is_valid": true,
    "created_at": "2026-01-21T22:00:00Z"
  }
}
```

**Errors**:
- `400 BAD_REQUEST`: Invalid formula syntax

---

### POST /formulas/evaluate

Evaluate formula for a product.

**Request**:
```json
{
  "formula_id": "uuid",
  "product_id": "uuid"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "formula_id": "uuid",
    "product_id": "uuid",
    "result": "COMMANDER",
    "variables_values": {
      "STOCK_ACTUEL": 10,
      "VENTES_7J": 35
    },
    "execution_time_ms": 5
  }
}
```

---

## 8. Locations Service (`/locations`)

### GET /locations

List all locations.

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Main Warehouse",
      "address": "123 Rue de Paris, 75001 Paris",
      "location_type": "warehouse",
      "is_active": true,
      "product_count": 45,
      "total_value": 12500.00,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /locations

Create new location.

**Request**:
```json
{
  "name": "Store Paris 15",
  "address": "456 Avenue Victor Hugo, 75015 Paris",
  "location_type": "store"
}
```

**Response** (201 Created)

---

## 9. Suppliers Service (`/suppliers`)

### GET /suppliers

List all suppliers.

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Coffee Inc",
      "contact_name": "Jean Dupont",
      "email": "contact@coffeeinc.com",
      "phone": "+33 1 23 45 67 89",
      "address": "789 Rue du Commerce, 75008 Paris",
      "is_active": true,
      "product_count": 12,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /suppliers

Create new supplier.

**Request**:
```json
{
  "name": "New Supplier",
  "contact_name": "Marie Martin",
  "email": "contact@newsupplier.com",
  "phone": "+33 1 98 76 54 32",
  "address": "123 Boulevard Haussmann, 75009 Paris"
}
```

**Response** (201 Created)

---

## 10. Dashboard Service (`/dashboard`)

### GET /dashboard/summary

Get dashboard summary data.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "sales_yesterday": {
      "total_amount": 1250.00,
      "transaction_count": 45,
      "change_percent": 12.5
    },
    "current_stock": {
      "total_value": 25000.00,
      "product_count": 45,
      "low_stock_count": 5,
      "critical_stock_count": 2
    },
    "alerts": [
      {
        "type": "low_stock",
        "severity": "high",
        "product": {
          "id": "uuid",
          "name": "Arabica Coffee"
        },
        "message": "Stock will run out in 7 days",
        "created_at": "2026-01-21T22:00:00Z"
      }
    ],
    "pending_orders": 3,
    "pending_invoices": 1
  }
}
```

---

## 11. Subscriptions Service (`/subscriptions`)

### GET /subscriptions/current

Get current subscription details.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tier": "premium",
    "status": "active",
    "started_at": "2026-01-01T00:00:00Z",
    "current_period_start": "2026-01-01T00:00:00Z",
    "current_period_end": "2026-02-01T00:00:00Z",
    "price_monthly": 150.00,
    "features": {
      "ai_predictions": true,
      "smart_orders": true,
      "photo_invoice": false,
      "auto_orders": false,
      "history_days": 90
    }
  }
}
```

---

### POST /subscriptions/upgrade

Upgrade subscription tier.

**Request**:
```json
{
  "new_tier": "premium_plus"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "subscription_id": "uuid",
    "old_tier": "premium",
    "new_tier": "premium_plus",
    "effective_date": "2026-01-21T22:00:00Z",
    "prorated_amount": 50.00
  }
}
```

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions or subscription tier |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists (duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Webhooks (V2 Feature)

Future webhook support for:
- Order status changes
- Stock alerts
- Prediction updates
- Invoice processing complete

---

*API Specifications by Winston (Architect) - 2026-01-21*  
*Based on FlowStock PRD v1.2*

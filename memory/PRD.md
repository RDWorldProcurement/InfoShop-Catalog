# InfoShop Digital Catalog - Product Requirements Document

## Project Overview
InfoShop is a B2B digital catalog application for Danone, powered by Infosys BPM. It consolidates supplier catalogs from multiple partners into a single unified platform with transparent Danone Preferred Pricing.

## Primary Goals
1. **Catalog Consolidation**: Aggregate products from Grainger, MOTION, and future partners
2. **Transparent Pricing**: Show Danone Preferred Pricing with clear savings vs. supplier list prices
3. **Enterprise Integration**: Coupa PunchOut enabled for seamless procurement workflows
4. **AI-Powered Features**: UNSPSC classification, InfoShop Part Number generation

## What's Been Implemented (Feb 2026)

### ✅ Core Features - COMPLETE

#### Landing Page (InfoShopLandingPage.jsx)
- Hero section with tagline: "You Deal with One, We Deal with Many"
- Interactive animation: 12 supplier file documents dropping into InfoShop folder
- Stats section: 26+ partners, 3M+ products, 4 global regions
- Trust badges: Enterprise Security, Coupa PunchOut, 15-25% Savings
- Infosys BPM and OMNISupply branding

#### Product Catalog (InfoShopCatalog.jsx)
- **2,000 products indexed** (1,000 Grainger + 1,000 MOTION)
- Product cards display:
  - Brand and product name
  - InfoShop Part Number (copyable)
  - Manufacturer Part Number
  - Partner SKU
  - UNSPSC code
  - Category badge
  - UOM and MoQ
  - Stock availability
  - **Danone Preferred Price** (prominent)
  - List Price (strikethrough)
  - **Savings badge** (green, e.g., "SAVE 18.7% vs. Supplier List Price")
- Search functionality (real-time)
- Filter by partner (Grainger/MOTION)
- Sort by relevance, price

#### Pricing Engine (infoshop_service.py)
- **Category-based discounts**:
  - Grainger: 18-25% by category (machining, safety, electrical, etc.)
  - MOTION: Per-product discounts from supplier data, or 20-25% default
- **Sliding gross margin**: 5.92% - 9.2% based on item price
- Formula: `Danone Price = List Price × (1 - Discount%) × (1 + Margin%)`
- Average customer savings: ~17% vs supplier list price

#### InfoShop Part Number Generation
- Format: `INF` + Vendor(2) + Category(3) + Random(5)
- Example: `INFGRBEA12345` (Grainger, Bearings)
- Unique, non-duplicating across all products

#### Cart & Checkout Flow
- Add to cart functionality
- Cart sidebar with quantity adjustment
- Checkout flow with shipping info collection:
  - Shipping address
  - Delivery attention
  - Required delivery date (2-week minimum lead time)

### ✅ Backend APIs - COMPLETE

| Endpoint | Description |
|----------|-------------|
| POST /api/algolia/catalog/search | Product search with filters |
| GET /api/algolia/catalog/public-stats | Catalog statistics |
| GET /api/infoshop/partners | Active and coming-soon partners |
| POST /api/infoshop/pricing/calculate | Calculate Danone price |
| GET /api/infoshop/delivery/minimum-date | Minimum delivery date |
| POST /api/infoshop/cart/prepare-transfer | Prepare cart for Coupa |

### ✅ Third-Party Integrations

| Service | Status |
|---------|--------|
| Algolia | ✅ LIVE - 2000 products indexed |
| Coupa PunchOut | ✅ Backend ready |
| Framer Motion | ✅ Animation library |

## Data Architecture

### Algolia Index: omnisupply_products
```json
{
  "objectID": "infoshop_grainger_SKU_hash",
  "product_name": "...",
  "brand": "...",
  "infoshop_part_number": "INFGRBEA12345",
  "mfg_part_number": "...",
  "partner_part_number": "SKU",
  "vendor": "Grainger",
  "category": "Indexable Cutting Tools",
  "unspsc_code": "23171618",
  "list_price": 19.99,
  "category_discount_percent": 24.0,
  "danone_preferred_price": 16.55,
  "customer_savings_percent": 17.2,
  "primary_image": "https://...",
  "has_image": 1,
  "in_stock": true
}
```

### Pricing Example
- **List Price**: $19.99
- **Category Discount**: 24%
- **Infosys Purchase Price**: $15.19
- **Gross Margin**: 9.0%
- **Danone Preferred Price**: $16.55
- **Customer Savings**: 17.2%

## File Structure
```
/app/
├── backend/
│   ├── server.py              # FastAPI main app
│   ├── infoshop_service.py    # Pricing & transformation logic
│   ├── algolia_service.py     # Algolia search service
│   ├── punchout_service.py    # Coupa cXML integration
│   └── reindex_infoshop.py    # Product indexing script
├── frontend/
│   └── src/
│       ├── App.js
│       └── pages/
│           ├── InfoShopLandingPage.jsx
│           └── InfoShopCatalog.jsx
```

## Outstanding Tasks

### P0 - Critical
- [ ] Scale to 2-3 million products (chunked processing, background tasks)

### P1 - High Priority
- [ ] Deploy to Vercel/production (infoshop.omnisupply.io)
- [ ] Complete checkout flow with Coupa PunchOut transfer
- [ ] "Coming Soon" partners dropdown UI

### P2 - Future
- [ ] Vendor Onboarding Agent
- [ ] Negotiation Agent (Phase 2)
- [ ] Contract Agent
- [ ] Spend Analytics Dashboard
- [ ] Approval Workflows

## Testing Status
- **Backend**: 15/15 tests passed (100%)
- **Frontend**: All UI elements verified
- **Pricing**: Savings range 14.8% - 26.2%
- **Test Report**: /app/test_reports/iteration_27.json

## Last Updated
February 1, 2026

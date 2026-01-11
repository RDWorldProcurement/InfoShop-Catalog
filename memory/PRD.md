# OMNISupply.io - Product Requirements Document

## Original Problem Statement
Build an enterprise-grade e-commerce platform called OMNISupply.io for Infosys Limited customers, offering 30M+ Industrial MRO Products, OEM Spare Parts, and 100K+ Professional Services with Infosys Preferred Pricing.

## User Personas
1. **Procurement Teams** - Searching and ordering MRO products in bulk
2. **Facility Managers** - Ordering maintenance services and supplies
3. **IT Teams** - Procuring IT equipment and services
4. **Operations Staff** - Day-to-day ordering of consumables and spare parts

## Core Requirements
1. Landing Page with Products AND Services prominence
2. Login with demo credentials and country selection for multi-currency
3. eCatalog with Products (30M+) and Services (100K+) search
4. UNSPSC codes displayed on all products and services
5. Cart with PunchOut transfer (Coupa, SAP Ariba, SAP ERP, Ivalua, Oracle)
6. Sponsored products/services (subtle promotion)
7. Brand logos and category icons
8. Order Management with Quotations/RFQs with different statuses
9. **Multi-language support** (EN, FR, DE, IT, NL)

## What's Been Implemented

### Phase 1 - MVP (Completed)
- [x] Landing page with hero, stats, categories, brands
- [x] JWT Authentication with demo login
- [x] Product/Service catalog with 70/20/10% distribution
- [x] Order history, repeat orders, bulk upload pages
- [x] InfoCoins rewards program
- [x] InfoConnect AI chatbot (GPT-5.2)

### Phase 2 - Enhancements (Completed)
- [x] **Infosys BPM Logo** on all screens (header, sidebar, footer)
- [x] **UNSPSC Codes** displayed on all products and services
- [x] **Shopping Cart** functionality with add/remove items
- [x] **PunchOut Transfer** to Coupa, SAP Ariba, SAP ERP, Ivalua, Oracle
- [x] **"Pending Customer PO"** status after cart transfer
- [x] **Sponsored Items** - 10% of results marked with subtle amber badge
- [x] **Brand Logos** in filters and product cards
- [x] **Enhanced Order History** with tabs:
  - Orders tab with status tracking
  - PunchOut Transfers tab showing transferred carts
  - Quotations tab with pending/received responses
  - RFQs tab with pending/received responses
- [x] **Add to Cart from Quotations** when response received
- [x] **Cancel Quotation** with reason/comments
- [x] **Services Catalog** prominently featured on landing page

### Phase 3 - UI/UX Redesign & i18n (Completed - January 11, 2025)
- [x] **Infosys BPM-inspired design** - Clean white surfaces, blue accents (#007CC3)
- [x] **Multi-language support** (EN, FR, DE, IT, NL) with LanguageContext
- [x] **Language switcher** in landing page header and sidebar
- [x] **Translated UI elements**:
  - Navigation labels (Catalog, Orders, Repeat Orders, Bulk Upload, Rewards)
  - Product/Service search placeholders
  - Filter dropdowns (All Categories, All Brands)
  - Buttons (Add to Cart, Check Stock, Get Quote, Submit RFQ)
  - Cart drawer (Shopping Cart, Total, Transfer Cart)
  - Order History tabs (Orders, PunchOut Transfers, Quotations, RFQs)
- [x] **Product cards** with realistic images, UNSPSC codes, pricing, lead times
- [x] **Service cards** with category badges, pricing models, supplier info

## Technology Stack
- **Backend**: FastAPI, MongoDB, JWT, emergentintegrations
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **AI**: GPT-5.2 via Emergent LLM Key
- **Branding**: Infosys BPM colors (#007CC3, #FF6B00)
- **i18n**: React Context with translations.js

## API Endpoints
- POST /api/auth/login - Login with country selection
- GET /api/auth/me - Get current user
- GET /api/products/search - Products with UNSPSC codes
- GET /api/products/categories - Product categories
- GET /api/products/brands - Product brands
- GET /api/products/{id}/inventory - Check inventory
- GET /api/services/search - Services with UNSPSC codes
- GET /api/services/categories - Service categories
- GET /api/cart - Get cart items
- POST /api/cart/add - Add item to cart
- DELETE /api/cart/remove/{id} - Remove from cart
- POST /api/cart/transfer - PunchOut transfer to ERP
- GET /api/cart/transfers - List cart transfers
- GET /api/punchout/systems - Available PunchOut systems
- POST /api/rfq/submit - Submit RFQ
- GET /api/rfq/list - List RFQs
- POST /api/quotation/request - Request quotation
- GET /api/quotation/list - List quotations
- POST /api/quotation/{id}/respond - Accept/cancel quotation
- POST /api/orders/create - Create order
- GET /api/orders/history - Order history
- GET /api/infocoins/balance - InfoCoins balance
- GET /api/infocoins/rewards - Available rewards
- POST /api/infocoins/redeem/{id} - Redeem reward
- POST /api/chat/message - Chat with AI assistant
- GET /api/chat/history - Chat history
- GET /api/stats - Platform stats

## Test Credentials
- **Email**: demo@infosys.com
- **Password**: demo123
- **Country**: USA (or any from the list)

## Prioritized Backlog

### P1 (High Priority)
- [ ] Schedule Repeat Orders backend logic
- [ ] Bulk Submission Excel upload processing
- [ ] InfoCoins redemption with actual gift catalog
- [ ] Add icons/logos for brand names and category names

### P2 (Medium Priority)
- [ ] Product detail page with full specifications
- [ ] Order tracking with timeline/status updates
- [ ] Email notifications for RFQs/quotations
- [ ] User profile management
- [ ] Product favorites/wishlist

### P3 (Low Priority)
- [ ] Advanced search with multiple filters
- [ ] Export reports (PDF/Excel)
- [ ] Dashboard with analytics
- [ ] Mobile responsive optimization
- [ ] Enhanced chatbot with product knowledge

## MOCKED Features
- **PunchOut Transfer**: Simulates transfer to ERP systems (Coupa, SAP Ariba, etc.) - creates transfer record with "Pending Customer PO" status but doesn't actually connect to real ERPs.

## Test Results (January 11, 2025)
- Backend: 24/24 tests passed (100%)
- Frontend: All features working (100%)
- Multi-language switching: Working for all 5 languages
- All Phase 1, 2, and 3 features verified

## File Structure
```
/app/
├── backend/
│   ├── server.py         # FastAPI app with all API logic
│   ├── .env
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   └── ChatBot.jsx
│   │   ├── i18n/
│   │   │   ├── LanguageContext.js
│   │   │   └── translations.js
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── CatalogPage.jsx
│   │   │   ├── OrderHistoryPage.jsx
│   │   │   ├── RepeatOrdersPage.jsx
│   │   │   ├── BulkUploadPage.jsx
│   │   │   └── InfoCoinsPage.jsx
│   │   ├── App.js
│   │   └── App.css
│   ├── .env
│   └── package.json
├── tests/
│   └── test_omnisupply_api.py
└── memory/
    └── PRD.md
```

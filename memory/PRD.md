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

## What's Been Implemented (January 11, 2025)

### Phase 1 - MVP
- [x] Landing page with hero, stats, categories, brands
- [x] JWT Authentication with demo login
- [x] Product/Service catalog with 70/20/10% distribution
- [x] Order history, repeat orders, bulk upload
- [x] InfoCoins rewards program
- [x] InfoConnect AI chatbot (GPT-5.2)

### Phase 2 - Enhancements
- [x] **Infosys BPM Logo** on all screens (header, sidebar, footer)
- [x] **UNSPSC Codes** displayed on all products and services
- [x] **Shopping Cart** functionality with add/remove items
- [x] **PunchOut Transfer** to Coupa, SAP Ariba, SAP ERP, Ivalua, Oracle
- [x] **"Pending Customer PO"** status after cart transfer
- [x] **Sponsored Items** - 10% of results marked with subtle amber badge
- [x] **Brand Logos** in filters and product cards
- [x] **Bento Grid Layout** highlighting both Products AND Services equally
- [x] **Enhanced Order History** with tabs:
  - Orders tab with status tracking
  - PunchOut Transfers tab showing transferred carts
  - Quotations tab with pending/received responses
  - RFQs tab with pending/received responses
- [x] **Add to Cart from Quotations** when response received
- [x] **Cancel Quotation** with reason/comments
- [x] **Services Catalog** prominently featured on landing page

### API Endpoints
- POST /api/auth/login - Login with country selection
- GET /api/products/search - Products with UNSPSC codes
- GET /api/services/search - Services with UNSPSC codes
- GET /api/cart - Get cart items
- POST /api/cart/add - Add item to cart
- DELETE /api/cart/remove/{id} - Remove from cart
- POST /api/cart/transfer - PunchOut transfer to ERP
- GET /api/cart/transfers - List cart transfers
- GET /api/punchout/systems - Available PunchOut systems
- GET /api/quotation/list - List quotations with statuses
- POST /api/quotation/{id}/respond - Accept or cancel quotation
- GET /api/rfq/list - List RFQs with statuses

## Technology Stack
- **Backend**: FastAPI, MongoDB, JWT, emergentintegrations
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **AI**: GPT-5.2 via Emergent LLM Key
- **Branding**: Infosys BPM colors (#007CC3, #FF6B00)

## Prioritized Backlog

### P1 (Next Phase)
- [ ] Product detail page with full specifications
- [ ] Order tracking with timeline/status updates
- [ ] Email notifications for RFQs/quotations
- [ ] User profile management
- [ ] Product favorites/wishlist

### P2 (Future)
- [ ] Advanced search with multiple filters
- [ ] Export reports (PDF/Excel)
- [ ] Dashboard with analytics
- [ ] Multi-language support
- [ ] Mobile responsive optimization

## Next Tasks
1. Add product detail modal with full specs
2. Implement order tracking timeline
3. Add email notifications
4. Enhance chatbot with product knowledge

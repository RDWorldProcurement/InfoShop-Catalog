# OMNISupply.io - Product Requirements Document

## Original Problem Statement
Build an enterprise-grade e-commerce platform called OMNISupply.io for Infosys Limited customers, offering 30M+ Industrial MRO Products, OEM Spare Parts, and 100K+ Rate Card Enabled Services with Infosys Preferred Pricing based on global spend aggregation.

## User Personas
1. **Procurement Teams** - Searching and ordering MRO products in bulk
2. **Facility Managers** - Ordering maintenance services and supplies
3. **IT Teams** - Procuring IT equipment and services
4. **Operations Staff** - Day-to-day ordering of consumables and spare parts

## Core Requirements
1. Landing Page with platform overview, categories, brands, services, and ERP integrations
2. Login with demo credentials and country selection for multi-currency support
3. eCatalog with Products (3M+) and Services (100K+) search
4. Product distribution: 70% with delivery partners, 20% quotation required, 10% RFQ
5. Service distribution: 40% with supplier, 10% quotation, 50% RFQ
6. Order History, Repeat Orders (weekly/monthly/quarterly), Bulk Upload
7. InfoCoins rewards program
8. InfoConnect AI Chatbot

## What's Been Implemented (January 11, 2025)
### Backend (FastAPI + MongoDB)
- [x] JWT Authentication with demo login
- [x] Multi-country currency support (15 countries)
- [x] Product search API with 70/20/10% distribution logic
- [x] Service search API with 40/10/50% distribution logic
- [x] Delivery partners with price/lead-time inverse relationship
- [x] Alternate product suggestions
- [x] Real-time inventory check API
- [x] RFQ submission system
- [x] Quotation request system
- [x] Order history management
- [x] Repeat order scheduling
- [x] Bulk upload with Excel processing
- [x] InfoCoins rewards and redemption
- [x] InfoConnect chatbot with GPT-5.2 (Emergent LLM Key)
- [x] Platform statistics API

### Frontend (React + Shadcn UI)
- [x] Landing page with Infosys BPM branding
- [x] Login page with demo credentials display
- [x] Catalog page with product/service tabs
- [x] Product cards with delivery partners, alternates
- [x] RFQ and Quotation modals
- [x] Order History page
- [x] Repeat Orders management page
- [x] Bulk Upload with drag-drop
- [x] InfoCoins rewards redemption page
- [x] ChatBot widget (toggleable)
- [x] Responsive sidebar navigation

## Technology Stack
- **Backend**: FastAPI, MongoDB, JWT, emergentintegrations
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **AI**: GPT-5.2 via Emergent LLM Key
- **Data**: Mock MRO products (35 categories, 54 brands)

## Prioritized Backlog

### P0 (Must Have - Done)
- [x] Core product/service catalog
- [x] Authentication flow
- [x] Search and filtering

### P1 (High Priority - For Next Phase)
- [ ] Add to cart functionality
- [ ] Checkout flow with order confirmation
- [ ] Email notifications for RFQs and orders
- [ ] User profile management
- [ ] Product favorites/wishlist

### P2 (Medium Priority)
- [ ] Advanced search with filters
- [ ] Price comparison across partners
- [ ] Order tracking with timeline
- [ ] Dashboard with analytics
- [ ] Export reports (PDF/Excel)

### P3 (Nice to Have)
- [ ] PunchOut catalog integration
- [ ] ERP system connectors
- [ ] Mobile responsive optimization
- [ ] Multi-language support
- [ ] Advanced chatbot training

## Next Tasks
1. Implement cart and checkout flow
2. Add order status tracking
3. Integrate email notifications
4. Enhance chatbot with product-specific knowledge
5. Add product image gallery in detail view

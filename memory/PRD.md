# OMNISupply.io - Product Requirements Document

## Original Problem Statement
Build an enterprise-grade unified procurement platform called OMNISupply.io for Infosys Limited customers, combining:
1. **Product & Service Catalogs** - 30M+ Industrial MRO Products and 100K+ Professional Services
2. **AI-Powered Quotation Analysis** - Upload quotations for AI extraction, price benchmarking, and tax verification
3. **End-to-End Sourcing Support** - Full procurement services handled by Infosys specialists

## What's Been Implemented

### ✅ Phase 11 - Unified Platform Merge (January 15, 2026 - COMPLETED)
**Landing Page Redesign:**
- New hero section with 3 procurement options (Browse Catalog, Upload Quotation, Sourcing Support)
- Stats bar: $2B+ Annual Spend, 500+ Clients, 35% Savings, 8 Languages
- AI-Powered Procurement Intelligence section (4 feature cards)
- Multi-Language Document Support banner (8 languages)
- How It Works process (4 steps)
- Flexible Payment Options (Infosys Limited, ProPay, Customer Direct)
- ERP Integrations section (Coupa, SAP Ariba, SAP ERP, Ivalua, Oracle)

**Upload Quotation Feature (NEW):**
- Drag & drop file upload (PDF, Images, Excel, Word)
- Supplier info capture (name, email)
- 8 language support for document processing
- AI-powered analysis results:
  - Data extraction with confidence score
  - Line item parsing with UNSPSC codes
  - Price benchmarking vs market average
  - Tax verification with Avalara status
  - Flags for above-market pricing
  - Recommendations for negotiation
- Actions: Add to Cart, Request Negotiation Support

**End-to-End Sourcing Support (NEW):**
- Request form: Title, Category, Description, Tech Specs
- Budget & Quantity fields with currency selection
- Delivery location and required-by date
- Preferred suppliers input
- Payment model selection (3 options)
- Urgency levels: Standard (5-7 days), Urgent (2-3 days), Critical (24-48 hrs)
- Request history with status tracking
- Assigned specialist display

**Backend APIs (NEW):**
- POST /api/procurement/quotation/upload - File upload with AI analysis
- GET /api/procurement/quotation/history - User's quotation history
- GET /api/procurement/quotation/{id} - Quotation details
- POST /api/procurement/quotation/{id}/escalate - Request negotiation
- POST /api/procurement/quotation/{id}/add-to-cart - Add items to cart
- POST /api/procurement/sourcing/request - Submit sourcing request
- GET /api/procurement/sourcing/history - User's sourcing history
- GET /api/procurement/sourcing/{id} - Sourcing request details
- POST /api/procurement/sourcing/{id}/cancel - Cancel request
- GET /api/user/profile - User profile with activity summary
- GET /api/procurement/dashboard - Procurement dashboard stats

**MongoDB Collections (NEW):**
- quotation_uploads - Stores uploaded quotations and AI analysis
- sourcing_requests - Stores E2E sourcing requests
- activity_logs - User activity tracking

**Updated Sidebar:**
- Organized sections: Catalog, Procurement, Orders, Rewards
- "Upload Quotation" with AI badge
- "Sourcing Support" with E2E badge

### Previous Phases (Completed)
- Phase 10: Category Icons & Product Comparison
- Phase 9: Watch Demo Feature
- Phase 8: UI Polish & New Vendor Products (Donaldson, Avantor, Markem-Imaje)
- Phase 7: Deep Language Translation (Emergent LLM)
- Phase 6: Admin Portal & Updated Stats
- Phase 5: Extended Catalog & 5-Stage Order Tracking

## Technology Stack
- **Backend**: FastAPI, MongoDB (motor), JWT, Emergent LLM
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Images**: Emergent CDN
- **Branding**: Infosys BPM (#007CC3, #FF6B00, #FF9900)
- **File Processing**: Simulated AI extraction (production-ready structure)
- **i18n**: Real-time LLM translation + 8-language document support

## Test Credentials
- **Demo User**: demo@infosys.com / demo123
- **Admin User**: admin@omnisupply.io / admin123

## Key API Endpoints
### Authentication
- POST /api/auth/login - User authentication

### Catalog
- GET /api/products/search - Product search with translation
- GET /api/services/search - Service search with translation
- GET /api/products/categories - 32 categories
- GET /api/products/brands - 33 brands

### Procurement (NEW)
- POST /api/procurement/quotation/upload - Upload & analyze quotation
- GET /api/procurement/quotation/history - Quotation history
- POST /api/procurement/sourcing/request - Submit sourcing request
- GET /api/procurement/sourcing/history - Sourcing history
- GET /api/procurement/dashboard - Dashboard stats

### Orders & Cart
- POST /api/cart/add - Add to cart
- GET /api/orders - Order history
- POST /api/rfq/submit - Submit RFQ

### Admin
- POST /api/admin/login - Admin authentication
- POST /api/admin/upload-catalog - Vendor catalog upload

## Prioritized Backlog

### P1 (High Priority)
- [ ] Real AI/ML document extraction integration
- [ ] Schedule Repeat Orders backend logic
- [ ] Bulk Submission via Excel upload

### P2 (Medium Priority)
- [ ] Enhance InfoConnect chatbot with LLM
- [ ] Real vendor API integration (Grainger)
- [ ] Email notifications for sourcing updates

### P3 (Low Priority)
- [ ] Advanced analytics dashboard
- [ ] Supplier rating system
- [ ] Audit trail export

## MOCKED Features
- **AI Document Extraction**: Generates realistic but simulated extraction results
- **Price Benchmarking**: Simulated market price comparison
- **Tax Verification**: Simulated Avalara integration
- **Sourcing Specialist Assignment**: Auto-assigned for demo
- **PunchOut Transfer**: Simulates ERP transfer

## 3rd Party Integrations
- **Emergent LLM** - Deep language translation
- **Avalara** (Mocked) - Tax verification
- **ERP Systems** (Mocked) - PunchOut support for Coupa, SAP Ariba, etc.

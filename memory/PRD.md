# OMNISupply.io - Product Requirements Document

## Original Problem Statement
Build an enterprise-grade unified procurement platform called OMNISupply.io for Infosys Limited customers, combining:
1. **Product & Service Catalogs** - 30M+ Industrial MRO Products and 100K+ Professional Services
2. **AI-Powered Quotation Analysis** - Upload quotations for AI extraction, price benchmarking, and tax verification
3. **End-to-End Sourcing Support** - Full procurement services handled by Infosys specialists
4. **Advanced AI Procurement Agent** - Conversational AI interface for intelligent procurement routing

## What's Been Implemented

### ✅ Phase 18.3 - Real AI Quotation Analysis Timeout Fix (January 24, 2026 - COMPLETED)
**Critical Bug Fix: Real AI Analysis Was Timing Out**

**Root Cause Analysis:**
- Backend Real AI Analysis was working correctly (confirmed with curl test: 2min 19sec, returned 200 OK)
- Frontend axios timeout was too short (2-3 minutes) for the ~2.5 minute processing time
- Kubernetes proxy was terminating long-running requests

**Fixes Applied:**
1. **Frontend Timeout Increased to 5 Minutes:**
   - `/app/frontend/src/pages/AIProcurementAgentPage.jsx` - axios timeout: 300000ms
   - `/app/frontend/src/pages/UploadQuotationPage.jsx` - axios timeout: 300000ms

2. **Supplier Name Made Optional in AI Agent:**
   - Removed validation requirement for supplier name
   - Updated label to show "(optional)"
   - Updated button disabled logic to only require file selection

3. **DB Query Optimization:**
   - Replaced `.to_list(10000)` with MongoDB aggregation in `/admin/catalog-summary`
   - Uses `$group` pipeline for efficient counting by delivery partner

4. **Real-time % Progress Indicator (January 24, 2026):**
   - Added `analysisPercentage` state for tracking progress 0-100%
   - Large progress bar showing overall completion percentage
   - Individual progress bars for each AI engine (GPT-5.2, Claude, Gemini)
   - Shows descriptive text for each engine's task
   - Simulated timing based on actual ~2.5 minute processing:
     - Phase 1: GPT (0-35%) - Data extraction
     - Phase 2: Claude (35-70%) - Price benchmarking
     - Phase 3: Gemini (70-100%) - Cross-validation

5. **"Upload Quotation for Analysis" Button Fix:**
   - Added `openQuotationUpload()` function with scroll-to-view
   - Uses `quotationUploadRef` to scroll smoothly to upload section
   - Works from both "Recommended Next Steps" and "Manual Options"

**Files Modified:**
- `/app/frontend/src/pages/AIProcurementAgentPage.jsx` - handleQuotationUpload function, timeout, optional fields, progress indicator
- `/app/frontend/src/pages/UploadQuotationPage.jsx` - axios timeout
- `/app/backend/server.py` - catalog-summary endpoint refactored

**Test Results:**
- Backend: 100% (6/6 tests passed)
- Frontend: 100% (verified all UI changes)
- Report: `/app/test_reports/iteration_18.json`

### ✅ Phase 18 - Advanced AI-Driven Procurement Handling (January 24, 2026 - COMPLETED)
**Major Feature: AI Procurement Agent - Conversational Entry Point**

**New AI Procurement Agent Page (/ai-agent):**
- Conversational chat interface with natural language understanding
- Powered by 3 LLMs working in concert: GPT-5.2, Claude Sonnet 4.5, Gemini 3 Flash
- Intelligent routing to one of three workflows:
  1. **CATALOG_SEARCH**: When user wants to find products/services → Shows matching products with Add to Cart
  2. **QUOTATION_ANALYSIS**: When user has a supplier quote → Guides to Upload Quotation page
  3. **MANAGED_SERVICES**: For strategic/complex sourcing → Routes to Buying Desk with UNSPSC suggestion
- Quick action buttons: Find a Product, Find a Service, I have a Quotation, Complex/Strategic Sourcing
- Real-time LLM indicator badges (GPT-5.2, Claude, Gemini)
- Currency display at bottom (USD/EUR/MXN based on user's country)

**Landing Page Update - 4 Options Layout:**
- Featured AI Procurement Agent card at top with gradient styling
- "NEW" badge and "GPT-5.2 + Claude + Gemini" badge
- Three regular option cards below:
  1. Browse Catalog (PunchOut Enabled)
  2. AI Enabled Intelligent Buying (Upload Quotation)
  3. Managed Services (Buying Desk)

**Sidebar Navigation Update:**
- Added "AI Procurement Agent" with "NEW" badge (purple gradient)
- Positioned at top of Procurement section

**Backend Endpoint Added:**
- `POST /api/ai-agent/conversation` - Main conversational endpoint
  - Accepts: message, session_id, context, language, currency
  - Returns: message, engines_used, action, products, services, context, unspsc_suggestion
  - Intent classification using LLM with keyword-based fallback
  - Product/service search integration
  - Conversation storage in MongoDB for analytics

**Files Created/Modified:**
- `/app/frontend/src/pages/AIProcurementAgentPage.jsx` - Full conversational UI
- `/app/frontend/src/pages/LandingPage.jsx` - Updated to 4-option layout with featured AI card
- `/app/frontend/src/components/Sidebar.jsx` - Added AI Procurement Agent nav item
- `/app/frontend/src/App.js` - Added /ai-agent route
- `/app/backend/server.py` - Added AI agent conversation endpoint (lines 4515-4800)

**Test Results:**
- Backend: 100% (12/12 tests passed)
- Frontend: All features working correctly
- Test file: `/app/backend/tests/test_ai_agent.py`
- Report: `/app/test_reports/iteration_14.json`

**Catalog Search Enhancements (January 24, 2026):**
- Enhanced `search_catalog_for_agent()` to search BOTH in-memory catalogs AND MongoDB `vendor_products` collection
- Implemented match scoring algorithm for relevance ranking:
  - Exact phrase match in name: +100 points
  - SKU/Part number match: +90 points
  - Brand match: +80 points
  - Individual term matches: +10-35 points per term
- Added MongoDB text indexes at startup for fast search on large catalogs:
  - `vendor_products`: name, brand, category, description, sku (text index)
  - `vendor_services`: name, category, description (text index)
- Search results now include `match_score` and `source` fields (catalog vs vendor_catalog)
- Verified admin catalog upload (`POST /api/admin/upload-catalog`) works with CSV/Excel files
- Fixed vendor product scoring to match in-memory product scoring (SKU, brand, category matching)

**⚠️ IMPORTANT: Catalog Scale Readiness**
- User will be adding large number of products next week
- MongoDB indexes are in place for performance
- Search accuracy is critical - uses multi-field matching with scoring
- SKU/Part number searches have highest priority (90 points)
- All catalog search tests passed (15/15)

### ✅ Phase 18.1 - Dynamic Currency Mapping (January 24, 2026 - COMPLETED)
**Multi-Currency Support Based on Language Selection:**
- Added 7 language options with associated currencies:
  - English (en) → USD ($)
  - Français (fr) → EUR (€)
  - Deutsch (de) → EUR (€)
  - Italiano (it) → EUR (€)
  - Nederlands (nl) → EUR (€)
  - Español (España) (es-ES) → EUR (€)
  - Español (México) (es-MX) → MXN (MX$)
- Currency automatically updates when language is changed
- Added full Spanish translations for Spain and Mexico variants
- Sidebar shows "Language & Currency" section with currency display
- Catalog header shows current currency
- Currency persists in localStorage across navigation and page refresh

**Files Modified:**
- `/app/frontend/src/i18n/LanguageContext.js` - Added LANGUAGE_CURRENCY_MAP, useMemo for currency derivation, formatPrice helper
- `/app/frontend/src/i18n/translations.js` - Added es-ES and es-MX translations with all UI strings
- `/app/frontend/src/components/Sidebar.jsx` - Updated language selector to show currency codes and display
- `/app/frontend/src/pages/CatalogPage.jsx` - Uses dynamic currency from LanguageContext

**Test Results:**
- Frontend: 100% (16/16 tests passed)
- Report: `/app/test_reports/iteration_16.json`

### ✅ Phase 18.2 - Intelligent AI Agent Business Logic (January 24, 2026 - COMPLETED)
**Smart Detection and User Guidance:**

**Problem Solved:**
- Previously, searching for "blue bike with red dots" would return random products
- Now the AI intelligently recognizes this is NOT in the catalog and guides users appropriately

**New Intelligent Features:**
1. **is_likely_not_in_catalog()** function detects:
   - Consumer items (bike, bicycle, furniture, clothing, food, etc.)
   - Color + unusual pattern combinations (blue with red dots)
   - Items outside standard industrial/IT procurement

2. **assess_requirement_complexity()** function detects:
   - Complex requirements (multiple, specialized, custom)
   - Installation/integration needs
   - Bulk/volume requirements
   - Long-term/contract needs

3. **Smart Response Flow:**
   - If NOT_IN_CATALOG → Shows intelligent message + two action buttons
   - If COMPLEX → Suggests Managed Services with UNSPSC classification
   - If FOUND → Shows products with match scores
   - If LOW_RELEVANCE → Shows products + offers alternatives

4. **"Recommended Next Steps" UI Box:**
   - Purple button: "Upload Quotation for Analysis" → `/upload-quotation`
   - Orange button: "Request Buying Desk Support" → `/sourcing-support`
   - Shows intelligent_guidance reason

**API Response Enhancements:**
- `show_quotation_upload`: boolean
- `show_managed_services`: boolean  
- `intelligent_guidance`: {reason, recommended_paths, confidence}

**Test Results:**
- Backend: 100% (16/16 tests passed)
- Frontend: 100% (10/10 tests passed)
- Report: `/app/test_reports/iteration_17.json`

### ✅ Phase 17 - Advanced AI Price Benchmarking with 3 LLMs (January 2026 - COMPLETED)
**Major Feature: AI Enabled Intelligent Buying with 3 AI Engines**

**Naming Updates:**
- Renamed "One-Off Purchases" to "AI Enabled Intelligent Buying" across all pages
- Added AI-themed tags to all 3 landing page cards:
  - Browse Catalog: "PunchOut Enabled Catalog" tag (blue, cart icon)
  - AI Enabled Intelligent Buying: "Infosys AI Enabled Intelligent Buying" tag (purple, brain icon)
  - Managed Services: "Infosys Buying Desk" tag (orange, handshake icon)

**Real AI Price Benchmarking Implementation:**
- Integrated 3 LLMs working in parallel:
  - 🤖 **OpenAI GPT-5.2** - Product price analysis and market research
  - 🧠 **Claude Sonnet 4.5** - Professional services rate analysis (Robert Half, PayScale)
  - ⚡ **Gemini 3 Flash** - Cross-validation and synthesis
- Created `/app/backend/ai_price_benchmark.py` module with async LLM integration
- Added `POST /api/procurement/quotation/upload-with-ai` endpoint for real AI analysis

**"Use Already Available Quotations" Feature (Demo Mode):**
- Added prominent orange button for instant demo without file upload
- Pre-loaded quotation from "TechPro Solutions Inc." with 6 line items:
  - Professional Services: Senior Cloud Architect ($29,600), DevOps Engineer ($13,200)
  - MRO Maintenance: HVAC Maintenance ($11,400), Electrical Inspection ($5,100)
  - MRO Products: Safety Equipment ($7,225), Hydraulic Parts ($5,625)
- Total value: ~$72K (under $75K limit as requested)
- Shows impressive AI analysis animation with progress bars for all 3 engines
- Displays potential savings of $4,535

**Upload Quotation Page Updates:**
- New header: "Infosys AI Enabled Intelligent Buying"
- AI Capabilities card showing all 3 engines with specialties
- "Use Real AI Analysis" toggle checkbox
- AI Analysis Progress modal with animated progress bars
- Expanded results showing individual AI engine analyses per line item

**Backend Endpoints Added:**
- `GET /api/procurement/quotation/demo-analysis` - Pre-loaded impressive demo analysis
- `POST /api/procurement/quotation/upload-with-ai` - Real AI-powered analysis

**Files Created/Modified:**
- `/app/backend/ai_price_benchmark.py` - New AI price benchmarking module
- `/app/frontend/src/pages/UploadQuotationPage.jsx` - Complete rewrite
- `/app/frontend/src/pages/LandingPage.jsx` - Added AI tags to all cards
- `/app/frontend/src/components/Sidebar.jsx` - Updated label and Brain icon

### ✅ Phase 16 - Admin Buying Desk Management System (January 15, 2026 - COMPLETED)
**Admin Portal - Buying Desk Management:**
- **Tactical Buying Tab** (formerly "Upload Catalog" was the default):
  - Stats cards: Total Requests, Pending Action, RFQ Sent, Negotiating, PO Ready
  - Request list showing: Request ID, Customer, Supplier, Amount, Potential Savings, Progress bar
  - Expandable panel with:
    - Update Status buttons (Submitted → Supplier ID → RFQ Sent → Quotes Received → Negotiating → PO Ready)
    - Assign Specialist dropdown (Rajesh Kumar, Priya Sharma, Amit Patel, Sneha Reddy, Vikram Singh)
    - Add Note functionality with notes history
  - Filter by status dropdown
  - Refresh button to reload data

- **Managed Services Tab** (for Sourcing Requests):
  - Stats cards: Total Requests, Urgent/Critical, In Progress, RFQ Sent, Completed
  - Request list showing: Sourcing ID, Title, Description, Category, Budget, Delivery Location, Urgency badge
  - Expandable panel with:
    - Update Status buttons (Submitted → In Progress → RFQ Sent → Quotes Received → Completed/Cancelled)
    - Assign Specialist dropdown
    - Full Request Details view
    - Add Note functionality

**Backend Endpoints Added:**
- GET /api/admin/buying-desk/requests - Get all tactical buying requests with stats
- GET /api/admin/buying-desk/request/{id} - Get single tactical request
- PUT /api/admin/buying-desk/request/{id}/status - Update status
- PUT /api/admin/buying-desk/request/{id}/assign - Assign specialist
- POST /api/admin/buying-desk/request/{id}/note - Add note
- GET /api/admin/buying-desk/specialists - Get specialist roster
- GET /api/admin/buying-desk/dashboard-stats - Get combined stats
- GET /api/admin/sourcing/requests - Get all sourcing requests with stats
- GET /api/admin/sourcing/request/{id} - Get single sourcing request
- PUT /api/admin/sourcing/request/{id}/status - Update status
- PUT /api/admin/sourcing/request/{id}/assign - Assign specialist
- POST /api/admin/sourcing/request/{id}/note - Add note

**Footer Links Updated:**
- Privacy Policy → https://www.infosys.com/privacy-statement.html
- Terms of Service → https://www.infosys.com/terms-of-use.html
- Contact Us → https://www.infosysbpm.com/contact.html

### ✅ Phase 16.1 - Stability Improvements (January 15, 2026 - COMPLETED)
**Health Check Endpoints Added:**
- `GET /api/health` - Comprehensive health check with database, collections, and data counts
- `GET /api/ready` - Kubernetes readiness probe
- `GET /api/live` - Kubernetes liveness probe

**Error Handling Improvements:**
- Added try-except blocks to admin buying desk endpoints
- Added logging for errors in admin endpoints
- Added Error Boundary component for React frontend
- Added axios interceptors for global error handling
- Set axios timeout to 30 seconds
- Auto-clear auth on 401 responses

**Files Added/Modified:**
- `/app/frontend/src/components/ErrorBoundary.jsx` - New error boundary component
- `/app/frontend/src/App.js` - Added ErrorBoundary wrapper and axios interceptors
- `/app/backend/server.py` - Added health endpoints and error handling

### ✅ Phase 15 - Multi-Language Translation Fix & Logo Enhancement (December 2025 - COMPLETED)
**Landing Page Translation - Complete i18n Implementation:**
- Fixed comprehensive multi-language support for all 5 languages: English, French, German, Italian, Dutch
- Converted static data arrays to use translation keys:
  - PLATFORM_STATS (labelKey): annualSpend, enterpriseClients, averageSavings, languagesSupported
  - AI_FEATURES (titleKey, descKey): aiDocumentAnalysis, priceBenchmarkingTitle, taxIntelligence, tacticalSourcing
  - PROCESS_STEPS (titleKey, descKey): step1-4 titles and descriptions
  - PAYMENT_MODELS (nameKey, subtitleKey, descKey): paymentModels translations added
- All sections now translate correctly:
  - Hero section with title and subtitle
  - Navigation links (Features, How It Works, Payment Options)
  - Stats section with dynamic labels
  - AI Features section with titles and descriptions
  - Multi-Language Document Support section
  - How It Works process steps
  - Payment Options with model names and descriptions
  - CTA section with buttons (Get Started, Contact Sales)
  - Footer links (Privacy Policy, Terms of Service, Contact Us, All rights reserved)

**German Translation Fix:**
- "Managed Services" correctly translated to "Verwaltete Dienste"

**Infosys BPM Logo Enhancement on Login Page:**
- Replaced semi-transparent background with solid white background
- Removed brightness-200 filter that was making logo unclear
- Added proper shadow and border styling for better visibility
- Logo dimensions: 114x56 pixels with clear branding

### ✅ Phase 14 - ProPay.ai Logo & Buying Desk Tracker (January 15, 2026 - COMPLETED)
**ProPay.ai Logo Integration:**
- Updated ProPay.ai logo across all screens using official logo asset
- Landing Page: Payment Options section shows ProPay.ai with logo
- One-Off Purchases: PO and Invoice Handling Entity section displays logo
- Managed Services: PO and Invoice Handling Entity section displays logo
- Renamed "ProPay World Wide Inc" → "ProPay.ai"

**AI Capability Text Updates:**
- Price benchmarking now mentions "products and services" explicitly
- Updated in Landing Page, One-Off Purchases page descriptions

**Buying Desk Dashboard (NEW PAGE):**
- Route: `/buying-desk`
- Visual progress tracker with 6 stages:
  1. Submitted
  2. Supplier Identification
  3. RFQ Sent
  4. Quotes Received
  5. Negotiating
  6. PO Ready
- Stats cards: Total Requests, In Progress, Completed, Potential Savings
- Request cards with:
  - Request ID and status badge
  - Supplier name and total amount
  - Potential savings indicator
  - Visual progress bar showing stage completion
  - Expandable details with timestamps
- Sidebar link: "Buying Desk Tracker" with "Track" badge

**Backend Enhancements:**
- New endpoint: GET /api/procurement/buying-desk/requests
- New endpoint: GET /api/procurement/buying-desk/request/{id}
- Updated buying_desk_requests schema with stages array and current_stage

### ✅ Phase 13 - UI Labeling & PO/Invoice Entity Options (January 15, 2026 - COMPLETED)
**Landing Page Option Labels:**
- "Upload Quotation" renamed to "**One-Off Purchases**" - Clearer description: "Upload your quotation for AI-powered analysis & processing"
- "Sourcing Support" renamed to "**Managed Services**" - Description: "Let our Buying Desk handle end-to-end sourcing for you"
- Button updated to "Request Buying Desk"

**Sidebar Navigation Updates:**
- "Upload Quotation" → "**One-Off Purchases**" with "AI" badge
- "Sourcing Support" → "**Managed Services**" with "Buying Desk" badge

**Page Title Updates:**
- Upload Quotation page header: "**One-Off Purchases**"
- Sourcing Support page header: "**Managed Services / Buying Desk**"

**PO and Invoice Handling Entity Feature:**
- Renamed "Payment Model" to "**PO and Invoice Handling Entity**" on Managed Services page
- Added description: "Select which entity will handle purchase orders and invoices"
- **NEW:** Added same section to One-Off Purchases page (after quotation analysis)
- Three options:
  - Infosys Limited - "Consolidated invoicing through Infosys entity"
  - ProPay World Wide Inc - "Third-party payment processing partner"
  - Customer Direct - "Direct invoicing from supplier to customer"

### ✅ Phase 12 - Engage Tactical Buyers & Cart Navigation Fix (January 15, 2026 - COMPLETED)
**Engage Infosys Tactical Buyers Button:**
- New prominent CTA on Upload Quotation page after analysis completes
- Positioned before Potential Savings section
- Blue button "Engage Tactical Buyers" with Handshake icon
- On click: Shows "Infosys Notified!" with green checkmark
- Success message: "Your request has been submitted to the Infosys Buying Desk Dashboard. Expected response within 24 hours."
- "Request Submitted" badge replaces button after submission
- Toast notification confirms team notification

**Backend - New Endpoint:**
- POST /api/procurement/quotation/{id}/engage-tactical-buyers
- Creates buying_desk_request record with: request_id, quotation_id, user info, amounts, potential_savings, timestamps
- Updates quotation with tactical_buyers_engaged flag

**Add to Cart Navigation Fix:**
- Clicking "Add to Cart" on Catalog page now opens PunchOut modal directly
- Shows "Transfer Cart via PunchOut" with 5 system options: Coupa, SAP Ariba, SAP ERP, Ivalua, Oracle
- Add to Cart from Upload Quotation page navigates to Catalog with openCart=true param
- Seamless cart transfer flow implemented

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
- POST /api/procurement/quotation/{id}/engage-tactical-buyers - Notify Infosys Buying Desk (NEW)
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

### P0 (Immediate - Next Tasks)
- [x] ~~Dynamic Currency Mapping: EUR for French & Spanish (Spain), MXN for Spanish (Mexico), USD for English~~ **COMPLETED**
- [x] ~~Mixed Catalog Display: Industrial products, spare parts, and IT equipment interleaved~~ **COMPLETED**
- [x] ~~Intelligent AI Agent: Detect items NOT in catalog, guide users to quotation upload or Managed Services~~ **COMPLETED**

### P1 (High Priority)
- [ ] Real-time notifications for Buying Desk status changes
- [ ] Real AI/ML document extraction integration
- [ ] Schedule Repeat Orders backend logic
- [ ] Bulk Submission via Excel upload

### P2 (Medium Priority)
- [ ] DB query optimization (replace `.to_list(10000)` with aggregation pipelines)
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

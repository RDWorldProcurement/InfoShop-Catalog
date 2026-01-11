# OMNISupply.io - Product Requirements Document

## Original Problem Statement
Build an enterprise-grade e-commerce platform called OMNISupply.io for Infosys Limited customers, offering 30M+ Industrial MRO Products, OEM Spare Parts, and 100K+ Professional Services with Infosys Preferred Pricing.

## What's Been Implemented (January 11, 2025)

### All Images & Branding Fixed
- [x] **Product images** loading correctly from Unsplash (high-quality industrial images)
- [x] **Brand badges** displayed with colored backgrounds (brand colors: HP blue, Dell blue, Bosch red, 3M red, etc.)
- [x] **Supplier badges** for services with company colors
- [x] **No external logo dependencies** - using text badges with brand colors for reliability

### Amazon-like Product Display
- [x] High-quality product images (800x800)
- [x] 5-star ratings with review counts
- [x] Short descriptions and full descriptions
- [x] Expandable specifications section
- [x] Availability info (quantity + warehouse location)
- [x] Delivery options from multiple partners
- [x] Alternates with savings percentage
- [x] "In Stock" badges
- [x] Brand badges with official brand colors

### IT Equipment Products
- HP ProBook 450 G10 Business Laptop ($1,299)
- HP EliteBook 840 G10 Enterprise Laptop ($1,849)
- Dell Latitude 5540 Business Laptop ($1,449)
- Dell Precision 5680 Mobile Workstation ($3,299)
- Lenovo ThinkPad X1 Carbon Gen 11 ($1,999)
- Dell UltraSharp U2723QE 4K Monitor ($799)
- LG UltraFine 32UN880-B Ergo Monitor ($699)
- Samsung ViewFinity S9 49" Ultrawide ($1,499)
- Cisco Catalyst 9200L Network Switch ($4,299)

### IT Services with Hourly Rates
- Network Infrastructure Installation - $125/hour (Infosys)
- Wireless Network Setup (Wi-Fi 6E) - $350/access point (Cisco)
- Desktop/Laptop Deployment Service - $85/device (Dell)
- Server Rack Installation - $450/server (HP)
- Network Security Assessment - $5,500/assessment (Infosys)
- Managed IT Support - $75/user/month (Infosys)

### Multi-Language Support (5 Languages)
- [x] English (EN)
- [x] French (FR) 
- [x] German (DE)
- [x] Italian (IT)
- [x] Dutch (NL)
- [x] Language switcher in sidebar and landing page
- [x] All UI elements translate including navigation, buttons, filters, product cards

## Technology Stack
- **Backend**: FastAPI, MongoDB, JWT
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **AI**: GPT-5.2 via Emergent LLM Key (InfoConnect chatbot)
- **Branding**: Infosys BPM colors (#007CC3, #FF6B00)
- **i18n**: React Context with translations.js

## Test Credentials
- **Email**: demo@infosys.com
- **Password**: demo123
- **Country**: USA (USD) or France (EUR)

## Prioritized Backlog

### P1 (High Priority)
- [ ] Schedule Repeat Orders backend logic
- [ ] Bulk Submission Excel upload processing
- [ ] InfoCoins redemption with actual gift catalog

### P2 (Medium Priority)
- [ ] Product detail modal with full specifications
- [ ] Order tracking with timeline/status updates
- [ ] Email notifications for RFQs/quotations

### P3 (Low Priority)
- [ ] Advanced search with multiple filters
- [ ] Export reports (PDF/Excel)
- [ ] Dashboard with analytics

## MOCKED Features
- **PunchOut Transfer**: Simulates transfer to ERP systems (Coupa, SAP Ariba, etc.) - creates transfer record with "Pending Customer PO" status but doesn't connect to real ERPs.

## Brand Colors Reference
- SKF: #005B94
- 3M: #FF0000
- Bosch: #E30016
- Siemens: #009999
- HP: #0096D6
- Dell: #007DB8
- Lenovo: #E2231A
- Cisco: #049FD9
- Samsung: #1428A0
- Infosys: #007CC3

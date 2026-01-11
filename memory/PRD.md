# OMNISupply.io - Product Requirements Document

## Original Problem Statement
Build an enterprise-grade e-commerce platform called OMNISupply.io for Infosys Limited customers, offering 30M+ Industrial MRO Products, OEM Spare Parts, and 100K+ Professional Services with Infosys Preferred Pricing.

## What's Been Implemented (January 11, 2025)

### All Images Hosted on Emergent CDN ✅
All product and service images are now hosted on Emergent's CDN (`static.prod-images.emergentagent.com`) - **guaranteed to work with no external dependencies**.

### Product Images (12 generated)
- Ball bearings (chrome steel)
- Power drill (yellow cordless)
- Safety helmet (yellow hard hat)
- Circuit breaker (electrical component)
- Safety glasses (protective eyewear)
- Business laptop
- 4K Monitor
- Wrench set
- Screwdriver set with bits
- LED high bay light
- Network switch
- Timing belt

### Service Images (12 generated)
- Network engineer installing cables in server rack
- Technician configuring Wi-Fi access point
- IT support setting up laptop at desk
- Server rack installation in data center
- Cybersecurity analyst at monitoring screens
- IT helpdesk support team with headsets
- Facilities management team inspecting HVAC
- Digital marketing team in creative agency
- Warehouse logistics operation
- Business meeting in corporate boardroom
- Safety inspector performing HSE compliance audit
- Skilled technicians on manufacturing floor

### IT Services with Images & Hourly Rates
1. **Network Infrastructure Installation** - $125/hr (network cables image)
2. **Wireless Network Setup Wi-Fi 6E** - $350/access point (WiFi setup image)
3. **Desktop/Laptop Deployment** - $85/device (laptop setup image)
4. **Server Rack Installation** - $450/server (server rack image)
5. **Network Security Assessment** - $5,500/assessment (cybersecurity image)
6. **Managed IT Support** - $75/user/month (helpdesk image)

### Service Categories with Images
- Network Installation Services
- IT Equipment Installation & Setup
- Cybersecurity Services
- IT Managed Services
- Corporate & Business Support Services
- Digital Marketing & Creative Agency Services
- Facilities Management & Workplace Services
- HSE, Quality & Compliance Services
- Logistics, Warehouse & Supply Chain Services
- Temp Labor across Technical Skilled Capabilities

## Technology Stack
- **Backend**: FastAPI, MongoDB, JWT
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Images**: Emergent CDN (static.prod-images.emergentagent.com)
- **Branding**: Infosys BPM colors (#007CC3, #FF6B00)
- **i18n**: React Context with 5 languages (EN, FR, DE, IT, NL)

## Test Credentials
- **Email**: demo@infosys.com
- **Password**: demo123
- **Country**: USA (USD) or France (EUR)

## Image CDN URLs Reference

### Product Images
```
Bearings: https://static.prod-images.emergentagent.com/jobs/.../7ac37795d305...png
Power Tools: https://static.prod-images.emergentagent.com/jobs/.../7428451866e1...png
Safety Helmet: https://static.prod-images.emergentagent.com/jobs/.../61099fb65121...png
Circuit Breaker: https://static.prod-images.emergentagent.com/jobs/.../562b9e992a87...png
Laptop: https://static.prod-images.emergentagent.com/jobs/.../8cba2db4e0d2...png
Monitor: https://static.prod-images.emergentagent.com/jobs/.../0e831c2f5467...png
```

### Service Images
```
Network Installation: https://static.prod-images.emergentagent.com/jobs/.../afdd726c02cc...png
WiFi Setup: https://static.prod-images.emergentagent.com/jobs/.../88c4a88606ac...png
Laptop Deployment: https://static.prod-images.emergentagent.com/jobs/.../cff7a5158c43...png
Server Installation: https://static.prod-images.emergentagent.com/jobs/.../a1c30bd322a6...png
Cybersecurity: https://static.prod-images.emergentagent.com/jobs/.../88995698058a...png
Managed IT: https://static.prod-images.emergentagent.com/jobs/.../f848c4af2e1f...png
```

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
- **PunchOut Transfer**: Simulates transfer to ERP systems (Coupa, SAP Ariba, etc.)

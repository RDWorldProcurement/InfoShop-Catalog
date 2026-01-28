# InfoShop Catalog - Standalone Application

A dedicated B2B Product Catalog with **Coupa cXML PunchOut Integration**, extracted from OMNISupply.io.

## Overview

InfoShop Catalog is a standalone e-commerce catalog designed specifically for B2B procurement integration. It supports:

- **Algolia-powered search** with faceted filtering
- **Coupa cXML PunchOut** integration (OCI 4.0 compatible)
- **Variable pricing engine** with category-level discounts
- **Amazon-style UI/UX** for professional catalog browsing

## Architecture

```
infoshop-standalone/
├── backend/                  # FastAPI Backend
│   ├── server.py            # Main API server
│   ├── algolia_service.py   # Algolia indexing & search
│   ├── pricing_engine.py    # Discount calculations
│   ├── punchout_service.py  # cXML PunchOut handling
│   └── .env                 # Environment configuration
│
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── App.js
│   │   └── pages/
│   │       └── InfoShopCatalog.jsx  # Main catalog page
│   └── .env
│
└── README.md
```

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8002 --reload
```

### Frontend

```bash
cd frontend
yarn install
yarn start
```

The frontend will run on `http://localhost:3001`

## Coupa PunchOut Integration

### Configuration

**PunchOut Endpoint:** `POST /api/punchout/setup`

**Required Credentials:**
- **SharedSecret:** `Infoshop@2026`
- **Supplier Domain:** `InfoShopNetwork`
- **Supplier Identity:** `InfoShopSupplier`

### Testing with cURL

```bash
curl -X POST http://localhost:8002/api/punchout/setup \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<cXML version="1.2.014" timestamp="2026-01-28T12:00:00+00:00" payloadID="test@coupa.com">
  <Header>
    <From><Credential domain="NetworkId"><Identity>BuyerCompany</Identity></Credential></From>
    <To><Credential domain="InfoShopNetwork"><Identity>InfoShopSupplier</Identity></Credential></To>
    <Sender>
      <Credential domain="NetworkId">
        <Identity>Sender</Identity>
        <SharedSecret>Infoshop@2026</SharedSecret>
      </Credential>
    </Sender>
  </Header>
  <Request>
    <PunchOutSetupRequest operation="create">
      <BuyerCookie>COOKIE-123</BuyerCookie>
      <BrowserFormPost><URL>https://your-coupa-instance/punchout/return</URL></BrowserFormPost>
    </PunchOutSetupRequest>
  </Request>
</cXML>'
```

### PunchOut Flow

1. **Setup Request:** Coupa sends `PunchOutSetupRequest` to `/api/punchout/setup`
2. **Validation:** We validate `SharedSecret` and create a session
3. **Redirect:** Response contains a `StartPage` URL with session token
4. **Browse:** User browses catalog in PunchOut mode
5. **Transfer:** User clicks "Transfer to Coupa" to send cart back
6. **Order Message:** We generate `PunchOutOrderMessage` cXML
7. **Return:** cXML is POSTed to Coupa's `BrowserFormPost` URL

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/punchout/setup` | POST | Handle cXML PunchOutSetupRequest |
| `/api/punchout/session/{token}` | GET | Get session info |
| `/api/punchout/cart/update` | POST | Update cart items |
| `/api/punchout/order` | POST | Create PunchOutOrderMessage |
| `/api/punchout/config` | GET | Get PunchOut configuration |
| `/api/catalog/search` | POST | Search products |
| `/api/catalog/stats` | GET | Get catalog statistics |

## Environment Variables

### Backend (.env)

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=infoshop_catalog
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:8002
ALGOLIA_APP_ID=your_app_id
ALGOLIA_ADMIN_KEY=your_admin_key
ALGOLIA_SEARCH_KEY=your_search_key
PUNCHOUT_SHARED_SECRET=Infoshop@2026
```

### Frontend (.env)

```
REACT_APP_BACKEND_URL=http://localhost:8002
PORT=3001
```

## For Coupa Administrators

To configure this catalog in Coupa:

1. Go to **Setup > Suppliers > [Your Supplier] > PunchOut**
2. Set **PunchOut URL:** `https://your-domain/api/punchout/setup`
3. Set **PunchOut Protocol:** `cXML`
4. Configure credentials:
   - **Domain:** `NetworkId`
   - **Identity:** Your buyer identity
   - **SharedSecret:** `Infoshop@2026`
5. Save and test the connection

## Support

For integration support, contact the InfoShop team.

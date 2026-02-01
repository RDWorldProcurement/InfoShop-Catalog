# InfoShop Deployment Guide
## Deployment to infoshop.omnisupply.io

---

## Overview

This document provides step-by-step instructions for deploying InfoShop to production at `infoshop.omnisupply.io`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Coupa                                    │
│                    (Procurement System)                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ cXML PunchOutSetupRequest
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              infoshop.omnisupply.io                              │
│  ┌─────────────────────┐    ┌────────────────────────────────┐  │
│  │   Frontend (React)   │◄──►│    Backend (FastAPI)           │  │
│  │   - Landing Page     │    │    - /api/punchout/setup       │  │
│  │   - Catalog          │    │    - /api/algolia/catalog/*    │  │
│  │   - Cart             │    │    - /api/infoshop/*           │  │
│  └─────────────────────┘    └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Algolia    │  │   MongoDB    │  │  Grainger/MOTION APIs  │ │
│  │   (Search)   │  │  (Sessions)  │  │  (Product Data)        │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## PunchOut Configuration

### Coupa Configuration Parameters

| Parameter | Value |
|-----------|-------|
| **Supplier Name** | OMNISupply |
| **PunchOut Store Name** | InfoShop – Powered by OMNISupply |
| **PunchOut Setup URL** | `https://infoshop.omnisupply.io/api/punchout/setup` |
| **Domain** | `118817359` |
| **Identity** | `OMNISUPPLY_PUNCHOUT` |
| **Shared Secret** | `OmniSup!y#2026$Coupa$8472` |
| **Protocol** | HTTPS (TLS 1.2+) |

### Sample cXML PunchOutSetupRequest

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.024/cXML.dtd">
<cXML payloadID="1234567890@coupa.com" timestamp="2026-02-01T10:00:00-05:00">
  <Header>
    <From>
      <Credential domain="DUNS">
        <Identity>118817359</Identity>
      </Credential>
    </From>
    <To>
      <Credential domain="infoshop.omnisupply.io">
        <Identity>OMNISUPPLY_PUNCHOUT</Identity>
      </Credential>
    </To>
    <Sender>
      <Credential domain="infoshop.omnisupply.io">
        <Identity>OMNISUPPLY_PUNCHOUT</Identity>
        <SharedSecret>OmniSup!y#2026$Coupa$8472</SharedSecret>
      </Credential>
      <UserAgent>Coupa Procurement 1.0</UserAgent>
    </Sender>
  </Header>
  <Request deploymentMode="production">
    <PunchOutSetupRequest operation="create">
      <BuyerCookie>unique-session-cookie</BuyerCookie>
      <BrowserFormPost>
        <URL>https://danone.coupahost.com/punchout/checkout</URL>
      </BrowserFormPost>
    </PunchOutSetupRequest>
  </Request>
</cXML>
```

---

## Environment Variables

### Backend (.env)

```env
# Database
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/infoshop
DB_NAME=infoshop_production

# Security
JWT_SECRET_KEY=<generate-secure-256-bit-key>
CORS_ORIGINS=https://infoshop.omnisupply.io

# PunchOut
PUNCHOUT_SHARED_SECRET=OmniSup!y#2026$Coupa$8472
FRONTEND_URL=https://infoshop.omnisupply.io

# Algolia
ALGOLIA_APP_ID=ZQXK1D2XLM
ALGOLIA_ADMIN_KEY=<your-admin-key>
ALGOLIA_SEARCH_KEY=b55bffdc4ec8f937863aafce747fca8d
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=https://infoshop.omnisupply.io
REACT_APP_ALGOLIA_APP_ID=ZQXK1D2XLM
REACT_APP_ALGOLIA_SEARCH_KEY=b55bffdc4ec8f937863aafce747fca8d
```

---

## Deployment Options

### Option A: Vercel (Frontend) + Separate Backend Host

1. **Deploy Frontend to Vercel:**
   ```bash
   cd /app/frontend
   vercel --prod
   ```

2. **Configure Custom Domain:**
   - Add `infoshop.omnisupply.io` in Vercel dashboard
   - Update DNS: CNAME record pointing to `cname.vercel-dns.com`

3. **Deploy Backend:**
   - Use Railway, Render, AWS, or similar
   - Ensure `/api/punchout/setup` is accessible

### Option B: Single Deployment (Recommended for PunchOut)

Deploy both frontend and backend to the same domain for simpler PunchOut integration:

1. **Use a platform like Railway or Render** that supports both
2. **Configure reverse proxy** to route `/api/*` to backend

---

## DNS Configuration

Add these records to your DNS for `omnisupply.io`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | infoshop | cname.vercel-dns.com (or your host) | 300 |
| A | infoshop | (your server IP if not using CNAME) | 300 |

---

## API Endpoints

### PunchOut Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/punchout/setup` | Handle PunchOutSetupRequest from Coupa |
| GET | `/api/punchout/session/{token}` | Verify session |
| POST | `/api/punchout/transfer-cart` | Transfer cart back to Coupa |

### Catalog Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/algolia/catalog/search` | Search products |
| GET | `/api/infoshop/partners` | Get partner list |
| GET | `/api/infoshop/catalog/stats` | Catalog statistics |

---

## Testing PunchOut

### Test with cURL:

```bash
curl -X POST https://infoshop.omnisupply.io/api/punchout/setup \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<cXML payloadID="test@coupa.com" timestamp="2026-02-01T10:00:00">
  <Header>
    <From><Credential domain="DUNS"><Identity>118817359</Identity></Credential></From>
    <To><Credential domain="infoshop.omnisupply.io"><Identity>OMNISUPPLY_PUNCHOUT</Identity></Credential></To>
    <Sender>
      <Credential domain="infoshop.omnisupply.io">
        <Identity>OMNISUPPLY_PUNCHOUT</Identity>
        <SharedSecret>OmniSup!y#2026$Coupa$8472</SharedSecret>
      </Credential>
    </Sender>
  </Header>
  <Request><PunchOutSetupRequest operation="create">
    <BuyerCookie>test-cookie</BuyerCookie>
    <BrowserFormPost><URL>https://test.coupahost.com/checkout</URL></BrowserFormPost>
  </PunchOutSetupRequest></Request>
</cXML>'
```

### Expected Response:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<cXML>
  <Response>
    <Status code="200" text="OK"/>
    <PunchOutSetupResponse>
      <StartPage>
        <URL>https://infoshop.omnisupply.io?catalog=true&punchout_session=TOKEN</URL>
      </StartPage>
    </PunchOutSetupResponse>
  </Response>
</cXML>
```

---

## Checklist Before Go-Live

- [ ] DNS configured for infoshop.omnisupply.io
- [ ] SSL certificate active (HTTPS)
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables set for production
- [ ] PunchOut endpoint tested with Coupa
- [ ] Product catalog indexed in Algolia
- [ ] MongoDB connection verified
- [ ] Cart transfer to Coupa tested

---

## Support

For technical issues, contact the development team.

**Document Version:** 1.0  
**Last Updated:** February 2026

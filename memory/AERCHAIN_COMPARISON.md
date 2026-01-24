# Aerchain vs OMNISupply.io - Feature Comparison Checklist

## Executive Summary

**Aerchain** is an AI-powered procurement platform with specialized AI Agents for different procurement functions.
**OMNISupply.io** is our AI-driven procurement platform built for Infosys customers.

---

## AERCHAIN FEATURE CHECKLIST

### 1. AI AGENTS / CONVERSATIONAL AI

| Feature | Aerchain Claims | OMNISupply.io Status | Notes |
|---------|----------------|---------------------|-------|
| **Aera AI - Conversational Assistant** | Chat-based procurement interface | ✅ **IMPLEMENTED** | AI Procurement Agent at `/ai-agent` |
| Natural language procurement requests | Yes | ✅ **IMPLEMENTED** | Users can describe needs in natural language |
| AI understands needs even when user is unsure | Yes | ✅ **IMPLEMENTED** | Intelligent routing based on intent |
| Upload files in conversation | Yes | ✅ **IMPLEMENTED** | Quotation upload in chat |
| AI-powered contextual search | Yes | ✅ **IMPLEMENTED** | Catalog search with MongoDB text indexing |
| Recommends best options from catalogs | Yes | ✅ **IMPLEMENTED** | Shows matching products/services |
| Finds right suppliers | Yes | ✅ **IMPLEMENTED** | Links to vendor catalog |
| Drafts specifications | Yes | ⚠️ **PARTIAL** | RFQ generation exists but manual |
| Handles negotiations | Yes | ⚠️ **PARTIAL** | Escalation to Buying Desk, not autonomous |
| Awards with confidence | Yes | ❌ **NOT IMPLEMENTED** | No automated awarding |

### 2. INTAKE AGENT

| Feature | Aerchain Claims | OMNISupply.io Status | Notes |
|---------|----------------|---------------------|-------|
| Single entry point for all requests | Yes | ✅ **IMPLEMENTED** | AI Agent is central gateway |
| Auto-classifies requests to workflows | Yes | ✅ **IMPLEMENTED** | CATALOG_SEARCH, NOT_IN_CATALOG, etc. |
| Collaborative request building | Yes | ⚠️ **PARTIAL** | Single user, no multi-user collab |
| AI-powered contextual search | Yes | ✅ **IMPLEMENTED** | Product/service search |
| Smart approvals with AI routing | Yes | ❌ **NOT IMPLEMENTED** | No approval workflows |
| Chat or upload to create | Yes | ✅ **IMPLEMENTED** | Both supported |
| Seamless process execution | Yes | ✅ **IMPLEMENTED** | End-to-end flow works |

### 3. EVALUATION AGENT

| Feature | Aerchain Claims | OMNISupply.io Status | Notes |
|---------|----------------|---------------------|-------|
| Analyzes supplier responses | Yes | ✅ **IMPLEMENTED** | AI analyzes quotations |
| Automated scoring | Yes | ✅ **IMPLEMENTED** | Price benchmarking with confidence scores |
| Side-by-side comparisons | Yes | ⚠️ **PARTIAL** | Single quotation analysis, not side-by-side |
| Highlights risks and opportunities | Yes | ✅ **IMPLEMENTED** | Risk levels shown per line item |
| AI-driven insights | Yes | ✅ **IMPLEMENTED** | GPT-5.2, Claude, Gemini analysis |

### 4. NEGOTIATION AGENT

| Feature | Aerchain Claims | OMNISupply.io Status | Notes |
|---------|----------------|---------------------|-------|
| Multi-round negotiations | Yes | ❌ **NOT IMPLEMENTED** | No automated negotiation |
| AI benchmarks against market data | Yes | ✅ **IMPLEMENTED** | Market price comparison |
| Natural language negotiations | Yes | ❌ **NOT IMPLEMENTED** | Human-handled |
| Pre-built negotiation playbooks | Yes | ❌ **NOT IMPLEMENTED** | No playbooks |
| Auto-updates quotes | Yes | ❌ **NOT IMPLEMENTED** | Manual process |
| 360° strategy for terms | Yes | ❌ **NOT IMPLEMENTED** | Not available |

### 5. VENDOR ONBOARDING AGENT

| Feature | Aerchain Claims | OMNISupply.io Status | Notes |
|---------|----------------|---------------------|-------|
| Automated registration | Yes | ❌ **NOT IMPLEMENTED** | No supplier portal |
| Credential verification | Yes | ❌ **NOT IMPLEMENTED** | Not available |
| Compliance checks | Yes | ⚠️ **PARTIAL** | Tax analysis exists |
| Continuous monitoring | Yes | ❌ **NOT IMPLEMENTED** | Not available |
| Document collection | Yes | ❌ **NOT IMPLEMENTED** | Not available |

### 6. ANALYTICS AGENT

| Feature | Aerchain Claims | OMNISupply.io Status | Notes |
|---------|----------------|---------------------|-------|
| Unified dashboards | Yes | ⚠️ **PARTIAL** | Admin dashboard exists |
| AI-driven spend analysis | Yes | ⚠️ **PARTIAL** | Quotation analysis exists |
| Forecasts procurement needs | Yes | ❌ **NOT IMPLEMENTED** | Not available |
| Real-time data | Yes | ✅ **IMPLEMENTED** | Live data from MongoDB |

### 7. CONTRACT AGENT

| Feature | Aerchain Claims | OMNISupply.io Status | Notes |
|---------|----------------|---------------------|-------|
| Drafts contracts | Yes | ❌ **NOT IMPLEMENTED** | Not available |
| Tracks compliance | Yes | ❌ **NOT IMPLEMENTED** | Not available |
| Monitors performance | Yes | ❌ **NOT IMPLEMENTED** | Not available |
| Alerts for actions | Yes | ❌ **NOT IMPLEMENTED** | No notifications |
| Renegotiation opportunities | Yes | ❌ **NOT IMPLEMENTED** | Not available |

### 8. ENTERPRISE FEATURES

| Feature | Aerchain Claims | OMNISupply.io Status | Notes |
|---------|----------------|---------------------|-------|
| **Multi-language support (30+)** | Yes | ✅ **IMPLEMENTED** | 7 languages (EN, ES, FR, DE, PT, ZH, JP) |
| **Multi-currency** | Yes | ✅ **IMPLEMENTED** | USD, EUR, MXN dynamic |
| Configurable workflows | Yes | ❌ **NOT IMPLEMENTED** | Fixed workflows |
| Approval matrices | Yes | ❌ **NOT IMPLEMENTED** | No approval system |
| DIY tools (no-code) | Yes | ❌ **NOT IMPLEMENTED** | Not available |
| ERP integrations | Yes | ⚠️ **PARTIAL** | PunchOut ready |
| Compliance guardrails | Yes | ⚠️ **PARTIAL** | Tax verification |

### 9. SPEND CATEGORIES

| Category | Aerchain Claims | OMNISupply.io Status | Notes |
|----------|----------------|---------------------|-------|
| MRO (Maintenance, Repair, Operations) | Yes | ✅ **IMPLEMENTED** | 30M+ products |
| IT Hardware | Yes | ✅ **IMPLEMENTED** | In catalog |
| Office Supplies | Yes | ✅ **IMPLEMENTED** | In catalog |
| Professional Services | Yes | ✅ **IMPLEMENTED** | 100K+ services |
| Travel | Yes | ❌ **NOT IMPLEMENTED** | Not in scope |
| Fleet | Yes | ❌ **NOT IMPLEMENTED** | Not in scope |
| Telecom | Yes | ❌ **NOT IMPLEMENTED** | Not in scope |
| Chemicals | Yes | ✅ **IMPLEMENTED** | In MRO catalog |
| Strategic Spend | Yes | ✅ **IMPLEMENTED** | Buying Desk handles |

### 10. AI/ML CAPABILITIES

| Feature | Aerchain Claims | OMNISupply.io Status | Notes |
|---------|----------------|---------------------|-------|
| AI-powered document extraction | Yes | ✅ **IMPLEMENTED** | Real extraction from PDF/Word/Excel |
| Price benchmarking | Yes | ✅ **IMPLEMENTED** | 3-LLM consensus (GPT, Claude, Gemini) |
| Multi-LLM approach | Unknown | ✅ **IMPLEMENTED** | Uses 3 LLMs for validation |
| Intent classification | Yes | ✅ **IMPLEMENTED** | Automatic routing |
| Natural language processing | Yes | ✅ **IMPLEMENTED** | Conversational AI |

---

## SUMMARY SCORECARD

| Category | Aerchain Features | OMNISupply.io Has | Coverage % |
|----------|------------------|------------------|------------|
| Conversational AI / Aera | 10 | 7 | **70%** |
| Intake Agent | 7 | 5 | **71%** |
| Evaluation Agent | 5 | 4 | **80%** |
| Negotiation Agent | 6 | 1 | **17%** |
| Vendor Onboarding | 5 | 0 | **0%** |
| Analytics Agent | 4 | 2 | **50%** |
| Contract Agent | 5 | 0 | **0%** |
| Enterprise Features | 7 | 3 | **43%** |
| **TOTAL** | **49** | **22** | **~45%** |

---

## KEY GAPS (What Aerchain Has That We Don't)

### 🔴 CRITICAL GAPS
1. **Automated Negotiation Agent** - AI that autonomously negotiates with suppliers
2. **Contract Lifecycle Management** - Draft, track, and manage contracts
3. **Vendor Onboarding Portal** - Supplier self-registration and verification
4. **Approval Workflows** - Multi-level approval matrices
5. **Spend Analytics Dashboard** - Comprehensive spend visibility

### 🟡 MODERATE GAPS
6. **Side-by-side Quotation Comparison** - Compare multiple supplier quotes
7. **Configurable Workflows** - No-code workflow builder
8. **Real-time Notifications** - Alerts for status changes
9. **RFQ Auto-generation** - AI creates RFQ documents
10. **Forecasting** - Predictive procurement needs

### 🟢 MINOR GAPS
11. **More Language Support** - Aerchain claims 30+, we have 7
12. **DIY Tools** - Self-service customization
13. **Extended Category Support** - Travel, Fleet, Telecom

---

## WHAT OMNISUPPLY.IO DOES WELL (Unique Strengths)

| Feature | Advantage Over Aerchain |
|---------|------------------------|
| **Multi-LLM Consensus** | Uses GPT-5.2 + Claude + Gemini for price benchmarking (verified with 3 AI models) |
| **Real Document Extraction** | Actual AI extraction from uploaded files, not just forms |
| **Buying Desk Integration** | Human expert support for complex sourcing |
| **UNSPSC Category Intelligence** | Deep category classification |
| **PunchOut Ready** | ERP cart transfer capability |
| **Tax Analysis** | Automated tax verification |

---

## RECOMMENDED ROADMAP TO CLOSE GAPS

### Phase 1 (High Impact, Medium Effort)
1. ✨ **Approval Workflows** - Add request approval routing
2. ✨ **Multi-Quote Comparison** - Side-by-side analysis
3. ✨ **Notifications System** - Real-time status alerts

### Phase 2 (High Impact, High Effort)  
4. ✨ **Contract Management Module** - Basic CLM functionality
5. ✨ **Vendor Portal** - Supplier self-service onboarding
6. ✨ **Analytics Dashboard** - Spend visibility and trends

### Phase 3 (Differentiator)
7. ✨ **AI Negotiation Agent** - Autonomous price negotiation
8. ✨ **Forecasting Engine** - Predictive procurement
9. ✨ **Workflow Builder** - No-code customization

---

*Generated: January 24, 2026*
*Comparison based on aerchain.io website content*

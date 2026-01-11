from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import random
import hashlib
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'omnisupply_default_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="OMNISupply.io API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Currency configurations per country
COUNTRY_CURRENCIES = {
    "USA": {"code": "USD", "symbol": "$", "rate": 1.0},
    "Canada": {"code": "CAD", "symbol": "CA$", "rate": 1.36},
    "Mexico": {"code": "MXN", "symbol": "MX$", "rate": 17.15},
    "India": {"code": "INR", "symbol": "₹", "rate": 83.12},
    "China": {"code": "CNY", "symbol": "¥", "rate": 7.24},
    "Germany": {"code": "EUR", "symbol": "€", "rate": 0.92},
    "France": {"code": "EUR", "symbol": "€", "rate": 0.92},
    "UK": {"code": "GBP", "symbol": "£", "rate": 0.79},
    "Italy": {"code": "EUR", "symbol": "€", "rate": 0.92},
    "Spain": {"code": "EUR", "symbol": "€", "rate": 0.92},
    "Netherlands": {"code": "EUR", "symbol": "€", "rate": 0.92},
    "Belgium": {"code": "EUR", "symbol": "€", "rate": 0.92},
    "Poland": {"code": "PLN", "symbol": "zł", "rate": 4.02},
    "Switzerland": {"code": "CHF", "symbol": "CHF", "rate": 0.88},
    "Sweden": {"code": "SEK", "symbol": "kr", "rate": 10.45},
}

# MRO Categories with UNSPSC codes
MRO_CATEGORIES = [
    {"name": "Bearings & Power Transmission", "unspsc": "31170000", "icon": "cog"},
    {"name": "Electrical & Lighting", "unspsc": "39110000", "icon": "lightbulb"},
    {"name": "Fasteners & Hardware", "unspsc": "31160000", "icon": "wrench"},
    {"name": "Hand Tools", "unspsc": "27110000", "icon": "hammer"},
    {"name": "Power Tools", "unspsc": "27112000", "icon": "zap"},
    {"name": "Safety & PPE", "unspsc": "46180000", "icon": "shield"},
    {"name": "Abrasives", "unspsc": "31190000", "icon": "disc"},
    {"name": "Adhesives & Sealants", "unspsc": "31200000", "icon": "droplet"},
    {"name": "Cleaning & Janitorial", "unspsc": "47130000", "icon": "sparkles"},
    {"name": "HVAC & Refrigeration", "unspsc": "40100000", "icon": "thermometer"},
    {"name": "Hydraulics & Pneumatics", "unspsc": "40140000", "icon": "gauge"},
    {"name": "Laboratory Supplies", "unspsc": "41110000", "icon": "flask"},
    {"name": "Lubrication", "unspsc": "15120000", "icon": "oil-can"},
    {"name": "Material Handling", "unspsc": "24100000", "icon": "package"},
    {"name": "Motors & Drives", "unspsc": "26100000", "icon": "cpu"},
    {"name": "Packaging & Shipping", "unspsc": "24110000", "icon": "box"},
    {"name": "Pipe, Valves & Fittings", "unspsc": "40170000", "icon": "cylinder"},
    {"name": "Plumbing", "unspsc": "40140000", "icon": "droplets"},
    {"name": "Pumps", "unspsc": "40150000", "icon": "activity"},
    {"name": "Raw Materials", "unspsc": "11100000", "icon": "layers"},
    {"name": "Test & Measurement", "unspsc": "41110000", "icon": "ruler"},
    {"name": "Welding", "unspsc": "23270000", "icon": "flame"},
    {"name": "Industrial Automation", "unspsc": "32150000", "icon": "bot"},
    {"name": "Cutting Tools", "unspsc": "27110000", "icon": "scissors"},
    {"name": "Storage & Organization", "unspsc": "56100000", "icon": "archive"},
]

# MRO Brands with logos
MRO_BRANDS = [
    {"name": "SKF", "logo": "https://logo.clearbit.com/skf.com"},
    {"name": "3M", "logo": "https://logo.clearbit.com/3m.com"},
    {"name": "Henkel", "logo": "https://logo.clearbit.com/henkel.com"},
    {"name": "Bosch", "logo": "https://logo.clearbit.com/bosch.com"},
    {"name": "Siemens", "logo": "https://logo.clearbit.com/siemens.com"},
    {"name": "ABB", "logo": "https://logo.clearbit.com/abb.com"},
    {"name": "Honeywell", "logo": "https://logo.clearbit.com/honeywell.com"},
    {"name": "Parker", "logo": "https://logo.clearbit.com/parker.com"},
    {"name": "Emerson", "logo": "https://logo.clearbit.com/emerson.com"},
    {"name": "Rockwell", "logo": "https://logo.clearbit.com/rockwellautomation.com"},
    {"name": "Schneider", "logo": "https://logo.clearbit.com/se.com"},
    {"name": "Mitsubishi", "logo": "https://logo.clearbit.com/mitsubishielectric.com"},
    {"name": "Omron", "logo": "https://logo.clearbit.com/omron.com"},
    {"name": "Festo", "logo": "https://logo.clearbit.com/festo.com"},
    {"name": "Fluke", "logo": "https://logo.clearbit.com/fluke.com"},
    {"name": "Makita", "logo": "https://logo.clearbit.com/makita.com"},
    {"name": "DeWalt", "logo": "https://logo.clearbit.com/dewalt.com"},
    {"name": "Milwaukee", "logo": "https://logo.clearbit.com/milwaukeetool.com"},
    {"name": "Stanley", "logo": "https://logo.clearbit.com/stanleytools.com"},
    {"name": "Klein Tools", "logo": "https://logo.clearbit.com/kleintools.com"},
]

# Service Categories with UNSPSC codes
SERVICE_CATEGORIES = [
    {"name": "Corporate & Business Support Services", "unspsc": "80100000", "icon": "briefcase"},
    {"name": "Digital Marketing & Creative Agency Services", "unspsc": "82100000", "icon": "palette"},
    {"name": "Facilities Management & Workplace Services", "unspsc": "72100000", "icon": "building"},
    {"name": "HSE, Quality & Compliance Services", "unspsc": "77100000", "icon": "shield-check"},
    {"name": "IT & Workplace Technology Services", "unspsc": "81110000", "icon": "monitor"},
    {"name": "Logistics, Warehouse & Supply Chain Services", "unspsc": "78100000", "icon": "truck"},
    {"name": "Temp Labor across Technical Skilled Capabilities", "unspsc": "80110000", "icon": "users"},
]

# PunchOut Systems
PUNCHOUT_SYSTEMS = [
    {"name": "Coupa", "logo": "https://logo.clearbit.com/coupa.com"},
    {"name": "SAP Ariba", "logo": "https://logo.clearbit.com/ariba.com"},
    {"name": "SAP ERP", "logo": "https://logo.clearbit.com/sap.com"},
    {"name": "Ivalua", "logo": "https://logo.clearbit.com/ivalua.com"},
    {"name": "Oracle", "logo": "https://logo.clearbit.com/oracle.com"},
]

# Services data with UNSPSC codes
SERVICES_DATA = [
    {"name": "Janitorial Office Cleaning Services – Business Hours", "unspsc_code": "76111501", "unspsc_name": "Janitorial services", "category": "Facilities Management & Workplace Services", "country": "Denmark", "supplier_name": "Wipro IT Services DK", "unit_of_measure": "Per Sq Ft", "base_price": 0.85},
    {"name": "Deep Cleaning Services – Office Facilities", "unspsc_code": "76111502", "unspsc_name": "Commercial cleaning", "category": "Facilities Management & Workplace Services", "country": "Nigeria", "supplier_name": None, "unit_of_measure": "Per Service", "base_price": None},
    {"name": "Pest Control Services – Preventive", "unspsc_code": "76102101", "unspsc_name": "Pest control", "category": "Facilities Management & Workplace Services", "country": "Spain", "supplier_name": "Genpact Enterprise IT ES", "unit_of_measure": "Per Visit", "base_price": 150.00},
    {"name": "HVAC Preventive Maintenance Services", "unspsc_code": "72101502", "unspsc_name": "HVAC maintenance", "category": "Facilities Management & Workplace Services", "country": "Switzerland", "supplier_name": None, "unit_of_measure": "Per Service", "base_price": None},
    {"name": "Security Guard Services – Day Shift", "unspsc_code": "92121504", "unspsc_name": "Guard services", "category": "Facilities Management & Workplace Services", "country": "Brazil", "supplier_name": "Siemens Smart Infrastructure", "unit_of_measure": "Per Hour", "base_price": 25.00},
    {"name": "Elevator Preventive Maintenance Services", "unspsc_code": "72101504", "unspsc_name": "Elevator maintenance", "category": "Facilities Management & Workplace Services", "country": "Chile", "supplier_name": "Schindler Elevator", "unit_of_measure": "Per Month", "base_price": 450.00},
    {"name": "Fire Extinguisher Inspection Services", "unspsc_code": "46191601", "unspsc_name": "Fire safety inspection", "category": "Facilities Management & Workplace Services", "country": "Portugal", "supplier_name": "Tata Consultancy Services", "unit_of_measure": "Per Unit", "base_price": 15.00},
    {"name": "Digital Marketing Strategy Services", "unspsc_code": "80171607", "unspsc_name": "Digital marketing", "category": "Digital Marketing & Creative Agency Services", "country": "Greece", "supplier_name": None, "unit_of_measure": "Per Month", "base_price": None},
    {"name": "Search Engine Optimization (SEO) Services", "unspsc_code": "80171608", "unspsc_name": "SEO services", "category": "Digital Marketing & Creative Agency Services", "country": "Switzerland", "supplier_name": "Tata Consultancy Services", "unit_of_measure": "Per Month", "base_price": 2500.00},
    {"name": "Video Production Services – Corporate", "unspsc_code": "82131602", "unspsc_name": "Video production", "category": "Digital Marketing & Creative Agency Services", "country": "Argentina", "supplier_name": "Dentsu International", "unit_of_measure": "Per Day", "base_price": 1500.00},
    {"name": "Content Marketing Services", "unspsc_code": "80172106", "unspsc_name": "Content development", "category": "Digital Marketing & Creative Agency Services", "country": "Portugal", "supplier_name": "BrightView Landscape PT", "unit_of_measure": "Per Asset", "base_price": 350.00},
    {"name": "Brand Strategy Consulting Services", "unspsc_code": "80171605", "unspsc_name": "Brand management", "category": "Digital Marketing & Creative Agency Services", "country": "Singapore", "supplier_name": "Honeywell Building Solutions", "unit_of_measure": "Per Day", "base_price": 2000.00},
    {"name": "Desktop Support Services – Onsite – L1", "unspsc_code": "81112106", "unspsc_name": "Computer hardware support services", "category": "IT & Workplace Technology Services", "country": "Greece", "supplier_name": None, "unit_of_measure": "Per Hour", "base_price": None},
    {"name": "Desktop Support Services – Remote – L1", "unspsc_code": "81112107", "unspsc_name": "Remote technical support", "category": "IT & Workplace Technology Services", "country": "UAE", "supplier_name": "Infosys Digital Workplace", "unit_of_measure": "Per Hour", "base_price": 45.00},
    {"name": "Hardware Break/Fix Services – Workspace IT", "unspsc_code": "81112306", "unspsc_name": "Hardware maintenance services", "category": "IT & Workplace Technology Services", "country": "Spain", "supplier_name": "ABM Industries ES", "unit_of_measure": "Per Call", "base_price": 125.00},
    {"name": "Cloud Migration Assessment Services", "unspsc_code": "81101524", "unspsc_name": "Digital transformation consulting", "category": "IT & Workplace Technology Services", "country": "UK", "supplier_name": "Publicis Media GB", "unit_of_measure": "Per Day", "base_price": 2000.00},
    {"name": "Cybersecurity Awareness Training Services", "unspsc_code": "86101605", "unspsc_name": "Information security training", "category": "IT & Workplace Technology Services", "country": "Belgium", "supplier_name": "HCLTech Digital", "unit_of_measure": "Per Session", "base_price": 500.00},
    {"name": "Health & Safety Audit Services – Site Level", "unspsc_code": "81101508", "unspsc_name": "Facility inspection services", "category": "HSE, Quality & Compliance Services", "country": "Bulgaria", "supplier_name": None, "unit_of_measure": "Per Day", "base_price": None},
    {"name": "Fire Safety Risk Assessment Services", "unspsc_code": "92121702", "unspsc_name": "Fire safety consulting services", "category": "HSE, Quality & Compliance Services", "country": "Germany", "supplier_name": "Ricoh Managed Services DE", "unit_of_measure": "Per Day", "base_price": 800.00},
    {"name": "ISO 9001 Certification Support Services", "unspsc_code": "81101512", "unspsc_name": "Quality management consulting", "category": "HSE, Quality & Compliance Services", "country": "Finland", "supplier_name": None, "unit_of_measure": "Per Project", "base_price": None},
    {"name": "ISO 14001 Certification Support Services", "unspsc_code": "81101512", "unspsc_name": "Environmental management consulting", "category": "HSE, Quality & Compliance Services", "country": "Switzerland", "supplier_name": "Bureau Veritas", "unit_of_measure": "Per Project", "base_price": 8500.00},
    {"name": "Warehouse Labor Services – General", "unspsc_code": "78131601", "unspsc_name": "Warehousing services", "category": "Logistics, Warehouse & Supply Chain Services", "country": "Peru", "supplier_name": None, "unit_of_measure": "Per Hour", "base_price": None},
    {"name": "Import Customs Clearance Support Services", "unspsc_code": "80111509", "unspsc_name": "Customs support services", "category": "Logistics, Warehouse & Supply Chain Services", "country": "India", "supplier_name": "Genpact Enterprise IT", "unit_of_measure": "Per Hour", "base_price": 75.00},
    {"name": "Supply Chain Process Mapping Services", "unspsc_code": "81101503", "unspsc_name": "Process mapping services", "category": "Logistics, Warehouse & Supply Chain Services", "country": "Chile", "supplier_name": "WPP Group (GroupM)", "unit_of_measure": "Per Service", "base_price": 3500.00},
    {"name": "Freight Audit & Pay Services", "unspsc_code": "84111801", "unspsc_name": "Freight audit services", "category": "Logistics, Warehouse & Supply Chain Services", "country": "Romania", "supplier_name": "DHL Supply Chain", "unit_of_measure": "Per Transaction", "base_price": 5.00},
    {"name": "Legal Document Review Services – Standard", "unspsc_code": "80121602", "unspsc_name": "Legal review services", "category": "Corporate & Business Support Services", "country": "Bulgaria", "supplier_name": None, "unit_of_measure": "Per Hour", "base_price": None},
    {"name": "Contract Drafting Support Services", "unspsc_code": "80121603", "unspsc_name": "Contract drafting services", "category": "Corporate & Business Support Services", "country": "Ireland", "supplier_name": "SUEZ Recycling & Recovery IE", "unit_of_measure": "Per Hour", "base_price": 150.00},
    {"name": "Executive Presentation Development Services", "unspsc_code": "82111701", "unspsc_name": "Presentation design services", "category": "Corporate & Business Support Services", "country": "USA", "supplier_name": "Wipro IT Services", "unit_of_measure": "Per Deck", "base_price": 500.00},
    {"name": "Technical Staff Augmentation Services", "unspsc_code": "80111605", "unspsc_name": "Temporary staffing services", "category": "Temp Labor across Technical Skilled Capabilities", "country": "USA", "supplier_name": "Randstad", "unit_of_measure": "Per Hour", "base_price": 85.00},
    {"name": "Engineering Staff Augmentation Services", "unspsc_code": "80111605", "unspsc_name": "Temporary staffing services", "category": "Temp Labor across Technical Skilled Capabilities", "country": "Germany", "supplier_name": "Hays", "unit_of_measure": "Per Hour", "base_price": 95.00},
]

# Pydantic Models
class UserLogin(BaseModel):
    email: str
    password: str
    country: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    country: str
    currency: Dict[str, Any]
    info_coins: int
    token: str

class DeliveryPartner(BaseModel):
    partner_id: str
    price: float
    lead_time_days: int
    available_quantity: int

class CartItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    brand: str
    sku: str
    unspsc_code: str
    category: str
    quantity: int
    unit_price: float
    total_price: float
    currency_code: str
    image_url: Optional[str] = None
    is_service: bool = False

class CartTransfer(BaseModel):
    system: str  # "Coupa", "SAP Ariba", "SAP ERP", "Ivalua", "Oracle"
    cart_items: List[str]  # List of cart item IDs

class RFQCreate(BaseModel):
    product_description: str
    quantity: int
    brand_name: Optional[str] = None
    oem_part_number: Optional[str] = None
    needed_by: Optional[str] = None
    delivery_location: str
    supplier_name: Optional[str] = None
    supplier_email: Optional[str] = None
    request_type: str = "actual"
    is_product: bool = True

class QuotationRequest(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    notes: Optional[str] = None

class QuotationResponse(BaseModel):
    quotation_id: str
    action: str  # "accept", "cancel"
    cancel_reason: Optional[str] = None

# InfoCoin Rewards
INFOCOIN_REWARDS = [
    {"id": "1", "name": "Premium Branded Jacket", "description": "High-quality insulated jacket with Infosys branding", "coins_required": 5000, "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400", "category": "Apparel"},
    {"id": "2", "name": "Executive Leather Portfolio", "description": "Genuine leather portfolio with notepad and card holder", "coins_required": 3000, "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400", "category": "Accessories"},
    {"id": "3", "name": "Branded Cap", "description": "Premium cotton cap with embroidered logo", "coins_required": 1000, "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400", "category": "Apparel"},
    {"id": "4", "name": "Stainless Steel Coffee Mug", "description": "Double-walled insulated mug with lid", "coins_required": 800, "image_url": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400", "category": "Drinkware"},
    {"id": "5", "name": "Executive Pen Set", "description": "Premium ballpoint and rollerball pen set in gift box", "coins_required": 1500, "image_url": "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400", "category": "Stationery"},
    {"id": "6", "name": "Wireless Power Bank", "description": "10000mAh wireless charging power bank", "coins_required": 2500, "image_url": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400", "category": "Electronics"},
]

# Helper Functions
def create_jwt_token(user_id: str, email: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "email": email, "exp": expiration}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_jwt_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def generate_unspsc_code(category_name: str) -> str:
    """Get UNSPSC code for a category"""
    for cat in MRO_CATEGORIES:
        if cat["name"] == category_name:
            return cat["unspsc"]
    return "31000000"  # Default MRO code

def get_brand_info(brand_name: str) -> Dict:
    """Get brand info with logo"""
    for brand in MRO_BRANDS:
        if brand["name"] == brand_name:
            return brand
    return {"name": brand_name, "logo": None}

def generate_product_data(index: int, category: str, brand: str) -> Dict:
    """Generate realistic product data with UNSPSC"""
    product_names = {
        "Bearings & Power Transmission": ["Ball Bearing", "Roller Bearing", "Timing Belt", "V-Belt", "Chain Drive"],
        "Electrical & Lighting": ["LED Panel Light", "Circuit Breaker", "Contactor", "Relay", "Terminal Block"],
        "Fasteners & Hardware": ["Hex Bolt", "Socket Cap Screw", "Nut", "Washer", "Anchor Bolt"],
        "Hand Tools": ["Wrench Set", "Screwdriver Set", "Pliers", "Hammer", "Tape Measure"],
        "Power Tools": ["Cordless Drill", "Angle Grinder", "Impact Wrench", "Circular Saw", "Jigsaw"],
        "Safety & PPE": ["Safety Helmet", "Safety Glasses", "Work Gloves", "Safety Boots", "High-Vis Vest"],
    }
    
    product_images = [
        "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400",
        "https://images.unsplash.com/photo-1625592831117-b6ef5fe3bdd3?w=400",
        "https://images.unsplash.com/photo-1612430146325-87a163519863?w=400",
        "https://images.unsplash.com/photo-1616524617587-2ddb5ccf87cc?w=400",
        "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400",
    ]
    
    names = product_names.get(category, ["Industrial Component", "MRO Part", "Equipment Part"])
    name = random.choice(names)
    unspsc = generate_unspsc_code(category)
    brand_info = get_brand_info(brand)
    
    # 10% chance of being sponsored
    is_sponsored = random.random() < 0.10
    
    return {
        "id": str(uuid.uuid4()),
        "name": f"{brand} {name}",
        "description": f"High-quality {name.lower()} from {brand}. Industrial grade, designed for demanding applications. Meets ISO standards.",
        "category": category,
        "brand": brand,
        "brand_logo": brand_info.get("logo"),
        "sku": f"{brand[:3].upper()}-{category[:3].upper()}-{index:06d}",
        "unspsc_code": unspsc,
        "unspsc_name": category,
        "base_price": round(random.uniform(10, 500), 2),
        "unit": random.choice(["EA", "PK", "BX", "SET"]),
        "image_url": random.choice(product_images),
        "spec_document_url": "https://example.com/specs/document.pdf",
        "is_sponsored": is_sponsored
    }

def generate_delivery_partners(base_price: float, count: int) -> List[DeliveryPartner]:
    """Generate delivery partners with price/lead time inverse relationship"""
    partners = []
    for i in range(count):
        price_multiplier = 1.0 + (0.1 * (count - i - 1))
        lead_time = 10 - (i * 3)
        if lead_time < 1:
            lead_time = 1
        partners.append(DeliveryPartner(
            partner_id=f"DP-{uuid.uuid4().hex[:8]}",
            price=round(base_price * price_multiplier, 2),
            lead_time_days=lead_time,
            available_quantity=random.randint(16, 2098)
        ))
    return partners

def get_alternate_products(product: Dict, brand: str) -> List[Dict]:
    """Generate alternate product suggestions"""
    alt_brands = [b["name"] for b in MRO_BRANDS if b["name"] != brand]
    alternates = []
    for alt_brand in random.sample(alt_brands, min(2, len(alt_brands))):
        brand_info = get_brand_info(alt_brand)
        alternates.append({
            "id": str(uuid.uuid4()),
            "name": product["name"].replace(brand, alt_brand),
            "brand": alt_brand,
            "brand_logo": brand_info.get("logo"),
            "price": round(product["base_price"] * random.uniform(0.7, 0.95), 2),
            "lead_time_days": random.randint(7, 15)
        })
    return alternates

# Auth Routes
@api_router.post("/auth/login", response_model=UserResponse)
async def login(user_data: UserLogin):
    if not user_data.email or not user_data.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    
    if existing_user:
        if existing_user.get("country") != user_data.country:
            await db.users.update_one({"email": user_data.email}, {"$set": {"country": user_data.country}})
            existing_user["country"] = user_data.country
        user = existing_user
    else:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.email.split("@")[0].title(),
            "country": user_data.country,
            "info_coins": 2500,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    
    currency = COUNTRY_CURRENCIES.get(user_data.country, COUNTRY_CURRENCIES["USA"])
    token = create_jwt_token(user["id"], user["email"])
    
    return UserResponse(
        id=user["id"], email=user["email"], name=user["name"],
        country=user_data.country, currency=currency,
        info_coins=user.get("info_coins", 0), token=token
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
    return {**current_user, "currency": currency}

# Product Routes
@api_router.get("/products/search")
async def search_products(
    q: str = Query("", description="Search query"),
    category: Optional[str] = None,
    brand: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
    results = []
    
    search_term = q.lower()
    matching_categories = [c["name"] for c in MRO_CATEGORIES if search_term in c["name"].lower()] if search_term else [c["name"] for c in MRO_CATEGORIES[:10]]
    matching_brands = [b["name"] for b in MRO_BRANDS if search_term in b["name"].lower()] if search_term else [b["name"] for b in MRO_BRANDS[:10]]
    
    if category and category != "all":
        matching_categories = [c for c in matching_categories if c.lower() == category.lower()] or [category]
    if brand and brand != "all":
        matching_brands = [b for b in matching_brands if b.lower() == brand.lower()] or [brand]
    
    for i in range(limit):
        cat = random.choice(matching_categories if matching_categories else [c["name"] for c in MRO_CATEGORIES])
        br = random.choice(matching_brands if matching_brands else [b["name"] for b in MRO_BRANDS])
        product = generate_product_data(i + (page - 1) * limit, cat, br)
        
        rand = random.random()
        
        if rand < 0.70:
            partner_count = random.choice([1, 2, 3])
            delivery_partners = generate_delivery_partners(product["base_price"], partner_count)
            result_type = "with_partner"
            price = delivery_partners[0].price if delivery_partners else product["base_price"]
            lead_time = delivery_partners[0].lead_time_days if delivery_partners else 5
        elif rand < 0.90:
            delivery_partners = []
            result_type = "quotation_required"
            price = None
            lead_time = None
        else:
            continue
        
        alternates = get_alternate_products(product, br) if result_type == "with_partner" else []
        
        results.append({
            "id": product["id"],
            "name": product["name"],
            "description": product["description"],
            "category": product["category"],
            "brand": product["brand"],
            "brand_logo": product["brand_logo"],
            "sku": product["sku"],
            "unspsc_code": product["unspsc_code"],
            "unspsc_name": product["unspsc_name"],
            "price": round(price * currency["rate"], 2) if price else None,
            "currency_code": currency["code"],
            "currency_symbol": currency["symbol"],
            "unit": product["unit"],
            "image_url": product["image_url"],
            "spec_document_url": product["spec_document_url"],
            "lead_time_days": lead_time,
            "delivery_partners": [
                {"partner_id": dp.partner_id, "price": round(dp.price * currency["rate"], 2),
                 "lead_time_days": dp.lead_time_days, "available_quantity": dp.available_quantity}
                for dp in delivery_partners
            ] if result_type == "with_partner" else [],
            "has_delivery_partner": result_type == "with_partner",
            "alternate_products": [{**alt, "price": round(alt["price"] * currency["rate"], 2)} for alt in alternates],
            "result_type": result_type,
            "is_sponsored": product["is_sponsored"]
        })
    
    return {
        "results": results,
        "total": 3000000,
        "page": page,
        "limit": limit,
        "categories": [{"name": c["name"], "unspsc": c["unspsc"], "icon": c["icon"]} for c in MRO_CATEGORIES],
        "brands": [{"name": b["name"], "logo": b["logo"]} for b in MRO_BRANDS]
    }

@api_router.get("/products/{product_id}/inventory")
async def check_inventory(product_id: str, current_user: dict = Depends(get_current_user)):
    quantity = random.randint(16, 2098)
    return {
        "product_id": product_id,
        "available_quantity": quantity,
        "warehouse_locations": [
            {"location": "US-East", "quantity": random.randint(5, quantity // 2)},
            {"location": "US-West", "quantity": random.randint(5, quantity // 2)},
            {"location": "EU-Central", "quantity": random.randint(0, quantity // 4)}
        ],
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/products/categories")
async def get_categories():
    return {"categories": [{"name": c["name"], "unspsc": c["unspsc"], "icon": c["icon"]} for c in MRO_CATEGORIES]}

@api_router.get("/products/brands")
async def get_brands():
    return {"brands": [{"name": b["name"], "logo": b["logo"]} for b in MRO_BRANDS]}

# Services Routes
@api_router.get("/services/search")
async def search_services(
    q: str = Query("", description="Search query"),
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
    results = []
    
    search_term = q.lower()
    filtered_services = SERVICES_DATA.copy()
    if search_term:
        filtered_services = [s for s in SERVICES_DATA if search_term in s["name"].lower() or search_term in s["category"].lower()]
    if category and category != "all":
        filtered_services = [s for s in filtered_services if s["category"].lower() == category.lower()]
    
    if not filtered_services:
        filtered_services = SERVICES_DATA[:15]
    
    for service in filtered_services[:limit]:
        rand = random.random()
        is_sponsored = random.random() < 0.10
        
        if rand < 0.40 and service["supplier_name"]:
            result_type = "with_supplier"
            price = service["base_price"]
            has_supplier = True
        elif rand < 0.50:
            result_type = "quotation_required"
            price = None
            has_supplier = False
        else:
            result_type = "not_found"
            price = None
            has_supplier = False
        
        results.append({
            "id": str(uuid.uuid4()),
            "name": service["name"],
            "description": f"{service['name']}. Professional service meeting industry standards.",
            "category": service["category"],
            "unspsc_code": service["unspsc_code"],
            "unspsc_name": service["unspsc_name"],
            "unit_of_measure": service["unit_of_measure"],
            "price": round(price * currency["rate"], 2) if price else None,
            "currency_code": currency["code"],
            "currency_symbol": currency["symbol"],
            "pricing_model": service["unit_of_measure"],
            "supplier_name": service["supplier_name"] if has_supplier else None,
            "has_supplier": has_supplier,
            "result_type": result_type,
            "is_sponsored": is_sponsored
        })
    
    return {
        "results": results,
        "total": 100000,
        "page": page,
        "limit": limit,
        "categories": [{"name": c["name"], "unspsc": c["unspsc"], "icon": c["icon"]} for c in SERVICE_CATEGORIES]
    }

@api_router.get("/services/categories")
async def get_service_categories():
    return {"categories": [{"name": c["name"], "unspsc": c["unspsc"], "icon": c["icon"]} for c in SERVICE_CATEGORIES]}

# Cart Routes
@api_router.get("/cart")
async def get_cart(current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {"items": cart.get("items", []) if cart else [], "total": sum(item.get("total_price", 0) for item in (cart.get("items", []) if cart else []))}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]})
    item_dict = item.model_dump()
    
    if cart:
        await db.carts.update_one({"user_id": current_user["id"]}, {"$push": {"items": item_dict}})
    else:
        await db.carts.insert_one({"user_id": current_user["id"], "items": [item_dict]})
    
    return {"message": "Item added to cart", "item_id": item.id}

@api_router.delete("/cart/remove/{item_id}")
async def remove_from_cart(item_id: str, current_user: dict = Depends(get_current_user)):
    await db.carts.update_one({"user_id": current_user["id"]}, {"$pull": {"items": {"id": item_id}}})
    return {"message": "Item removed from cart"}

@api_router.post("/cart/transfer")
async def transfer_cart(transfer: CartTransfer, current_user: dict = Depends(get_current_user)):
    """Transfer cart to PunchOut system (Coupa, Ariba, SAP, etc.)"""
    cart = await db.carts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Get system info
    system_info = next((s for s in PUNCHOUT_SYSTEMS if s["name"] == transfer.system), None)
    if not system_info:
        raise HTTPException(status_code=400, detail="Invalid PunchOut system")
    
    # Create transfer record
    transfer_record = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "system": transfer.system,
        "system_logo": system_info["logo"],
        "items": cart["items"],
        "total_amount": sum(item.get("total_price", 0) for item in cart["items"]),
        "status": "Pending Customer PO",
        "transferred_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.cart_transfers.insert_one(transfer_record)
    
    # Clear cart
    await db.carts.update_one({"user_id": current_user["id"]}, {"$set": {"items": []}})
    
    return {
        "message": f"Cart transferred to {transfer.system}",
        "transfer_id": transfer_record["id"],
        "status": "Pending Customer PO",
        "system_logo": system_info["logo"]
    }

@api_router.get("/cart/transfers")
async def get_cart_transfers(current_user: dict = Depends(get_current_user)):
    transfers = await db.cart_transfers.find({"user_id": current_user["id"]}, {"_id": 0}).sort("transferred_at", -1).to_list(50)
    return {"transfers": transfers}

@api_router.get("/punchout/systems")
async def get_punchout_systems():
    return {"systems": PUNCHOUT_SYSTEMS}

# RFQ Routes
@api_router.post("/rfq/submit")
async def submit_rfq(rfq: RFQCreate, current_user: dict = Depends(get_current_user)):
    rfq_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "product_description": rfq.product_description,
        "quantity": rfq.quantity,
        "brand_name": rfq.brand_name,
        "oem_part_number": rfq.oem_part_number,
        "needed_by": rfq.needed_by,
        "delivery_location": rfq.delivery_location,
        "supplier_name": rfq.supplier_name,
        "supplier_email": rfq.supplier_email,
        "request_type": rfq.request_type,
        "is_product": rfq.is_product,
        "status": "submitted",
        "response": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.rfqs.insert_one(rfq_doc)
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"info_coins": 50}})
    
    return {"message": "RFQ submitted successfully", "rfq_id": rfq_doc["id"], "coins_earned": 50}

@api_router.get("/rfq/list")
async def list_rfqs(current_user: dict = Depends(get_current_user)):
    rfqs = await db.rfqs.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    # Add sample RFQs if none exist
    if not rfqs:
        sample_rfqs = [
            {"id": "RFQ-001", "user_id": current_user["id"], "product_description": "Industrial Hydraulic Pump 50GPM",
             "quantity": 5, "status": "response_received", "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
             "response": {"supplier": "Parker Hannifin", "unit_price": 1250.00, "lead_time": 14, "valid_until": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()}},
            {"id": "RFQ-002", "user_id": current_user["id"], "product_description": "Custom Gasket Set for Compressor Model X200",
             "quantity": 100, "status": "pending", "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(), "response": None},
            {"id": "RFQ-003", "user_id": current_user["id"], "product_description": "Specialized Bearing Assembly",
             "quantity": 20, "status": "response_received", "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
             "response": {"supplier": "SKF Industrial", "unit_price": 89.50, "lead_time": 7, "valid_until": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()}},
        ]
        rfqs = sample_rfqs
    
    return {"rfqs": rfqs}

# Quotation Routes
@api_router.post("/quotation/request")
async def request_quotation(request: QuotationRequest, current_user: dict = Depends(get_current_user)):
    quote_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "product_id": request.product_id,
        "product_name": request.product_name,
        "quantity": request.quantity,
        "notes": request.notes,
        "status": "pending",
        "response": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quotations.insert_one(quote_doc)
    return {"message": "Quotation request sent to 100+ Infosys distributors", "quotation_id": quote_doc["id"]}

@api_router.get("/quotation/list")
async def list_quotations(current_user: dict = Depends(get_current_user)):
    quotations = await db.quotations.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    # Add sample quotations if none exist
    if not quotations:
        currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
        sample_quotations = [
            {"id": "QT-001", "user_id": current_user["id"], "product_name": "Heavy Duty Industrial Motor 5HP",
             "quantity": 3, "status": "response_received", "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
             "response": {"supplier": "Siemens Industrial", "unit_price": 2450.00 * currency["rate"], "currency": currency["code"],
                         "lead_time": 10, "valid_until": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()}},
            {"id": "QT-002", "user_id": current_user["id"], "product_name": "Pneumatic Control Valve Assembly",
             "quantity": 10, "status": "pending", "created_at": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(), "response": None},
            {"id": "QT-003", "user_id": current_user["id"], "product_name": "Industrial Sensor Package",
             "quantity": 25, "status": "response_received", "created_at": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat(),
             "response": {"supplier": "Honeywell Solutions", "unit_price": 125.00 * currency["rate"], "currency": currency["code"],
                         "lead_time": 5, "valid_until": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()}},
            {"id": "QT-004", "user_id": current_user["id"], "product_name": "Custom Fabricated Steel Parts",
             "quantity": 50, "status": "cancelled", "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
             "response": None, "cancel_reason": "Found alternative supplier with better pricing"},
        ]
        quotations = sample_quotations
    
    return {"quotations": quotations}

@api_router.post("/quotation/{quotation_id}/respond")
async def respond_to_quotation(quotation_id: str, response: QuotationResponse, current_user: dict = Depends(get_current_user)):
    if response.action == "accept":
        await db.quotations.update_one(
            {"id": quotation_id, "user_id": current_user["id"]},
            {"$set": {"status": "accepted"}}
        )
        return {"message": "Quotation accepted. Item ready to add to cart."}
    elif response.action == "cancel":
        await db.quotations.update_one(
            {"id": quotation_id, "user_id": current_user["id"]},
            {"$set": {"status": "cancelled", "cancel_reason": response.cancel_reason}}
        )
        return {"message": "Quotation cancelled."}
    
    raise HTTPException(status_code=400, detail="Invalid action")

# Order Routes
@api_router.post("/orders/create")
async def create_order(items: List[CartItem], current_user: dict = Depends(get_current_user)):
    currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
    total = sum(item.total_price for item in items)
    
    order = {
        "id": f"ORD-{uuid.uuid4().hex[:8].upper()}",
        "user_id": current_user["id"],
        "items": [item.model_dump() for item in items],
        "total_amount": total,
        "currency_code": currency["code"],
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "estimated_delivery": (datetime.now(timezone.utc) + timedelta(days=random.randint(3, 10))).isoformat()
    }
    
    await db.orders.insert_one(order)
    coins = int(total / 10)
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"info_coins": coins}})
    
    return {"message": "Order placed successfully", "order_id": order["id"], "coins_earned": coins}

@api_router.get("/orders/history")
async def get_order_history(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders}

# Repeat Orders, Bulk Upload, InfoCoins remain same...
@api_router.post("/repeat-orders/create")
async def create_repeat_order(product_id: str, product_name: str, quantity: int, frequency: str, current_user: dict = Depends(get_current_user)):
    if frequency not in ["weekly", "monthly", "quarterly"]:
        raise HTTPException(status_code=400, detail="Invalid frequency")
    
    days_map = {"weekly": 7, "monthly": 30, "quarterly": 90}
    next_date = datetime.now(timezone.utc) + timedelta(days=days_map[frequency])
    
    repeat_order = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "product_id": product_id,
        "product_name": product_name,
        "quantity": quantity,
        "frequency": frequency,
        "next_order_date": next_date.isoformat(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.repeat_orders.insert_one(repeat_order)
    return {"message": "Repeat order scheduled", "repeat_order_id": repeat_order["id"]}

@api_router.get("/repeat-orders/list")
async def list_repeat_orders(current_user: dict = Depends(get_current_user)):
    repeat_orders = await db.repeat_orders.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return {"repeat_orders": repeat_orders}

@api_router.delete("/repeat-orders/{repeat_order_id}")
async def cancel_repeat_order(repeat_order_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.repeat_orders.update_one({"id": repeat_order_id, "user_id": current_user["id"]}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Repeat order not found")
    return {"message": "Repeat order cancelled"}

@api_router.post("/bulk/upload")
async def bulk_upload(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    import openpyxl
    from io import BytesIO
    
    content = await file.read()
    wb = openpyxl.load_workbook(BytesIO(content))
    sheet = wb.active
    
    results = []
    found = 0
    not_found = 0
    currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
    
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not row[0]:
            continue
        product_name = str(row[0])
        quantity = int(row[1]) if len(row) > 1 and row[1] else 1
        
        if random.random() < 0.70:
            product = generate_product_data(random.randint(1, 10000), random.choice([c["name"] for c in MRO_CATEGORIES]), random.choice([b["name"] for b in MRO_BRANDS]))
            results.append({
                "search_term": product_name, "found": True,
                "product": {"id": product["id"], "name": product["name"], "price": round(product["base_price"] * currency["rate"], 2),
                           "currency": currency["symbol"], "available_quantity": random.randint(16, 2098), "unspsc_code": product["unspsc_code"]},
                "requested_quantity": quantity
            })
            found += 1
        else:
            results.append({"search_term": product_name, "found": False, "product": None, "requested_quantity": quantity})
            not_found += 1
    
    return {"total_items": found + not_found, "found_items": found, "not_found_items": not_found, "results": results}

@api_router.get("/infocoins/balance")
async def get_infocoin_balance(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return {"balance": user.get("info_coins", 0)}

@api_router.get("/infocoins/rewards")
async def get_rewards():
    return {"rewards": INFOCOIN_REWARDS}

@api_router.post("/infocoins/redeem/{reward_id}")
async def redeem_reward(reward_id: str, current_user: dict = Depends(get_current_user)):
    reward = next((r for r in INFOCOIN_REWARDS if r["id"] == reward_id), None)
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if user.get("info_coins", 0) < reward["coins_required"]:
        raise HTTPException(status_code=400, detail="Insufficient InfoCoins")
    
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"info_coins": -reward["coins_required"]}})
    
    redemption = {
        "id": str(uuid.uuid4()), "user_id": current_user["id"], "reward_id": reward_id,
        "reward_name": reward["name"], "coins_spent": reward["coins_required"],
        "status": "processing", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.redemptions.insert_one(redemption)
    
    return {"message": f"Successfully redeemed {reward['name']}!"}

# Chat Routes
@api_router.post("/chat/message")
async def chat_message(chat: dict, current_user: dict = Depends(get_current_user)):
    session_id = chat.get("session_id") or str(uuid.uuid4())
    message = chat.get("message", "")
    
    system_message = """You are InfoConnect, the AI assistant for OMNISupply.io - Infosys's enterprise procurement platform. 
    You help users with finding products and services, managing orders, submitting RFQs, and using InfoCoins rewards.
    Be helpful, professional, and concise."""
    
    try:
        llm = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message).with_model("openai", "gpt-5.2")
        user_message = UserMessage(text=message)
        response = await llm.send_message(user_message)
        
        await db.chat_history.insert_one({
            "session_id": session_id, "user_id": current_user["id"],
            "user_message": message, "bot_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logging.error(f"Chat error: {e}")
        return {"response": "I'm here to help! You can search for products, check order history, or explore InfoCoins rewards.", "session_id": session_id}

# Stats
@api_router.get("/stats")
async def get_stats():
    return {
        "total_products": "30M+",
        "total_services": "100K+",
        "total_categories": len(MRO_CATEGORIES),
        "total_brands": len(MRO_BRANDS),
        "service_categories": len(SERVICE_CATEGORIES),
        "integrations": ["Coupa", "SAP Ariba", "SAP ERP", "Ivalua", "Oracle"],
        "countries_served": len(COUNTRY_CURRENCIES),
        "punchout_systems": PUNCHOUT_SYSTEMS
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

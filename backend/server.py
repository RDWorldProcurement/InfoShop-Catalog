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
app = FastAPI(title="OMNISupply.io API", version="1.0.0")

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

# MRO Categories
MRO_CATEGORIES = [
    "Bearings & Power Transmission", "Electrical & Lighting", "Fasteners & Hardware",
    "Hand Tools", "Power Tools", "Safety & PPE", "Abrasives", "Adhesives & Sealants",
    "Cleaning & Janitorial", "HVAC & Refrigeration", "Hydraulics & Pneumatics",
    "Laboratory Supplies", "Lubrication", "Material Handling", "Motors & Drives",
    "Packaging & Shipping", "Pipe, Valves & Fittings", "Plumbing", "Pumps",
    "Raw Materials", "Refrigeration", "Safes & Security", "Test & Measurement",
    "Welding", "Fluid Handling", "Electrical Components", "Industrial Automation",
    "Maintenance Equipment", "Building & Construction", "Office Supplies",
    "Fleet & Vehicle Maintenance", "Cutting Tools", "Metalworking", "Workshop Equipment",
    "Storage & Organization"
]

# MRO Brands
MRO_BRANDS = [
    "SKF", "3M", "Henkel", "MARKEM", "IFM", "Avantor", "Donaldson", "Bosch",
    "Siemens", "ABB", "Honeywell", "Parker", "Emerson", "Rockwell", "Schneider",
    "Mitsubishi", "Omron", "Festo", "SMC", "Phoenix Contact", "Wago", "Fluke",
    "Tektronix", "Keyence", "Banner", "Sick", "Balluff", "Pepperl+Fuchs",
    "Turck", "Pilz", "Lenze", "SEW", "Nord", "Danfoss", "Grundfos", "ITT",
    "Flowserve", "Pentair", "Xylem", "Lincoln Electric", "Miller", "ESAB",
    "Fronius", "Hypertherm", "Makita", "DeWalt", "Milwaukee", "Stanley",
    "Snap-on", "Craftsman", "Klein Tools", "Proto", "Bahco", "Gedore"
]

# Service Categories from the Excel
SERVICE_CATEGORIES = [
    "Corporate & Business Support Services",
    "Digital Marketing & Creative Agency Services",
    "Facilities Management & Workplace Services",
    "HSE, Quality & Compliance Services",
    "IT & Workplace Technology Services",
    "Logistics, Warehouse & Supply Chain Services",
    "Temp Labor across Technical Skilled Capabilities"
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

class ProductBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str
    brand: str
    sku: str
    base_price: float
    unit: str = "EA"
    image_url: str
    spec_document_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DeliveryPartner(BaseModel):
    partner_id: str
    price: float
    lead_time_days: int
    available_quantity: int

class ProductSearchResult(BaseModel):
    id: str
    name: str
    description: str
    category: str
    brand: str
    sku: str
    price: float
    currency_code: str
    currency_symbol: str
    unit: str
    image_url: str
    spec_document_url: Optional[str]
    lead_time_days: int
    delivery_partners: List[DeliveryPartner]
    has_delivery_partner: bool
    alternate_products: List[Dict[str, Any]]
    result_type: str  # "with_partner", "quotation_required", "not_found"

class ServiceBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str
    unspsc_code: str
    unspsc_name: str
    country: str
    supplier_name: Optional[str] = None
    unit_of_measure: str
    base_price: Optional[float] = None
    pricing_model: str  # "Per Hour", "Per Sq Ft", "Fixed Fee", etc.
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServiceSearchResult(BaseModel):
    id: str
    name: str
    description: str
    category: str
    unspsc_code: str
    unspsc_name: str
    unit_of_measure: str
    price: Optional[float]
    currency_code: str
    currency_symbol: str
    pricing_model: str
    supplier_name: Optional[str]
    has_supplier: bool
    result_type: str  # "with_supplier", "quotation_required", "not_found"

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    total_price: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[OrderItem]
    total_amount: float
    currency_code: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    estimated_delivery: Optional[datetime] = None

class RFQCreate(BaseModel):
    product_description: str
    quantity: int
    brand_name: Optional[str] = None
    oem_part_number: Optional[str] = None
    needed_by: Optional[str] = None
    delivery_location: str
    supplier_name: Optional[str] = None
    supplier_email: Optional[str] = None
    request_type: str = "actual"  # "pricing_only" or "actual"
    is_product: bool = True

class QuotationRequest(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    notes: Optional[str] = None

class RepeatOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_id: str
    product_name: str
    quantity: int
    frequency: str  # "weekly", "monthly", "quarterly"
    next_order_date: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InfoCoinReward(BaseModel):
    id: str
    name: str
    description: str
    coins_required: int
    image_url: str
    category: str

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class BulkUploadResult(BaseModel):
    total_items: int
    found_items: int
    not_found_items: int
    results: List[Dict[str, Any]]

# Helper Functions
def create_jwt_token(user_id: str, email: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
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

def generate_product_data(index: int, category: str, brand: str) -> Dict:
    """Generate realistic product data"""
    product_names = {
        "Bearings & Power Transmission": ["Ball Bearing", "Roller Bearing", "Timing Belt", "V-Belt", "Chain Drive", "Coupling", "Shaft Seal"],
        "Electrical & Lighting": ["LED Panel Light", "Circuit Breaker", "Contactor", "Relay", "Terminal Block", "Cable Tray", "Junction Box"],
        "Fasteners & Hardware": ["Hex Bolt", "Socket Cap Screw", "Nut", "Washer", "Anchor Bolt", "Thread Insert", "Rivet"],
        "Hand Tools": ["Wrench Set", "Screwdriver Set", "Pliers", "Hammer", "Chisel Set", "Tape Measure", "Level"],
        "Power Tools": ["Cordless Drill", "Angle Grinder", "Impact Wrench", "Circular Saw", "Jigsaw", "Rotary Hammer", "Heat Gun"],
        "Safety & PPE": ["Safety Helmet", "Safety Glasses", "Work Gloves", "Safety Boots", "High-Vis Vest", "Ear Protection", "Respirator"],
        "Adhesives & Sealants": ["Epoxy Adhesive", "Thread Locker", "Silicone Sealant", "Super Glue", "Structural Adhesive", "Pipe Sealant", "Gasket Maker"],
        "Lubrication": ["Bearing Grease", "Chain Lubricant", "Gear Oil", "Hydraulic Fluid", "Penetrating Oil", "Food Grade Lubricant", "High Temp Grease"],
    }
    
    product_images = [
        "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400",
        "https://images.unsplash.com/photo-1625592831117-b6ef5fe3bdd3?w=400",
        "https://images.unsplash.com/photo-1612430146325-87a163519863?w=400",
        "https://images.unsplash.com/photo-1616524617587-2ddb5ccf87cc?w=400",
        "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400",
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400"
    ]
    
    names = product_names.get(category, ["Industrial Component", "MRO Part", "Equipment Part"])
    name = random.choice(names)
    
    return {
        "id": str(uuid.uuid4()),
        "name": f"{brand} {name} - {index}",
        "description": f"High-quality {name.lower()} from {brand}. Industrial grade, designed for demanding applications. Meets ISO standards.",
        "category": category,
        "brand": brand,
        "sku": f"{brand[:3].upper()}-{category[:3].upper()}-{index:06d}",
        "base_price": round(random.uniform(10, 500), 2),
        "unit": random.choice(["EA", "PK", "BX", "SET"]),
        "image_url": random.choice(product_images),
        "spec_document_url": "https://example.com/specs/document.pdf"
    }

def generate_delivery_partners(base_price: float, count: int) -> List[DeliveryPartner]:
    """Generate delivery partners with price/lead time inverse relationship"""
    partners = []
    for i in range(count):
        # Higher price = shorter lead time
        price_multiplier = 1.0 + (0.1 * (count - i - 1))  # First partner cheapest
        lead_time = 10 - (i * 3)  # First partner longest lead time
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
    """Generate alternate product suggestions from different brands"""
    alt_brands = [b for b in MRO_BRANDS if b != brand]
    alternates = []
    for alt_brand in random.sample(alt_brands, min(2, len(alt_brands))):
        alternates.append({
            "id": str(uuid.uuid4()),
            "name": product["name"].replace(brand, alt_brand),
            "brand": alt_brand,
            "price": round(product["base_price"] * random.uniform(0.7, 0.95), 2),
            "lead_time_days": random.randint(7, 15)
        })
    return alternates

# Services data from Excel (sample)
SERVICES_DATA = [
    {"name": "Janitorial Office Cleaning Services – Business Hours", "unspsc_code": "76111501", "unspsc_name": "Janitorial services", "category": "Facilities Management & Workplace Services", "country": "Denmark", "supplier_name": "Wipro IT Services DK", "unit_of_measure": "Per Sq Ft", "base_price": 0.85},
    {"name": "Deep Cleaning Services – Office Facilities", "unspsc_code": "76111502", "unspsc_name": "Commercial cleaning", "category": "Facilities Management & Workplace Services", "country": "Nigeria", "supplier_name": None, "unit_of_measure": "Per Service", "base_price": None},
    {"name": "Pest Control Services – Preventive", "unspsc_code": "76102101", "unspsc_name": "Pest control", "category": "Facilities Management & Workplace Services", "country": "Spain", "supplier_name": "Genpact Enterprise IT ES", "unit_of_measure": "Per Visit", "base_price": 150.00},
    {"name": "HVAC Preventive Maintenance Services", "unspsc_code": "72101502", "unspsc_name": "HVAC maintenance", "category": "Facilities Management & Workplace Services", "country": "Switzerland", "supplier_name": None, "unit_of_measure": "Per Service", "base_price": None},
    {"name": "Security Guard Services – Day Shift", "unspsc_code": "92121504", "unspsc_name": "Guard services", "category": "Facilities Management & Workplace Services", "country": "Brazil", "supplier_name": "Siemens Smart Infrastructure", "unit_of_measure": "Per Hour", "base_price": 25.00},
    {"name": "Digital Marketing Strategy Services", "unspsc_code": "80171607", "unspsc_name": "Digital marketing", "category": "Digital Marketing & Creative Agency Services", "country": "Greece", "supplier_name": None, "unit_of_measure": "Per Month", "base_price": None},
    {"name": "Search Engine Optimization (SEO) Services", "unspsc_code": "80171608", "unspsc_name": "SEO services", "category": "Digital Marketing & Creative Agency Services", "country": "Switzerland", "supplier_name": "Tata Consultancy Services", "unit_of_measure": "Per Month", "base_price": 2500.00},
    {"name": "Video Production Services – Corporate", "unspsc_code": "82131602", "unspsc_name": "Video production", "category": "Digital Marketing & Creative Agency Services", "country": "Argentina", "supplier_name": "Dentsu International", "unit_of_measure": "Per Day", "base_price": 1500.00},
    {"name": "Desktop Support Services – Onsite – L1", "unspsc_code": "81112106", "unspsc_name": "Computer hardware support services", "category": "IT & Workplace Technology Services", "country": "Greece", "supplier_name": None, "unit_of_measure": "Per Hour", "base_price": None},
    {"name": "Desktop Support Services – Remote – L1", "unspsc_code": "81112107", "unspsc_name": "Remote technical support", "category": "IT & Workplace Technology Services", "country": "UAE", "supplier_name": "Infosys Digital Workplace", "unit_of_measure": "Per Hour", "base_price": 45.00},
    {"name": "Hardware Break/Fix Services – Workspace IT", "unspsc_code": "81112306", "unspsc_name": "Hardware maintenance services", "category": "IT & Workplace Technology Services", "country": "Spain", "supplier_name": "ABM Industries ES", "unit_of_measure": "Per Call", "base_price": 125.00},
    {"name": "Cloud Migration Assessment Services", "unspsc_code": "81101524", "unspsc_name": "Digital transformation consulting", "category": "IT & Workplace Technology Services", "country": "UK", "supplier_name": "Publicis Media GB", "unit_of_measure": "Per Day", "base_price": 2000.00},
    {"name": "Health & Safety Audit Services – Site Level", "unspsc_code": "81101508", "unspsc_name": "Facility inspection services", "category": "HSE, Quality & Compliance Services", "country": "Bulgaria", "supplier_name": None, "unit_of_measure": "Per Day", "base_price": None},
    {"name": "Fire Safety Risk Assessment Services", "unspsc_code": "92121702", "unspsc_name": "Fire safety consulting services", "category": "HSE, Quality & Compliance Services", "country": "Germany", "supplier_name": "Ricoh Managed Services DE", "unit_of_measure": "Per Day", "base_price": 800.00},
    {"name": "ISO 9001 Certification Support Services", "unspsc_code": "81101512", "unspsc_name": "Quality management consulting", "category": "HSE, Quality & Compliance Services", "country": "Finland", "supplier_name": None, "unit_of_measure": "Per Project", "base_price": None},
    {"name": "Warehouse Labor Services – General", "unspsc_code": "78131601", "unspsc_name": "Warehousing services", "category": "Logistics, Warehouse & Supply Chain Services", "country": "Peru", "supplier_name": None, "unit_of_measure": "Per Hour", "base_price": None},
    {"name": "Import Customs Clearance Support Services", "unspsc_code": "80111509", "unspsc_name": "Customs support services", "category": "Logistics, Warehouse & Supply Chain Services", "country": "India", "supplier_name": "Genpact Enterprise IT", "unit_of_measure": "Per Hour", "base_price": 75.00},
    {"name": "Supply Chain Process Mapping Services", "unspsc_code": "81101503", "unspsc_name": "Process mapping services", "category": "Logistics, Warehouse & Supply Chain Services", "country": "Chile", "supplier_name": "WPP Group (GroupM)", "unit_of_measure": "Per Service", "base_price": 3500.00},
    {"name": "Legal Document Review Services – Standard", "unspsc_code": "80121602", "unspsc_name": "Legal review services", "category": "Corporate & Business Support Services", "country": "Bulgaria", "supplier_name": None, "unit_of_measure": "Per Hour", "base_price": None},
    {"name": "Contract Drafting Support Services", "unspsc_code": "80121603", "unspsc_name": "Contract drafting services", "category": "Corporate & Business Support Services", "country": "Ireland", "supplier_name": "SUEZ Recycling & Recovery IE", "unit_of_measure": "Per Hour", "base_price": 150.00},
]

# InfoCoin Rewards
INFOCOIN_REWARDS = [
    {"id": "1", "name": "Premium Branded Jacket", "description": "High-quality insulated jacket with Infosys branding", "coins_required": 5000, "image_url": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400", "category": "Apparel"},
    {"id": "2", "name": "Executive Leather Portfolio", "description": "Genuine leather portfolio with notepad and card holder", "coins_required": 3000, "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400", "category": "Accessories"},
    {"id": "3", "name": "Branded Cap", "description": "Premium cotton cap with embroidered logo", "coins_required": 1000, "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400", "category": "Apparel"},
    {"id": "4", "name": "Stainless Steel Coffee Mug", "description": "Double-walled insulated mug with lid", "coins_required": 800, "image_url": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400", "category": "Drinkware"},
    {"id": "5", "name": "Executive Pen Set", "description": "Premium ballpoint and rollerball pen set in gift box", "coins_required": 1500, "image_url": "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400", "category": "Stationery"},
    {"id": "6", "name": "Wireless Power Bank", "description": "10000mAh wireless charging power bank", "coins_required": 2500, "image_url": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400", "category": "Electronics"},
]

# Auth Routes
@api_router.post("/auth/login", response_model=UserResponse)
async def login(user_data: UserLogin):
    # Demo login - accept any credentials with demo prefix
    if not user_data.email or not user_data.password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    # Check if user exists or create demo user
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    
    if existing_user:
        # Update country if different
        if existing_user.get("country") != user_data.country:
            await db.users.update_one(
                {"email": user_data.email},
                {"$set": {"country": user_data.country}}
            )
            existing_user["country"] = user_data.country
        user = existing_user
    else:
        # Create new demo user
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.email.split("@")[0].title(),
            "country": user_data.country,
            "info_coins": 2500,  # Starting bonus
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    
    currency = COUNTRY_CURRENCIES.get(user_data.country, COUNTRY_CURRENCIES["USA"])
    token = create_jwt_token(user["id"], user["email"])
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        country=user_data.country,
        currency=currency,
        info_coins=user.get("info_coins", 0),
        token=token
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
    return {
        **current_user,
        "currency": currency
    }

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
    """Search products with realistic distribution:
    - 70% with delivery partners
    - 20% quotation required
    - 10% not found (returns RFQ option)
    """
    currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
    results = []
    
    # Generate mock products based on search
    search_term = q.lower()
    matching_categories = [c for c in MRO_CATEGORIES if search_term in c.lower()] if search_term else MRO_CATEGORIES[:10]
    matching_brands = [b for b in MRO_BRANDS if search_term in b.lower()] if search_term else MRO_BRANDS[:10]
    
    if category:
        matching_categories = [c for c in matching_categories if c.lower() == category.lower()] or [category]
    if brand:
        matching_brands = [b for b in matching_brands if b.lower() == brand.lower()] or [brand]
    
    # Generate products
    for i in range(limit):
        cat = random.choice(matching_categories if matching_categories else MRO_CATEGORIES)
        br = random.choice(matching_brands if matching_brands else MRO_BRANDS)
        product = generate_product_data(i + (page - 1) * limit, cat, br)
        
        # Determine result type based on random distribution
        rand = random.random()
        
        if rand < 0.70:  # 70% with delivery partners
            partner_count = random.choice([1, 2, 3])
            delivery_partners = generate_delivery_partners(product["base_price"], partner_count)
            result_type = "with_partner"
            price = delivery_partners[0].price if delivery_partners else product["base_price"]
            lead_time = delivery_partners[0].lead_time_days if delivery_partners else 5
        elif rand < 0.90:  # 20% quotation required
            delivery_partners = []
            result_type = "quotation_required"
            price = None
            lead_time = None
        else:  # 10% not found
            continue  # Skip to simulate not found
        
        # Get alternates for products with partners
        alternates = get_alternate_products(product, br) if result_type == "with_partner" else []
        
        results.append(ProductSearchResult(
            id=product["id"],
            name=product["name"],
            description=product["description"],
            category=product["category"],
            brand=product["brand"],
            sku=product["sku"],
            price=round(price * currency["rate"], 2) if price else None,
            currency_code=currency["code"],
            currency_symbol=currency["symbol"],
            unit=product["unit"],
            image_url=product["image_url"],
            spec_document_url=product["spec_document_url"],
            lead_time_days=lead_time,
            delivery_partners=[
                DeliveryPartner(
                    partner_id=dp.partner_id,
                    price=round(dp.price * currency["rate"], 2),
                    lead_time_days=dp.lead_time_days,
                    available_quantity=dp.available_quantity
                ) for dp in delivery_partners
            ] if result_type == "with_partner" else [],
            has_delivery_partner=result_type == "with_partner",
            alternate_products=[
                {**alt, "price": round(alt["price"] * currency["rate"], 2)}
                for alt in alternates
            ],
            result_type=result_type
        ))
    
    # Add "not found" results for 10% simulation
    not_found_count = max(1, int(limit * 0.1))
    
    return {
        "results": results,
        "total": 3000000,  # 3M+ products
        "page": page,
        "limit": limit,
        "categories": MRO_CATEGORIES,
        "brands": MRO_BRANDS,
        "not_found_count": not_found_count,
        "show_rfq_option": len(results) < limit * 0.5  # Show RFQ if few results
    }

@api_router.get("/products/{product_id}/inventory")
async def check_inventory(product_id: str, current_user: dict = Depends(get_current_user)):
    """Check real-time inventory availability"""
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
    return {"categories": MRO_CATEGORIES}

@api_router.get("/products/brands")
async def get_brands():
    return {"brands": MRO_BRANDS}

# Services Routes
@api_router.get("/services/search")
async def search_services(
    q: str = Query("", description="Search query"),
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Search services with distribution:
    - 40% with supplier mapped
    - 10% quotation required
    - 50% not found (RFQ option)
    """
    currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
    results = []
    
    search_term = q.lower()
    
    # Filter services based on search
    filtered_services = SERVICES_DATA.copy()
    if search_term:
        filtered_services = [s for s in SERVICES_DATA if search_term in s["name"].lower() or search_term in s["category"].lower()]
    if category:
        filtered_services = [s for s in filtered_services if s["category"].lower() == category.lower()]
    
    if not filtered_services:
        filtered_services = SERVICES_DATA[:10]
    
    for service in filtered_services[:limit]:
        rand = random.random()
        
        if rand < 0.40 and service["supplier_name"]:  # 40% with supplier
            result_type = "with_supplier"
            price = service["base_price"]
            has_supplier = True
        elif rand < 0.50:  # 10% quotation required
            result_type = "quotation_required"
            price = None
            has_supplier = False
        else:  # 50% not found
            result_type = "not_found"
            price = None
            has_supplier = False
        
        results.append(ServiceSearchResult(
            id=str(uuid.uuid4()),
            name=service["name"],
            description=f"{service['name']}. Professional service meeting industry standards.",
            category=service["category"],
            unspsc_code=service["unspsc_code"],
            unspsc_name=service["unspsc_name"],
            unit_of_measure=service["unit_of_measure"],
            price=round(price * currency["rate"], 2) if price else None,
            currency_code=currency["code"],
            currency_symbol=currency["symbol"],
            pricing_model=service["unit_of_measure"],
            supplier_name=service["supplier_name"] if has_supplier else None,
            has_supplier=has_supplier,
            result_type=result_type
        ))
    
    return {
        "results": results,
        "total": 100000,  # 100K+ services
        "page": page,
        "limit": limit,
        "categories": SERVICE_CATEGORIES
    }

@api_router.get("/services/categories")
async def get_service_categories():
    return {"categories": SERVICE_CATEGORIES}

# RFQ Routes
@api_router.post("/rfq/submit")
async def submit_rfq(rfq: RFQCreate, current_user: dict = Depends(get_current_user)):
    """Submit a free text RFQ for product or service"""
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.rfqs.insert_one(rfq_doc)
    
    # Award InfoCoins for RFQ submission
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"info_coins": 50}}
    )
    
    return {
        "message": "RFQ submitted successfully. You will receive quotes within 24-48 hours.",
        "rfq_id": rfq_doc["id"],
        "coins_earned": 50
    }

@api_router.get("/rfq/list")
async def list_rfqs(current_user: dict = Depends(get_current_user)):
    rfqs = await db.rfqs.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return {"rfqs": rfqs}

# Quotation Routes
@api_router.post("/quotation/request")
async def request_quotation(request: QuotationRequest, current_user: dict = Depends(get_current_user)):
    """Request instant quotation for products without delivery partners"""
    quote_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "product_id": request.product_id,
        "product_name": request.product_name,
        "quantity": request.quantity,
        "notes": request.notes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quotations.insert_one(quote_doc)
    
    return {
        "message": "Quotation request sent to 100+ Infosys distributors. Expect responses within 4-8 hours.",
        "quotation_id": quote_doc["id"]
    }

@api_router.get("/quotation/list")
async def list_quotations(current_user: dict = Depends(get_current_user)):
    quotations = await db.quotations.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return {"quotations": quotations}

# Order Routes
@api_router.post("/orders/create")
async def create_order(items: List[OrderItem], current_user: dict = Depends(get_current_user)):
    currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
    total = sum(item.total_price for item in items)
    
    order = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "items": [item.model_dump() for item in items],
        "total_amount": total,
        "currency_code": currency["code"],
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "estimated_delivery": (datetime.now(timezone.utc) + timedelta(days=random.randint(3, 10))).isoformat()
    }
    
    await db.orders.insert_one(order)
    
    # Award InfoCoins (1 coin per $10 spent)
    coins = int(total / 10)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"info_coins": coins}}
    )
    
    return {
        "message": "Order placed successfully",
        "order_id": order["id"],
        "coins_earned": coins
    }

@api_router.get("/orders/history")
async def get_order_history(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# Repeat Orders Routes
@api_router.post("/repeat-orders/create")
async def create_repeat_order(
    product_id: str,
    product_name: str,
    quantity: int,
    frequency: str,
    current_user: dict = Depends(get_current_user)
):
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
    result = await db.repeat_orders.update_one(
        {"id": repeat_order_id, "user_id": current_user["id"]},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Repeat order not found")
    return {"message": "Repeat order cancelled"}

# Bulk Upload Routes
@api_router.post("/bulk/upload")
async def bulk_upload(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Process bulk Excel upload and search for products"""
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
        
        # Simulate search - 70% found, 30% not found
        if random.random() < 0.70:
            product = generate_product_data(random.randint(1, 10000), random.choice(MRO_CATEGORIES), random.choice(MRO_BRANDS))
            results.append({
                "search_term": product_name,
                "found": True,
                "product": {
                    "id": product["id"],
                    "name": product["name"],
                    "price": round(product["base_price"] * currency["rate"], 2),
                    "currency": currency["symbol"],
                    "available_quantity": random.randint(16, 2098)
                },
                "requested_quantity": quantity
            })
            found += 1
        else:
            results.append({
                "search_term": product_name,
                "found": False,
                "product": None,
                "requested_quantity": quantity
            })
            not_found += 1
    
    return BulkUploadResult(
        total_items=found + not_found,
        found_items=found,
        not_found_items=not_found,
        results=results
    )

# InfoCoins Routes
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
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"info_coins": -reward["coins_required"]}}
    )
    
    redemption = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "reward_id": reward_id,
        "reward_name": reward["name"],
        "coins_spent": reward["coins_required"],
        "status": "processing",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.redemptions.insert_one(redemption)
    
    return {"message": f"Successfully redeemed {reward['name']}! Your gift will be shipped within 5-7 business days."}

# Chat Routes
@api_router.post("/chat/message")
async def chat_message(chat: ChatMessage, current_user: dict = Depends(get_current_user)):
    """InfoConnect AI Chatbot"""
    session_id = chat.session_id or str(uuid.uuid4())
    
    system_message = """You are InfoConnect, the AI assistant for OMNISupply.io - Infosys's enterprise procurement platform. 
    You help users with:
    - Finding products and services in the catalog
    - Understanding pricing and delivery options
    - Submitting RFQs and quotation requests
    - Managing orders and repeat orders
    - Using InfoCoins rewards program
    - Bulk upload functionality
    
    Be helpful, professional, and concise. Guide users to the right features of the platform."""
    
    try:
        llm = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=chat.message)
        response = await llm.send_message(user_message)
        
        # Store chat history
        await db.chat_history.insert_one({
            "session_id": session_id,
            "user_id": current_user["id"],
            "user_message": chat.message,
            "bot_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logging.error(f"Chat error: {e}")
        return {
            "response": "I'm here to help! You can search for products, check order history, manage repeat orders, or explore InfoCoins rewards. What would you like to do?",
            "session_id": session_id
        }

@api_router.get("/chat/history")
async def get_chat_history(session_id: str, current_user: dict = Depends(get_current_user)):
    history = await db.chat_history.find(
        {"session_id": session_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    return {"history": history}

# Stats for landing page
@api_router.get("/stats")
async def get_stats():
    return {
        "total_products": "30M+",
        "total_services": "100K+",
        "total_categories": 35,
        "total_brands": len(MRO_BRANDS),
        "integrations": ["Coupa", "Ariba", "Ivalua", "SAP", "Oracle"],
        "countries_served": len(COUNTRY_CURRENCIES)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

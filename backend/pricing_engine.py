"""
Pricing Engine for OMNISupply.io
Handles category-level discounts, Infosys pricing, and margin calculations

Pricing Model:
- List Price: Original supplier catalog price
- Infosys Purchase Price: List Price - Category Discount (what Infosys pays)
- Margin: List Price - Infosys Purchase Price
- Infosys Selling Price: List Price - (70% × Margin)
  - Infosys keeps 30% of margin
  - Customer gets 70% of margin as discount
"""

import os
import logging
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import pandas as pd
import io
import re

logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Default discount mappings by supplier (based on provided discount tables)
DEFAULT_FASTENAL_DISCOUNTS = {
    "Abrasives": 30,
    "Adhesives, Sealants, and Tape": 30,
    "Adhesives & Sealants": 30,
    "Cutting Tools and Metalworking": 30,
    "Cutting Tools": 30,
    "Electrical": 35,
    "Electronics and Batteries": 30,
    "Electronics & Batteries": 30,
    "Fasteners": 50,
    "Fasteners & Hardware": 50,
    "Fleet and Automotive": 35,
    "Fleet & Automotive": 35,
    "HVAC and Refrigeration": 25,
    "HVAC & Refrigeration": 25,
    "Hardware and Building Supplies": 40,
    "Hardware & Building Supplies": 40,
    "Hydraulics": 30,
    "Hydraulics & Pneumatics": 30,
    "Janitorial and Cleaning": 35,
    "Cleaning & Janitorial": 35,
    "Lighting": 30,
    "Electrical & Lighting": 30,
    "Lubricants, Coolants, and Fluids": 30,
    "Lubrication": 30,
    "Machinery": 20,
    "Material Handling, Lifting and Rigging": 25,
    "Material Handling": 25,
    "Motors": 20,
    "Motors & Drives": 20,
    "Office and Breakroom Supplies": 20,
    "Outdoor Products and Equipment": 25,
    "Packaging and Shipping Products": 25,
    "Packaging & Shipping": 25,
    "Paint and Painting Supplies": 30,
    "Plumbing": 35,
    "Pneumatics": 30,
    "Power Transmission": 30,
    "Bearings & Power Transmission": 30,
    "Pumps": 20,
    "Raw Materials": 25,
    "Safety": 30,
    "Safety & PPE": 30,
    "Sealing": 30,
    "Security": 30,
    "Test and Measurement": 25,
    "Test & Measurement": 25,
    "Tools and Equipment": 30,
    "Hand Tools": 30,
    "Power Tools": 30,
    "Corded Power Tools": 23,
    "Cordless Power Tools": 23,
    "Trainings, Resources and Sustainability": 30,
    "Welding": 30,
    "Filtration": 30,
    "Laboratory Supplies": 25,
    "Industrial Automation": 25,
    "Storage & Organization": 30,
    "IT Equipment - Laptops": 15,
    "IT Equipment - Monitors": 15,
    "IT Equipment - Networking": 15,
    "IT Equipment - Servers": 15,
    "IT Equipment - Peripherals": 15,
    "Industrial Coding": 25,
}

# Grainger has similar discounts - will be loaded from uploaded contract
DEFAULT_GRAINGER_DISCOUNTS = {
    "Safety": 35,
    "Safety & PPE": 35,
    "Electrical": 30,
    "Electrical & Lighting": 30,
    "Plumbing": 32,
    "HVAC": 28,
    "HVAC & Refrigeration": 28,
    "Material Handling": 30,
    "Motors": 25,
    "Motors & Drives": 25,
    "Power Transmission": 28,
    "Bearings & Power Transmission": 28,
    "Hand Tools": 35,
    "Power Tools": 30,
    "Abrasives": 33,
    "Adhesives, Sealants & Tape": 30,
    "Adhesives & Sealants": 30,
    "Fasteners": 40,
    "Fasteners & Hardware": 40,
    "Lubrication": 28,
    "Welding": 30,
    "Cutting Tools": 32,
    "Test & Measurement": 27,
    "Janitorial": 35,
    "Cleaning & Janitorial": 35,
    "Pumps": 25,
    "Hydraulics & Pneumatics": 30,
    "Filtration": 32,
    "Raw Materials": 25,
    "Storage & Organization": 30,
    "Packaging & Shipping": 28,
    "IT Equipment - Laptops": 12,
    "IT Equipment - Monitors": 12,
    "IT Equipment - Networking": 15,
}

# Motion discounts (similar structure)
DEFAULT_MOTION_DISCOUNTS = {
    "Bearings": 35,
    "Bearings & Power Transmission": 35,
    "Power Transmission": 32,
    "Motors": 28,
    "Motors & Drives": 28,
    "Electrical": 25,
    "Electrical & Lighting": 25,
    "Hydraulics": 30,
    "Hydraulics & Pneumatics": 30,
    "Pneumatics": 30,
    "Linear Motion": 28,
    "Material Handling": 25,
    "Safety": 30,
    "Safety & PPE": 30,
    "Hand Tools": 30,
    "Lubrication": 30,
    "Seals": 32,
    "Sealing": 32,
    "Filtration": 30,
    "Cutting Tools": 28,
    "Abrasives": 30,
}

# UNSPSC to Category mapping for AI-powered classification
UNSPSC_CATEGORY_MAP = {
    "31170000": "Bearings & Power Transmission",
    "39110000": "Electrical & Lighting",
    "31160000": "Fasteners & Hardware",
    "27110000": "Hand Tools",
    "27112000": "Power Tools",
    "46180000": "Safety & PPE",
    "31190000": "Abrasives",
    "31200000": "Adhesives & Sealants",
    "47130000": "Cleaning & Janitorial",
    "40100000": "HVAC & Refrigeration",
    "40140000": "Hydraulics & Pneumatics",
    "41110000": "Test & Measurement",
    "15120000": "Lubrication",
    "24100000": "Material Handling",
    "26100000": "Motors & Drives",
    "24110000": "Packaging & Shipping",
    "40170000": "Pipe, Valves & Fittings",
    "40150000": "Pumps",
    "11100000": "Raw Materials",
    "23270000": "Welding",
    "32150000": "Industrial Automation",
    "56100000": "Storage & Organization",
    "43211500": "IT Equipment - Laptops",
    "43211900": "IT Equipment - Monitors",
    "43222600": "IT Equipment - Networking",
    "43211800": "IT Equipment - Servers",
    "43211700": "IT Equipment - Peripherals",
    "40161500": "Filtration",
    "44100000": "Industrial Coding",
}


async def get_supplier_contracts() -> Dict[str, Dict[str, float]]:
    """Get all supplier contracts with category discounts from database"""
    contracts = {}
    cursor = db.supplier_contracts.find({"status": "active"})
    async for contract in cursor:
        supplier = contract.get("supplier_name", "").lower()
        discounts = contract.get("category_discounts", {})
        contracts[supplier] = discounts
    return contracts


async def get_category_discount(supplier: str, category: str) -> float:
    """
    Get the discount percentage for a supplier/category combination.
    Checks database first, falls back to defaults.
    """
    # Check database for custom contract
    contract = await db.supplier_contracts.find_one({
        "supplier_name": {"$regex": supplier, "$options": "i"},
        "status": "active"
    })
    
    if contract:
        discounts = contract.get("category_discounts", {})
        # Try exact match first
        if category in discounts:
            return float(discounts[category])
        # Try case-insensitive match
        for cat, disc in discounts.items():
            if cat.lower() == category.lower():
                return float(disc)
    
    # Fall back to defaults based on supplier
    supplier_lower = supplier.lower()
    
    if "fastenal" in supplier_lower:
        defaults = DEFAULT_FASTENAL_DISCOUNTS
    elif "grainger" in supplier_lower:
        defaults = DEFAULT_GRAINGER_DISCOUNTS
    elif "motion" in supplier_lower:
        defaults = DEFAULT_MOTION_DISCOUNTS
    else:
        defaults = DEFAULT_FASTENAL_DISCOUNTS  # Default to Fastenal rates
    
    # Try exact match
    if category in defaults:
        return float(defaults[category])
    
    # Try case-insensitive partial match
    category_lower = category.lower()
    for cat, disc in defaults.items():
        if category_lower in cat.lower() or cat.lower() in category_lower:
            return float(disc)
    
    # Default discount if no match found
    return 25.0


def map_unspsc_to_category(unspsc: str) -> Optional[str]:
    """Map UNSPSC code to category name"""
    if not unspsc:
        return None
    
    # Try exact match
    if unspsc in UNSPSC_CATEGORY_MAP:
        return UNSPSC_CATEGORY_MAP[unspsc]
    
    # Try prefix match (first 6 digits)
    prefix = unspsc[:6] + "00" if len(unspsc) >= 6 else unspsc
    if prefix in UNSPSC_CATEGORY_MAP:
        return UNSPSC_CATEGORY_MAP[prefix]
    
    # Try 4-digit prefix
    prefix4 = unspsc[:4] + "0000" if len(unspsc) >= 4 else unspsc
    if prefix4 in UNSPSC_CATEGORY_MAP:
        return UNSPSC_CATEGORY_MAP[prefix4]
    
    return None


async def calculate_pricing(
    list_price: float,
    supplier: str,
    category: str,
    unspsc_code: str = None
) -> Dict[str, Any]:
    """
    Calculate all price tiers for a product.
    
    Returns:
        {
            "list_price": float,           # Original catalog price
            "infosys_purchase_price": float,  # What Infosys pays (cost)
            "margin": float,               # List - Purchase
            "infosys_keeps": float,        # 30% of margin
            "customer_discount": float,    # 70% of margin
            "selling_price": float,        # List - customer_discount
            "discount_percentage": float,  # Savings as percentage
            "category_discount": float,    # Contract discount percentage
        }
    """
    if list_price <= 0:
        return {
            "list_price": 0,
            "infosys_purchase_price": 0,
            "margin": 0,
            "infosys_keeps": 0,
            "customer_discount": 0,
            "selling_price": 0,
            "discount_percentage": 0,
            "category_discount": 0,
        }
    
    # Determine category from UNSPSC if not provided
    effective_category = category
    if not effective_category and unspsc_code:
        effective_category = map_unspsc_to_category(unspsc_code)
    if not effective_category:
        effective_category = "General"
    
    # Get discount percentage
    discount_pct = await get_category_discount(supplier, effective_category)
    
    # Calculate prices
    infosys_purchase_price = list_price * (1 - discount_pct / 100)
    margin = list_price - infosys_purchase_price
    infosys_keeps = margin * 0.30  # Infosys keeps 30%
    customer_discount = margin * 0.70  # Customer gets 70%
    selling_price = list_price - customer_discount
    
    # Calculate effective discount percentage for customer
    discount_percentage = (customer_discount / list_price) * 100 if list_price > 0 else 0
    
    return {
        "list_price": round(list_price, 2),
        "infosys_purchase_price": round(infosys_purchase_price, 2),
        "margin": round(margin, 2),
        "infosys_keeps": round(infosys_keeps, 2),
        "customer_discount": round(customer_discount, 2),
        "selling_price": round(selling_price, 2),
        "discount_percentage": round(discount_percentage, 1),
        "category_discount": discount_pct,
    }


async def save_supplier_contract(
    supplier_name: str,
    category_discounts: Dict[str, float],
    countries: List[str] = None,
    contract_file: str = None,
    effective_date: datetime = None,
    expiry_date: datetime = None
) -> Dict:
    """Save or update supplier contract with category discounts"""
    contract_data = {
        "supplier_name": supplier_name,
        "category_discounts": category_discounts,
        "countries": countries or ["Global"],
        "contract_file": contract_file,
        "effective_date": effective_date or datetime.now(timezone.utc),
        "expiry_date": expiry_date,
        "status": "active",
        "updated_at": datetime.now(timezone.utc),
    }
    
    result = await db.supplier_contracts.update_one(
        {"supplier_name": {"$regex": f"^{supplier_name}$", "$options": "i"}},
        {"$set": contract_data},
        upsert=True
    )
    
    return {
        "success": True,
        "supplier": supplier_name,
        "categories_count": len(category_discounts),
        "modified": result.modified_count > 0,
        "upserted": result.upserted_id is not None
    }


async def parse_discount_file(file_content: bytes, filename: str) -> Dict[str, float]:
    """Parse discount percentages from an uploaded Excel file"""
    try:
        df = pd.read_excel(io.BytesIO(file_content))
        
        # Try to identify category and discount columns
        category_col = None
        discount_col = None
        
        for col in df.columns:
            col_lower = str(col).lower()
            if 'category' in col_lower or 'name' in col_lower:
                category_col = col
            elif 'discount' in col_lower or '%' in col_lower or 'percent' in col_lower:
                discount_col = col
        
        # If not found by name, use first two columns
        if category_col is None and len(df.columns) >= 2:
            category_col = df.columns[0]
            discount_col = df.columns[1]
        
        discounts = {}
        for _, row in df.iterrows():
            category = str(row[category_col]).strip()
            discount_val = row[discount_col]
            
            # Parse discount value (handle "30%", "30", etc.)
            if pd.notna(discount_val):
                discount_str = str(discount_val).replace('%', '').strip()
                try:
                    discount = float(discount_str)
                    if discount > 0 and discount <= 100:
                        discounts[category] = discount
                except ValueError:
                    continue
        
        return discounts
    except Exception as e:
        logger.error(f"Error parsing discount file: {e}")
        return {}


def normalize_category_name(category: str) -> str:
    """Normalize category name for consistent matching"""
    if not category:
        return ""
    
    # Standard mapping for common variations
    mappings = {
        "abrasives": "Abrasives",
        "adhesives": "Adhesives & Sealants",
        "sealants": "Adhesives & Sealants",
        "tape": "Adhesives & Sealants",
        "bearings": "Bearings & Power Transmission",
        "power transmission": "Bearings & Power Transmission",
        "cleaning": "Cleaning & Janitorial",
        "janitorial": "Cleaning & Janitorial",
        "cutting tools": "Cutting Tools",
        "metalworking": "Cutting Tools",
        "electrical": "Electrical & Lighting",
        "lighting": "Electrical & Lighting",
        "fasteners": "Fasteners & Hardware",
        "hardware": "Fasteners & Hardware",
        "filtration": "Filtration",
        "hand tools": "Hand Tools",
        "tools": "Hand Tools",
        "hvac": "HVAC & Refrigeration",
        "refrigeration": "HVAC & Refrigeration",
        "hydraulics": "Hydraulics & Pneumatics",
        "pneumatics": "Hydraulics & Pneumatics",
        "industrial automation": "Industrial Automation",
        "automation": "Industrial Automation",
        "it equipment": "IT Equipment",
        "laptops": "IT Equipment - Laptops",
        "monitors": "IT Equipment - Monitors",
        "networking": "IT Equipment - Networking",
        "laboratory": "Laboratory Supplies",
        "lab supplies": "Laboratory Supplies",
        "lubrication": "Lubrication",
        "lubricants": "Lubrication",
        "material handling": "Material Handling",
        "motors": "Motors & Drives",
        "drives": "Motors & Drives",
        "packaging": "Packaging & Shipping",
        "shipping": "Packaging & Shipping",
        "plumbing": "Plumbing",
        "power tools": "Power Tools",
        "pumps": "Pumps",
        "raw materials": "Raw Materials",
        "safety": "Safety & PPE",
        "ppe": "Safety & PPE",
        "storage": "Storage & Organization",
        "organization": "Storage & Organization",
        "test": "Test & Measurement",
        "measurement": "Test & Measurement",
        "welding": "Welding",
    }
    
    category_lower = category.lower().strip()
    
    # Check for direct or partial matches
    for key, value in mappings.items():
        if key in category_lower:
            return value
    
    # Return original with title case if no match
    return category.strip().title()

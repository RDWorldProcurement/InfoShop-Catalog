from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Form
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

# Translation cache to avoid repeated LLM calls
translation_cache = {}

# Language mapping for translation
LANGUAGE_NAMES = {
    "en": "English",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "nl": "Dutch"
}

async def translate_text(text: str, target_lang: str, context: str = "product") -> str:
    """Translate text using Emergent LLM with caching"""
    if not text or target_lang == "en":
        return text
    
    # Check cache first
    cache_key = f"{target_lang}:{hashlib.md5(text.encode()).hexdigest()}"
    if cache_key in translation_cache:
        return translation_cache[cache_key]
    
    # Check MongoDB cache
    cached = await db.translations.find_one({"cache_key": cache_key})
    if cached:
        translation_cache[cache_key] = cached["translation"]
        return cached["translation"]
    
    try:
        target_language = LANGUAGE_NAMES.get(target_lang, "French")
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate_{cache_key[:8]}",
            system_message=f"You are a professional B2B e-commerce product translator. Translate the following {context} text from English to {target_language}. Keep technical terms, brand names, model numbers, and specifications intact. Only provide the translation, no explanations."
        ).with_model("openai", "gpt-4o-mini")
        
        response = await chat.send_message(UserMessage(text=text))
        translated = response.strip() if response else text
        
        # Cache in memory and MongoDB
        translation_cache[cache_key] = translated
        await db.translations.update_one(
            {"cache_key": cache_key},
            {"$set": {"cache_key": cache_key, "original": text, "target_lang": target_lang, 
                     "translation": translated, "created_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        
        return translated
    except Exception as e:
        logger.error(f"Translation error: {e}")
        return text

async def translate_product(product: dict, target_lang: str) -> dict:
    """Translate all product text fields"""
    if target_lang == "en":
        return product
    
    translated = product.copy()
    
    # Translate key fields
    if product.get("name"):
        translated["name"] = await translate_text(product["name"], target_lang, "product name")
    if product.get("short_description"):
        translated["short_description"] = await translate_text(product["short_description"], target_lang, "product description")
    if product.get("full_description"):
        translated["full_description"] = await translate_text(product["full_description"], target_lang, "product description")
    if product.get("category"):
        translated["category"] = await translate_text(product["category"], target_lang, "category name")
    
    # Translate specifications
    if product.get("specifications"):
        translated_specs = {}
        for key, value in product["specifications"].items():
            translated_key = await translate_text(key, target_lang, "specification label")
            # Don't translate numeric values or technical specs
            if isinstance(value, str) and not any(c.isdigit() for c in value):
                translated_specs[translated_key] = await translate_text(value, target_lang, "specification value")
            else:
                translated_specs[translated_key] = value
        translated["specifications"] = translated_specs
    
    return translated

async def translate_service(service: dict, target_lang: str) -> dict:
    """Translate all service text fields"""
    if target_lang == "en":
        return service
    
    translated = service.copy()
    
    # Translate key fields
    if service.get("name"):
        translated["name"] = await translate_text(service["name"], target_lang, "service name")
    if service.get("short_description"):
        translated["short_description"] = await translate_text(service["short_description"], target_lang, "service description")
    if service.get("full_description"):
        translated["full_description"] = await translate_text(service["full_description"], target_lang, "service description")
    if service.get("category"):
        translated["category"] = await translate_text(service["category"], target_lang, "category name")
    if service.get("unit_of_measure"):
        translated["unit_of_measure"] = await translate_text(service["unit_of_measure"], target_lang, "pricing unit")
    
    # Translate service includes list
    if service.get("service_includes"):
        translated["service_includes"] = [
            await translate_text(item, target_lang, "service feature") 
            for item in service["service_includes"]
        ]
    
    return translated

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
    {"name": "IT Equipment - Laptops", "unspsc": "43211500", "icon": "laptop"},
    {"name": "IT Equipment - Monitors", "unspsc": "43211900", "icon": "monitor"},
    {"name": "IT Equipment - Networking", "unspsc": "43222600", "icon": "wifi"},
    {"name": "IT Equipment - Servers", "unspsc": "43211800", "icon": "server"},
    {"name": "IT Equipment - Peripherals", "unspsc": "43211700", "icon": "keyboard"},
]

# MRO Brands - using text-based display (logos removed due to external service reliability issues)
MRO_BRANDS = [
    {"name": "SKF", "logo": None, "color": "#005B94"},
    {"name": "3M", "logo": None, "color": "#FF0000"},
    {"name": "Henkel", "logo": None, "color": "#D40000"},
    {"name": "Bosch", "logo": None, "color": "#E30016"},
    {"name": "Siemens", "logo": None, "color": "#009999"},
    {"name": "ABB", "logo": None, "color": "#FF000F"},
    {"name": "Honeywell", "logo": None, "color": "#E31837"},
    {"name": "Parker", "logo": None, "color": "#004B87"},
    {"name": "Emerson", "logo": None, "color": "#63666A"},
    {"name": "Rockwell", "logo": None, "color": "#C8102E"},
    {"name": "Schneider Electric", "logo": None, "color": "#3DCD58"},
    {"name": "Mitsubishi Electric", "logo": None, "color": "#ED1C24"},
    {"name": "Omron", "logo": None, "color": "#0063AF"},
    {"name": "Festo", "logo": None, "color": "#0091D5"},
    {"name": "Fluke", "logo": None, "color": "#FFC20E"},
    {"name": "Makita", "logo": None, "color": "#00B1BC"},
    {"name": "DeWalt", "logo": None, "color": "#FEBD17"},
    {"name": "Milwaukee", "logo": None, "color": "#DB0032"},
    {"name": "Stanley", "logo": None, "color": "#FFCC00"},
    {"name": "Klein Tools", "logo": None, "color": "#FF6600"},
    {"name": "HP", "logo": None, "color": "#0096D6"},
    {"name": "Dell", "logo": None, "color": "#007DB8"},
    {"name": "Lenovo", "logo": None, "color": "#E2231A"},
    {"name": "LG", "logo": None, "color": "#A50034"},
    {"name": "Samsung", "logo": None, "color": "#1428A0"},
    {"name": "Cisco", "logo": None, "color": "#049FD9"},
    {"name": "ASUS", "logo": None, "color": "#00539B"},
    {"name": "Acer", "logo": None, "color": "#83B81A"},
    {"name": "BenQ", "logo": None, "color": "#5B2D87"},
    {"name": "Logitech", "logo": None, "color": "#00B8FC"},
]

# Product images hosted on Emergent CDN - product-specific matches
PRODUCT_IMAGE_URLS = {
    # Specific product images (brand-matched)
    "SKF Ball Bearing": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/5d11401880367c9ecb4d3d43cf84af6a95372bff44764d01080f72fdadaccc38.png",
    "3M Safety Helmet": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/d5fdc07665f86ea5f580ac7e6fd0e73c4925625f60f6055ebcda4f23f08d0431.png",
    "3M Safety Glasses": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/9c7ea6cfd47a7569144fd2bb61eb54feef71eabfcdda4f5f7fa2f001d3c668ad.png",
    "Bosch Drill": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/abca8f6c400eccd9885f40052859c77b18c5a13dbde5ed8763170d9ab7fd9c41.png",
    "Stanley Wrench": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/25e01814ef99f668b385220f94849941ba287aee8811756d6a673bc4069e2c85.png",
    "Gates Timing Belt": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/b339b39dd2001c7b78175f881458bfe5c1cc9ac85b875769eaabab2ed13b9ccd.png",
    "Schneider Circuit Breaker": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/1b06c8223f99520d00c70296b71296814d63202c0c3d150b627d2bb53ce629a6.png",
    "HP Laptop": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/f6f1caf66bd07154a37a0dadfa973a662a67d39d32552f5d51d73e7cec65e616.png",
    "Dell Monitor": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/08c23c33778bc9d3ce86d151e5eee5000a143292981570e9eb926791a48d5f62.png",
    "Cisco Switch": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/6663d8398909e7e6833d27291342928ba4b7567abeeb7570dc5c39af9136f127.png",
    "Henkel Adhesive": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/1ad744a50cda48b7b4ced8b7f15874c83dd722b367c119e969f45cb842db7b6f.png",
    "Philips LED Light": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/6339f73a3f393ecb8997ea7a9444a9068c2c829d743f44b928094ecf8464e143.png",
    # Category fallback images
    "Bearings & Power Transmission": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/5d11401880367c9ecb4d3d43cf84af6a95372bff44764d01080f72fdadaccc38.png",
    "Electrical & Lighting": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/1b06c8223f99520d00c70296b71296814d63202c0c3d150b627d2bb53ce629a6.png",
    "Fasteners & Hardware": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/77f9d6c3fedcd85729745ffaf16ab46b268ba0176386a36e9d3bd3d1b2e6c293.png",
    "Hand Tools": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/25e01814ef99f668b385220f94849941ba287aee8811756d6a673bc4069e2c85.png",
    "Power Tools": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/abca8f6c400eccd9885f40052859c77b18c5a13dbde5ed8763170d9ab7fd9c41.png",
    "Safety & PPE": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/d5fdc07665f86ea5f580ac7e6fd0e73c4925625f60f6055ebcda4f23f08d0431.png",
    "Abrasives": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/7ac37795d30541fe96a379b8ebc9a669a9f5534a1c47d157f2dcfce68eda8fde.png",
    "Adhesives & Sealants": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/1ad744a50cda48b7b4ced8b7f15874c83dd722b367c119e969f45cb842db7b6f.png",
    "Cleaning & Janitorial": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/899b4b3e6aceed339189fb8d0b0fa309930af38864a707139f102cc7b47c1bfd.png",
    "HVAC & Refrigeration": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/5deee0f39fbb43dd7a40094f3273b92017a5b99cb2f2a4ffe89656529a244bf5.png",
    "Hydraulics & Pneumatics": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/67b16a05b97dae42c11c9c72f6e05b8af5d7aec7f63f9dfbd8e237a3fd5fc463.png",
    "Laboratory Supplies": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/411bcb13dee27615e9b815fde695cdc27e5f05eee4347121309be34bbdb8c3e0.png",
    "Lubrication": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/e12637ed7080f9cc6f0ab4378314a9bf6991b40c91ff9c4c31ea98fd25d1aa62.png",
    "Material Handling": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/d3b288a3bc2eae93ca8304dff24b6a6c2fa3e071ff498bff6f994dc86e336ddf.png",
    "Motors & Drives": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/48eb714ed81a4debd0fcbb8614e5e4412263c16c00d900b645c44f969c378c75.png",
    "Packaging & Shipping": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/77f9d6c3fedcd85729745ffaf16ab46b268ba0176386a36e9d3bd3d1b2e6c293.png",
    "Pipe, Valves & Fittings": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/f33db98cd05c6baa652b94111e2425bcdc4313c5335f9673a214cb91bf2d2284.png",
    "Plumbing": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/f33db98cd05c6baa652b94111e2425bcdc4313c5335f9673a214cb91bf2d2284.png",
    "Pumps": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/67b16a05b97dae42c11c9c72f6e05b8af5d7aec7f63f9dfbd8e237a3fd5fc463.png",
    "Raw Materials": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/e937d26ba9dc90a270d3f1672abc004a7cbd5351be7177df115648759a328877.png",
    "Test & Measurement": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/411bcb13dee27615e9b815fde695cdc27e5f05eee4347121309be34bbdb8c3e0.png",
    "Welding": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/2e6b43c65ae6a6b6a4fa924c3f3f88f897cad2a707104ffdc57d165e3b1d04e8.png",
    "Industrial Automation": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/022021c9eb3d4350b596e47b5cbbc21f913a9ca5428f805d45b37108e6428799.png",
    "Cutting Tools": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/5f3ec0cc9e4246d05af7b1609a78a8d3c2c76abbebba2fcb9823ffac8851309d.png",
    "Storage & Organization": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/ad801ca5185620afbcc264b33f0c59dacf2085f9b98895eb624068ec3ebad64d.png",
    "IT Equipment - Laptops": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/f6f1caf66bd07154a37a0dadfa973a662a67d39d32552f5d51d73e7cec65e616.png",
    "IT Equipment - Monitors": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/08c23c33778bc9d3ce86d151e5eee5000a143292981570e9eb926791a48d5f62.png",
    "IT Equipment - Networking": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/6663d8398909e7e6833d27291342928ba4b7567abeeb7570dc5c39af9136f127.png",
    "IT Equipment - Servers": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/022021c9eb3d4350b596e47b5cbbc21f913a9ca5428f805d45b37108e6428799.png",
    "IT Equipment - Peripherals": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/075214c7f6dce1e67075c623d025158b3d3cac86e45217650f7d58db7662f1d6.png",
    "Safety Gloves": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/9f7011dbf936aa67ab41af039d39e363f5a435c0efbfbed8a069e7684f74ad25.png",
}

# Reward images for InfoCoins redemption
REWARD_IMAGE_URLS = {
    "Executive Jacket": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/7a28899414c059decd7892a76b2510a988cbd7721cd8cc81edb9db0b2d98abb8.png",
    "Insulated Tumbler": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/e20ad22b18b960ea85b19e85bf4ff46d506caa85fc150f5ed6f1b6f4b693fde8.png",
    "Leather Backpack": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/24f072b8fe320ed518c80d29f9dc4b59278746c3e30e7d4e9e4be2a654c9fb68.png",
    "Wireless Earbuds": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/f9f47c254925d769c605a9cacaf94508b5b86b3a75ca50b7ad1ea13892d9ead4.png",
    "Desk Organizer Set": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/41326a793c1dca20d6762573d31aba0fcb23091926051fb6868ffa92c39df981.png",
    "Smartwatch": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/4b7a4dd5c087a82d7316e8d008a8dc5946dcc6733dc8596fcea9bd56143dde46.png",
}

# Default fallback image
DEFAULT_PRODUCT_IMAGE = "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/7ac37795d30541fe96a379b8ebc9a669a9f5534a1c47d157f2dcfce68eda8fde.png"

# Service images hosted on Emergent CDN (guaranteed to work)
SERVICE_IMAGE_URLS = {
    "Network Installation Services": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/afdd726c02cc7d9e8690e91dc7c1b0a13c962c96325cef7d1eece4d48001fb82.png",
    "IT Equipment Installation & Setup": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/cff7a5158c43f81799d59a99494279b2c5f255b2610fe406a1ffe6934277c4a7.png",
    "Cybersecurity Services": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/88995698058a90986297157d130fa19ac15656bbe7ac2296b1949cbb9993e380.png",
    "IT Managed Services": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/f848c4af2e1f5caac71aa56dc1f1b9285fb801ad8e1ee77ad4185116211e3627.png",
    "Corporate & Business Support Services": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/49c83afc1a588e3c2810a205953d952ac31ad730ca2f9871863edeeea2072a83.png",
    "Digital Marketing & Creative Agency Services": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/3e0d7da8578b2c511105784ffde94733d5a947a499e7481de09ef3466e65afa6.png",
    "Facilities Management & Workplace Services": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/23544d6096e596b6e3954fec76d55a7fa874df0072512cd79110a2a41cce3b44.png",
    "HSE, Quality & Compliance Services": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/1e0527ecaf208bd7905092e337f70a54eabef0782a81bd6e510c8e4d5c3c18ac.png",
    "IT & Workplace Technology Services": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/cff7a5158c43f81799d59a99494279b2c5f255b2610fe406a1ffe6934277c4a7.png",
    "Logistics, Warehouse & Supply Chain Services": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/6810b3362e86e8ba23010897c9d6d3718dce4d1803e090213f94464944c1175b.png",
    "Temp Labor across Technical Skilled Capabilities": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/ec1d202cfaeb46233ae208411d641185f676c426d6219f30dc8a7f6d57ccaa7b.png",
    "Server Installation": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/a1c30bd322a62ea6d441b12da74c66ca96707140958e1737c0d9a286f041a795.png",
    "WiFi Setup": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/88c4a88606ac13bb8e539641523213064945b830124a9c902aa9147532aa3c49.png",
    "Data Center Services": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/45b8605364d7a481ab4a4bf15be73f59f9761da18220b1efb363c134d7ce0fb4.png",
    "Equipment Maintenance": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/fd8c452c65505c4fa649fae356b50b7dcc945b4ca0d180088866270a0b7d86f5.png",
    "Training Services": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/8d3d10c922ac4516e87dff834b0b0f3d00633c1032b7667687f506addb1e98b3.png",
    "Quality Control": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/1e0527ecaf208bd7905092e337f70a54eabef0782a81bd6e510c8e4d5c3c18ac.png",
    "Commercial Cleaning": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/124d0636fdb6759f0b0e809e00fe07c91c12562a510f2da1e68cc2cb7a0fd266.png",
    # Digital Marketing Services Images
    "Social Media Marketing": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/3e0d7da8578b2c511105784ffde94733d5a947a499e7481de09ef3466e65afa6.png",
    "SEO Optimization": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/065098b74382dcef95f4d43a5acfec01cf7019a80344289d9bbcf29876951ecf.png",
    "Content Marketing": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/11858f0f46d7b769347af0396a64091c470e4cfaf679e89ea3f0d9bc9c197174.png",
    "Email Marketing": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/6643f65c20391b649166e5889b2700f56e38fbc70128635358567cc335c9ca9c.png",
    "PPC Advertising": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/06ee08e5c3b4256c9a72385c72da51dd6abf1464eab5586423dce224913af57d.png",
    "Brand Identity Design": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/317b64184657f818f660ec7fb260ac16010f4fb505facb3924e1b120b1ea17d2.png",
}

# Default fallback service image
DEFAULT_SERVICE_IMAGE = "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/49c83afc1a588e3c2810a205953d952ac31ad730ca2f9871863edeeea2072a83.png"

# Service Categories with UNSPSC codes
SERVICE_CATEGORIES = [
    {"name": "Corporate & Business Support Services", "unspsc": "80100000", "icon": "briefcase"},
    {"name": "Digital Marketing & Creative Agency Services", "unspsc": "82100000", "icon": "palette"},
    {"name": "Facilities Management & Workplace Services", "unspsc": "72100000", "icon": "building"},
    {"name": "HSE, Quality & Compliance Services", "unspsc": "77100000", "icon": "shield-check"},
    {"name": "IT & Workplace Technology Services", "unspsc": "81110000", "icon": "monitor"},
    {"name": "Logistics, Warehouse & Supply Chain Services", "unspsc": "78100000", "icon": "truck"},
    {"name": "Temp Labor across Technical Skilled Capabilities", "unspsc": "80110000", "icon": "users"},
    {"name": "Network Installation Services", "unspsc": "81111800", "icon": "wifi"},
    {"name": "IT Equipment Installation & Setup", "unspsc": "81112200", "icon": "server"},
    {"name": "IT Managed Services", "unspsc": "81112300", "icon": "cloud"},
    {"name": "Cybersecurity Services", "unspsc": "81112500", "icon": "shield"},
]

# Detailed IT Products Catalog
IT_PRODUCTS_CATALOG = [
    # HP Laptops
    {
        "id": "HP-LAP-001",
        "name": "HP ProBook 450 G10 Business Laptop",
        "brand": "HP",
        "category": "IT Equipment - Laptops",
        "sku": "HP-PB450G10-i7",
        "unspsc_code": "43211503",
        "base_price": 1299.00,
        "image_url": PRODUCT_IMAGE_URLS.get("HP Laptop", PRODUCT_IMAGE_URLS.get("IT Equipment - Laptops")),
        "short_description": "15.6\" FHD Display, Intel Core i7-1355U, 16GB RAM, 512GB SSD",
        "full_description": "The HP ProBook 450 G10 is designed for business professionals who need reliability and performance. Features a 15.6-inch Full HD anti-glare display, Intel Core i7-1355U processor (up to 5.0 GHz), 16GB DDR4 RAM, and 512GB NVMe SSD. Includes Windows 11 Pro, Intel Iris Xe Graphics, fingerprint reader, and HD webcam with privacy shutter.",
        "specifications": {
            "Processor": "Intel Core i7-1355U (10 cores, up to 5.0 GHz)",
            "Memory": "16GB DDR4-3200",
            "Storage": "512GB PCIe NVMe SSD",
            "Display": "15.6\" FHD (1920x1080) IPS Anti-Glare",
            "Graphics": "Intel Iris Xe Graphics",
            "Operating System": "Windows 11 Pro",
            "Battery": "51Wh, up to 10 hours",
            "Weight": "1.79 kg (3.94 lbs)",
            "Ports": "USB-C, USB-A, HDMI, RJ-45, Audio Jack",
            "Warranty": "3 Years On-Site"
        },
        "availability": {"in_stock": True, "quantity": 156, "warehouse": "US-East"},
        "rating": 4.5,
        "reviews_count": 234
    },
    {
        "id": "HP-LAP-002",
        "name": "HP EliteBook 840 G10 Enterprise Laptop",
        "brand": "HP",
        "category": "IT Equipment - Laptops",
        "sku": "HP-EB840G10-i7",
        "unspsc_code": "43211503",
        "base_price": 1849.00,
        "image_url": PRODUCT_IMAGE_URLS.get("HP Laptop", PRODUCT_IMAGE_URLS.get("IT Equipment - Laptops")),
        "short_description": "14\" WUXGA Display, Intel Core i7-1365U, 32GB RAM, 1TB SSD",
        "full_description": "HP EliteBook 840 G10 delivers enterprise-grade security with stunning design. Features Sure View Reflect privacy screen, Wolf Security for Business, and military-grade durability (MIL-STD 810H). Perfect for executive and hybrid workforce.",
        "specifications": {
            "Processor": "Intel Core i7-1365U vPro (12 cores, up to 5.2 GHz)",
            "Memory": "32GB DDR5-4800",
            "Storage": "1TB PCIe Gen4 NVMe SSD",
            "Display": "14\" WUXGA (1920x1200) Sure View Reflect",
            "Graphics": "Intel Iris Xe Graphics",
            "Operating System": "Windows 11 Pro",
            "Battery": "51Wh, up to 14 hours",
            "Weight": "1.36 kg (3.0 lbs)",
            "Security": "Fingerprint, IR Camera, TPM 2.0, Wolf Security",
            "Warranty": "3 Years On-Site Next Business Day"
        },
        "availability": {"in_stock": True, "quantity": 89, "warehouse": "US-West"},
        "rating": 4.8,
        "reviews_count": 412
    },
    # Dell Laptops
    {
        "id": "DELL-LAP-001",
        "name": "Dell Latitude 5540 Business Laptop",
        "brand": "Dell",
        "category": "IT Equipment - Laptops",
        "sku": "DELL-LAT5540-i7",
        "unspsc_code": "43211503",
        "base_price": 1449.00,
        "image_url": PRODUCT_IMAGE_URLS.get("HP Laptop", PRODUCT_IMAGE_URLS.get("IT Equipment - Laptops")),
        "short_description": "15.6\" FHD+ Display, Intel Core i7-1365U, 16GB RAM, 512GB SSD",
        "full_description": "Dell Latitude 5540 combines performance with enterprise manageability. Built for IT deployment with Dell Optimizer AI, SafeBIOS, and comprehensive Dell Technologies services.",
        "specifications": {
            "Processor": "Intel Core i7-1365U vPro (12 cores, up to 5.2 GHz)",
            "Memory": "16GB DDR4-3200",
            "Storage": "512GB PCIe NVMe SSD",
            "Display": "15.6\" FHD+ (1920x1200) Anti-Glare",
            "Graphics": "Intel Iris Xe Graphics",
            "Operating System": "Windows 11 Pro",
            "Battery": "54Wh, up to 11 hours",
            "Weight": "1.66 kg (3.66 lbs)",
            "Ports": "Thunderbolt 4, USB-A, HDMI 2.0, microSD",
            "Warranty": "3 Years ProSupport"
        },
        "availability": {"in_stock": True, "quantity": 203, "warehouse": "US-Central"},
        "rating": 4.6,
        "reviews_count": 567
    },
    {
        "id": "DELL-LAP-002",
        "name": "Dell Precision 5680 Mobile Workstation",
        "brand": "Dell",
        "category": "IT Equipment - Laptops",
        "sku": "DELL-P5680-i9",
        "unspsc_code": "43211503",
        "base_price": 3299.00,
        "image_url": PRODUCT_IMAGE_URLS.get("HP Laptop", PRODUCT_IMAGE_URLS.get("IT Equipment - Laptops")),
        "short_description": "16\" 3.5K OLED, Intel Core i9-13900H, 64GB RAM, 2TB SSD, RTX 3500",
        "full_description": "Dell Precision 5680 is engineered for CAD, 3D modeling, and AI workloads. Features NVIDIA RTX 3500 Ada graphics, stunning 3.5K OLED display with 120Hz refresh, and ISV-certified reliability.",
        "specifications": {
            "Processor": "Intel Core i9-13900H (14 cores, up to 5.4 GHz)",
            "Memory": "64GB DDR5-4800",
            "Storage": "2TB PCIe Gen4 NVMe SSD",
            "Display": "16\" 3.5K (3456x2160) OLED 120Hz Touch",
            "Graphics": "NVIDIA RTX 3500 Ada 12GB GDDR6",
            "Operating System": "Windows 11 Pro for Workstations",
            "Battery": "86Wh, up to 8 hours",
            "Weight": "2.01 kg (4.43 lbs)",
            "Certifications": "ISV Certified (AutoCAD, SolidWorks, Revit)",
            "Warranty": "3 Years ProSupport Plus"
        },
        "availability": {"in_stock": True, "quantity": 34, "warehouse": "US-East"},
        "rating": 4.9,
        "reviews_count": 123
    },
    # Lenovo Laptops
    {
        "id": "LEN-LAP-001",
        "name": "Lenovo ThinkPad X1 Carbon Gen 11",
        "brand": "Lenovo",
        "category": "IT Equipment - Laptops",
        "sku": "LEN-X1C-G11-i7",
        "unspsc_code": "43211503",
        "base_price": 1999.00,
        "image_url": PRODUCT_IMAGE_URLS.get("HP Laptop", PRODUCT_IMAGE_URLS.get("IT Equipment - Laptops")),
        "short_description": "14\" 2.8K OLED, Intel Core i7-1365U, 32GB RAM, 1TB SSD",
        "full_description": "The legendary ThinkPad X1 Carbon continues its legacy with Gen 11. Ultra-light at just 1.12kg, featuring stunning OLED display, iconic keyboard, and comprehensive security features.",
        "specifications": {
            "Processor": "Intel Core i7-1365U vPro (12 cores, up to 5.2 GHz)",
            "Memory": "32GB LPDDR5-6400",
            "Storage": "1TB PCIe Gen4 NVMe SSD",
            "Display": "14\" 2.8K (2880x1800) OLED 400nits",
            "Graphics": "Intel Iris Xe Graphics",
            "Operating System": "Windows 11 Pro",
            "Battery": "57Wh, up to 15 hours",
            "Weight": "1.12 kg (2.48 lbs)",
            "Security": "Fingerprint, IR Camera, dTPM 2.0, ThinkShutter",
            "Warranty": "3 Years Premier Support"
        },
        "availability": {"in_stock": True, "quantity": 178, "warehouse": "US-West"},
        "rating": 4.7,
        "reviews_count": 891
    },
    # Monitors
    {
        "id": "DELL-MON-001",
        "name": "Dell UltraSharp U2723QE 27\" 4K USB-C Hub Monitor",
        "brand": "Dell",
        "category": "IT Equipment - Monitors",
        "sku": "DELL-U2723QE",
        "unspsc_code": "43211902",
        "base_price": 799.00,
        "image_url": PRODUCT_IMAGE_URLS.get("Dell Monitor", PRODUCT_IMAGE_URLS.get("IT Equipment - Monitors")),
        "short_description": "27\" 4K UHD IPS Black, USB-C 90W PD, RJ45, Built-in KVM",
        "full_description": "Dell UltraSharp U2723QE features IPS Black technology for 2000:1 contrast ratio. USB-C hub with 90W power delivery, RJ45 ethernet, and built-in KVM for multi-PC productivity.",
        "specifications": {
            "Screen Size": "27 inches",
            "Resolution": "3840 x 2160 (4K UHD)",
            "Panel Type": "IPS Black Technology",
            "Refresh Rate": "60Hz",
            "Response Time": "5ms (GtG Fast)",
            "Brightness": "400 cd/m² (typical)",
            "Contrast": "2000:1",
            "Color Accuracy": "100% sRGB, 98% DCI-P3, Delta E < 2",
            "Connectivity": "USB-C (90W PD), HDMI, DP, USB-A Hub, RJ45",
            "Stand": "Height, Tilt, Swivel, Pivot Adjustable",
            "Warranty": "3 Years Advanced Exchange"
        },
        "availability": {"in_stock": True, "quantity": 312, "warehouse": "US-Central"},
        "rating": 4.8,
        "reviews_count": 1245
    },
    {
        "id": "LG-MON-001",
        "name": "LG UltraFine 32UN880-B 32\" 4K Ergo Monitor",
        "brand": "LG",
        "category": "IT Equipment - Monitors",
        "sku": "LG-32UN880B",
        "unspsc_code": "43211902",
        "base_price": 699.00,
        "image_url": PRODUCT_IMAGE_URLS.get("Dell Monitor", PRODUCT_IMAGE_URLS.get("IT Equipment - Monitors")),
        "short_description": "32\" 4K UHD IPS, USB-C 60W PD, Ergo Stand, HDR10",
        "full_description": "LG UltraFine Ergo features a unique C-clamp stand for maximum desk space and flexibility. HDR10 support, 95% DCI-P3 color gamut, and USB-C one-cable solution.",
        "specifications": {
            "Screen Size": "31.5 inches",
            "Resolution": "3840 x 2160 (4K UHD)",
            "Panel Type": "IPS",
            "Refresh Rate": "60Hz",
            "Response Time": "5ms (GtG)",
            "Brightness": "350 cd/m²",
            "HDR": "HDR10",
            "Color Gamut": "95% DCI-P3, 99% sRGB",
            "Connectivity": "USB-C (60W PD), HDMI x2, USB Hub",
            "Stand": "Ergo C-Clamp with Full Articulation",
            "Warranty": "3 Years"
        },
        "availability": {"in_stock": True, "quantity": 187, "warehouse": "US-East"},
        "rating": 4.6,
        "reviews_count": 678
    },
    {
        "id": "SAM-MON-001",
        "name": "Samsung ViewFinity S9 49\" 5K Ultrawide",
        "brand": "Samsung",
        "category": "IT Equipment - Monitors",
        "sku": "SAM-LS49C950",
        "unspsc_code": "43211902",
        "base_price": 1499.00,
        "image_url": PRODUCT_IMAGE_URLS.get("Dell Monitor", PRODUCT_IMAGE_URLS.get("IT Equipment - Monitors")),
        "short_description": "49\" 5K Dual QHD, 1000R Curve, USB-C 90W, KVM Switch",
        "full_description": "Samsung ViewFinity S9 replaces two monitors with one stunning 49-inch ultrawide. 5120x1440 Dual QHD resolution with 1000R curvature for immersive productivity.",
        "specifications": {
            "Screen Size": "49 inches (32:9 Aspect)",
            "Resolution": "5120 x 1440 (Dual QHD)",
            "Panel Type": "VA",
            "Refresh Rate": "120Hz",
            "Response Time": "4ms (GtG)",
            "Brightness": "350 cd/m²",
            "Curvature": "1000R",
            "Color Accuracy": "99% sRGB, Delta E < 2",
            "Connectivity": "USB-C (90W PD), HDMI x2, DP, USB Hub",
            "Features": "PBP/PIP, KVM Switch, Eye Saver Mode",
            "Warranty": "3 Years"
        },
        "availability": {"in_stock": True, "quantity": 56, "warehouse": "US-West"},
        "rating": 4.7,
        "reviews_count": 234
    },
    # Networking Equipment
    {
        "id": "CISCO-NET-001",
        "name": "Cisco Catalyst 9200L-48P-4G Network Switch",
        "brand": "Cisco",
        "category": "IT Equipment - Networking",
        "sku": "C9200L-48P-4G-E",
        "unspsc_code": "43222609",
        "base_price": 4299.00,
        "image_url": PRODUCT_IMAGE_URLS.get("Cisco Switch", PRODUCT_IMAGE_URLS.get("IT Equipment - Networking")),
        "short_description": "48-Port PoE+ Gigabit, 4x1G SFP, 370W PoE Budget, Stackable",
        "full_description": "Cisco Catalyst 9200L delivers enterprise-class access switching with PoE+ for wireless APs, IP phones, and IoT devices. DNA licensing for automation and security.",
        "specifications": {
            "Ports": "48x Gigabit Ethernet PoE+",
            "Uplinks": "4x 1G SFP",
            "PoE Budget": "370W",
            "Switching Capacity": "176 Gbps",
            "Forwarding Rate": "130 Mpps",
            "Stacking": "Up to 8 switches",
            "Management": "Cisco DNA Center, CLI, REST API",
            "Security": "TrustSec, MACsec, VLAN ACLs",
            "Dimensions": "1.73\" x 17.5\" x 14.96\"",
            "Warranty": "Limited Lifetime (Hardware)"
        },
        "availability": {"in_stock": True, "quantity": 45, "warehouse": "US-Central"},
        "rating": 4.9,
        "reviews_count": 167
    },
    # Additional Products - Motors & Drives
    {
        "id": "MOT-001",
        "name": "ABB Industrial AC Motor 7.5HP",
        "brand": "ABB",
        "category": "Motors & Drives",
        "sku": "ABB-ACM-75HP",
        "unspsc_code": "26101500",
        "base_price": 1850.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/48eb714ed81a4debd0fcbb8614e5e4412263c16c00d900b645c44f969c378c75.png",
        "short_description": "7.5HP 3-Phase AC Induction Motor, TEFC, 1800RPM",
        "full_description": "ABB Industrial AC Motor delivers reliable performance for demanding industrial applications. Features Totally Enclosed Fan Cooled (TEFC) design, Class F insulation, and robust construction.",
        "specifications": {
            "Power": "7.5 HP (5.5 kW)",
            "Voltage": "460V 3-Phase",
            "Speed": "1800 RPM",
            "Frame": "213T",
            "Enclosure": "TEFC",
            "Efficiency": "IE3 Premium",
            "Service Factor": "1.15"
        },
        "availability": {"in_stock": True, "quantity": 28, "warehouse": "US-East"},
        "rating": 4.7,
        "reviews_count": 156
    },
    {
        "id": "MOT-002",
        "name": "Siemens VFD Variable Frequency Drive 15HP",
        "brand": "Siemens",
        "category": "Motors & Drives",
        "sku": "SIE-VFD-15HP",
        "unspsc_code": "26101600",
        "base_price": 2450.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/48eb714ed81a4debd0fcbb8614e5e4412263c16c00d900b645c44f969c378c75.png",
        "short_description": "15HP Variable Frequency Drive with Integrated PLC",
        "full_description": "Siemens SINAMICS G120 VFD for precise motor control. Features built-in safety functions, Modbus communication, and energy-saving algorithms.",
        "specifications": {
            "Power Rating": "15 HP",
            "Input Voltage": "480V 3-Phase",
            "Output Frequency": "0-400 Hz",
            "Control Mode": "V/f, Sensorless Vector",
            "Communication": "Modbus RTU, Profinet",
            "Protection": "IP20",
            "Ambient Temp": "-10°C to +50°C"
        },
        "availability": {"in_stock": True, "quantity": 42, "warehouse": "US-Central"},
        "rating": 4.8,
        "reviews_count": 234
    },
    # Hydraulics & Pneumatics
    {
        "id": "HYD-001",
        "name": "Parker Hydraulic Gear Pump 20GPM",
        "brand": "Parker",
        "category": "Hydraulics & Pneumatics",
        "sku": "PAR-HGP-20",
        "unspsc_code": "40141600",
        "base_price": 875.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/67b16a05b97dae42c11c9c72f6e05b8af5d7aec7f63f9dfbd8e237a3fd5fc463.png",
        "short_description": "High-pressure hydraulic gear pump, 20GPM at 3000PSI",
        "full_description": "Parker PGP Series hydraulic gear pump designed for mobile and industrial applications. Features case-hardened gears and high volumetric efficiency.",
        "specifications": {
            "Flow Rate": "20 GPM",
            "Max Pressure": "3000 PSI",
            "Displacement": "3.6 cu in/rev",
            "Shaft": "SAE B 2-Bolt",
            "Port Size": "SAE 16",
            "Speed Range": "500-3600 RPM",
            "Fluid": "Mineral-based hydraulic oil"
        },
        "availability": {"in_stock": True, "quantity": 65, "warehouse": "US-West"},
        "rating": 4.6,
        "reviews_count": 189
    },
    {
        "id": "PNE-001",
        "name": "Festo Pneumatic Cylinder 100mm Bore",
        "brand": "Festo",
        "category": "Hydraulics & Pneumatics",
        "sku": "FES-CYL-100",
        "unspsc_code": "40141700",
        "base_price": 425.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/f33db98cd05c6baa652b94111e2425bcdc4313c5335f9673a214cb91bf2d2284.png",
        "short_description": "Double-acting pneumatic cylinder, ISO 15552 standard",
        "full_description": "Festo DSBC Series pneumatic cylinder with adjustable cushioning. Built to ISO 15552 standard for easy interchangeability.",
        "specifications": {
            "Bore": "100mm",
            "Stroke": "200mm",
            "Operating Pressure": "1-10 bar",
            "Piston Rod": "25mm Chrome-plated",
            "Cushioning": "PPV Adjustable",
            "Mounting": "ISO 15552",
            "Temperature Range": "-20°C to +80°C"
        },
        "availability": {"in_stock": True, "quantity": 112, "warehouse": "EU-West"},
        "rating": 4.9,
        "reviews_count": 321
    },
    # Welding Equipment
    {
        "id": "WLD-001",
        "name": "Lincoln Electric MIG Welder 250A",
        "brand": "Lincoln Electric",
        "category": "Welding",
        "sku": "LIN-MIG-250",
        "unspsc_code": "23270000",
        "base_price": 2150.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/2e6b43c65ae6a6b6a4fa924c3f3f88f897cad2a707104ffdc57d165e3b1d04e8.png",
        "short_description": "Industrial MIG welder with synergic control, 250A output",
        "full_description": "Lincoln Electric Power MIG 256 delivers reliable performance for production welding. Features Diamond Core Technology for superior arc performance.",
        "specifications": {
            "Amperage Range": "30-250A",
            "Input Power": "230V Single Phase",
            "Wire Feed Speed": "50-700 IPM",
            "Duty Cycle": "40% at 250A",
            "Wire Size": "0.023-0.045\"",
            "Spool Size": "10-15 lb",
            "Weight": "145 lbs"
        },
        "availability": {"in_stock": True, "quantity": 23, "warehouse": "US-Central"},
        "rating": 4.8,
        "reviews_count": 445
    },
    # Test & Measurement
    {
        "id": "TST-001",
        "name": "Fluke 289 True-RMS Industrial Multimeter",
        "brand": "Fluke",
        "category": "Test & Measurement",
        "sku": "FLK-289",
        "unspsc_code": "41110000",
        "base_price": 595.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/411bcb13dee27615e9b815fde695cdc27e5f05eee4347121309be34bbdb8c3e0.png",
        "short_description": "Industrial logging multimeter with TrendCapture",
        "full_description": "Fluke 289 True-RMS Industrial Logging Multimeter with TrendCapture for recording signal fluctuations over time. CAT IV 600V safety rated.",
        "specifications": {
            "DC Accuracy": "0.025%",
            "True RMS": "AC+DC",
            "Max Voltage": "1000V DC, 1000V AC",
            "Max Current": "10A (20A 30-sec)",
            "Resistance": "500MΩ",
            "Memory": "250 saved readings",
            "Safety Rating": "CAT III 1000V, CAT IV 600V"
        },
        "availability": {"in_stock": True, "quantity": 87, "warehouse": "US-East"},
        "rating": 4.9,
        "reviews_count": 678
    },
    # Safety Equipment
    {
        "id": "SAF-001",
        "name": "3M Powered Air Purifying Respirator System",
        "brand": "3M",
        "category": "Safety & PPE",
        "sku": "3M-PAPR-SYS",
        "unspsc_code": "46180000",
        "base_price": 1250.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/61099fb65121a227a0c6e32140edac60830b2fd0c6269420c02ee34b2e9933a2.png",
        "short_description": "Complete PAPR system with headgear and battery",
        "full_description": "3M Versaflo TR-600 Powered Air Purifying Respirator System provides respiratory protection with comfortable airflow in hazardous environments.",
        "specifications": {
            "Airflow": "6.7 CFM",
            "Battery Life": "8+ hours",
            "Filter Type": "P100/OV/AG",
            "APF": "1000",
            "Weight": "2.2 lbs (belt unit)",
            "Charging Time": "4 hours",
            "Certifications": "NIOSH Approved"
        },
        "availability": {"in_stock": True, "quantity": 34, "warehouse": "US-West"},
        "rating": 4.7,
        "reviews_count": 234
    },
    {
        "id": "SAF-002",
        "name": "Honeywell Safety Harness Full Body",
        "brand": "Honeywell",
        "category": "Safety & PPE",
        "sku": "HON-FBH-PRO",
        "unspsc_code": "46180000",
        "base_price": 345.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/9f7011dbf936aa67ab41af039d39e363f5a435c0efbfbed8a069e7684f74ad25.png",
        "short_description": "Full body fall protection harness with quick-connect buckles",
        "full_description": "Honeywell Miller Revolution Harness features DualTech webbing for maximum comfort and durability. Quick-connect chest and leg buckles for easy donning.",
        "specifications": {
            "Type": "Full Body",
            "D-Rings": "5-Point (back, shoulders, front)",
            "Weight Capacity": "400 lbs",
            "Webbing": "DualTech Polyester",
            "Buckles": "Quick-Connect",
            "Size Range": "S-XL",
            "Compliance": "OSHA 1926.502, ANSI Z359.11"
        },
        "availability": {"in_stock": True, "quantity": 156, "warehouse": "US-Central"},
        "rating": 4.8,
        "reviews_count": 412
    },
    # Material Handling
    {
        "id": "MAT-001",
        "name": "Crown Electric Pallet Jack 4500lb",
        "brand": "Crown",
        "category": "Material Handling",
        "sku": "CRW-EPJ-4500",
        "unspsc_code": "24100000",
        "base_price": 3950.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/d3b288a3bc2eae93ca8304dff24b6a6c2fa3e071ff498bff6f994dc86e336ddf.png",
        "short_description": "Electric pallet jack with 4500lb capacity",
        "full_description": "Crown WP 3000 Series electric pallet jack provides effortless load handling. Features regenerative braking and AC traction motor.",
        "specifications": {
            "Capacity": "4500 lbs",
            "Fork Length": "48\"",
            "Fork Width": "27\"",
            "Lift Height": "7.9\"",
            "Travel Speed": "4.1 mph",
            "Battery": "24V Lead-Acid",
            "Runtime": "8 hours continuous"
        },
        "availability": {"in_stock": True, "quantity": 12, "warehouse": "US-East"},
        "rating": 4.6,
        "reviews_count": 189
    },
    # Cutting Tools
    {
        "id": "CUT-001",
        "name": "Kennametal Carbide End Mill Set",
        "brand": "Kennametal",
        "category": "Cutting Tools",
        "sku": "KEN-CEM-SET",
        "unspsc_code": "27110000",
        "base_price": 485.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/5f3ec0cc9e4246d05af7b1609a78a8d3c2c76abbebba2fcb9823ffac8851309d.png",
        "short_description": "10-piece solid carbide end mill set, various sizes",
        "full_description": "Kennametal Harvi I TE solid carbide end mills for high-performance milling. Features advanced coating for extended tool life.",
        "specifications": {
            "Material": "Solid Carbide",
            "Coating": "TiAlN",
            "Flutes": "4",
            "Sizes": "1/8\" to 1/2\"",
            "Cut Length": "3x Diameter",
            "Shank": "Standard",
            "Helix Angle": "30°"
        },
        "availability": {"in_stock": True, "quantity": 78, "warehouse": "US-Central"},
        "rating": 4.8,
        "reviews_count": 345
    },
    # Storage & Organization
    {
        "id": "STO-001",
        "name": "Lista Industrial Storage Cabinet",
        "brand": "Lista",
        "category": "Storage & Organization",
        "sku": "LST-CAB-IND",
        "unspsc_code": "56100000",
        "base_price": 1875.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/ad801ca5185620afbcc264b33f0c59dacf2085f9b98895eb624068ec3ebad64d.png",
        "short_description": "Heavy-duty modular drawer cabinet, 10 drawers",
        "full_description": "Lista industrial storage cabinet with 100% drawer extension and 440lb drawer capacity. Ideal for tool storage and parts organization.",
        "specifications": {
            "Drawers": "10",
            "Drawer Capacity": "440 lbs each",
            "Dimensions": "30\"W x 28\"D x 59\"H",
            "Material": "14-gauge Steel",
            "Extension": "100%",
            "Lock": "Central Locking",
            "Color": "Industrial Gray"
        },
        "availability": {"in_stock": True, "quantity": 19, "warehouse": "US-West"},
        "rating": 4.7,
        "reviews_count": 234
    },
    # Cleaning & Janitorial
    {
        "id": "CLN-001",
        "name": "Tennant T300 Floor Scrubber",
        "brand": "Tennant",
        "category": "Cleaning & Janitorial",
        "sku": "TEN-T300",
        "unspsc_code": "47130000",
        "base_price": 4250.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/899b4b3e6aceed339189fb8d0b0fa309930af38864a707139f102cc7b47c1bfd.png",
        "short_description": "Walk-behind floor scrubber, 20\" cleaning path",
        "full_description": "Tennant T300 walk-behind scrubber delivers consistent cleaning performance. Features ec-H2O NanoClean technology for chemical-free cleaning.",
        "specifications": {
            "Cleaning Path": "20 inches",
            "Solution Tank": "11 gallons",
            "Recovery Tank": "12 gallons",
            "Run Time": "Up to 3 hours",
            "Productivity": "Up to 18,400 sq ft/hr",
            "Power": "Battery (24V)",
            "Weight": "287 lbs"
        },
        "availability": {"in_stock": True, "quantity": 8, "warehouse": "US-Central"},
        "rating": 4.5,
        "reviews_count": 167
    },
    # Lubrication
    {
        "id": "LUB-001",
        "name": "Mobil Industrial Lubricant Kit",
        "brand": "Mobil",
        "category": "Lubrication",
        "sku": "MOB-IND-KIT",
        "unspsc_code": "15120000",
        "base_price": 385.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/e12637ed7080f9cc6f0ab4378314a9bf6991b40c91ff9c4c31ea98fd25d1aa62.png",
        "short_description": "Complete industrial lubrication kit with various grades",
        "full_description": "Mobil Industrial Lubricant Kit includes synthetic and mineral-based lubricants for diverse industrial applications. Premium quality for extended equipment life.",
        "specifications": {
            "Includes": "5 products",
            "Types": "Gear Oil, Hydraulic, Grease, Way Oil, Spindle",
            "Grades": "ISO 32-220",
            "Container Sizes": "1 Quart each",
            "Base Stock": "Synthetic/Mineral",
            "Temperature Range": "-40°F to +300°F",
            "Applications": "General Industrial"
        },
        "availability": {"in_stock": True, "quantity": 145, "warehouse": "US-East"},
        "rating": 4.6,
        "reviews_count": 289
    }
]

# Detailed IT Services Catalog
IT_SERVICES_CATALOG = [
    {
        "id": "SVC-NET-001",
        "name": "Network Infrastructure Installation - Enterprise",
        "category": "Network Installation Services",
        "unspsc_code": "81111801",
        "unspsc_name": "Network installation services",
        "supplier_name": "Infosys Network Solutions",
        "supplier_logo": None,
        "supplier_color": "#007CC3",
        "pricing_model": "Per Hour",
        "base_price": 125.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/afdd726c02cc7d9e8690e91dc7c1b0a13c962c96325cef7d1eece4d48001fb82.png",
        "short_description": "Professional network cabling, switch configuration, and testing",
        "full_description": "Complete enterprise network installation including structured cabling (Cat6/Cat6a), switch rack mounting and configuration, fiber optic termination, cable management, and comprehensive testing with documentation.",
        "service_includes": [
            "Site survey and network design",
            "Structured cabling (Cat6/Cat6a/Fiber)",
            "Patch panel and switch installation",
            "Network switch configuration",
            "Cable certification and testing",
            "Network documentation and labeling",
            "Post-installation support (48 hours)"
        ],
        "availability": {"available": True, "lead_time_days": 3, "regions": ["North America", "Europe", "APAC"]},
        "rating": 4.8,
        "reviews_count": 234
    },
    {
        "id": "SVC-NET-002",
        "name": "Wireless Network Setup - Enterprise Wi-Fi 6E",
        "category": "Network Installation Services",
        "unspsc_code": "81111802",
        "unspsc_name": "Wireless network installation",
        "supplier_name": "Cisco Certified Partner",
        "supplier_logo": None,
        "supplier_color": "#049FD9",
        "pricing_model": "Per Access Point",
        "base_price": 350.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/88c4a88606ac13bb8e539641523213064945b830124a9c902aa9147532aa3c49.png",
        "short_description": "Wi-Fi 6E access point deployment with site survey",
        "full_description": "Enterprise-grade wireless network deployment including predictive site survey, access point mounting, controller configuration, SSID setup, security policies, and performance optimization.",
        "service_includes": [
            "Predictive RF site survey",
            "Access point mounting and cabling",
            "Wireless controller configuration",
            "SSID and security policy setup",
            "Guest network configuration",
            "Heat map validation",
            "Performance optimization"
        ],
        "availability": {"available": True, "lead_time_days": 5, "regions": ["North America", "Europe"]},
        "rating": 4.7,
        "reviews_count": 189
    },
    {
        "id": "SVC-IT-001",
        "name": "Desktop/Laptop Deployment Service",
        "category": "IT Equipment Installation & Setup",
        "unspsc_code": "81112201",
        "unspsc_name": "Computer hardware installation",
        "supplier_name": "Dell ProDeploy Services",
        "supplier_logo": None,
        "supplier_color": "#007DB8",
        "pricing_model": "Per Device",
        "base_price": 85.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/cff7a5158c43f81799d59a99494279b2c5f255b2610fe406a1ffe6934277c4a7.png",
        "short_description": "Complete device imaging, setup, and user migration",
        "full_description": "Full PC lifecycle deployment including asset tagging, image deployment, domain join, software installation, data migration, and user orientation. Includes packaging disposal.",
        "service_includes": [
            "Asset tagging and inventory",
            "Custom image deployment",
            "Domain join and policy application",
            "Standard software installation",
            "User data migration (up to 50GB)",
            "Basic user orientation (30 min)",
            "Old device data wipe",
            "Packaging disposal"
        ],
        "availability": {"available": True, "lead_time_days": 1, "regions": ["Global"]},
        "rating": 4.6,
        "reviews_count": 567
    },
    {
        "id": "SVC-IT-002",
        "name": "Server Rack Installation & Configuration",
        "category": "IT Equipment Installation & Setup",
        "unspsc_code": "81112202",
        "unspsc_name": "Server installation services",
        "supplier_name": "HP Enterprise Services",
        "supplier_logo": None,
        "supplier_color": "#0096D6",
        "pricing_model": "Per Server",
        "base_price": 450.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/a1c30bd322a62ea6d441b12da74c66ca96707140958e1737c0d9a286f041a795.png",
        "short_description": "Physical server installation with OS and baseline config",
        "full_description": "Complete server deployment including rack mounting, power and network cabling, BIOS/firmware updates, OS installation, baseline security hardening, and integration with monitoring systems.",
        "service_includes": [
            "Server rack mounting",
            "Power and network cabling",
            "BIOS/firmware updates",
            "RAID configuration",
            "Operating system installation",
            "Security baseline hardening",
            "Monitoring agent deployment",
            "Documentation and handover"
        ],
        "availability": {"available": True, "lead_time_days": 2, "regions": ["North America", "Europe", "APAC"]},
        "rating": 4.9,
        "reviews_count": 312
    },
    {
        "id": "SVC-SEC-001",
        "name": "Network Security Assessment",
        "category": "Cybersecurity Services",
        "unspsc_code": "81112501",
        "unspsc_name": "Network security services",
        "supplier_name": "Infosys Cybersecurity",
        "supplier_logo": None,
        "supplier_color": "#007CC3",
        "pricing_model": "Per Assessment",
        "base_price": 5500.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/88995698058a90986297157d130fa19ac15656bbe7ac2296b1949cbb9993e380.png",
        "short_description": "Comprehensive vulnerability scan and penetration testing",
        "full_description": "Full network security assessment including vulnerability scanning, penetration testing, firewall review, and detailed remediation recommendations with executive summary.",
        "service_includes": [
            "External vulnerability scanning",
            "Internal network assessment",
            "Penetration testing (network layer)",
            "Firewall rule review",
            "Detailed findings report",
            "Risk prioritization matrix",
            "Executive summary presentation",
            "Remediation consultation (4 hours)"
        ],
        "availability": {"available": True, "lead_time_days": 7, "regions": ["Global"]},
        "rating": 4.8,
        "reviews_count": 145
    },
    {
        "id": "SVC-MGD-001",
        "name": "Managed IT Support - Per User/Month",
        "category": "IT Managed Services",
        "unspsc_code": "81112301",
        "unspsc_name": "IT managed services",
        "supplier_name": "Infosys Managed Services",
        "supplier_logo": None,
        "supplier_color": "#007CC3",
        "pricing_model": "Per User/Month",
        "base_price": 75.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/f848c4af2e1f5caac71aa56dc1f1b9285fb801ad8e1ee77ad4185116211e3627.png",
        "short_description": "24/7 helpdesk, remote support, and proactive monitoring",
        "full_description": "Comprehensive managed IT services including 24/7 helpdesk, remote troubleshooting, patch management, antivirus monitoring, and monthly reporting.",
        "service_includes": [
            "24/7 helpdesk support (phone/email/chat)",
            "Remote desktop support",
            "Patch management",
            "Antivirus monitoring",
            "Basic user provisioning",
            "Monthly health reports",
            "Quarterly business reviews",
            "15 min average response time"
        ],
        "availability": {"available": True, "lead_time_days": 0, "regions": ["Global"]},
        "rating": 4.5,
        "reviews_count": 789
    },
    # Additional Services
    {
        "id": "SVC-DC-001",
        "name": "Data Center Infrastructure Services",
        "category": "IT Equipment Installation & Setup",
        "unspsc_code": "81112203",
        "unspsc_name": "Data center services",
        "supplier_name": "Equinix Solutions",
        "supplier_logo": None,
        "supplier_color": "#ED1C24",
        "pricing_model": "Per Rack",
        "base_price": 1250.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/45b8605364d7a481ab4a4bf15be73f59f9761da18220b1efb363c134d7ce0fb4.png",
        "short_description": "Complete data center rack installation and configuration",
        "full_description": "End-to-end data center infrastructure deployment including rack installation, power distribution, cooling setup, cable management, and environmental monitoring integration.",
        "service_includes": [
            "42U rack installation",
            "Power distribution unit setup",
            "Cable management systems",
            "Environmental monitoring",
            "Hot/cold aisle containment",
            "Documentation and labeling",
            "Commissioning and testing"
        ],
        "availability": {"available": True, "lead_time_days": 5, "regions": ["North America", "Europe", "APAC"]},
        "rating": 4.9,
        "reviews_count": 234
    },
    {
        "id": "SVC-MNT-001",
        "name": "Industrial Equipment Maintenance",
        "category": "Facilities Management & Workplace Services",
        "unspsc_code": "72151500",
        "unspsc_name": "Equipment maintenance services",
        "supplier_name": "SKF Reliability Systems",
        "supplier_logo": None,
        "supplier_color": "#005B94",
        "pricing_model": "Per Hour",
        "base_price": 145.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/fd8c452c65505c4fa649fae356b50b7dcc945b4ca0d180088866270a0b7d86f5.png",
        "short_description": "Preventive and predictive maintenance for industrial machinery",
        "full_description": "Comprehensive industrial equipment maintenance program including vibration analysis, thermography, oil analysis, and predictive maintenance scheduling.",
        "service_includes": [
            "Vibration monitoring and analysis",
            "Thermal imaging inspection",
            "Oil sample analysis",
            "Alignment verification",
            "Bearing inspection and replacement",
            "Maintenance scheduling",
            "Performance reporting"
        ],
        "availability": {"available": True, "lead_time_days": 2, "regions": ["Global"]},
        "rating": 4.7,
        "reviews_count": 456
    },
    {
        "id": "SVC-TRN-001",
        "name": "Corporate Technology Training",
        "category": "Corporate & Business Support Services",
        "unspsc_code": "86101700",
        "unspsc_name": "Professional training services",
        "supplier_name": "Infosys Learning Solutions",
        "supplier_logo": None,
        "supplier_color": "#007CC3",
        "pricing_model": "Per Session",
        "base_price": 2500.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/8d3d10c922ac4516e87dff834b0b0f3d00633c1032b7667687f506addb1e98b3.png",
        "short_description": "Custom corporate technology training programs",
        "full_description": "Tailored technology training programs for enterprise teams. Includes curriculum development, certified instructors, hands-on labs, and certification preparation.",
        "service_includes": [
            "Needs assessment",
            "Custom curriculum development",
            "Certified instructor delivery",
            "Hands-on lab exercises",
            "Training materials and guides",
            "Post-training assessment",
            "Certification exam prep"
        ],
        "availability": {"available": True, "lead_time_days": 7, "regions": ["Global"]},
        "rating": 4.6,
        "reviews_count": 312
    },
    {
        "id": "SVC-QC-001",
        "name": "Quality Control & Inspection Services",
        "category": "HSE, Quality & Compliance Services",
        "unspsc_code": "77100000",
        "unspsc_name": "Quality inspection services",
        "supplier_name": "Bureau Veritas",
        "supplier_logo": None,
        "supplier_color": "#E30613",
        "pricing_model": "Per Day",
        "base_price": 950.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/1e0527ecaf208bd7905092e337f70a54eabef0782a81bd6e510c8e4d5c3c18ac.png",
        "short_description": "Product and process quality inspection services",
        "full_description": "Independent quality control and inspection services including incoming material inspection, in-process checks, final product inspection, and supplier audits.",
        "service_includes": [
            "Incoming material inspection",
            "In-process quality checks",
            "Final product inspection",
            "AQL sampling inspection",
            "Supplier quality audits",
            "Non-conformance reporting",
            "Corrective action tracking"
        ],
        "availability": {"available": True, "lead_time_days": 3, "regions": ["Global"]},
        "rating": 4.8,
        "reviews_count": 289
    },
    {
        "id": "SVC-LOG-001",
        "name": "Supply Chain Optimization Services",
        "category": "Logistics, Warehouse & Supply Chain Services",
        "unspsc_code": "78100000",
        "unspsc_name": "Supply chain services",
        "supplier_name": "DHL Supply Chain",
        "supplier_logo": None,
        "supplier_color": "#FFCC00",
        "pricing_model": "Per Project",
        "base_price": 15000.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/6810b3362e86e8ba23010897c9d6d3718dce4d1803e090213f94464944c1175b.png",
        "short_description": "End-to-end supply chain analysis and optimization",
        "full_description": "Comprehensive supply chain optimization including network analysis, inventory optimization, transportation routing, and warehouse layout design.",
        "service_includes": [
            "Current state assessment",
            "Network optimization modeling",
            "Inventory strategy development",
            "Transportation route optimization",
            "Warehouse layout design",
            "Technology recommendations",
            "Implementation roadmap"
        ],
        "availability": {"available": True, "lead_time_days": 10, "regions": ["North America", "Europe"]},
        "rating": 4.7,
        "reviews_count": 167
    },
    {
        "id": "SVC-CLN-001",
        "name": "Commercial Deep Cleaning Services",
        "category": "Facilities Management & Workplace Services",
        "unspsc_code": "76111500",
        "unspsc_name": "Commercial cleaning services",
        "supplier_name": "ISS Facility Services",
        "supplier_logo": None,
        "supplier_color": "#E4002B",
        "pricing_model": "Per Sq Ft",
        "base_price": 0.45,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/9c245588-b7cf-44e6-ac82-aa2be101ce17/images/124d0636fdb6759f0b0e809e00fe07c91c12562a510f2da1e68cc2cb7a0fd266.png",
        "short_description": "Professional commercial deep cleaning and sanitization",
        "full_description": "Comprehensive commercial deep cleaning services including floor stripping and waxing, carpet extraction, window cleaning, and disinfection protocols.",
        "service_includes": [
            "Floor stripping and refinishing",
            "Carpet deep extraction",
            "Window and glass cleaning",
            "High-touch surface disinfection",
            "Restroom deep sanitization",
            "Kitchen/break room cleaning",
            "Waste removal and recycling"
        ],
        "availability": {"available": True, "lead_time_days": 1, "regions": ["Global"]},
        "rating": 4.5,
        "reviews_count": 523
    },
    {
        "id": "SVC-SEC-002",
        "name": "Penetration Testing Services",
        "category": "Cybersecurity Services",
        "unspsc_code": "81112502",
        "unspsc_name": "Security testing services",
        "supplier_name": "Mandiant",
        "supplier_logo": None,
        "supplier_color": "#FF6600",
        "pricing_model": "Per Assessment",
        "base_price": 12500.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/88995698058a90986297157d130fa19ac15656bbe7ac2296b1949cbb9993e380.png",
        "short_description": "Advanced penetration testing for web, network, and applications",
        "full_description": "Comprehensive penetration testing services including web application testing, network penetration, social engineering, and red team exercises.",
        "service_includes": [
            "Web application penetration testing",
            "Network infrastructure testing",
            "Social engineering assessment",
            "Wireless security testing",
            "Physical security testing",
            "Detailed findings report",
            "Remediation consultation"
        ],
        "availability": {"available": True, "lead_time_days": 14, "regions": ["Global"]},
        "rating": 4.9,
        "reviews_count": 178
    },
    {
        "id": "SVC-MKT-001",
        "name": "B2B Digital Marketing Campaign",
        "category": "Digital Marketing & Creative Agency Services",
        "unspsc_code": "80171600",
        "unspsc_name": "Marketing campaign services",
        "supplier_name": "WPP Digital",
        "supplier_logo": None,
        "supplier_color": "#5C0080",
        "pricing_model": "Per Month",
        "base_price": 8500.00,
        "image_url": "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/516a358136877fc314216c27facefe3422f8dfa69a45e5553584d72a437e9fce.png",
        "short_description": "Full-service B2B digital marketing campaign management",
        "full_description": "Complete B2B digital marketing campaign including strategy development, content creation, paid media management, and performance analytics.",
        "service_includes": [
            "Campaign strategy development",
            "Content creation and copywriting",
            "LinkedIn advertising management",
            "Google Ads B2B campaigns",
            "Email marketing automation",
            "Landing page optimization",
            "Monthly performance reporting"
        ],
        "availability": {"available": True, "lead_time_days": 5, "regions": ["Global"]},
        "rating": 4.6,
        "reviews_count": 234
    },
    # Additional Digital Marketing Services
    {
        "id": "SVC-SMM-001",
        "name": "Social Media Marketing Management",
        "category": "Digital Marketing & Creative Agency Services",
        "unspsc_code": "80171610",
        "unspsc_name": "Social media marketing services",
        "supplier_name": "Hootsuite Enterprise",
        "supplier_logo": None,
        "supplier_color": "#143059",
        "pricing_model": "Per Month",
        "base_price": 3500.00,
        "image_url": SERVICE_IMAGE_URLS.get("Social Media Marketing"),
        "short_description": "Full-service social media marketing and community management",
        "full_description": "Comprehensive social media marketing services including strategy development, content creation, community management, and analytics reporting across all major platforms.",
        "service_includes": [
            "Social media strategy development",
            "Content calendar creation",
            "Daily post publishing",
            "Community engagement management",
            "Influencer partnership coordination",
            "Social listening and monitoring",
            "Monthly analytics reports"
        ],
        "availability": {"available": True, "lead_time_days": 3, "regions": ["Global"]},
        "rating": 4.7,
        "reviews_count": 456
    },
    {
        "id": "SVC-SEO-001",
        "name": "Enterprise SEO Optimization Services",
        "category": "Digital Marketing & Creative Agency Services",
        "unspsc_code": "80171608",
        "unspsc_name": "Search engine optimization services",
        "supplier_name": "Moz Enterprise",
        "supplier_logo": None,
        "supplier_color": "#1B98E0",
        "pricing_model": "Per Month",
        "base_price": 4500.00,
        "image_url": SERVICE_IMAGE_URLS.get("SEO Optimization"),
        "short_description": "Technical and content SEO optimization for enterprise websites",
        "full_description": "Full-spectrum SEO services including technical audits, on-page optimization, link building, and content strategy to improve organic search rankings and drive qualified traffic.",
        "service_includes": [
            "Technical SEO audit",
            "Keyword research and mapping",
            "On-page optimization",
            "Link building campaigns",
            "Content optimization",
            "Competitor analysis",
            "Monthly ranking reports"
        ],
        "availability": {"available": True, "lead_time_days": 5, "regions": ["Global"]},
        "rating": 4.8,
        "reviews_count": 312
    },
    {
        "id": "SVC-CNT-001",
        "name": "B2B Content Marketing Services",
        "category": "Digital Marketing & Creative Agency Services",
        "unspsc_code": "80172106",
        "unspsc_name": "Content marketing services",
        "supplier_name": "Contently Enterprise",
        "supplier_logo": None,
        "supplier_color": "#FF5733",
        "pricing_model": "Per Month",
        "base_price": 6000.00,
        "image_url": SERVICE_IMAGE_URLS.get("Content Marketing"),
        "short_description": "Strategic content creation and distribution for B2B audiences",
        "full_description": "End-to-end B2B content marketing services including content strategy, thought leadership creation, blog management, and content distribution across multiple channels.",
        "service_includes": [
            "Content strategy development",
            "Blog article writing (8/month)",
            "Whitepaper creation (1/quarter)",
            "Case study development",
            "Newsletter content creation",
            "Content distribution strategy",
            "Performance analytics"
        ],
        "availability": {"available": True, "lead_time_days": 7, "regions": ["Global"]},
        "rating": 4.5,
        "reviews_count": 234
    },
    {
        "id": "SVC-EML-001",
        "name": "Email Marketing Automation Services",
        "category": "Digital Marketing & Creative Agency Services",
        "unspsc_code": "80171615",
        "unspsc_name": "Email marketing services",
        "supplier_name": "Mailchimp Enterprise",
        "supplier_logo": None,
        "supplier_color": "#FFE01B",
        "pricing_model": "Per Month",
        "base_price": 2500.00,
        "image_url": SERVICE_IMAGE_URLS.get("Email Marketing"),
        "short_description": "Automated email marketing campaigns with lead nurturing",
        "full_description": "Comprehensive email marketing services including campaign strategy, template design, automation workflow setup, A/B testing, and performance optimization.",
        "service_includes": [
            "Email strategy development",
            "Template design and coding",
            "List segmentation setup",
            "Automation workflow creation",
            "A/B testing programs",
            "Deliverability optimization",
            "Performance reporting"
        ],
        "availability": {"available": True, "lead_time_days": 3, "regions": ["Global"]},
        "rating": 4.6,
        "reviews_count": 389
    },
    {
        "id": "SVC-PPC-001",
        "name": "PPC & Paid Advertising Management",
        "category": "Digital Marketing & Creative Agency Services",
        "unspsc_code": "80171620",
        "unspsc_name": "Paid advertising services",
        "supplier_name": "WordStream Agency",
        "supplier_logo": None,
        "supplier_color": "#4285F4",
        "pricing_model": "Percentage of Ad Spend",
        "base_price": 15.00,
        "image_url": SERVICE_IMAGE_URLS.get("PPC Advertising"),
        "short_description": "Google Ads, LinkedIn Ads, and paid media campaign management",
        "full_description": "Full-service paid advertising management across Google Ads, LinkedIn, Facebook, and programmatic display networks with focus on ROI optimization.",
        "service_includes": [
            "Campaign strategy and setup",
            "Keyword and audience research",
            "Ad copywriting and creative",
            "Bid management optimization",
            "Landing page recommendations",
            "Conversion tracking setup",
            "Weekly performance reports"
        ],
        "availability": {"available": True, "lead_time_days": 3, "regions": ["Global"]},
        "rating": 4.7,
        "reviews_count": 567
    },
    {
        "id": "SVC-BRD-001",
        "name": "Brand Identity Design Services",
        "category": "Digital Marketing & Creative Agency Services",
        "unspsc_code": "80141605",
        "unspsc_name": "Brand identity design",
        "supplier_name": "Pentagram Design",
        "supplier_logo": None,
        "supplier_color": "#000000",
        "pricing_model": "Per Project",
        "base_price": 25000.00,
        "image_url": SERVICE_IMAGE_URLS.get("Brand Identity Design"),
        "short_description": "Complete brand identity creation and visual design system",
        "full_description": "Comprehensive brand identity design services including logo design, visual identity system, brand guidelines, and collateral design for consistent brand representation.",
        "service_includes": [
            "Brand discovery workshop",
            "Logo design and variations",
            "Color palette development",
            "Typography selection",
            "Visual design system",
            "Brand guidelines documentation",
            "Collateral template design"
        ],
        "availability": {"available": True, "lead_time_days": 21, "regions": ["Global"]},
        "rating": 4.9,
        "reviews_count": 178
    }
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

# InfoCoin Rewards with CDN images
INFOCOIN_REWARDS = [
    {"id": "1", "name": "Premium Executive Jacket", "description": "High-quality insulated navy blue jacket with Infosys branding", "coins_required": 5000, "image_url": REWARD_IMAGE_URLS.get("Executive Jacket"), "category": "Apparel"},
    {"id": "2", "name": "Premium Leather Backpack", "description": "Professional leather laptop backpack for business travel", "coins_required": 4500, "image_url": REWARD_IMAGE_URLS.get("Leather Backpack"), "category": "Accessories"},
    {"id": "3", "name": "Wireless Bluetooth Earbuds", "description": "Premium wireless earbuds with noise cancellation in charging case", "coins_required": 3500, "image_url": REWARD_IMAGE_URLS.get("Wireless Earbuds"), "category": "Electronics"},
    {"id": "4", "name": "Stainless Steel Insulated Tumbler", "description": "Double-walled insulated tumbler, keeps drinks hot/cold for 12 hours", "coins_required": 800, "image_url": REWARD_IMAGE_URLS.get("Insulated Tumbler"), "category": "Drinkware"},
    {"id": "5", "name": "Executive Desk Organizer Set", "description": "Premium desk organizer with pen holder, card holder, and notepad holder", "coins_required": 1500, "image_url": REWARD_IMAGE_URLS.get("Desk Organizer Set"), "category": "Office"},
    {"id": "6", "name": "Smartwatch Fitness Tracker", "description": "Modern smartwatch with fitness tracking, heart rate monitor, and notifications", "coins_required": 6000, "image_url": REWARD_IMAGE_URLS.get("Smartwatch"), "category": "Electronics"},
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
    """Get brand info with color"""
    for brand in MRO_BRANDS:
        if brand["name"] == brand_name:
            return brand
    return {"name": brand_name, "logo": None, "color": "#007CC3"}

def generate_product_data(index: int, category: str, brand: str) -> Dict:
    """Generate realistic product data with UNSPSC and detailed specifications"""
    # Enhanced product names with specifications - all images from Emergent CDN
    product_catalog = {
        "Bearings & Power Transmission": [
            {"name": "Deep Groove Ball Bearing", "specs": {"Inner Diameter": "25mm", "Outer Diameter": "52mm", "Width": "15mm", "Material": "Chrome Steel", "Seal Type": "2RS Rubber Sealed", "Load Rating": "14kN Dynamic"}, "image": PRODUCT_IMAGE_URLS.get("SKF Ball Bearing", PRODUCT_IMAGE_URLS.get("Bearings & Power Transmission"))},
            {"name": "Tapered Roller Bearing", "specs": {"Bore Size": "30mm", "Outside Diameter": "62mm", "Width": "17.25mm", "Material": "Chrome Steel", "Cage Type": "Steel", "Dynamic Load": "44kN"}, "image": PRODUCT_IMAGE_URLS.get("SKF Ball Bearing", PRODUCT_IMAGE_URLS.get("Bearings & Power Transmission"))},
            {"name": "Industrial Timing Belt", "specs": {"Pitch": "8mm HTD", "Width": "30mm", "Length": "1200mm", "Material": "Neoprene/Fiberglass", "Teeth Count": "150", "Max Speed": "40m/s"}, "image": PRODUCT_IMAGE_URLS.get("Gates Timing Belt", PRODUCT_IMAGE_URLS.get("Bearings & Power Transmission"))},
        ],
        "Electrical & Lighting": [
            {"name": "Industrial LED High Bay Light", "specs": {"Power": "200W", "Lumens": "26,000lm", "Color Temp": "5000K", "IP Rating": "IP65", "Beam Angle": "120°", "Lifespan": "50,000hrs"}, "image": PRODUCT_IMAGE_URLS.get("Philips LED Light", PRODUCT_IMAGE_URLS.get("Electrical & Lighting"))},
            {"name": "Miniature Circuit Breaker", "specs": {"Current Rating": "32A", "Poles": "3P", "Breaking Capacity": "10kA", "Curve Type": "C", "Voltage": "400V AC", "DIN Rail Mount": "Yes"}, "image": PRODUCT_IMAGE_URLS.get("Schneider Circuit Breaker", PRODUCT_IMAGE_URLS.get("Electrical & Lighting"))},
            {"name": "Industrial Contactor", "specs": {"Coil Voltage": "24V DC", "Current Rating": "40A", "Contacts": "3NO + 1NC", "Mounting": "DIN Rail", "Duty Cycle": "AC-3", "Mechanical Life": "10M ops"}, "image": PRODUCT_IMAGE_URLS.get("Schneider Circuit Breaker", PRODUCT_IMAGE_URLS.get("Electrical & Lighting"))},
        ],
        "Hand Tools": [
            {"name": "Professional Ratcheting Wrench Set", "specs": {"Pieces": "12pc SAE/Metric", "Drive Size": "72-Tooth Ratchet", "Material": "Chrome Vanadium", "Finish": "Polished Chrome", "Case": "Blow Mold", "Warranty": "Lifetime"}, "image": PRODUCT_IMAGE_URLS.get("Stanley Wrench", PRODUCT_IMAGE_URLS.get("Hand Tools"))},
            {"name": "Precision Screwdriver Set", "specs": {"Pieces": "32pc", "Tip Types": "Phillips/Slotted/Torx/Hex", "Handle": "Ergonomic Cushion Grip", "Blade": "Hardened Steel", "Case": "Rotating Stand", "Magnetic Tips": "Yes"}, "image": PRODUCT_IMAGE_URLS.get("Stanley Wrench", PRODUCT_IMAGE_URLS.get("Hand Tools"))},
        ],
        "Power Tools": [
            {"name": "18V Brushless Cordless Drill/Driver Kit", "specs": {"Voltage": "18V/20V MAX", "Chuck": "1/2\" Metal Ratcheting", "Speed": "0-2000 RPM", "Torque": "620 in-lbs", "Battery": "5.0Ah Li-Ion (2x)", "LED Light": "3-Mode"}, "image": PRODUCT_IMAGE_URLS.get("Bosch Drill", PRODUCT_IMAGE_URLS.get("Power Tools"))},
            {"name": "Industrial Angle Grinder", "specs": {"Disc Size": "125mm (5\")", "Power": "1400W", "No Load Speed": "11,500 RPM", "Spindle Thread": "M14", "Guard": "Adjustable", "Soft Start": "Yes"}, "image": PRODUCT_IMAGE_URLS.get("Bosch Drill", PRODUCT_IMAGE_URLS.get("Power Tools"))},
        ],
        "Safety & PPE": [
            {"name": "Premium Safety Helmet", "specs": {"Standard": "EN397/ANSI Z89.1", "Material": "ABS Shell", "Suspension": "6-Point Ratchet", "Ventilation": "4-Point Vented", "Accessory Slots": "Yes", "UV Resistant": "Yes"}, "image": PRODUCT_IMAGE_URLS.get("3M Safety Helmet", PRODUCT_IMAGE_URLS.get("Safety & PPE"))},
            {"name": "Impact-Resistant Safety Glasses", "specs": {"Standard": "EN166/ANSI Z87.1+", "Lens": "Polycarbonate Anti-Scratch", "Coating": "Anti-Fog", "UV Protection": "99.9%", "Frame": "Wraparound", "Weight": "28g"}, "image": PRODUCT_IMAGE_URLS.get("3M Safety Glasses", PRODUCT_IMAGE_URLS.get("Safety & PPE"))},
        ],
        "IT Equipment - Laptops": [
            {"name": "ProBook Business Laptop", "specs": {"Processor": "Intel Core i7-1355U", "Memory": "16GB DDR4", "Storage": "512GB NVMe SSD", "Display": "15.6\" FHD IPS", "OS": "Windows 11 Pro", "Battery": "Up to 10hrs"}, "image": PRODUCT_IMAGE_URLS.get("HP Laptop", PRODUCT_IMAGE_URLS.get("IT Equipment - Laptops"))},
            {"name": "Elite Ultrabook", "specs": {"Processor": "Intel Core i7-1365U vPro", "Memory": "32GB DDR5", "Storage": "1TB NVMe Gen4", "Display": "14\" 2.8K OLED", "OS": "Windows 11 Pro", "Weight": "1.12kg"}, "image": PRODUCT_IMAGE_URLS.get("HP Laptop", PRODUCT_IMAGE_URLS.get("IT Equipment - Laptops"))},
        ],
        "IT Equipment - Monitors": [
            {"name": "Professional 4K USB-C Monitor", "specs": {"Screen Size": "27\"", "Resolution": "3840x2160", "Panel": "IPS", "Refresh": "60Hz", "Ports": "USB-C 90W, HDMI, DP", "Ergonomics": "HAS"}, "image": PRODUCT_IMAGE_URLS.get("Dell Monitor", PRODUCT_IMAGE_URLS.get("IT Equipment - Monitors"))},
            {"name": "Ultrawide Curved Monitor", "specs": {"Screen Size": "34\"", "Resolution": "3440x1440", "Panel": "VA 1500R", "Refresh": "100Hz", "HDR": "HDR10", "Built-in KVM": "Yes"}, "image": PRODUCT_IMAGE_URLS.get("Dell Monitor", PRODUCT_IMAGE_URLS.get("IT Equipment - Monitors"))},
        ],
        "IT Equipment - Networking": [
            {"name": "Enterprise Managed Switch", "specs": {"Ports": "48x GbE PoE+", "Uplinks": "4x 10G SFP+", "PoE Budget": "740W", "Switching": "176Gbps", "Management": "CLI/Web/SNMP", "Stackable": "Yes"}, "image": PRODUCT_IMAGE_URLS.get("Cisco Switch", PRODUCT_IMAGE_URLS.get("IT Equipment - Networking"))},
            {"name": "Enterprise Wireless Access Point", "specs": {"Standard": "Wi-Fi 6E", "Speed": "Up to 5.4Gbps", "Bands": "Tri-Band", "Clients": "500+", "PoE": "802.3at", "MIMO": "4x4:4"}, "image": PRODUCT_IMAGE_URLS.get("Cisco Switch", PRODUCT_IMAGE_URLS.get("IT Equipment - Networking"))},
        ],
        "Adhesives & Sealants": [
            {"name": "Industrial Adhesive Set", "specs": {"Type": "Multi-purpose", "Bond Strength": "High", "Cure Time": "24hrs", "Temperature Range": "-40°C to 120°C", "Volume": "50ml each"}, "image": PRODUCT_IMAGE_URLS.get("Henkel Adhesive", PRODUCT_IMAGE_URLS.get("Adhesives & Sealants"))},
        ],
    }
    
    # Get product details or use defaults
    products = product_catalog.get(category, [
        {"name": "Industrial Component", "specs": {"Type": "Standard", "Grade": "Industrial", "Material": "High-Quality", "Certification": "ISO 9001"}}
    ])
    
    product = products[index % len(products)]
    unspsc = generate_unspsc_code(category)
    brand_info = get_brand_info(brand)
    
    # Get image URL from CDN
    image_url = PRODUCT_IMAGE_URLS.get(category, DEFAULT_PRODUCT_IMAGE)
    
    # Generate price based on category
    price_ranges = {
        "IT Equipment - Laptops": (800, 3500),
        "IT Equipment - Monitors": (300, 1500),
        "IT Equipment - Networking": (500, 5000),
        "IT Equipment - Servers": (2000, 15000),
        "Power Tools": (100, 800),
        "Safety & PPE": (15, 150),
    }
    price_range = price_ranges.get(category, (25, 500))
    base_price = round(random.uniform(*price_range), 2)
    
    # 10% chance of being sponsored
    is_sponsored = random.random() < 0.10
    
    # Generate availability info
    availability = {
        "in_stock": random.random() > 0.1,
        "quantity": random.randint(5, 500),
        "warehouse": random.choice(["US-East", "US-West", "US-Central", "EU-West", "APAC-SG"]),
        "ships_from": random.choice(["Manufacturer", "Distribution Center", "Local Warehouse"]),
        "estimated_delivery": f"{random.randint(1, 5)}-{random.randint(6, 10)} business days"
    }
    
    return {
        "id": str(uuid.uuid4()),
        "name": f"{brand} {product['name']}",
        "short_description": f"Professional-grade {product['name'].lower()} from {brand}. Designed for enterprise and industrial applications.",
        "full_description": f"The {brand} {product['name']} delivers exceptional performance and reliability for demanding professional environments. Built with premium materials and backed by {brand}'s reputation for quality. Meets international standards for safety and performance. Ideal for enterprise deployments and industrial applications.",
        "category": category,
        "brand": brand,
        "brand_logo": brand_info.get("logo"),
        "brand_color": brand_info.get("color", "#007CC3"),
        "sku": f"{brand[:3].upper()}-{category[:3].upper()}-{index:06d}",
        "unspsc_code": unspsc,
        "unspsc_name": category,
        "base_price": base_price,
        "unit": random.choice(["EA", "PK", "BX", "SET"]),
        "image_url": image_url,
        "specifications": product.get("specs", {}),
        "availability": availability,
        "rating": round(random.uniform(4.0, 5.0), 1),
        "reviews_count": random.randint(10, 500),
        "spec_document_url": "https://example.com/specs/document.pdf",
        "is_sponsored": is_sponsored,
        "features": [
            "Premium build quality",
            "Industry-standard compliance",
            "Extended warranty available",
            f"Genuine {brand} product"
        ]
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
    lang: str = Query("en", description="Language code (en, fr, de, it, nl)"),
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
            "short_description": product.get("short_description", product.get("full_description", "")[:100]),
            "full_description": product.get("full_description", ""),
            "category": product["category"],
            "brand": product["brand"],
            "brand_logo": product.get("brand_logo"),
            "brand_color": product.get("brand_color"),
            "sku": product["sku"],
            "unspsc_code": product["unspsc_code"],
            "unspsc_name": product["unspsc_name"],
            "price": round(price * currency["rate"], 2) if price else None,
            "currency_code": currency["code"],
            "currency_symbol": currency["symbol"],
            "unit": product["unit"],
            "image_url": product["image_url"],
            "specifications": product.get("specifications", {}),
            "availability": product.get("availability", {"in_stock": True, "quantity": random.randint(10, 500)}),
            "rating": product.get("rating", round(random.uniform(4.0, 5.0), 1)),
            "reviews_count": product.get("reviews_count", random.randint(10, 500)),
            "features": product.get("features", []),
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
        "brands": [{"name": b["name"], "logo": b.get("logo"), "color": b.get("color")} for b in MRO_BRANDS]
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
    
    # Combine IT Services Catalog with SERVICES_DATA
    all_services = []
    
    # Add IT Services from detailed catalog
    for it_service in IT_SERVICES_CATALOG:
        all_services.append({
            "id": it_service["id"],
            "name": it_service["name"],
            "short_description": it_service["short_description"],
            "full_description": it_service["full_description"],
            "category": it_service["category"],
            "unspsc_code": it_service["unspsc_code"],
            "unspsc_name": it_service["unspsc_name"],
            "supplier_name": it_service.get("supplier_name"),
            "supplier_logo": it_service.get("supplier_logo"),
            "supplier_color": it_service.get("supplier_color", "#007CC3"),
            "unit_of_measure": it_service["pricing_model"],
            "base_price": it_service["base_price"],
            "image_url": it_service.get("image_url", DEFAULT_SERVICE_IMAGE),
            "service_includes": it_service.get("service_includes", []),
            "availability": it_service.get("availability", {}),
            "rating": it_service.get("rating", 4.5),
            "reviews_count": it_service.get("reviews_count", 100),
            "is_it_service": True
        })
    
    # Add regular services
    for service in SERVICES_DATA:
        # Get image URL for the service category
        service_image = SERVICE_IMAGE_URLS.get(service["category"], DEFAULT_SERVICE_IMAGE)
        all_services.append({
            "id": str(uuid.uuid4()),
            "name": service["name"],
            "short_description": f"Professional {service['name'].lower()} for enterprise environments.",
            "full_description": f"{service['name']}. Professional service meeting industry standards and compliance requirements.",
            "category": service["category"],
            "unspsc_code": service["unspsc_code"],
            "unspsc_name": service["unspsc_name"],
            "supplier_name": service["supplier_name"],
            "supplier_logo": None,
            "supplier_color": "#007CC3",
            "unit_of_measure": service["unit_of_measure"],
            "base_price": service["base_price"],
            "image_url": service_image,
            "service_includes": [],
            "availability": {"available": True, "lead_time_days": random.randint(1, 7)},
            "rating": round(random.uniform(4.0, 5.0), 1),
            "reviews_count": random.randint(20, 300),
            "is_it_service": False
        })
    
    # Filter by search term
    filtered_services = all_services
    if search_term:
        filtered_services = [s for s in all_services if 
            search_term in s["name"].lower() or 
            search_term in s["category"].lower() or
            search_term in s.get("short_description", "").lower()]
    if category and category != "all":
        filtered_services = [s for s in filtered_services if s["category"].lower() == category.lower()]
    
    if not filtered_services:
        filtered_services = all_services[:15]
    
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
            "id": service["id"],
            "name": service["name"],
            "short_description": service.get("short_description", ""),
            "full_description": service.get("full_description", ""),
            "category": service["category"],
            "unspsc_code": service["unspsc_code"],
            "unspsc_name": service["unspsc_name"],
            "unit_of_measure": service["unit_of_measure"],
            "price": round(price * currency["rate"], 2) if price else None,
            "currency_code": currency["code"],
            "currency_symbol": currency["symbol"],
            "pricing_model": service["unit_of_measure"],
            "supplier_name": service["supplier_name"] if has_supplier else None,
            "supplier_logo": service.get("supplier_logo"),
            "supplier_color": service.get("supplier_color", "#007CC3"),
            "image_url": service.get("image_url", DEFAULT_SERVICE_IMAGE),
            "service_includes": service.get("service_includes", []),
            "availability": service.get("availability", {}),
            "rating": service.get("rating", 4.5),
            "reviews_count": service.get("reviews_count", 100),
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
    
    # If no orders exist, return sample orders with 5 different statuses
    if not orders:
        currency = COUNTRY_CURRENCIES.get(current_user.get("country", "USA"), COUNTRY_CURRENCIES["USA"])
        sample_orders = [
            # Status 1: Pending - Just placed
            {
                "id": "ORD-A1B2C3D4",
                "user_id": current_user["id"],
                "items": [
                    {"product_name": "HP ProBook 450 G10 Business Laptop", "quantity": 2, "unit_price": round(1299.00 * currency["rate"], 2), "total_price": round(2598.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("IT Equipment - Laptops")},
                    {"product_name": "Dell UltraSharp U2723QE 27\" 4K Monitor", "quantity": 2, "unit_price": round(799.00 * currency["rate"], 2), "total_price": round(1598.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("IT Equipment - Monitors")}
                ],
                "total_amount": round(4196.00 * currency["rate"], 2),
                "currency_code": currency["code"],
                "status": "pending",
                "status_description": "Order received, awaiting processing",
                "created_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
                "estimated_delivery": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                "tracking_number": None
            },
            # Status 2: Confirmed - Payment verified
            {
                "id": "ORD-E5F6G7H8",
                "user_id": current_user["id"],
                "items": [
                    {"product_name": "ABB Industrial AC Motor 7.5HP", "quantity": 1, "unit_price": round(1850.00 * currency["rate"], 2), "total_price": round(1850.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("Motors & Drives")},
                    {"product_name": "Siemens VFD Variable Frequency Drive 15HP", "quantity": 1, "unit_price": round(2450.00 * currency["rate"], 2), "total_price": round(2450.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("Motors & Drives")}
                ],
                "total_amount": round(4300.00 * currency["rate"], 2),
                "currency_code": currency["code"],
                "status": "confirmed",
                "status_description": "Payment verified, preparing for shipment",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
                "estimated_delivery": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
                "tracking_number": None
            },
            # Status 3: Processing - Being prepared
            {
                "id": "ORD-I9J0K1L2",
                "user_id": current_user["id"],
                "items": [
                    {"product_name": "Fluke 289 True-RMS Industrial Multimeter", "quantity": 3, "unit_price": round(595.00 * currency["rate"], 2), "total_price": round(1785.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("Test & Measurement")},
                    {"product_name": "Kennametal Carbide End Mill Set", "quantity": 2, "unit_price": round(485.00 * currency["rate"], 2), "total_price": round(970.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("Cutting Tools")}
                ],
                "total_amount": round(2755.00 * currency["rate"], 2),
                "currency_code": currency["code"],
                "status": "processing",
                "status_description": "Items being picked and packed in warehouse",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                "estimated_delivery": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
                "tracking_number": None
            },
            # Status 4: Shipped - In transit
            {
                "id": "ORD-M3N4O5P6",
                "user_id": current_user["id"],
                "items": [
                    {"product_name": "Lincoln Electric MIG Welder 250A", "quantity": 1, "unit_price": round(2150.00 * currency["rate"], 2), "total_price": round(2150.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("Welding")},
                    {"product_name": "3M Powered Air Purifying Respirator System", "quantity": 2, "unit_price": round(1250.00 * currency["rate"], 2), "total_price": round(2500.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("Safety & PPE")}
                ],
                "total_amount": round(4650.00 * currency["rate"], 2),
                "currency_code": currency["code"],
                "status": "shipped",
                "status_description": "Package in transit with carrier",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat(),
                "estimated_delivery": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
                "tracking_number": "1Z999AA10123456784",
                "carrier": "UPS Ground"
            },
            # Status 5: Delivered - Completed
            {
                "id": "ORD-Q7R8S9T0",
                "user_id": current_user["id"],
                "items": [
                    {"product_name": "Parker Hydraulic Gear Pump 20GPM", "quantity": 2, "unit_price": round(875.00 * currency["rate"], 2), "total_price": round(1750.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("Hydraulics & Pneumatics")},
                    {"product_name": "Festo Pneumatic Cylinder 100mm Bore", "quantity": 4, "unit_price": round(425.00 * currency["rate"], 2), "total_price": round(1700.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("Hydraulics & Pneumatics")},
                    {"product_name": "Honeywell Safety Harness Full Body", "quantity": 5, "unit_price": round(345.00 * currency["rate"], 2), "total_price": round(1725.00 * currency["rate"], 2), "image_url": PRODUCT_IMAGE_URLS.get("Safety Gloves")}
                ],
                "total_amount": round(5175.00 * currency["rate"], 2),
                "currency_code": currency["code"],
                "status": "delivered",
                "status_description": "Delivered and signed for",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
                "delivery_date": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                "tracking_number": "1Z999AA10987654321",
                "carrier": "FedEx Express",
                "signed_by": "J. Smith"
            }
        ]
        orders = sample_orders
    
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

@api_router.get("/chat/history")
async def get_chat_history(session_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    history = await db.chat_history.find(
        {"session_id": session_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    return {"history": history}

# Stats
@api_router.get("/stats")
async def get_stats():
    return {
        "total_products": "30M+",
        "total_services": "100K+",
        "total_categories": 78,
        "total_brands": "511+",
        "service_categories": len(SERVICE_CATEGORIES),
        "integrations": ["Coupa", "SAP Ariba", "SAP ERP", "Ivalua", "Oracle"],
        "countries_served": len(COUNTRY_CURRENCIES),
        "punchout_systems": PUNCHOUT_SYSTEMS
    }

# Admin Routes for Vendor Catalog Upload
DELIVERY_PARTNERS = [
    {"id": "grainger", "name": "Grainger", "logo": None, "color": "#E31837"},
    {"id": "motion", "name": "Motion Industries", "logo": None, "color": "#003366"},
    {"id": "fastenal", "name": "Fastenal", "logo": None, "color": "#00529B"},
    {"id": "bdi", "name": "BDI (Bearing Distributors Inc)", "logo": None, "color": "#1E4D8C"},
    {"id": "msc", "name": "MSC Industrial", "logo": None, "color": "#003B71"},
    {"id": "mcmaster", "name": "McMaster-Carr", "logo": None, "color": "#8B4513"},
    {"id": "zoro", "name": "Zoro", "logo": None, "color": "#FF6600"},
    {"id": "uline", "name": "Uline", "logo": None, "color": "#003366"},
]

class AdminLogin(BaseModel):
    username: str
    password: str

class CatalogUploadResponse(BaseModel):
    success: bool
    message: str
    products_imported: int = 0
    services_imported: int = 0
    errors: List[str] = []

# Admin authentication - simple for demo
ADMIN_CREDENTIALS = {
    "admin": "admin123",
    "infosys_admin": "InfosysBPM2024!"
}

def verify_admin(username: str, password: str) -> bool:
    return ADMIN_CREDENTIALS.get(username) == password

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    if verify_admin(credentials.username, credentials.password):
        admin_token = create_jwt_token(f"admin_{credentials.username}", credentials.username)
        return {"success": True, "token": admin_token, "username": credentials.username}
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@api_router.get("/admin/delivery-partners")
async def get_delivery_partners():
    return {"partners": DELIVERY_PARTNERS}

@api_router.post("/admin/upload-catalog")
async def upload_vendor_catalog(
    file: UploadFile = File(...),
    partner_id: str = Form(...),
    catalog_type: str = Form(...)  # "products" or "services"
):
    """
    Upload vendor catalog from delivery partners like Grainger, MOTION, Fastenal, BDI
    Accepts CSV/Excel files with product or service data
    """
    # Validate partner
    partner = next((p for p in DELIVERY_PARTNERS if p["id"] == partner_id), None)
    if not partner:
        raise HTTPException(status_code=400, detail=f"Invalid delivery partner: {partner_id}")
    
    # Validate file type
    allowed_extensions = ['.csv', '.xlsx', '.xls']
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}")
    
    # Read file content
    content = await file.read()
    
    products_imported = 0
    services_imported = 0
    errors = []
    
    try:
        if file_ext == '.csv':
            import csv
            import io
            
            decoded = content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(decoded))
            rows = list(reader)
        else:
            # Excel file
            import openpyxl
            import io
            
            wb = openpyxl.load_workbook(io.BytesIO(content))
            ws = wb.active
            headers = [cell.value for cell in ws[1]]
            rows = []
            for row in ws.iter_rows(min_row=2, values_only=True):
                rows.append(dict(zip(headers, row)))
        
        # Process rows
        for idx, row in enumerate(rows):
            try:
                if catalog_type == "products":
                    product_data = {
                        "id": str(uuid.uuid4()),
                        "name": row.get("name") or row.get("product_name") or row.get("Name"),
                        "description": row.get("description") or row.get("Description") or "",
                        "brand": row.get("brand") or row.get("Brand") or partner["name"],
                        "category": row.get("category") or row.get("Category") or "General MRO",
                        "sku": row.get("sku") or row.get("SKU") or row.get("part_number") or f"{partner_id.upper()}-{idx:06d}",
                        "unspsc_code": row.get("unspsc") or row.get("UNSPSC") or "31000000",
                        "base_price": float(row.get("price") or row.get("Price") or row.get("unit_price") or 0),
                        "unit": row.get("unit") or row.get("UOM") or "EA",
                        "delivery_partner": partner["name"],
                        "delivery_partner_id": partner_id,
                        "image_url": row.get("image_url") or PRODUCT_IMAGE_URLS.get("Hand Tools"),
                        "imported_at": datetime.now(timezone.utc).isoformat(),
                        "source": f"vendor_upload_{partner_id}"
                    }
                    
                    if product_data["name"]:
                        await db.vendor_products.insert_one(product_data)
                        products_imported += 1
                else:  # services
                    service_data = {
                        "id": str(uuid.uuid4()),
                        "name": row.get("name") or row.get("service_name") or row.get("Name"),
                        "description": row.get("description") or row.get("Description") or "",
                        "category": row.get("category") or row.get("Category") or "Facilities Management & Workplace Services",
                        "unspsc_code": row.get("unspsc") or row.get("UNSPSC") or "76100000",
                        "base_rate": float(row.get("rate") or row.get("Rate") or row.get("price") or 0),
                        "pricing_model": row.get("pricing_model") or row.get("unit") or "Per Hour",
                        "supplier_name": row.get("supplier") or row.get("Supplier") or partner["name"],
                        "delivery_partner": partner["name"],
                        "delivery_partner_id": partner_id,
                        "image_url": row.get("image_url") or SERVICE_IMAGE_URLS.get("Commercial Cleaning"),
                        "imported_at": datetime.now(timezone.utc).isoformat(),
                        "source": f"vendor_upload_{partner_id}"
                    }
                    
                    if service_data["name"]:
                        await db.vendor_services.insert_one(service_data)
                        services_imported += 1
                        
            except Exception as e:
                errors.append(f"Row {idx + 2}: {str(e)}")
                
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    
    return CatalogUploadResponse(
        success=True,
        message=f"Catalog uploaded successfully from {partner['name']}",
        products_imported=products_imported,
        services_imported=services_imported,
        errors=errors[:10]  # Return first 10 errors only
    )

@api_router.get("/admin/uploaded-catalogs")
async def get_uploaded_catalogs():
    """Get summary of uploaded vendor catalogs"""
    products_by_partner = {}
    services_by_partner = {}
    
    # Count products by partner
    products = await db.vendor_products.find({}, {"delivery_partner": 1, "_id": 0}).to_list(10000)
    for p in products:
        partner = p.get("delivery_partner", "Unknown")
        products_by_partner[partner] = products_by_partner.get(partner, 0) + 1
    
    # Count services by partner
    services = await db.vendor_services.find({}, {"delivery_partner": 1, "_id": 0}).to_list(10000)
    for s in services:
        partner = s.get("delivery_partner", "Unknown")
        services_by_partner[partner] = services_by_partner.get(partner, 0) + 1
    
    return {
        "products_by_partner": products_by_partner,
        "services_by_partner": services_by_partner,
        "total_vendor_products": sum(products_by_partner.values()),
        "total_vendor_services": sum(services_by_partner.values()),
        "delivery_partners": DELIVERY_PARTNERS
    }

@api_router.delete("/admin/clear-catalog/{partner_id}")
async def clear_partner_catalog(partner_id: str, catalog_type: str = "all"):
    """Clear uploaded catalog from a specific delivery partner"""
    deleted_products = 0
    deleted_services = 0
    
    if catalog_type in ["products", "all"]:
        result = await db.vendor_products.delete_many({"delivery_partner_id": partner_id})
        deleted_products = result.deleted_count
    
    if catalog_type in ["services", "all"]:
        result = await db.vendor_services.delete_many({"delivery_partner_id": partner_id})
        deleted_services = result.deleted_count
    
    return {
        "success": True,
        "deleted_products": deleted_products,
        "deleted_services": deleted_services
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

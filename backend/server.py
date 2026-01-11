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
    {"name": "IT Equipment - Laptops", "unspsc": "43211500", "icon": "laptop"},
    {"name": "IT Equipment - Monitors", "unspsc": "43211900", "icon": "monitor"},
    {"name": "IT Equipment - Networking", "unspsc": "43222600", "icon": "wifi"},
    {"name": "IT Equipment - Servers", "unspsc": "43211800", "icon": "server"},
    {"name": "IT Equipment - Peripherals", "unspsc": "43211700", "icon": "keyboard"},
]

# MRO Brands with high-quality logos (using Clearbit for reliable loading)
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
    {"name": "Schneider Electric", "logo": "https://logo.clearbit.com/se.com"},
    {"name": "Mitsubishi Electric", "logo": "https://logo.clearbit.com/mitsubishielectric.com"},
    {"name": "Omron", "logo": "https://logo.clearbit.com/omron.com"},
    {"name": "Festo", "logo": "https://logo.clearbit.com/festo.com"},
    {"name": "Fluke", "logo": "https://logo.clearbit.com/fluke.com"},
    {"name": "Makita", "logo": "https://logo.clearbit.com/makita.com"},
    {"name": "DeWalt", "logo": "https://logo.clearbit.com/dewalt.com"},
    {"name": "Milwaukee", "logo": "https://logo.clearbit.com/milwaukeetool.com"},
    {"name": "Stanley", "logo": "https://logo.clearbit.com/stanleytools.com"},
    {"name": "Klein Tools", "logo": "https://logo.clearbit.com/kleintools.com"},
    {"name": "HP", "logo": "https://logo.clearbit.com/hp.com"},
    {"name": "Dell", "logo": "https://logo.clearbit.com/dell.com"},
    {"name": "Lenovo", "logo": "https://logo.clearbit.com/lenovo.com"},
    {"name": "LG", "logo": "https://logo.clearbit.com/lg.com"},
    {"name": "Samsung", "logo": "https://logo.clearbit.com/samsung.com"},
    {"name": "Cisco", "logo": "https://logo.clearbit.com/cisco.com"},
    {"name": "ASUS", "logo": "https://logo.clearbit.com/asus.com"},
    {"name": "Acer", "logo": "https://logo.clearbit.com/acer.com"},
    {"name": "BenQ", "logo": "https://logo.clearbit.com/benq.com"},
    {"name": "Logitech", "logo": "https://logo.clearbit.com/logitech.com"},
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
        "image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80",
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
        "image_url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
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
        "supplier_logo": "https://logo.clearbit.com/infosys.com",
        "pricing_model": "Per Hour",
        "base_price": 125.00,
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
        "supplier_logo": "https://logo.clearbit.com/cisco.com",
        "pricing_model": "Per Access Point",
        "base_price": 350.00,
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
        "supplier_logo": "https://logo.clearbit.com/dell.com",
        "pricing_model": "Per Device",
        "base_price": 85.00,
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
        "supplier_logo": "https://logo.clearbit.com/hpe.com",
        "pricing_model": "Per Server",
        "base_price": 450.00,
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
        "supplier_logo": "https://logo.clearbit.com/infosys.com",
        "pricing_model": "Per Assessment",
        "base_price": 5500.00,
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
        "supplier_logo": "https://logo.clearbit.com/infosys.com",
        "pricing_model": "Per User/Month",
        "base_price": 75.00,
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
    """Generate realistic product data with UNSPSC and detailed specifications"""
    # Enhanced product names with specifications
    product_catalog = {
        "Bearings & Power Transmission": [
            {"name": "Deep Groove Ball Bearing", "specs": {"Inner Diameter": "25mm", "Outer Diameter": "52mm", "Width": "15mm", "Material": "Chrome Steel", "Seal Type": "2RS Rubber Sealed", "Load Rating": "14kN Dynamic"}, "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"},
            {"name": "Tapered Roller Bearing", "specs": {"Bore Size": "30mm", "Outside Diameter": "62mm", "Width": "17.25mm", "Material": "Chrome Steel", "Cage Type": "Steel", "Dynamic Load": "44kN"}, "image": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80"},
            {"name": "Industrial Timing Belt", "specs": {"Pitch": "8mm HTD", "Width": "30mm", "Length": "1200mm", "Material": "Neoprene/Fiberglass", "Teeth Count": "150", "Max Speed": "40m/s"}, "image": "https://images.unsplash.com/photo-1612430146325-87a163519863?w=800&q=80"},
        ],
        "Electrical & Lighting": [
            {"name": "Industrial LED High Bay Light", "specs": {"Power": "200W", "Lumens": "26,000lm", "Color Temp": "5000K", "IP Rating": "IP65", "Beam Angle": "120°", "Lifespan": "50,000hrs"}, "image": "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&q=80"},
            {"name": "Miniature Circuit Breaker", "specs": {"Current Rating": "32A", "Poles": "3P", "Breaking Capacity": "10kA", "Curve Type": "C", "Voltage": "400V AC", "DIN Rail Mount": "Yes"}, "image": "https://images.unsplash.com/photo-1625592831117-b6ef5fe3bdd3?w=800&q=80"},
            {"name": "Industrial Contactor", "specs": {"Coil Voltage": "24V DC", "Current Rating": "40A", "Contacts": "3NO + 1NC", "Mounting": "DIN Rail", "Duty Cycle": "AC-3", "Mechanical Life": "10M ops"}, "image": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80"},
        ],
        "Hand Tools": [
            {"name": "Professional Ratcheting Wrench Set", "specs": {"Pieces": "12pc SAE/Metric", "Drive Size": "72-Tooth Ratchet", "Material": "Chrome Vanadium", "Finish": "Polished Chrome", "Case": "Blow Mold", "Warranty": "Lifetime"}, "image": "https://images.unsplash.com/photo-1580402427914-a3b9f8de8b39?w=800&q=80"},
            {"name": "Precision Screwdriver Set", "specs": {"Pieces": "32pc", "Tip Types": "Phillips/Slotted/Torx/Hex", "Handle": "Ergonomic Cushion Grip", "Blade": "Hardened Steel", "Case": "Rotating Stand", "Magnetic Tips": "Yes"}, "image": "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80"},
        ],
        "Power Tools": [
            {"name": "18V Brushless Cordless Drill/Driver Kit", "specs": {"Voltage": "18V/20V MAX", "Chuck": "1/2\" Metal Ratcheting", "Speed": "0-2000 RPM", "Torque": "620 in-lbs", "Battery": "5.0Ah Li-Ion (2x)", "LED Light": "3-Mode"}, "image": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80"},
            {"name": "Industrial Angle Grinder", "specs": {"Disc Size": "125mm (5\")", "Power": "1400W", "No Load Speed": "11,500 RPM", "Spindle Thread": "M14", "Guard": "Adjustable", "Soft Start": "Yes"}, "image": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80"},
        ],
        "Safety & PPE": [
            {"name": "Premium Safety Helmet", "specs": {"Standard": "EN397/ANSI Z89.1", "Material": "ABS Shell", "Suspension": "6-Point Ratchet", "Ventilation": "4-Point Vented", "Accessory Slots": "Yes", "UV Resistant": "Yes"}, "image": "https://images.unsplash.com/photo-1578874691223-64558a3ca096?w=800&q=80"},
            {"name": "Impact-Resistant Safety Glasses", "specs": {"Standard": "EN166/ANSI Z87.1+", "Lens": "Polycarbonate Anti-Scratch", "Coating": "Anti-Fog", "UV Protection": "99.9%", "Frame": "Wraparound", "Weight": "28g"}, "image": "https://images.unsplash.com/photo-1617114919297-3c8ddb01f599?w=800&q=80"},
        ],
        "IT Equipment - Laptops": [
            {"name": "ProBook Business Laptop", "specs": {"Processor": "Intel Core i7-1355U", "Memory": "16GB DDR4", "Storage": "512GB NVMe SSD", "Display": "15.6\" FHD IPS", "OS": "Windows 11 Pro", "Battery": "Up to 10hrs"}, "image": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80"},
            {"name": "Elite Ultrabook", "specs": {"Processor": "Intel Core i7-1365U vPro", "Memory": "32GB DDR5", "Storage": "1TB NVMe Gen4", "Display": "14\" 2.8K OLED", "OS": "Windows 11 Pro", "Weight": "1.12kg"}, "image": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=80"},
        ],
        "IT Equipment - Monitors": [
            {"name": "Professional 4K USB-C Monitor", "specs": {"Screen Size": "27\"", "Resolution": "3840x2160", "Panel": "IPS", "Refresh": "60Hz", "Ports": "USB-C 90W, HDMI, DP", "Ergonomics": "HAS"}, "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80"},
            {"name": "Ultrawide Curved Monitor", "specs": {"Screen Size": "34\"", "Resolution": "3440x1440", "Panel": "VA 1500R", "Refresh": "100Hz", "HDR": "HDR10", "Built-in KVM": "Yes"}, "image": "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80"},
        ],
        "IT Equipment - Networking": [
            {"name": "Enterprise Managed Switch", "specs": {"Ports": "48x GbE PoE+", "Uplinks": "4x 10G SFP+", "PoE Budget": "740W", "Switching": "176Gbps", "Management": "CLI/Web/SNMP", "Stackable": "Yes"}, "image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80"},
            {"name": "Enterprise Wireless Access Point", "specs": {"Standard": "Wi-Fi 6E", "Speed": "Up to 5.4Gbps", "Bands": "Tri-Band", "Clients": "500+", "PoE": "802.3at", "MIMO": "4x4:4"}, "image": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80"},
        ],
    }
    
    # Get product details or use defaults
    products = product_catalog.get(category, [
        {"name": "Industrial Component", "specs": {"Type": "Standard", "Grade": "Industrial", "Material": "High-Quality", "Certification": "ISO 9001"}, "image": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80"}
    ])
    
    product = products[index % len(products)]
    unspsc = generate_unspsc_code(category)
    brand_info = get_brand_info(brand)
    
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
        "sku": f"{brand[:3].upper()}-{category[:3].upper()}-{index:06d}",
        "unspsc_code": unspsc,
        "unspsc_name": category,
        "base_price": base_price,
        "unit": random.choice(["EA", "PK", "BX", "SET"]),
        "image_url": product.get("image", "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80"),
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
            "brand_logo": product["brand_logo"],
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
            "unit_of_measure": it_service["pricing_model"],
            "base_price": it_service["base_price"],
            "service_includes": it_service.get("service_includes", []),
            "availability": it_service.get("availability", {}),
            "rating": it_service.get("rating", 4.5),
            "reviews_count": it_service.get("reviews_count", 100),
            "is_it_service": True
        })
    
    # Add regular services
    for service in SERVICES_DATA:
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
            "unit_of_measure": service["unit_of_measure"],
            "base_price": service["base_price"],
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

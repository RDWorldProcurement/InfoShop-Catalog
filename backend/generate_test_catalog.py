#!/usr/bin/env python3
"""
Generate Large Test Catalog for Scalability Testing
====================================================

Generates CSV files with 50k, 100k, 500k, or 1M+ products
to test the scalable ingestion system.
"""

import os
import csv
import random
import argparse
from datetime import datetime

# Sample data for generation
BRANDS = [
    "3M", "Grainger", "DEWALT", "Milwaukee", "Bosch", "Makita", "Stanley", 
    "Klein Tools", "Fluke", "Honeywell", "MSA Safety", "Ansell", "Kimberly-Clark",
    "Eaton", "Schneider Electric", "ABB", "Siemens", "Allen-Bradley", "Square D",
    "Lincoln Electric", "ESAB", "Miller", "Hobart", "Victor", "Harris",
    "SKF", "NSK", "FAG", "Timken", "NTN", "Koyo", "INA", "IKO",
    "Parker", "Eaton Hydraulics", "Bosch Rexroth", "Danfoss", "Sun Hydraulics"
]

CATEGORIES = [
    "Bearings", "Motors", "Pumps", "Valves", "Fasteners", "Safety Equipment",
    "Electrical Components", "HVAC", "Plumbing", "Welding", "Cutting Tools",
    "Abrasives", "Adhesives", "Lubricants", "Hand Tools", "Power Tools",
    "Material Handling", "Lighting", "Test Equipment", "Pneumatics",
    "Hydraulics", "Seals & O-Rings", "Power Transmission", "Filters"
]

PRODUCT_PREFIXES = [
    "Industrial", "Heavy-Duty", "Professional", "Premium", "Standard",
    "High-Performance", "Precision", "Commercial", "Multi-Purpose", "Universal"
]

PRODUCT_TYPES = [
    "Ball Bearing", "Motor", "Pump", "Valve", "Bolt Set", "Safety Gloves",
    "Circuit Breaker", "Air Filter", "Pipe Fitting", "Welding Wire",
    "Drill Bit Set", "Grinding Wheel", "Epoxy Adhesive", "Grease Cartridge",
    "Wrench Set", "Cordless Drill", "Pallet Jack", "LED Light", "Multimeter",
    "Air Compressor", "Hydraulic Cylinder", "O-Ring Kit", "V-Belt", "Oil Filter"
]


def generate_product(row_id, vendor):
    """Generate a single product record"""
    brand = random.choice(BRANDS)
    category = random.choice(CATEGORIES)
    prefix = random.choice(PRODUCT_PREFIXES)
    product_type = random.choice(PRODUCT_TYPES)
    
    # Generate realistic prices
    base_price = random.uniform(5, 5000)
    list_price = round(base_price, 2)
    
    # Generate discount (for MOTION-style files)
    discount = round(random.uniform(0, 35), 2) if random.random() > 0.3 else 0
    
    return {
        "ID": row_id,
        "Product Name": f"{prefix} {brand} {product_type} - Model {random.randint(100, 9999)}",
        "Brand": brand,
        "Category": category,
        "List Price": list_price,
        "Original Price": list_price,
        "Discount": discount,
        "SKU": f"{vendor[:2].upper()}{random.randint(100000, 999999)}",
        "Manufacturer Part No": f"{brand[:3].upper()}-{random.randint(10000, 99999)}",
        "Description": f"High-quality {product_type.lower()} from {brand}. Suitable for industrial applications.",
        "UOM": random.choice(["EA", "PK", "BX", "CS"]),
        "MoQ": random.choice([1, 1, 1, 5, 10, 25]),
        "Stock Status": random.choice(["In Stock", "Limited Stock", "Available", "Ships in 2-3 days"]),
        "Images": f"https://example.com/images/{vendor.lower()}/{random.randint(1000, 9999)}.jpg" if random.random() > 0.3 else "",
        "UNSPSC": f"{random.randint(23, 46)}{random.randint(100000, 999999)}"
    }


def generate_catalog(vendor: str, num_products: int, output_path: str):
    """Generate a catalog CSV file"""
    print(f"\n📦 Generating {num_products:,} products for {vendor}...")
    
    fieldnames = [
        "ID", "Product Name", "Brand", "Category", "List Price", "Original Price",
        "Discount", "SKU", "Manufacturer Part No", "Description", "UOM", "MoQ",
        "Stock Status", "Images", "UNSPSC"
    ]
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        batch_size = 10000
        for i in range(num_products):
            writer.writerow(generate_product(i + 1, vendor))
            
            if (i + 1) % batch_size == 0:
                print(f"   Generated {i + 1:,} products...")
    
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"✅ Created: {output_path} ({file_size:.1f} MB)")
    return output_path


def main():
    parser = argparse.ArgumentParser(description='Generate large test catalogs')
    parser.add_argument('--size', type=int, default=100000, 
                        help='Number of products to generate (default: 100000)')
    parser.add_argument('--vendor', type=str, default='TestVendor',
                        help='Vendor name (default: TestVendor)')
    parser.add_argument('--output', type=str, default=None,
                        help='Output file path (optional)')
    
    args = parser.parse_args()
    
    if args.output:
        output_path = args.output
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"/app/backend/uploads/catalogs/test_{args.vendor}_{args.size}_{timestamp}.csv"
    
    print("=" * 60)
    print("  Large Catalog Generator for Scalability Testing")
    print("=" * 60)
    
    generate_catalog(args.vendor, args.size, output_path)
    
    print(f"\n📊 To test ingestion, use:")
    print(f"   curl -X POST /api/infoshop/catalog/upload-large \\")
    print(f"     -F 'file=@{output_path}' \\")
    print(f"     -F 'vendor=Grainger'")


if __name__ == "__main__":
    main()

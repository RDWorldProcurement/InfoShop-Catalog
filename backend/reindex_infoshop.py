#!/usr/bin/env python3
"""
Re-index InfoShop Products with Correct Pricing Logic
This script:
1. Clears the existing Algolia index
2. Reads Grainger and MOTION catalog files
3. Applies correct category discounts
4. Calculates Danone Preferred Pricing
5. Indexes all products to Algolia
"""

import os
import sys
import pandas as pd
from datetime import datetime, timezone
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import services
from infoshop_service import (
    transform_product_for_infoshop,
    GRAINGER_CATEGORY_DISCOUNTS,
    MOTION_CATEGORY_DISCOUNTS,
    FASTENAL_CATEGORY_DISCOUNTS,
)
from algolia_service import init_algolia, clear_index, PRODUCTS_INDEX

# Algolia client
from algoliasearch.search.client import SearchClientSync

ALGOLIA_APP_ID = os.environ.get("ALGOLIA_APP_ID")
ALGOLIA_ADMIN_KEY = os.environ.get("ALGOLIA_ADMIN_KEY")

# Catalog file paths
CATALOG_DIR = "/app/backend/uploads/catalogs"
GRAINGER_FILE = f"{CATALOG_DIR}/GT7700_Grainger_Sample_27012026.xlsx"
MOTION_FILE = f"{CATALOG_DIR}/GT7700_Motion_Sample_27012026.xlsx"


def main():
    print("\n" + "="*70)
    print("  InfoShop Product Re-Indexing with Correct Pricing")
    print("="*70 + "\n")
    
    # Initialize Algolia
    if not ALGOLIA_APP_ID or not ALGOLIA_ADMIN_KEY:
        print("❌ Algolia credentials not configured!")
        sys.exit(1)
    
    client = SearchClientSync(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)
    print("✅ Algolia client initialized")
    
    # Clear existing index
    print("\n📦 Clearing existing index...")
    try:
        client.clear_objects(PRODUCTS_INDEX)
        print("✅ Index cleared successfully")
    except Exception as e:
        print(f"⚠️ Warning during clear: {e}")
    
    all_products = []
    
    # ==================================================
    # Process GRAINGER
    # ==================================================
    print("\n" + "-"*50)
    print("📁 Processing GRAINGER catalog...")
    print("-"*50)
    
    try:
        df_grainger = pd.read_excel(GRAINGER_FILE)
        print(f"   Loaded {len(df_grainger)} products from Grainger")
        
        grainger_products = []
        for idx, row in df_grainger.iterrows():
            try:
                product = transform_product_for_infoshop(row.to_dict(), "Grainger", GRAINGER_CATEGORY_DISCOUNTS)
                if product.get("product_name"):
                    grainger_products.append(product)
            except Exception as e:
                logger.warning(f"Grainger row {idx} error: {e}")
        
        # Stats
        with_price = sum(1 for p in grainger_products if p.get("danone_preferred_price", 0) > 0)
        with_discount = sum(1 for p in grainger_products if p.get("category_discount_percent", 0) > 0)
        with_image = sum(1 for p in grainger_products if p.get("has_image", 0) == 1)
        with_savings = sum(1 for p in grainger_products if p.get("customer_savings_percent", 0) > 0)
        
        print(f"   ✅ Transformed: {len(grainger_products)} products")
        print(f"      - With Price: {with_price}")
        print(f"      - With Discount: {with_discount}")
        print(f"      - With Image: {with_image}")
        print(f"      - With Savings: {with_savings}")
        
        # Sample
        if grainger_products:
            sample = grainger_products[0]
            print(f"\n   📋 Sample Grainger Product:")
            print(f"      Name: {sample['product_name'][:60]}...")
            print(f"      List Price: ${sample['list_price']:.2f}")
            print(f"      Category Discount: {sample['category_discount_percent']:.1f}%")
            print(f"      Danone Price: ${sample['danone_preferred_price']:.2f}")
            print(f"      Customer Savings: {sample['customer_savings_percent']:.1f}%")
        
        all_products.extend(grainger_products)
        
    except Exception as e:
        print(f"❌ Error processing Grainger: {e}")
    
    # ==================================================
    # Process MOTION
    # ==================================================
    print("\n" + "-"*50)
    print("📁 Processing MOTION catalog...")
    print("-"*50)
    
    try:
        df_motion = pd.read_excel(MOTION_FILE)
        print(f"   Loaded {len(df_motion)} products from MOTION")
        
        motion_products = []
        for idx, row in df_motion.iterrows():
            try:
                product = transform_product_for_infoshop(row.to_dict(), "MOTION", MOTION_CATEGORY_DISCOUNTS)
                if product.get("product_name"):
                    motion_products.append(product)
            except Exception as e:
                logger.warning(f"MOTION row {idx} error: {e}")
        
        # Stats
        with_price = sum(1 for p in motion_products if p.get("danone_preferred_price", 0) > 0)
        with_discount = sum(1 for p in motion_products if p.get("category_discount_percent", 0) > 0)
        with_image = sum(1 for p in motion_products if p.get("has_image", 0) == 1)
        with_savings = sum(1 for p in motion_products if p.get("customer_savings_percent", 0) > 0)
        
        print(f"   ✅ Transformed: {len(motion_products)} products")
        print(f"      - With Price: {with_price}")
        print(f"      - With Discount: {with_discount}")
        print(f"      - With Image: {with_image}")
        print(f"      - With Savings: {with_savings}")
        
        # Sample - show one with discount
        sample_with_discount = next((p for p in motion_products if p.get("category_discount_percent", 0) > 5), motion_products[0] if motion_products else None)
        if sample_with_discount:
            print(f"\n   📋 Sample MOTION Product:")
            print(f"      Name: {sample_with_discount['product_name'][:60]}...")
            print(f"      List Price: ${sample_with_discount['list_price']:.2f}")
            print(f"      Product Discount: {sample_with_discount['category_discount_percent']:.1f}%")
            print(f"      Danone Price: ${sample_with_discount['danone_preferred_price']:.2f}")
            print(f"      Customer Savings: {sample_with_discount['customer_savings_percent']:.1f}%")
        
        all_products.extend(motion_products)
        
    except Exception as e:
        print(f"❌ Error processing MOTION: {e}")
    
    # ==================================================
    # Index to Algolia
    # ==================================================
    print("\n" + "-"*50)
    print("🚀 Indexing to Algolia...")
    print("-"*50)
    
    if not all_products:
        print("❌ No products to index!")
        sys.exit(1)
    
    # Batch indexing
    batch_size = 500
    indexed_count = 0
    
    try:
        for i in range(0, len(all_products), batch_size):
            batch = all_products[i:i + batch_size]
            client.save_objects(PRODUCTS_INDEX, batch)
            indexed_count += len(batch)
            print(f"   ✅ Indexed batch {i//batch_size + 1}: {len(batch)} products (Total: {indexed_count})")
        
        print(f"\n✅ Successfully indexed {indexed_count} total products!")
        
    except Exception as e:
        print(f"❌ Indexing error: {e}")
        sys.exit(1)
    
    # ==================================================
    # Final Summary
    # ==================================================
    print("\n" + "="*70)
    print("  INDEXING COMPLETE - SUMMARY")
    print("="*70)
    
    total_grainger = sum(1 for p in all_products if p.get("vendor") == "Grainger")
    total_motion = sum(1 for p in all_products if p.get("vendor") == "MOTION")
    total_with_savings = sum(1 for p in all_products if p.get("customer_savings_percent", 0) > 0)
    total_with_images = sum(1 for p in all_products if p.get("has_image", 0) == 1)
    avg_savings = sum(p.get("customer_savings_percent", 0) for p in all_products) / len(all_products) if all_products else 0
    
    print(f"""
    📊 Total Products Indexed: {indexed_count}
       - Grainger: {total_grainger}
       - MOTION: {total_motion}
    
    💰 Pricing Stats:
       - Products with Savings: {total_with_savings}
       - Average Savings: {avg_savings:.1f}%
    
    🖼️ Image Stats:
       - Products with Images: {total_with_images}
    
    ⏰ Indexed at: {datetime.now(timezone.utc).isoformat()}
    """)
    
    print("="*70 + "\n")


if __name__ == "__main__":
    main()

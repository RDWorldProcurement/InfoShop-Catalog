#!/usr/bin/env python3
"""
Re-index REAL Grainger and MOTION products with priority flag
This ensures real products with actual images show before test/mock data
"""

import os
import sys
import pandas as pd
from datetime import datetime, timezone
from dotenv import load_dotenv
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

from infoshop_service import (
    transform_product_for_infoshop,
    GRAINGER_CATEGORY_DISCOUNTS,
    MOTION_CATEGORY_DISCOUNTS,
)
from algolia_service import PRODUCTS_INDEX
from algoliasearch.search.client import SearchClientSync

ALGOLIA_APP_ID = os.environ.get("ALGOLIA_APP_ID")
ALGOLIA_ADMIN_KEY = os.environ.get("ALGOLIA_ADMIN_KEY")

# Real catalog files
CATALOG_DIR = "/app/backend/uploads/catalogs"
GRAINGER_FILE = f"{CATALOG_DIR}/GT7700_Grainger_Sample_27012026.xlsx"
MOTION_FILE = f"{CATALOG_DIR}/GT7700_Motion_Sample_27012026.xlsx"


def main():
    print("\n" + "="*70)
    print("  Re-indexing REAL Products with Priority Flag")
    print("="*70 + "\n")
    
    client = SearchClientSync(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)
    print("✅ Algolia client initialized")
    
    all_products = []
    
    # ==================================================
    # Process GRAINGER - REAL PRODUCTS
    # ==================================================
    print("\n" + "-"*50)
    print("📁 Processing REAL Grainger catalog...")
    print("-"*50)
    
    try:
        df_grainger = pd.read_excel(GRAINGER_FILE)
        print(f"   Loaded {len(df_grainger)} REAL products from Grainger")
        
        grainger_products = []
        for idx, row in df_grainger.iterrows():
            try:
                product = transform_product_for_infoshop(row.to_dict(), "Grainger", GRAINGER_CATEGORY_DISCOUNTS)
                if product.get("product_name"):
                    # Mark as REAL catalog product with high priority
                    product["is_real_catalog"] = True
                    product["data_source"] = "real_catalog"
                    product["priority_score"] = 1000  # High priority
                    grainger_products.append(product)
            except Exception as e:
                logger.warning(f"Grainger row {idx} error: {e}")
        
        with_image = sum(1 for p in grainger_products if p.get("has_image", 0) == 1)
        print(f"   ✅ Transformed: {len(grainger_products)} products ({with_image} with images)")
        all_products.extend(grainger_products)
        
    except Exception as e:
        print(f"❌ Error processing Grainger: {e}")
    
    # ==================================================
    # Process MOTION - REAL PRODUCTS
    # ==================================================
    print("\n" + "-"*50)
    print("📁 Processing REAL MOTION catalog...")
    print("-"*50)
    
    try:
        df_motion = pd.read_excel(MOTION_FILE)
        print(f"   Loaded {len(df_motion)} REAL products from MOTION")
        
        motion_products = []
        for idx, row in df_motion.iterrows():
            try:
                product = transform_product_for_infoshop(row.to_dict(), "MOTION", MOTION_CATEGORY_DISCOUNTS)
                if product.get("product_name"):
                    # Mark as REAL catalog product with high priority
                    product["is_real_catalog"] = True
                    product["data_source"] = "real_catalog"
                    product["priority_score"] = 1000  # High priority
                    motion_products.append(product)
            except Exception as e:
                logger.warning(f"MOTION row {idx} error: {e}")
        
        with_image = sum(1 for p in motion_products if p.get("has_image", 0) == 1)
        print(f"   ✅ Transformed: {len(motion_products)} products ({with_image} with images)")
        all_products.extend(motion_products)
        
    except Exception as e:
        print(f"❌ Error processing MOTION: {e}")
    
    # ==================================================
    # Index to Algolia (update existing records)
    # ==================================================
    print("\n" + "-"*50)
    print("🚀 Updating Algolia index with priority flags...")
    print("-"*50)
    
    if not all_products:
        print("❌ No products to index!")
        sys.exit(1)
    
    try:
        # Use partialUpdateObjects to update existing records
        client.partial_update_objects(
            PRODUCTS_INDEX,
            all_products,
            create_if_not_exists=True
        )
        print(f"   ✅ Updated {len(all_products)} REAL products with priority flags")
        
    except Exception as e:
        print(f"❌ Indexing error: {e}")
        # Fallback to save_objects
        try:
            client.save_objects(PRODUCTS_INDEX, all_products)
            print(f"   ✅ Saved {len(all_products)} REAL products")
        except Exception as e2:
            print(f"❌ Save error: {e2}")
            sys.exit(1)
    
    # ==================================================
    # Update Algolia settings to prioritize real products
    # ==================================================
    print("\n" + "-"*50)
    print("⚙️ Updating Algolia ranking to prioritize real products...")
    print("-"*50)
    
    try:
        settings = {
            'customRanking': [
                'desc(priority_score)',      # Real products first (priority_score=1000)
                'desc(is_real_catalog)',     # Then by real catalog flag
                'desc(has_image)',           # Then products with images
                'desc(has_price)',           # Then products with prices
                'desc(customer_savings_percent)',  # Higher savings first
                'asc(danone_preferred_price)',     # Lower price first
                'desc(in_stock)'             # In-stock products first
            ],
            'attributesForFaceting': [
                'searchable(brand)',
                'searchable(manufacturer)',
                'searchable(category)',
                'searchable(supplier)',
                'searchable(vendor)',
                'filterOnly(has_image)',
                'filterOnly(in_stock)',
                'filterOnly(is_real_catalog)',
                'filterOnly(data_source)',
                'price',
                'danone_preferred_price'
            ]
        }
        
        client.set_settings(PRODUCTS_INDEX, settings)
        print("   ✅ Algolia settings updated - real products will show first!")
        
    except Exception as e:
        print(f"⚠️ Settings update warning: {e}")
    
    # ==================================================
    # Summary
    # ==================================================
    print("\n" + "="*70)
    print("  COMPLETE - Real products now have priority")
    print("="*70)
    print(f"""
    📊 Real Products Updated: {len(all_products)}
       - Grainger: {len([p for p in all_products if p.get('vendor') == 'Grainger'])}
       - MOTION: {len([p for p in all_products if p.get('vendor') == 'MOTION'])}
    
    🎯 Priority Settings:
       - is_real_catalog: True
       - priority_score: 1000
       - Custom ranking updated
    
    ✨ Real products with images will now appear first in the catalog!
    """)
    print("="*70 + "\n")


if __name__ == "__main__":
    main()

"""
Algolia Search Service for OMNISupply.io
World-class B2B product catalog search with multi-supplier support
Includes pricing engine integration for Infosys discounts
"""

import os
import logging
import hashlib
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from algoliasearch.search.client import SearchClientSync
import pandas as pd
import io
import aiofiles

logger = logging.getLogger(__name__)

# Algolia Configuration
ALGOLIA_APP_ID = os.environ.get("ALGOLIA_APP_ID")
ALGOLIA_ADMIN_KEY = os.environ.get("ALGOLIA_ADMIN_KEY")
ALGOLIA_SEARCH_KEY = os.environ.get("ALGOLIA_SEARCH_KEY")

# Index names
PRODUCTS_INDEX = "omnisupply_products"
PRODUCTS_INDEX_PRICE_ASC = "omnisupply_products_price_asc"
PRODUCTS_INDEX_PRICE_DESC = "omnisupply_products_price_desc"

# Initialize Algolia client
algolia_client = None


def init_algolia():
    """Initialize Algolia client and configure indices"""
    global algolia_client
    
    if not ALGOLIA_APP_ID or not ALGOLIA_ADMIN_KEY:
        logger.warning("Algolia credentials not configured")
        return False
    
    try:
        algolia_client = SearchClientSync(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)
        
        # Configure index settings for optimal search
        index_settings = {
            "searchableAttributes": [
                "product_name",
                "brand",
                "manufacturer",
                "part_number",
                "oem_part_number",
                "sku",
                "description",
                "short_description",
                "category",
                "breadcrumb",
                "unspsc_code",
                "specifications"
            ],
            "attributesForFaceting": [
                "searchable(brand)",
                "searchable(manufacturer)", 
                "searchable(category)",
                "searchable(supplier)",
                "searchable(country)",
                "filterOnly(availability)",
                "filterOnly(in_stock)",
                "price",
                "selling_price"
            ],
            "customRanking": [
                "desc(has_image)",
                "desc(has_price)",
                "asc(selling_price)",
                "desc(in_stock)",
                "desc(availability_score)"
            ],
            "attributesToRetrieve": [
                "objectID",
                "product_name",
                "brand",
                "manufacturer",
                "part_number",
                "oem_part_number",
                "sku",
                "description",
                "short_description",
                "category",
                "breadcrumb",
                "price",
                "list_price",
                "selling_price",
                "discount_percentage",
                "availability",
                "in_stock",
                "stock_quantity",
                "supplier",
                "country",
                "countries",
                "images",
                "primary_image",
                "has_image",
                "documents",
                "specifications",
                "unspsc_code",
                "unit",
                "min_order_qty",
                "product_group_id",
                "is_lowest_price",
                "supplier_count"
            ],
            "attributesToHighlight": [
                "product_name",
                "brand",
                "description",
                "part_number"
            ],
            "highlightPreTag": "<mark>",
            "highlightPostTag": "</mark>",
            "hitsPerPage": 24,
            "maxValuesPerFacet": 100,
            "sortFacetValuesBy": "count",
            "typoTolerance": True,
            "minWordSizefor1Typo": 3,
            "minWordSizefor2Typos": 6
        }
        
        # Apply settings to main index
        algolia_client.set_settings(PRODUCTS_INDEX, index_settings)
        
        # Create replica indices for sorting
        algolia_client.set_settings(PRODUCTS_INDEX, {
            **index_settings,
            "replicas": [
                PRODUCTS_INDEX_PRICE_ASC,
                PRODUCTS_INDEX_PRICE_DESC
            ]
        })
        
        logger.info("Algolia initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Algolia: {e}")
        return False


def generate_product_group_id(brand: str, part_number: str, oem_part_number: str = None) -> str:
    """
    Generate a unique product group ID for matching products across suppliers.
    Products with same brand + part number are grouped together.
    """
    brand_normalized = (brand or "").strip().lower()
    part_normalized = (part_number or "").strip().lower().replace("-", "").replace(" ", "")
    oem_normalized = (oem_part_number or "").strip().lower().replace("-", "").replace(" ", "")
    
    identifier = part_normalized or oem_normalized or ""
    
    if not brand_normalized or not identifier:
        return None
    
    group_string = f"{brand_normalized}|{identifier}"
    return hashlib.md5(group_string.encode()).hexdigest()[:16]


def extract_category_from_breadcrumb(breadcrumb: str) -> str:
    """Extract category from breadcrumb path"""
    if not breadcrumb:
        return ""
    
    parts = breadcrumb.replace(" > ", ">").replace(" / ", ">").replace(" >> ", ">").split(">")
    parts = [p.strip() for p in parts if p.strip()]
    
    if len(parts) >= 2:
        return parts[1] if len(parts) > 2 else parts[-1]
    elif len(parts) == 1:
        return parts[0]
    return ""


def parse_price(price_value: Any) -> float:
    """Parse price from various formats"""
    if not price_value:
        return 0.0
    
    price_str = str(price_value).replace("$", "").replace(",", "").replace("€", "").replace("£", "").strip()
    
    try:
        return float(price_str) if price_str and price_str != "nan" else 0.0
    except (ValueError, TypeError):
        return 0.0


def transform_fastenal_product(row: Dict, countries: List[str], pricing_func=None) -> Dict:
    """Transform Fastenal product data to Algolia format"""
    product_name = str(row.get("Title", "") or row.get("Product Name", "")).strip()
    brand = str(row.get("Manufacturer Brand", "") or row.get("Brand", "")).strip()
    manufacturer = str(row.get("Manufacturer", "") or brand).strip()
    part_number = str(row.get("Part No", "") or row.get("OEM Part No", "")).strip()
    oem_part_number = str(row.get("OEM Part No", "") or part_number).strip()
    sku = str(row.get("SKU", "")).strip()
    
    # Parse price
    list_price = parse_price(row.get("Original Price") or row.get("List Price") or row.get("Price"))
    
    # Extract category from breadcrumb
    breadcrumb = str(row.get("Breadcrumb", "") or row.get("Category", "")).strip()
    category = extract_category_from_breadcrumb(breadcrumb)
    
    # Parse availability
    availability_str = str(row.get("Availability", "")).strip()
    in_stock = any(kw in availability_str.lower() for kw in ["in stock", "available", "ships"])
    availability_score = 100 if in_stock else 0
    
    # Parse images
    images_raw = row.get("Images", "") or row.get("Product_image", "")
    images = []
    if images_raw:
        if isinstance(images_raw, str):
            images = [img.strip() for img in images_raw.split("|") if img.strip() and "http" in img]
        elif isinstance(images_raw, list):
            images = images_raw
    
    # UNSPSC
    unspsc = str(row.get("UNSPSC", "")).strip()
    
    # Description
    description = str(row.get("Short Description", "") or row.get("Overview", "")).strip()
    
    # Generate IDs
    object_id = f"fastenal_{sku or part_number}_{hashlib.md5(product_name.encode()).hexdigest()[:8]}"
    product_group_id = generate_product_group_id(brand, part_number, oem_part_number)
    
    # Check if product has valid image
    has_valid_image = len(images) > 0 and any(img.startswith('http') for img in images)
    
    return {
        "objectID": object_id,
        "product_name": product_name,
        "brand": brand,
        "manufacturer": manufacturer,
        "part_number": part_number,
        "oem_part_number": oem_part_number,
        "sku": sku,
        "description": description,
        "short_description": description[:200] if description else "",
        "category": category,
        "breadcrumb": breadcrumb,
        "list_price": list_price,
        "price": list_price,  # Will be updated with selling_price
        "has_price": 1 if list_price > 0 else 0,  # For sorting: products with price first
        "has_image": 1 if has_valid_image else 0,  # For sorting: products with image first
        "currency": "USD",
        "availability": availability_str,
        "in_stock": in_stock,
        "stock_quantity": 0,  # Will be parsed if available
        "availability_score": availability_score,
        "supplier": "Fastenal",
        "country": countries[0] if countries else "USA",
        "countries": countries or ["USA"],
        "images": images[:5],
        "primary_image": images[0] if images else None,
        "documents": [],
        "specifications": {},
        "unspsc_code": unspsc,
        "unit": "EA",
        "min_order_qty": 1,
        "product_group_id": product_group_id,
        "is_lowest_price": False,
        "supplier_count": 1,
        "indexed_at": datetime.now(timezone.utc).isoformat()
    }


def transform_grainger_product(row: Dict, countries: List[str], pricing_func=None) -> Dict:
    """Transform Grainger product data to Algolia format"""
    product_name = str(row.get("Product title", "") or row.get("Product Name", "")).strip()
    brand = str(row.get("Brand", "")).strip()
    manufacturer = str(row.get("BrandNumber", "") or brand).strip()
    part_number = str(row.get("ManufacturerPartNumber", "") or row.get("Sku", "")).strip()
    sku = str(row.get("Sku", "")).strip()
    
    # Parse price
    list_price = parse_price(row.get("List_Price") or row.get("Original_Price") or row.get("Price"))
    
    # Extract category from breadcrumb
    breadcrumb = str(row.get("Breadcrumb", "")).strip()
    category = extract_category_from_breadcrumb(breadcrumb)
    
    # Parse availability
    stock_status = str(row.get("Stock_Status", "")).strip()
    in_stock = "in stock" in stock_status.lower() or "available" in stock_status.lower()
    availability_score = 100 if in_stock else 0
    
    # Parse images
    images_raw = row.get("Images", "") or row.get("Product_image", "")
    images = []
    if images_raw:
        if isinstance(images_raw, str):
            images = [img.strip() for img in images_raw.split("|") if img.strip() and "http" in img]
        elif isinstance(images_raw, list):
            images = images_raw
    
    # UNSPSC
    unspsc = str(row.get("UNSPSC", "")).strip()
    
    # Description from Product Details
    description = str(row.get("Product Details", ""))[:500] if row.get("Product Details") else ""
    
    # Country of origin
    country_origin = str(row.get("Country_origin", "USA")).strip()
    
    # Generate IDs
    object_id = f"grainger_{sku or part_number}_{hashlib.md5(product_name.encode()).hexdigest()[:8]}"
    product_group_id = generate_product_group_id(brand, part_number)
    
    # Check if product has valid image
    has_valid_image = len(images) > 0 and any(img.startswith('http') for img in images)
    
    return {
        "objectID": object_id,
        "product_name": product_name,
        "brand": brand,
        "manufacturer": manufacturer,
        "part_number": part_number,
        "oem_part_number": part_number,
        "sku": sku,
        "description": description,
        "short_description": description[:200] if description else "",
        "category": category,
        "breadcrumb": breadcrumb,
        "list_price": list_price,
        "price": list_price,
        "has_price": 1 if list_price > 0 else 0,
        "has_image": 1 if has_valid_image else 0,
        "currency": "USD",
        "availability": stock_status,
        "in_stock": in_stock,
        "stock_quantity": 0,
        "availability_score": availability_score,
        "supplier": "Grainger",
        "country": countries[0] if countries else country_origin,
        "countries": countries or [country_origin],
        "images": images[:5],
        "primary_image": images[0] if images else None,
        "documents": [],
        "specifications": {},
        "unspsc_code": unspsc,
        "unit": "EA",
        "min_order_qty": 1,
        "product_group_id": product_group_id,
        "is_lowest_price": False,
        "supplier_count": 1,
        "indexed_at": datetime.now(timezone.utc).isoformat()
    }


def transform_motion_product(row: Dict, countries: List[str], pricing_func=None) -> Dict:
    """Transform Motion Industries product data to Algolia format"""
    product_name = str(row.get("Item Description", "") or row.get("Product Name", "")).strip()
    brand = str(row.get("Brand Name", "") or row.get("Brand", "")).strip()
    manufacturer = str(row.get("Manufacturer", "") or brand).strip()
    part_number = str(row.get("Manufacturer Part Number", "") or row.get("Item Number", "")).strip()
    sku = str(row.get("Item Number", "") or row.get("Sku", "")).strip()
    
    # Parse price
    list_price = parse_price(row.get("Unit Price") or row.get("Price") or row.get("List Price"))
    
    # Category
    category = str(row.get("Category", "") or row.get("Product Category", "")).strip()
    breadcrumb = category
    
    # Parse availability
    stock_status = str(row.get("Stock Status", "") or row.get("Availability", "")).strip()
    in_stock = any(kw in stock_status.lower() for kw in ["in stock", "available", "ships"])
    availability_score = 100 if in_stock else 0
    
    # Parse images
    images_raw = row.get("Image URL", "") or row.get("Images", "")
    images = []
    if images_raw:
        if isinstance(images_raw, str) and "http" in images_raw:
            images = [images_raw.strip()]
        elif isinstance(images_raw, list):
            images = images_raw
    
    # UNSPSC
    unspsc = str(row.get("UNSPSC", "")).strip()
    
    # Description
    description = str(row.get("Long Description", "") or row.get("Description", "")).strip()
    
    # Generate IDs
    object_id = f"motion_{sku or part_number}_{hashlib.md5(product_name.encode()).hexdigest()[:8]}"
    product_group_id = generate_product_group_id(brand, part_number)
    
    # Check if product has valid image
    has_valid_image = len(images) > 0 and any(img.startswith('http') for img in images)
    
    return {
        "objectID": object_id,
        "product_name": product_name,
        "brand": brand,
        "manufacturer": manufacturer,
        "part_number": part_number,
        "oem_part_number": part_number,
        "sku": sku,
        "description": description,
        "short_description": description[:200] if description else "",
        "category": category,
        "breadcrumb": breadcrumb,
        "list_price": list_price,
        "price": list_price,
        "has_price": 1 if list_price > 0 else 0,
        "has_image": 1 if has_valid_image else 0,
        "currency": "USD",
        "availability": stock_status,
        "in_stock": in_stock,
        "stock_quantity": 0,
        "availability_score": availability_score,
        "supplier": "Motion",
        "country": countries[0] if countries else "USA",
        "countries": countries or ["USA"],
        "images": images[:5],
        "primary_image": images[0] if images else None,
        "documents": [],
        "specifications": {},
        "unspsc_code": unspsc,
        "unit": "EA",
        "min_order_qty": 1,
        "product_group_id": product_group_id,
        "is_lowest_price": False,
        "supplier_count": 1,
        "indexed_at": datetime.now(timezone.utc).isoformat()
    }


async def apply_pricing_to_products(products: List[Dict], pricing_engine) -> List[Dict]:
    """Apply pricing engine calculations to all products"""
    from pricing_engine import calculate_pricing
    
    for product in products:
        list_price = product.get("list_price", 0)
        supplier = product.get("supplier", "")
        category = product.get("category", "")
        unspsc = product.get("unspsc_code", "")
        
        if list_price > 0:
            pricing = await calculate_pricing(list_price, supplier, category, unspsc)
            product["list_price"] = pricing["list_price"]
            product["selling_price"] = pricing["selling_price"]
            product["price"] = pricing["selling_price"]  # For search/sort
            product["discount_percentage"] = pricing["discount_percentage"]
            product["infosys_purchase_price"] = pricing["infosys_purchase_price"]
            product["customer_savings"] = pricing["customer_discount"]
            product["has_price"] = 1  # Products with price appear first
        else:
            product["selling_price"] = 0
            product["discount_percentage"] = 0
            product["has_price"] = 0  # Products without price appear last
    
    return products


async def index_products_from_file(
    file_content: bytes,
    filename: str,
    supplier: str,
    countries: List[str] = None
) -> Dict:
    """
    Index products from an uploaded Excel file to Algolia.
    Automatically detects supplier format and applies pricing.
    """
    global algolia_client
    
    if not algolia_client:
        init_algolia()
    
    if not algolia_client:
        return {"success": False, "error": "Algolia not configured"}
    
    try:
        # Read Excel file
        df = pd.read_excel(io.BytesIO(file_content))
        logger.info(f"Read {len(df)} rows from {filename}")
        
        # Determine supplier and transform function
        supplier_lower = supplier.lower()
        if "fastenal" in supplier_lower:
            transform_func = transform_fastenal_product
            supplier_name = "Fastenal"
        elif "grainger" in supplier_lower:
            transform_func = transform_grainger_product
            supplier_name = "Grainger"
        elif "motion" in supplier_lower:
            transform_func = transform_motion_product
            supplier_name = "Motion"
        else:
            # Generic transformation based on column names
            transform_func = transform_fastenal_product
            supplier_name = supplier
        
        # Transform products
        products = []
        for _, row in df.iterrows():
            try:
                product = transform_func(row.to_dict(), countries or ["USA"])
                if product.get("product_name"):
                    products.append(product)
            except Exception as e:
                logger.warning(f"Failed to transform row: {e}")
                continue
        
        if not products:
            return {"success": False, "error": "No valid products found in file"}
        
        # Apply pricing calculations
        products = await apply_pricing_to_products(products, None)
        
        # Batch save to Algolia (500 at a time)
        batch_size = 500
        total_indexed = 0
        
        for i in range(0, len(products), batch_size):
            batch = products[i:i + batch_size]
            try:
                algolia_client.save_objects(PRODUCTS_INDEX, batch)
                total_indexed += len(batch)
                logger.info(f"Indexed batch {i//batch_size + 1}: {len(batch)} products")
            except Exception as e:
                logger.error(f"Failed to index batch: {e}")
        
        logger.info(f"Successfully indexed {total_indexed} products from {supplier_name}")
        
        return {
            "success": True,
            "indexed_count": total_indexed,
            "supplier": supplier_name,
            "countries": countries or ["USA"],
            "filename": filename
        }
        
    except Exception as e:
        logger.error(f"Failed to index products from file: {e}")
        return {"success": False, "error": str(e)}


async def index_products(products: List[Dict], supplier: str) -> Dict:
    """Index products to Algolia"""
    global algolia_client
    
    if not algolia_client:
        init_algolia()
    
    if not algolia_client:
        return {"success": False, "error": "Algolia not configured"}
    
    try:
        # Apply pricing
        products = await apply_pricing_to_products(products, None)
        
        # Filter valid products
        valid_products = [p for p in products if p.get("product_name")]
        
        if not valid_products:
            return {"success": False, "error": "No valid products to index"}
        
        # Batch save
        algolia_client.save_objects(PRODUCTS_INDEX, valid_products)
        
        logger.info(f"Indexed {len(valid_products)} products from {supplier}")
        
        return {
            "success": True,
            "indexed_count": len(valid_products),
            "supplier": supplier
        }
        
    except Exception as e:
        logger.error(f"Failed to index products: {e}")
        return {"success": False, "error": str(e)}


async def update_product_grouping():
    """Update product grouping to identify lowest prices across suppliers"""
    global algolia_client
    
    if not algolia_client:
        return
    
    try:
        all_products = []
        browse_result = algolia_client.browse_objects(PRODUCTS_INDEX, {
            "attributesToRetrieve": ["objectID", "product_group_id", "selling_price", "in_stock", "availability_score"]
        })
        
        for hit in browse_result:
            all_products.append(hit)
        
        # Group by product_group_id
        groups = {}
        for product in all_products:
            group_id = product.get("product_group_id")
            if group_id:
                if group_id not in groups:
                    groups[group_id] = []
                groups[group_id].append(product)
        
        # Find lowest price in each group
        updates = []
        for group_id, products in groups.items():
            if len(products) > 1:
                products.sort(key=lambda p: (p.get("selling_price", float("inf")), -p.get("availability_score", 0)))
                lowest_price = products[0].get("selling_price", 0)
                
                for i, product in enumerate(products):
                    updates.append({
                        "objectID": product["objectID"],
                        "is_lowest_price": i == 0 and product.get("selling_price") == lowest_price,
                        "supplier_count": len(products)
                    })
        
        if updates:
            algolia_client.partial_update_objects(PRODUCTS_INDEX, updates)
            logger.info(f"Updated grouping for {len(updates)} products")
        
    except Exception as e:
        logger.error(f"Failed to update product grouping: {e}")


def search_products(
    query: str,
    filters: Dict = None,
    page: int = 0,
    hits_per_page: int = 24,
    sort_by: str = None
) -> Dict:
    """Search products with Algolia"""
    global algolia_client
    
    if not algolia_client:
        init_algolia()
    
    if not algolia_client:
        return {"hits": [], "nbHits": 0, "error": "Algolia not configured"}
    
    try:
        # Determine index based on sort
        index_name = PRODUCTS_INDEX
        if sort_by == "price_asc":
            index_name = PRODUCTS_INDEX_PRICE_ASC
        elif sort_by == "price_desc":
            index_name = PRODUCTS_INDEX_PRICE_DESC
        
        # Build filter string
        filter_parts = []
        if filters:
            if filters.get("category"):
                filter_parts.append(f'category:"{filters["category"]}"')
            if filters.get("brand"):
                filter_parts.append(f'brand:"{filters["brand"]}"')
            if filters.get("supplier"):
                filter_parts.append(f'supplier:"{filters["supplier"]}"')
            if filters.get("country"):
                filter_parts.append(f'country:"{filters["country"]}"')
            if filters.get("in_stock"):
                filter_parts.append("in_stock:true")
            if filters.get("price_min") is not None:
                filter_parts.append(f'selling_price >= {filters["price_min"]}')
            if filters.get("price_max") is not None:
                filter_parts.append(f'selling_price <= {filters["price_max"]}')
        
        filter_string = " AND ".join(filter_parts) if filter_parts else ""
        
        # Execute search
        response = algolia_client.search_single_index(
            index_name,
            {
                "query": query,
                "page": page,
                "hitsPerPage": hits_per_page,
                "filters": filter_string,
                "facets": ["brand", "category", "supplier", "country", "in_stock"],
                "attributesToHighlight": ["product_name", "brand", "description", "part_number"],
                "getRankingInfo": True
            }
        )
        
        # Convert Hit objects to dicts using model_dump()
        hits_as_dicts = []
        for hit in response.hits:
            if hasattr(hit, 'model_dump'):
                hit_dict = hit.model_dump()
            elif hasattr(hit, 'to_dict'):
                hit_dict = hit.to_dict()
            elif hasattr(hit, '__dict__'):
                hit_dict = {k: v for k, v in hit.__dict__.items() if not k.startswith('_')}
            else:
                hit_dict = dict(hit)
            hits_as_dicts.append(hit_dict)
        
        return {
            "hits": hits_as_dicts,
            "nbHits": response.nb_hits,
            "page": response.page,
            "nbPages": response.nb_pages,
            "hitsPerPage": response.hits_per_page,
            "facets": response.facets,
            "processingTimeMS": response.processing_time_ms,
            "query": query
        }
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return {"hits": [], "nbHits": 0, "error": str(e)}


def get_facet_values(facet_name: str, query: str = "") -> List[Dict]:
    """Get all values for a specific facet"""
    global algolia_client
    
    if not algolia_client:
        init_algolia()
    
    if not algolia_client:
        return []
    
    try:
        response = algolia_client.search_for_facet_values(
            PRODUCTS_INDEX,
            facet_name,
            {
                "facetQuery": query,
                "maxFacetHits": 100
            }
        )
        return response.facet_hits
    except Exception as e:
        logger.error(f"Facet search error: {e}")
        return []


def get_index_stats() -> Dict:
    """Get statistics about the Algolia index"""
    global algolia_client
    
    if not algolia_client:
        init_algolia()
    
    if not algolia_client:
        return {"error": "Algolia not configured"}
    
    try:
        # Get index settings to retrieve stats
        response = algolia_client.search_single_index(
            PRODUCTS_INDEX,
            {
                "query": "",
                "hitsPerPage": 0,
                "facets": ["supplier", "country", "category", "brand"]
            }
        )
        
        return {
            "total_products": response.nb_hits,
            "suppliers": list(response.facets.get("supplier", {}).keys()) if response.facets else [],
            "supplier_count": len(response.facets.get("supplier", {})) if response.facets else 0,
            "countries": list(response.facets.get("country", {}).keys()) if response.facets else [],
            "country_count": len(response.facets.get("country", {})) if response.facets else 0,
            "categories": len(response.facets.get("category", {})) if response.facets else 0,
            "brands": len(response.facets.get("brand", {})) if response.facets else 0,
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {"error": str(e)}


def clear_index():
    """Clear all products from the index"""
    global algolia_client
    
    if not algolia_client:
        init_algolia()
    
    if algolia_client:
        try:
            algolia_client.clear_objects(PRODUCTS_INDEX)
            logger.info("Cleared Algolia index")
            return True
        except Exception as e:
            logger.error(f"Failed to clear index: {e}")
    return False


# Initialize on module load
init_algolia()

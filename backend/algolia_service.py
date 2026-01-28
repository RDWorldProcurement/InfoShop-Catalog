"""
Algolia Search Service for OMNISupply.io
World-class B2B product catalog search with multi-supplier support
"""

import os
import logging
import hashlib
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from algoliasearch.search.client import SearchClientSync
from algoliasearch.search.models.search_params import SearchParams

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
products_index = None

def init_algolia():
    """Initialize Algolia client and configure indices"""
    global algolia_client, products_index
    
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
                "filterOnly(availability)",
                "filterOnly(in_stock)",
                "price"
            ],
            "customRanking": [
                "asc(price)",
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
                "original_price",
                "list_price",
                "availability",
                "in_stock",
                "stock_quantity",
                "supplier",
                "images",
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
    # Normalize inputs
    brand_normalized = (brand or "").strip().lower()
    part_normalized = (part_number or "").strip().lower().replace("-", "").replace(" ", "")
    oem_normalized = (oem_part_number or "").strip().lower().replace("-", "").replace(" ", "")
    
    # Use part number as primary, OEM as fallback
    identifier = part_normalized or oem_normalized or ""
    
    if not brand_normalized or not identifier:
        return None
    
    # Create hash for grouping
    group_string = f"{brand_normalized}|{identifier}"
    return hashlib.md5(group_string.encode()).hexdigest()[:16]


def transform_product_for_algolia(product: Dict, supplier: str) -> Dict:
    """Transform product data to Algolia-optimized format"""
    
    # Extract and normalize fields
    product_name = (
        product.get("Title") or 
        product.get("Product Name") or 
        product.get("product_name") or 
        ""
    ).strip()
    
    brand = (
        product.get("Manufacturer Brand") or 
        product.get("Manufacturer") or 
        product.get("Brand") or 
        product.get("brand") or
        ""
    ).strip()
    
    manufacturer = (
        product.get("Manufacturer") or 
        product.get("Manufacturer Brand") or 
        product.get("Brand") or
        ""
    ).strip()
    
    part_number = (
        product.get("Part No") or 
        product.get("OEM Part No") or 
        product.get("part_number") or
        ""
    ).strip()
    
    oem_part_number = (
        product.get("OEM Part No") or 
        product.get("Part No") or
        ""
    ).strip()
    
    sku = (product.get("SKU") or product.get("sku") or "").strip()
    
    # Parse price - handle various formats
    price_str = str(product.get("Original Price") or product.get("List Price") or product.get("price") or "0")
    price_str = price_str.replace("$", "").replace(",", "").strip()
    try:
        price = float(price_str) if price_str else 0
    except:
        price = 0
    
    # Parse availability
    availability = (product.get("Availability") or "").strip()
    in_stock = any(keyword in availability.lower() for keyword in ["in stock", "available", "ships"])
    
    # Calculate availability score for sorting
    availability_score = 100 if in_stock else 0
    if "same day" in availability.lower():
        availability_score = 150
    elif "next day" in availability.lower():
        availability_score = 120
    
    # Extract category from breadcrumb
    breadcrumb = product.get("Breadcrumb") or product.get("Category") or ""
    category = ""
    if breadcrumb:
        # Get the most specific category (usually last in breadcrumb)
        parts = breadcrumb.replace(" > ", ">").replace(" / ", ">").split(">")
        if len(parts) > 1:
            category = parts[-2].strip() if len(parts) > 2 else parts[-1].strip()
        else:
            category = parts[0].strip()
    
    # Process images - extract URLs, hide supplier domains
    images_raw = product.get("Images") or product.get("images") or ""
    images = []
    if images_raw:
        # Parse image URLs from various formats
        if isinstance(images_raw, list):
            images = images_raw
        elif isinstance(images_raw, str):
            # Handle JSON array or pipe-separated
            if images_raw.startswith("["):
                try:
                    images = json.loads(images_raw)
                except:
                    images = [img.strip() for img in images_raw.split("|") if img.strip()]
            else:
                images = [img.strip() for img in images_raw.split("|") if img.strip()]
    
    # Process specification documents - hide supplier URLs
    documents_raw = product.get("Documents") or product.get("Specifications") or product.get("Compliance & Safety Data") or ""
    documents = []
    if documents_raw:
        if isinstance(documents_raw, str):
            # Parse document entries
            doc_entries = documents_raw.split("|") if "|" in documents_raw else [documents_raw]
            for entry in doc_entries:
                if "http" in entry.lower():
                    # Extract URL and create clean document entry
                    url_start = entry.lower().find("http")
                    url = entry[url_start:].split()[0].strip()
                    doc_name = entry[:url_start].strip() if url_start > 0 else "Specification Document"
                    doc_name = doc_name.replace(":", "").strip() or "Product Documentation"
                    documents.append({
                        "name": doc_name,
                        "url": url,
                        "type": "specification"
                    })
    
    # Extract specifications as structured data
    specs_raw = product.get("Product Attributes") or product.get("Specifications") or ""
    specifications = {}
    if specs_raw and isinstance(specs_raw, str):
        # Parse key-value pairs
        for pair in specs_raw.split("|"):
            if ":" in pair:
                key, value = pair.split(":", 1)
                specifications[key.strip()] = value.strip()
    
    # Description
    description = (
        product.get("Short Description") or 
        product.get("Overview") or 
        product.get("description") or
        ""
    ).strip()
    
    # UNSPSC
    unspsc = (product.get("UNSPSC") or product.get("unspsc_code") or "").strip()
    
    # Generate unique object ID and product group ID
    object_id = f"{supplier.lower()}_{sku or part_number}_{hashlib.md5(product_name.encode()).hexdigest()[:8]}"
    product_group_id = generate_product_group_id(brand, part_number, oem_part_number)
    
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
        "price": price,
        "original_price": price,
        "list_price": price,
        "currency": "USD",
        "availability": availability,
        "in_stock": in_stock,
        "availability_score": availability_score,
        "stock_quantity": None,  # Can be parsed if available
        "supplier": supplier,
        "images": images[:5],  # Limit to 5 images
        "primary_image": images[0] if images else None,
        "documents": documents,
        "specifications": specifications,
        "unspsc_code": unspsc,
        "unit": product.get("unit") or "EA",
        "min_order_qty": product.get("Minimum Purchase Quantity") or 1,
        "product_group_id": product_group_id,
        "is_lowest_price": False,  # Will be set during grouping
        "supplier_count": 1,  # Will be updated during grouping
        "indexed_at": datetime.now(timezone.utc).isoformat()
    }


async def index_products(products: List[Dict], supplier: str) -> Dict:
    """Index products to Algolia"""
    if not algolia_client:
        init_algolia()
    
    if not algolia_client:
        return {"success": False, "error": "Algolia not configured"}
    
    try:
        # Transform products
        algolia_records = []
        for product in products:
            try:
                record = transform_product_for_algolia(product, supplier)
                if record.get("product_name"):  # Only index products with names
                    algolia_records.append(record)
            except Exception as e:
                logger.warning(f"Failed to transform product: {e}")
                continue
        
        if not algolia_records:
            return {"success": False, "error": "No valid products to index"}
        
        # Batch save to Algolia
        response = algolia_client.save_objects(PRODUCTS_INDEX, algolia_records)
        
        logger.info(f"Indexed {len(algolia_records)} products from {supplier}")
        
        return {
            "success": True,
            "indexed_count": len(algolia_records),
            "supplier": supplier,
            "task_id": response[0].task_id if response else None
        }
        
    except Exception as e:
        logger.error(f"Failed to index products: {e}")
        return {"success": False, "error": str(e)}


async def update_product_grouping():
    """
    Update product grouping to identify lowest prices across suppliers.
    Products are grouped by brand + part number.
    """
    if not algolia_client:
        return
    
    try:
        # Get all unique product groups
        # This is a simplified approach - for millions of products,
        # this should be done in batches or using Algolia Rules
        
        # Browse all products
        all_products = []
        browse_result = algolia_client.browse_objects(PRODUCTS_INDEX, {
            "attributesToRetrieve": ["objectID", "product_group_id", "price", "in_stock", "availability_score"]
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
        
        # Find lowest price in each group and update
        updates = []
        for group_id, products in groups.items():
            if len(products) > 1:
                # Sort by price, then by availability
                products.sort(key=lambda p: (p.get("price", float("inf")), -p.get("availability_score", 0)))
                lowest_price = products[0].get("price", 0)
                
                for i, product in enumerate(products):
                    updates.append({
                        "objectID": product["objectID"],
                        "is_lowest_price": i == 0 and product.get("price") == lowest_price,
                        "supplier_count": len(products)
                    })
        
        # Batch update
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
    """
    Search products with Algolia.
    Returns products with facets for filtering.
    """
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
            if filters.get("in_stock"):
                filter_parts.append("in_stock:true")
            if filters.get("price_min") is not None:
                filter_parts.append(f'price >= {filters["price_min"]}')
            if filters.get("price_max") is not None:
                filter_parts.append(f'price <= {filters["price_max"]}')
        
        filter_string = " AND ".join(filter_parts) if filter_parts else ""
        
        # Execute search
        response = algolia_client.search_single_index(
            index_name,
            {
                "query": query,
                "page": page,
                "hitsPerPage": hits_per_page,
                "filters": filter_string,
                "facets": ["brand", "category", "supplier", "in_stock"],
                "attributesToHighlight": ["product_name", "brand", "description", "part_number"],
                "getRankingInfo": True
            }
        )
        
        return {
            "hits": response.hits,
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


def clear_index():
    """Clear all products from the index"""
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

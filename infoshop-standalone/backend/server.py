"""
InfoShop Catalog - Standalone Application
A dedicated PunchOut-enabled B2B catalog for Coupa integration

This is a standalone version of the InfoShop Catalog extracted from OMNISupply.io
Designed specifically for Coupa PunchOut testing and production integration.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'infoshop_catalog')]

# Import Algolia service
try:
    from algolia_service import (
        init_algolia,
        search_products as algolia_search_products,
        index_products_from_file,
        get_index_stats
    )
    ALGOLIA_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Algolia service not available: {e}")
    ALGOLIA_AVAILABLE = False

# Import PunchOut service
from punchout_service import (
    parse_punchout_setup_request,
    validate_punchout_credentials,
    create_punchout_setup_response,
    create_punchout_order_message,
    create_punchout_session,
    get_punchout_session,
    update_punchout_cart,
    close_punchout_session,
    log_punchout_transaction,
    save_punchout_session_to_db,
    get_punchout_session_from_db,
    PUNCHOUT_CONFIG
)

# Create FastAPI app
app = FastAPI(
    title="InfoShop Catalog API",
    description="Standalone B2B Catalog with Coupa PunchOut Integration",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
api_router = APIRouter(prefix="/api")

# ============================================
# Health Check
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "InfoShop Catalog",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "algolia_available": ALGOLIA_AVAILABLE
    }

# ============================================
# Catalog Search
# ============================================

class SearchRequest(BaseModel):
    query: str = ""
    page: int = 0
    hits_per_page: int = 24
    filters: Dict[str, Any] = {}
    sort_by: Optional[str] = None

@api_router.post("/catalog/search")
async def search_catalog(request: SearchRequest):
    """Search the product catalog"""
    if not ALGOLIA_AVAILABLE:
        return {"hits": [], "nbHits": 0, "error": "Search not configured"}
    
    results = algolia_search_products(
        query=request.query,
        filters=request.filters,
        page=request.page,
        hits_per_page=request.hits_per_page,
        sort_by=request.sort_by
    )
    return results

@api_router.get("/catalog/stats")
async def get_catalog_stats():
    """Get catalog statistics"""
    if not ALGOLIA_AVAILABLE:
        return {"total_products": 0, "suppliers": [], "error": "Algolia not configured"}
    
    stats = get_index_stats()
    
    # Get facet counts for filters
    search_result = algolia_search_products("", {}, 0, 0)
    facets = search_result.get("facets", {})
    
    # Build supplier list
    suppliers = []
    for name, count in facets.get("supplier", {}).items():
        suppliers.append({"name": name, "count": count})
    
    # Build top categories
    top_categories = []
    for name, count in list(facets.get("category", {}).items())[:15]:
        top_categories.append({"name": name, "count": count})
    
    # Build top brands
    top_brands = []
    for name, count in list(facets.get("brand", {}).items())[:15]:
        top_brands.append({"name": name, "count": count})
    
    return {
        "total_products": stats.get("total_products", 0),
        "supplier_count": stats.get("supplier_count", 0),
        "suppliers": suppliers,
        "top_categories": top_categories,
        "top_brands": top_brands,
        "countries": stats.get("countries", [])
    }

# ============================================
# PunchOut Endpoints
# ============================================

@api_router.post("/punchout/setup")
async def punchout_setup(request: Request):
    """
    Handle cXML PunchOutSetupRequest from Coupa.
    
    Flow:
    1. Coupa sends PunchOutSetupRequest
    2. We validate credentials (SharedSecret: Infoshop@2026)
    3. Create session and return StartPage URL
    4. User browses catalog in PunchOut mode
    """
    try:
        body = await request.body()
        xml_content = body.decode("utf-8")
        
        logger.info(f"PunchOut setup request received, length: {len(xml_content)}")
        
        # Parse cXML
        try:
            parsed = parse_punchout_setup_request(xml_content)
        except ValueError as e:
            error_response = create_punchout_setup_response(
                success=False,
                error_message=f"Invalid cXML format: {str(e)}"
            )
            return Response(content=error_response, media_type="application/xml", status_code=400)
        
        # Validate credentials
        if not validate_punchout_credentials(parsed.get("sender_shared_secret", "")):
            logger.warning(f"PunchOut auth failed for {parsed.get('from_identity', 'unknown')}")
            
            await log_punchout_transaction(
                db,
                transaction_type="setup_failed",
                session_token="",
                buyer_identity=parsed.get("from_identity", "unknown"),
                status="authentication_failed",
                details={"reason": "Invalid shared secret"}
            )
            
            error_response = create_punchout_setup_response(
                success=False,
                error_message="Authentication failed: Invalid credentials"
            )
            return Response(content=error_response, media_type="application/xml", status_code=401)
        
        # Create session
        session_token = create_punchout_session(
            buyer_cookie=parsed.get("buyer_cookie", ""),
            browser_form_post_url=parsed.get("browser_form_post_url", ""),
            from_identity=parsed.get("from_identity", ""),
            deployment_mode=parsed.get("deployment_mode", "production"),
            user_email=parsed.get("user_email", "")
        )
        
        # Save to database
        session_data = get_punchout_session(session_token)
        if session_data:
            await save_punchout_session_to_db(db, session_token, session_data)
        
        # Log success
        await log_punchout_transaction(
            db,
            transaction_type="setup_success",
            session_token=session_token,
            buyer_identity=parsed.get("from_identity", ""),
            status="session_created",
            details={
                "operation": parsed.get("operation", "create"),
                "deployment_mode": parsed.get("deployment_mode", "production")
            }
        )
        
        # Generate StartPage URL
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3001")
        start_page_url = f"{frontend_url}?punchout={session_token}"
        
        logger.info(f"PunchOut session created: {session_token[:16]}...")
        
        success_response = create_punchout_setup_response(
            success=True,
            start_page_url=start_page_url,
            buyer_cookie=parsed.get("buyer_cookie", "")
        )
        
        return Response(content=success_response, media_type="application/xml", status_code=200)
        
    except Exception as e:
        logger.error(f"PunchOut setup error: {e}", exc_info=True)
        error_response = create_punchout_setup_response(
            success=False,
            error_message=f"Internal server error: {str(e)}"
        )
        return Response(content=error_response, media_type="application/xml", status_code=500)


@api_router.get("/punchout/session/{session_token}")
async def get_punchout_session_info(session_token: str):
    """Get PunchOut session information"""
    session = get_punchout_session(session_token)
    if not session:
        session = await get_punchout_session_from_db(db, session_token)
    
    if not session:
        raise HTTPException(status_code=404, detail="PunchOut session not found or expired")
    
    return {
        "valid": True,
        "buyer_identity": session.get("from_identity", ""),
        "deployment_mode": session.get("deployment_mode", "production"),
        "created_at": session.get("created_at", ""),
        "cart_items_count": len(session.get("cart_items", []))
    }


class PunchOutCartItem(BaseModel):
    product_id: str
    supplier_part_id: str
    name: str
    description: Optional[str] = ""
    quantity: int = 1
    unit_price: float
    unit_of_measure: str = "EA"
    brand: Optional[str] = ""
    part_number: Optional[str] = ""
    unspsc_code: Optional[str] = ""


class PunchOutCartUpdate(BaseModel):
    session_token: str
    items: List[PunchOutCartItem]


@api_router.post("/punchout/cart/update")
async def update_punchout_session_cart(cart_update: PunchOutCartUpdate):
    """Update cart items in PunchOut session"""
    session_token = cart_update.session_token
    
    session = get_punchout_session(session_token)
    if not session:
        session = await get_punchout_session_from_db(db, session_token)
    
    if not session:
        raise HTTPException(status_code=404, detail="PunchOut session not found")
    
    cart_items = [item.model_dump() for item in cart_update.items]
    
    update_punchout_cart(session_token, cart_items)
    
    await db.punchout_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"cart_items": cart_items, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    total = sum(item["unit_price"] * item["quantity"] for item in cart_items)
    
    return {
        "success": True,
        "items_count": len(cart_items),
        "total_amount": round(total, 2),
        "currency": "USD"
    }


@api_router.post("/punchout/order")
async def create_punchout_order(session_token: str = Query(...)):
    """
    Create PunchOutOrderMessage to return cart to Coupa.
    Called when user clicks "Transfer to Coupa".
    """
    session = get_punchout_session(session_token)
    if not session:
        session = await get_punchout_session_from_db(db, session_token)
    
    if not session:
        raise HTTPException(status_code=404, detail="PunchOut session not found or expired")
    
    cart_items = session.get("cart_items", [])
    buyer_cookie = session.get("buyer_cookie", "")
    browser_form_post_url = session.get("browser_form_post_url", "")
    
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    total_amount = sum(item.get("unit_price", 0) * item.get("quantity", 1) for item in cart_items)
    
    order_message = create_punchout_order_message(
        cart_items=cart_items,
        buyer_cookie=buyer_cookie,
        total_amount=total_amount,
        currency="USD"
    )
    
    await log_punchout_transaction(
        db,
        transaction_type="order_created",
        session_token=session_token,
        buyer_identity=session.get("from_identity", ""),
        status="cart_transferred",
        details={
            "items_count": len(cart_items),
            "total_amount": total_amount
        }
    )
    
    close_punchout_session(session_token)
    await db.punchout_sessions.delete_one({"session_token": session_token})
    
    return {
        "success": True,
        "cxml": order_message,
        "browser_form_post_url": browser_form_post_url,
        "total_amount": total_amount,
        "items_count": len(cart_items)
    }


@api_router.get("/punchout/config")
async def get_punchout_config():
    """Get PunchOut configuration for Coupa setup"""
    api_url = os.environ.get("API_URL", "http://localhost:8002")
    
    return {
        "punchout_enabled": True,
        "supplier_info": {
            "supplier_domain": PUNCHOUT_CONFIG["supplier_domain"],
            "supplier_identity": PUNCHOUT_CONFIG["supplier_identity"],
            "from_domain": PUNCHOUT_CONFIG["from_domain"],
            "from_identity": PUNCHOUT_CONFIG["from_identity"]
        },
        "endpoints": {
            "setup_url": f"{api_url}/api/punchout/setup",
            "order_url": f"{api_url}/api/punchout/order",
            "session_url": f"{api_url}/api/punchout/session/{{session_token}}"
        },
        "cxml_version": "1.2.014",
        "supported_operations": ["create", "edit", "inspect"],
        "shared_secret": "Infoshop@2026"
    }


# ============================================
# Admin Endpoints for Catalog Management
# ============================================

@api_router.post("/admin/catalog/upload")
async def upload_catalog(
    file: UploadFile = File(...),
    supplier: str = Query(...),
    countries: str = Query("USA")
):
    """Upload and index a supplier catalog file"""
    if not ALGOLIA_AVAILABLE:
        raise HTTPException(status_code=503, detail="Algolia not configured")
    
    content = await file.read()
    country_list = [c.strip() for c in countries.split(",")]
    
    result = await index_products_from_file(
        file_content=content,
        filename=file.filename,
        supplier=supplier,
        countries=country_list
    )
    
    return result


# Include router
app.include_router(api_router)

# Startup event
@app.on_event("startup")
async def startup():
    if ALGOLIA_AVAILABLE:
        init_algolia()
    logger.info("InfoShop Catalog API started")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

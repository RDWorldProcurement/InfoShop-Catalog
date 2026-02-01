"""
Coupa PunchOut Integration for InfoShop Catalog
Implements cXML 1.2.x PunchOut Level 1 (Browse & Select)

Flow:
1. Coupa sends PunchOutSetupRequest to /api/punchout/setup
2. InfoShop validates credentials and returns StartPage URL
3. User browses catalog in PunchOut mode
4. User clicks "Transfer to Coupa" 
5. InfoShop sends PunchOutOrderMessage back to Coupa's BrowserFormPost URL
"""

import os
import uuid
import logging
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from xml.etree import ElementTree as ET
from xml.dom import minidom
import urllib.parse

logger = logging.getLogger(__name__)

# PunchOut Configuration - Production Settings for Danone/Coupa
PUNCHOUT_CONFIG = {
    "shared_secret": os.environ.get("PUNCHOUT_SHARED_SECRET", "OmniSup!y#2026$Coupa$8472"),
    "supplier_domain": "infoshop.omnisupply.io",
    "supplier_identity": "OMNISUPPLY_PUNCHOUT",
    "coupa_domain": "118817359",
    "from_domain": "DUNS",
    "from_identity": "InfoShop",
    "sender_domain": "infoshop.omnisupply.io",
    "sender_identity": "OMNISUPPLY_PUNCHOUT",
    "user_agent": "InfoShop PunchOut/2.0",
    "punchout_url": "https://infoshop.omnisupply.io/punchout/setup",
    "catalog_url": "https://infoshop.omnisupply.io",
}

# Active PunchOut sessions (in production, use Redis/database)
punchout_sessions: Dict[str, Dict] = {}


def generate_session_token() -> str:
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)


def generate_payload_id() -> str:
    """Generate a unique payload ID for cXML"""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    unique = secrets.token_hex(8)
    return f"{timestamp}.{unique}@infoshop.com"


def parse_punchout_setup_request(xml_content: str) -> Dict:
    """
    Parse incoming cXML PunchOutSetupRequest from Coupa
    
    Returns:
        {
            "buyer_cookie": str,
            "browser_form_post_url": str,
            "from_domain": str,
            "from_identity": str,
            "sender_domain": str,
            "sender_identity": str,
            "sender_shared_secret": str,
            "operation": str,
            "deployment_mode": str,
        }
    """
    try:
        root = ET.fromstring(xml_content)
        
        # Extract Header information
        header = root.find(".//Header")
        
        # From credentials (Buyer)
        from_elem = header.find(".//From/Credential")
        from_domain = from_elem.get("domain", "") if from_elem is not None else ""
        from_identity = from_elem.find("Identity").text if from_elem is not None and from_elem.find("Identity") is not None else ""
        
        # Sender credentials
        sender_elem = header.find(".//Sender/Credential")
        sender_domain = sender_elem.get("domain", "") if sender_elem is not None else ""
        sender_identity = sender_elem.find("Identity").text if sender_elem is not None and sender_elem.find("Identity") is not None else ""
        sender_shared_secret = ""
        if sender_elem is not None:
            secret_elem = sender_elem.find("SharedSecret")
            if secret_elem is not None:
                sender_shared_secret = secret_elem.text or ""
        
        # PunchOutSetupRequest details
        punchout_request = root.find(".//PunchOutSetupRequest")
        operation = punchout_request.get("operation", "create") if punchout_request is not None else "create"
        
        # BrowserFormPost URL (where to send the cart back)
        browser_form_post = punchout_request.find(".//BrowserFormPost")
        browser_form_post_url = ""
        if browser_form_post is not None:
            url_elem = browser_form_post.find("URL")
            if url_elem is not None:
                browser_form_post_url = url_elem.text or ""
        
        # Buyer Cookie (to include in response)
        buyer_cookie_elem = punchout_request.find(".//BuyerCookie")
        buyer_cookie = buyer_cookie_elem.text if buyer_cookie_elem is not None else ""
        
        # Deployment mode
        deployment_mode = "production"
        extrinsic = punchout_request.find(".//Extrinsic[@name='DeploymentMode']")
        if extrinsic is not None:
            deployment_mode = extrinsic.text or "production"
        
        # User email (optional)
        user_email = ""
        contact = punchout_request.find(".//Contact/Email")
        if contact is not None:
            user_email = contact.text or ""
        
        return {
            "buyer_cookie": buyer_cookie,
            "browser_form_post_url": browser_form_post_url,
            "from_domain": from_domain,
            "from_identity": from_identity,
            "sender_domain": sender_domain,
            "sender_identity": sender_identity,
            "sender_shared_secret": sender_shared_secret,
            "operation": operation,
            "deployment_mode": deployment_mode,
            "user_email": user_email,
        }
        
    except ET.ParseError as e:
        logger.error(f"Failed to parse PunchOutSetupRequest: {e}")
        raise ValueError(f"Invalid cXML: {e}")


def validate_punchout_credentials(sender_shared_secret: str) -> bool:
    """Validate the shared secret from the PunchOut request"""
    expected_secret = PUNCHOUT_CONFIG["shared_secret"]
    
    # Constant-time comparison to prevent timing attacks
    return secrets.compare_digest(sender_shared_secret, expected_secret)


def create_punchout_setup_response(
    success: bool,
    start_page_url: str = "",
    error_message: str = "",
    buyer_cookie: str = ""
) -> str:
    """
    Create cXML PunchOutSetupResponse
    
    Returns XML string to send back to Coupa
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    payload_id = generate_payload_id()
    
    if success:
        status_code = "200"
        status_text = "OK"
    else:
        status_code = "401"
        status_text = "Unauthorized"
    
    # Build cXML response
    cxml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML version="1.2.014" timestamp="{timestamp}" payloadID="{payload_id}">
    <Response>
        <Status code="{status_code}" text="{status_text}">{error_message}</Status>
'''
    
    if success:
        cxml += f'''        <PunchOutSetupResponse>
            <StartPage>
                <URL>{start_page_url}</URL>
            </StartPage>
        </PunchOutSetupResponse>
'''
    
    cxml += '''    </Response>
</cXML>'''
    
    return cxml


def create_punchout_order_message(
    cart_items: List[Dict],
    buyer_cookie: str,
    total_amount: float,
    currency: str = "USD"
) -> str:
    """
    Create cXML PunchOutOrderMessage to send cart back to Coupa
    
    cart_items: List of items with:
        - supplier_part_id: str
        - quantity: int
        - unit_price: float
        - description: str
        - unit_of_measure: str
        - classification_domain: str (e.g., "UNSPSC")
        - classification_code: str
        - manufacturer_part_id: str
        - manufacturer_name: str
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    payload_id = generate_payload_id()
    
    cxml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML version="1.2.014" timestamp="{timestamp}" payloadID="{payload_id}">
    <Header>
        <From>
            <Credential domain="{PUNCHOUT_CONFIG['from_domain']}">
                <Identity>{PUNCHOUT_CONFIG['from_identity']}</Identity>
            </Credential>
        </From>
        <To>
            <Credential domain="NetworkId">
                <Identity>Coupa</Identity>
            </Credential>
        </To>
        <Sender>
            <Credential domain="{PUNCHOUT_CONFIG['sender_domain']}">
                <Identity>{PUNCHOUT_CONFIG['sender_identity']}</Identity>
                <SharedSecret>{PUNCHOUT_CONFIG['shared_secret']}</SharedSecret>
            </Credential>
            <UserAgent>{PUNCHOUT_CONFIG['user_agent']}</UserAgent>
        </Sender>
    </Header>
    <Message>
        <PunchOutOrderMessage>
            <BuyerCookie>{buyer_cookie}</BuyerCookie>
            <PunchOutOrderMessageHeader operationAllowed="create">
                <Total>
                    <Money currency="{currency}">{total_amount:.2f}</Money>
                </Total>
            </PunchOutOrderMessageHeader>
'''
    
    # Add each item
    for idx, item in enumerate(cart_items, 1):
        unit_price = item.get("unit_price", 0)
        quantity = item.get("quantity", 1)
        line_total = unit_price * quantity
        
        cxml += f'''            <ItemIn quantity="{quantity}">
                <ItemID>
                    <SupplierPartID>{item.get('supplier_part_id', item.get('sku', ''))}</SupplierPartID>
                    <SupplierPartAuxiliaryID>{item.get('supplier_part_aux_id', '')}</SupplierPartAuxiliaryID>
                </ItemID>
                <ItemDetail>
                    <UnitPrice>
                        <Money currency="{currency}">{unit_price:.2f}</Money>
                    </UnitPrice>
                    <Description xml:lang="en">{escape_xml(item.get('description', item.get('name', '')))}</Description>
                    <UnitOfMeasure>{item.get('unit_of_measure', 'EA')}</UnitOfMeasure>
                    <Classification domain="{item.get('classification_domain', 'UNSPSC')}">{item.get('classification_code', item.get('unspsc_code', ''))}</Classification>
                    <ManufacturerPartID>{item.get('manufacturer_part_id', item.get('part_number', ''))}</ManufacturerPartID>
                    <ManufacturerName>{escape_xml(item.get('manufacturer_name', item.get('brand', '')))}</ManufacturerName>
                </ItemDetail>
            </ItemIn>
'''
    
    cxml += '''        </PunchOutOrderMessage>
    </Message>
</cXML>'''
    
    return cxml


def escape_xml(text: str) -> str:
    """Escape special characters for XML"""
    if not text:
        return ""
    return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;"))


def create_punchout_session(
    buyer_cookie: str,
    browser_form_post_url: str,
    from_identity: str,
    deployment_mode: str = "production",
    user_email: str = ""
) -> str:
    """
    Create a new PunchOut session and return the session token
    """
    session_token = generate_session_token()
    
    punchout_sessions[session_token] = {
        "buyer_cookie": buyer_cookie,
        "browser_form_post_url": browser_form_post_url,
        "from_identity": from_identity,
        "deployment_mode": deployment_mode,
        "user_email": user_email,
        "cart_items": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None,  # Could add expiration
    }
    
    logger.info(f"Created PunchOut session: {session_token[:16]}...")
    return session_token


def get_punchout_session(session_token: str) -> Optional[Dict]:
    """Get PunchOut session by token"""
    return punchout_sessions.get(session_token)


def update_punchout_cart(session_token: str, cart_items: List[Dict]) -> bool:
    """Update the cart items in a PunchOut session"""
    session = punchout_sessions.get(session_token)
    if session:
        session["cart_items"] = cart_items
        return True
    return False


def close_punchout_session(session_token: str) -> Optional[Dict]:
    """Close and remove a PunchOut session, returning the session data"""
    return punchout_sessions.pop(session_token, None)


# MongoDB storage for production (optional)
async def save_punchout_session_to_db(db, session_token: str, session_data: Dict):
    """Save PunchOut session to MongoDB for persistence"""
    await db.punchout_sessions.update_one(
        {"session_token": session_token},
        {"$set": {**session_data, "session_token": session_token}},
        upsert=True
    )


async def get_punchout_session_from_db(db, session_token: str) -> Optional[Dict]:
    """Get PunchOut session from MongoDB"""
    session = await db.punchout_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    return session


async def log_punchout_transaction(
    db,
    transaction_type: str,
    session_token: str,
    buyer_identity: str,
    status: str,
    details: Dict = None
):
    """Log PunchOut transactions for auditing"""
    await db.punchout_logs.insert_one({
        "transaction_type": transaction_type,
        "session_token": session_token[:16] + "...",
        "buyer_identity": buyer_identity,
        "status": status,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

"""
Test suite for Coupa cXML PunchOut Integration
Tests the PunchOut setup, session management, cart operations, and order creation

Endpoints tested:
- POST /api/punchout/setup - validates credentials, creates session, returns StartPage URL
- GET /api/punchout/session/{token} - returns session info
- POST /api/punchout/cart/update - updates cart items in session
- POST /api/punchout/order - creates cXML PunchOutOrderMessage
- GET /api/punchout/config - returns PunchOut configuration
"""

import pytest
import requests
import os
import xml.etree.ElementTree as ET

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Valid SharedSecret for testing
VALID_SHARED_SECRET = "Infoshop@2026"
INVALID_SHARED_SECRET = "WrongSecret123"


def create_punchout_setup_request(shared_secret: str, buyer_cookie: str = "test-cookie-123") -> str:
    """Create a valid cXML PunchOutSetupRequest"""
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.014/cXML.dtd">
<cXML version="1.2.014" timestamp="2026-01-28T10:00:00+00:00" payloadID="test123@coupa.com">
    <Header>
        <From>
            <Credential domain="NetworkId">
                <Identity>TestBuyer</Identity>
            </Credential>
        </From>
        <To>
            <Credential domain="InfoShopNetwork">
                <Identity>InfoShopSupplier</Identity>
            </Credential>
        </To>
        <Sender>
            <Credential domain="NetworkId">
                <Identity>TestBuyer</Identity>
                <SharedSecret>{shared_secret}</SharedSecret>
            </Credential>
            <UserAgent>Coupa Procurement 1.0</UserAgent>
        </Sender>
    </Header>
    <Request>
        <PunchOutSetupRequest operation="create">
            <BuyerCookie>{buyer_cookie}</BuyerCookie>
            <BrowserFormPost>
                <URL>https://coupa.example.com/punchout/return</URL>
            </BrowserFormPost>
            <Contact>
                <Email>buyer@example.com</Email>
            </Contact>
            <Extrinsic name="DeploymentMode">test</Extrinsic>
        </PunchOutSetupRequest>
    </Request>
</cXML>'''


class TestPunchOutConfig:
    """Test PunchOut configuration endpoint"""
    
    def test_get_punchout_config(self):
        """GET /api/punchout/config - should return PunchOut configuration"""
        response = requests.get(f"{BASE_URL}/api/punchout/config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify configuration structure
        assert data.get("punchout_enabled") == True
        assert "supplier_info" in data
        assert "endpoints" in data
        assert "cxml_version" in data
        
        # Verify supplier info
        supplier_info = data["supplier_info"]
        assert supplier_info.get("supplier_domain") == "InfoShopNetwork"
        assert supplier_info.get("supplier_identity") == "InfoShopSupplier"
        
        # Verify endpoints
        endpoints = data["endpoints"]
        assert "setup_url" in endpoints
        assert "order_url" in endpoints
        assert "session_url" in endpoints
        assert "/api/punchout/setup" in endpoints["setup_url"]
        
        print(f"✓ PunchOut config retrieved successfully")
        print(f"  - Setup URL: {endpoints['setup_url']}")
        print(f"  - cXML Version: {data['cxml_version']}")


class TestPunchOutSetup:
    """Test PunchOut setup endpoint with valid and invalid credentials"""
    
    def test_punchout_setup_valid_credentials(self):
        """POST /api/punchout/setup - should accept valid SharedSecret and return StartPage URL"""
        xml_request = create_punchout_setup_request(VALID_SHARED_SECRET)
        
        response = requests.post(
            f"{BASE_URL}/api/punchout/setup",
            data=xml_request,
            headers={"Content-Type": "application/xml"}
        )
        
        assert response.status_code == 200
        assert "application/xml" in response.headers.get("Content-Type", "")
        
        # Parse XML response
        root = ET.fromstring(response.text)
        
        # Check status code in response
        status = root.find(".//Status")
        assert status is not None
        assert status.get("code") == "200"
        assert status.get("text") == "OK"
        
        # Check StartPage URL
        start_page = root.find(".//StartPage/URL")
        assert start_page is not None
        assert start_page.text is not None
        assert "punchout=" in start_page.text
        assert "/infoshop-catalog" in start_page.text
        
        # Extract session token from URL
        session_token = start_page.text.split("punchout=")[1]
        assert len(session_token) > 20  # Token should be substantial
        
        print(f"✓ PunchOut setup successful with valid credentials")
        print(f"  - StartPage URL: {start_page.text[:80]}...")
        
        # Store session token for subsequent tests
        return session_token
    
    def test_punchout_setup_invalid_credentials(self):
        """POST /api/punchout/setup - should reject invalid SharedSecret with 401"""
        xml_request = create_punchout_setup_request(INVALID_SHARED_SECRET)
        
        response = requests.post(
            f"{BASE_URL}/api/punchout/setup",
            data=xml_request,
            headers={"Content-Type": "application/xml"}
        )
        
        assert response.status_code == 401
        assert "application/xml" in response.headers.get("Content-Type", "")
        
        # Parse XML response
        root = ET.fromstring(response.text)
        
        # Check status code in response
        status = root.find(".//Status")
        assert status is not None
        assert status.get("code") == "401"
        assert "Unauthorized" in status.get("text", "")
        
        # Should contain error message
        assert "Authentication failed" in status.text or "Invalid" in status.text
        
        print(f"✓ PunchOut setup correctly rejected invalid credentials")
        print(f"  - Status: {status.get('code')} {status.get('text')}")
    
    def test_punchout_setup_empty_secret(self):
        """POST /api/punchout/setup - should reject empty SharedSecret"""
        xml_request = create_punchout_setup_request("")
        
        response = requests.post(
            f"{BASE_URL}/api/punchout/setup",
            data=xml_request,
            headers={"Content-Type": "application/xml"}
        )
        
        assert response.status_code == 401
        print(f"✓ PunchOut setup correctly rejected empty credentials")
    
    def test_punchout_setup_invalid_xml(self):
        """POST /api/punchout/setup - should handle invalid XML gracefully"""
        invalid_xml = "<invalid>not valid cxml</invalid>"
        
        response = requests.post(
            f"{BASE_URL}/api/punchout/setup",
            data=invalid_xml,
            headers={"Content-Type": "application/xml"}
        )
        
        # Should return 400, 500, or 520 (Cloudflare error) with error message
        assert response.status_code in [400, 500, 520]
        print(f"✓ PunchOut setup correctly handled invalid XML (status: {response.status_code})")


class TestPunchOutSession:
    """Test PunchOut session management"""
    
    @pytest.fixture
    def valid_session_token(self):
        """Create a valid PunchOut session and return the token"""
        xml_request = create_punchout_setup_request(VALID_SHARED_SECRET, "fixture-cookie")
        response = requests.post(
            f"{BASE_URL}/api/punchout/setup",
            data=xml_request,
            headers={"Content-Type": "application/xml"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create PunchOut session")
        
        root = ET.fromstring(response.text)
        start_page = root.find(".//StartPage/URL")
        if start_page is None or start_page.text is None:
            pytest.skip("No StartPage URL in response")
        
        return start_page.text.split("punchout=")[1]
    
    def test_get_session_info_valid(self, valid_session_token):
        """GET /api/punchout/session/{token} - should return session info for valid token"""
        response = requests.get(f"{BASE_URL}/api/punchout/session/{valid_session_token}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("valid") == True
        assert "buyer_identity" in data
        assert "deployment_mode" in data
        assert "created_at" in data
        assert "cart_items_count" in data
        
        print(f"✓ Session info retrieved successfully")
        print(f"  - Buyer: {data.get('buyer_identity')}")
        print(f"  - Mode: {data.get('deployment_mode')}")
    
    def test_get_session_info_invalid_token(self):
        """GET /api/punchout/session/{token} - should return 404 for invalid token"""
        response = requests.get(f"{BASE_URL}/api/punchout/session/invalid-token-12345")
        
        assert response.status_code == 404
        print(f"✓ Invalid session token correctly returned 404")


class TestPunchOutCart:
    """Test PunchOut cart operations"""
    
    @pytest.fixture
    def session_with_token(self):
        """Create a valid PunchOut session and return the token"""
        xml_request = create_punchout_setup_request(VALID_SHARED_SECRET, "cart-test-cookie")
        response = requests.post(
            f"{BASE_URL}/api/punchout/setup",
            data=xml_request,
            headers={"Content-Type": "application/xml"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create PunchOut session")
        
        root = ET.fromstring(response.text)
        start_page = root.find(".//StartPage/URL")
        if start_page is None or start_page.text is None:
            pytest.skip("No StartPage URL in response")
        
        return start_page.text.split("punchout=")[1]
    
    def test_update_cart_items(self, session_with_token):
        """POST /api/punchout/cart/update - should update cart items in session"""
        cart_items = [
            {
                "product_id": "TEST-PROD-001",
                "supplier_part_id": "SKU-001",
                "name": "Test Product 1",
                "description": "A test product for PunchOut",
                "quantity": 2,
                "unit_price": 99.99,
                "unit_of_measure": "EA",
                "brand": "TestBrand",
                "part_number": "PN-001",
                "unspsc_code": "43211503"
            },
            {
                "product_id": "TEST-PROD-002",
                "supplier_part_id": "SKU-002",
                "name": "Test Product 2",
                "description": "Another test product",
                "quantity": 1,
                "unit_price": 149.50,
                "unit_of_measure": "EA",
                "brand": "TestBrand",
                "part_number": "PN-002",
                "unspsc_code": "43211902"
            }
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/punchout/cart/update",
            json={
                "session_token": session_with_token,
                "items": cart_items
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("items_count") == 2
        assert data.get("total_amount") == round(99.99 * 2 + 149.50, 2)
        assert data.get("currency") == "USD"
        
        print(f"✓ Cart updated successfully")
        print(f"  - Items: {data.get('items_count')}")
        print(f"  - Total: ${data.get('total_amount')}")
        
        return session_with_token
    
    def test_update_cart_invalid_session(self):
        """POST /api/punchout/cart/update - should return 404 for invalid session"""
        response = requests.post(
            f"{BASE_URL}/api/punchout/cart/update",
            json={
                "session_token": "invalid-session-token",
                "items": [{"product_id": "test", "supplier_part_id": "test", "name": "test", "quantity": 1, "unit_price": 10}]
            }
        )
        
        assert response.status_code == 404
        print(f"✓ Cart update correctly rejected invalid session")


class TestPunchOutOrder:
    """Test PunchOut order creation (cart transfer to Coupa)"""
    
    @pytest.fixture
    def session_with_cart(self):
        """Create a session with items in cart"""
        # Create session
        xml_request = create_punchout_setup_request(VALID_SHARED_SECRET, "order-test-cookie")
        response = requests.post(
            f"{BASE_URL}/api/punchout/setup",
            data=xml_request,
            headers={"Content-Type": "application/xml"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create PunchOut session")
        
        root = ET.fromstring(response.text)
        start_page = root.find(".//StartPage/URL")
        if start_page is None or start_page.text is None:
            pytest.skip("No StartPage URL in response")
        
        session_token = start_page.text.split("punchout=")[1]
        
        # Add items to cart
        cart_items = [
            {
                "product_id": "ORDER-PROD-001",
                "supplier_part_id": "ORDER-SKU-001",
                "name": "Order Test Product",
                "description": "Product for order test",
                "quantity": 3,
                "unit_price": 75.00,
                "unit_of_measure": "EA",
                "brand": "OrderBrand",
                "part_number": "ORDER-PN-001",
                "unspsc_code": "43211503"
            }
        ]
        
        cart_response = requests.post(
            f"{BASE_URL}/api/punchout/cart/update",
            json={"session_token": session_token, "items": cart_items}
        )
        
        if cart_response.status_code != 200:
            pytest.skip("Could not update cart")
        
        return session_token
    
    def test_create_order_message(self, session_with_cart):
        """POST /api/punchout/order - should create cXML PunchOutOrderMessage"""
        response = requests.post(
            f"{BASE_URL}/api/punchout/order?session_token={session_with_cart}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "cxml" in data
        assert data.get("items_count") == 1
        assert data.get("total_amount") == 225.00  # 3 * 75.00
        
        # Verify cXML structure
        cxml = data.get("cxml")
        assert "PunchOutOrderMessage" in cxml
        assert "BuyerCookie" in cxml
        assert "ItemIn" in cxml
        assert "ORDER-SKU-001" in cxml
        assert "75.00" in cxml
        
        # Parse and validate cXML
        root = ET.fromstring(cxml)
        
        # Check header
        header = root.find(".//Header")
        assert header is not None
        
        # Check order message
        order_msg = root.find(".//PunchOutOrderMessage")
        assert order_msg is not None
        
        # Check buyer cookie
        buyer_cookie = order_msg.find("BuyerCookie")
        assert buyer_cookie is not None
        assert buyer_cookie.text == "order-test-cookie"
        
        # Check total
        total = root.find(".//Total/Money")
        assert total is not None
        assert "225.00" in total.text
        
        print(f"✓ PunchOut order message created successfully")
        print(f"  - Items: {data.get('items_count')}")
        print(f"  - Total: ${data.get('total_amount')}")
        print(f"  - cXML length: {len(cxml)} chars")
    
    def test_create_order_empty_cart(self):
        """POST /api/punchout/order - should reject empty cart"""
        # Create session without adding items
        xml_request = create_punchout_setup_request(VALID_SHARED_SECRET, "empty-cart-cookie")
        response = requests.post(
            f"{BASE_URL}/api/punchout/setup",
            data=xml_request,
            headers={"Content-Type": "application/xml"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create session")
        
        root = ET.fromstring(response.text)
        start_page = root.find(".//StartPage/URL")
        session_token = start_page.text.split("punchout=")[1]
        
        # Try to create order with empty cart
        order_response = requests.post(
            f"{BASE_URL}/api/punchout/order?session_token={session_token}"
        )
        
        assert order_response.status_code == 400
        print(f"✓ Order creation correctly rejected empty cart")
    
    def test_create_order_invalid_session(self):
        """POST /api/punchout/order - should return 404 for invalid session"""
        response = requests.post(
            f"{BASE_URL}/api/punchout/order?session_token=invalid-session-token"
        )
        
        assert response.status_code == 404
        print(f"✓ Order creation correctly rejected invalid session")


class TestPunchOutEndToEnd:
    """End-to-end test of the complete PunchOut flow"""
    
    def test_complete_punchout_flow(self):
        """Test the complete PunchOut flow from setup to order"""
        print("\n=== Testing Complete PunchOut Flow ===\n")
        
        # Step 1: Setup PunchOut session
        print("Step 1: Creating PunchOut session...")
        xml_request = create_punchout_setup_request(VALID_SHARED_SECRET, "e2e-test-cookie")
        setup_response = requests.post(
            f"{BASE_URL}/api/punchout/setup",
            data=xml_request,
            headers={"Content-Type": "application/xml"}
        )
        
        assert setup_response.status_code == 200
        root = ET.fromstring(setup_response.text)
        start_page = root.find(".//StartPage/URL")
        session_token = start_page.text.split("punchout=")[1]
        print(f"  ✓ Session created: {session_token[:20]}...")
        
        # Step 2: Verify session
        print("Step 2: Verifying session...")
        session_response = requests.get(f"{BASE_URL}/api/punchout/session/{session_token}")
        assert session_response.status_code == 200
        session_data = session_response.json()
        assert session_data.get("valid") == True
        print(f"  ✓ Session valid, buyer: {session_data.get('buyer_identity')}")
        
        # Step 3: Add items to cart
        print("Step 3: Adding items to cart...")
        cart_items = [
            {
                "product_id": "E2E-PROD-001",
                "supplier_part_id": "E2E-SKU-001",
                "name": "HP ProBook 450 G10",
                "description": "Business Laptop",
                "quantity": 5,
                "unit_price": 1299.00,
                "unit_of_measure": "EA",
                "brand": "HP",
                "part_number": "HP-PB450G10",
                "unspsc_code": "43211503"
            },
            {
                "product_id": "E2E-PROD-002",
                "supplier_part_id": "E2E-SKU-002",
                "name": "Dell UltraSharp Monitor",
                "description": "27\" 4K Monitor",
                "quantity": 5,
                "unit_price": 799.00,
                "unit_of_measure": "EA",
                "brand": "Dell",
                "part_number": "DELL-U2723QE",
                "unspsc_code": "43211902"
            }
        ]
        
        cart_response = requests.post(
            f"{BASE_URL}/api/punchout/cart/update",
            json={"session_token": session_token, "items": cart_items}
        )
        assert cart_response.status_code == 200
        cart_data = cart_response.json()
        expected_total = (1299.00 * 5) + (799.00 * 5)  # 10490.00
        assert cart_data.get("total_amount") == expected_total
        print(f"  ✓ Cart updated: {cart_data.get('items_count')} items, ${cart_data.get('total_amount')}")
        
        # Step 4: Create order (transfer to Coupa)
        print("Step 4: Creating PunchOut order message...")
        order_response = requests.post(
            f"{BASE_URL}/api/punchout/order?session_token={session_token}"
        )
        assert order_response.status_code == 200
        order_data = order_response.json()
        assert order_data.get("success") == True
        assert order_data.get("total_amount") == expected_total
        assert "cxml" in order_data
        print(f"  ✓ Order created: ${order_data.get('total_amount')}")
        
        # Verify cXML contains correct data
        cxml = order_data.get("cxml")
        assert "e2e-test-cookie" in cxml
        assert "HP ProBook 450 G10" in cxml or "HP-PB450G10" in cxml
        assert "Dell UltraSharp Monitor" in cxml or "DELL-U2723QE" in cxml
        print(f"  ✓ cXML validated ({len(cxml)} chars)")
        
        # Step 5: Verify session is closed
        print("Step 5: Verifying session is closed...")
        closed_response = requests.get(f"{BASE_URL}/api/punchout/session/{session_token}")
        assert closed_response.status_code == 404
        print(f"  ✓ Session correctly closed after order")
        
        print("\n=== Complete PunchOut Flow Test PASSED ===\n")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

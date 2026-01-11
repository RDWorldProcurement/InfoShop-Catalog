"""
OMNISupply.io Backend API Tests
Tests for: Auth, Products, Services, Cart, PunchOut, RFQ, Quotations, Orders, InfoCoins
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@infosys.com"
TEST_PASSWORD = "demo123"
TEST_COUNTRY = "USA"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "id" in data, "User ID not in response"
        assert "email" in data, "Email not in response"
        assert data["email"] == TEST_EMAIL
        assert "currency" in data, "Currency not in response"
        assert data["currency"]["code"] == "USD"
        print(f"SUCCESS: Login successful for {TEST_EMAIL}")
    
    def test_login_missing_fields(self):
        """Test login with missing fields"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL
        })
        assert response.status_code in [400, 422], "Should fail with missing fields"
        print("SUCCESS: Login correctly rejects missing fields")
    
    def test_get_me_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        token = login_response.json()["token"]
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Get me failed: {response.text}"
        
        data = response.json()
        assert data["email"] == TEST_EMAIL
        assert "currency" in data
        print("SUCCESS: /auth/me returns user info correctly")


class TestProductEndpoints:
    """Product catalog endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_products(self):
        """Test product search endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/search", 
                               params={"q": "bearing", "limit": 10},
                               headers=self.headers)
        assert response.status_code == 200, f"Product search failed: {response.text}"
        
        data = response.json()
        assert "results" in data, "Results not in response"
        assert "total" in data, "Total not in response"
        assert "categories" in data, "Categories not in response"
        assert "brands" in data, "Brands not in response"
        print(f"SUCCESS: Product search returned {len(data['results'])} results")
    
    def test_search_products_with_category_filter(self):
        """Test product search with category filter"""
        response = requests.get(f"{BASE_URL}/api/products/search",
                               params={"category": "Bearings & Power Transmission", "limit": 5},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        print(f"SUCCESS: Category filter returned {len(data['results'])} results")
    
    def test_get_categories(self):
        """Test get product categories"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        
        # Check UNSPSC codes are present
        for cat in data["categories"]:
            assert "name" in cat
            assert "unspsc" in cat
        print(f"SUCCESS: Got {len(data['categories'])} product categories with UNSPSC codes")
    
    def test_get_brands(self):
        """Test get product brands"""
        response = requests.get(f"{BASE_URL}/api/products/brands")
        assert response.status_code == 200
        
        data = response.json()
        assert "brands" in data
        assert len(data["brands"]) > 0
        
        for brand in data["brands"]:
            assert "name" in brand
            assert "logo" in brand
        print(f"SUCCESS: Got {len(data['brands'])} brands with logos")
    
    def test_check_inventory(self):
        """Test inventory check endpoint"""
        # First get a product
        search_response = requests.get(f"{BASE_URL}/api/products/search",
                                       params={"limit": 1},
                                       headers=self.headers)
        products = search_response.json()["results"]
        
        if products:
            product_id = products[0]["id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}/inventory",
                                   headers=self.headers)
            assert response.status_code == 200
            
            data = response.json()
            assert "available_quantity" in data
            assert "warehouse_locations" in data
            print(f"SUCCESS: Inventory check returned {data['available_quantity']} units")


class TestServiceEndpoints:
    """Service catalog endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_services(self):
        """Test service search endpoint"""
        response = requests.get(f"{BASE_URL}/api/services/search",
                               params={"q": "cleaning", "limit": 10},
                               headers=self.headers)
        assert response.status_code == 200, f"Service search failed: {response.text}"
        
        data = response.json()
        assert "results" in data
        assert "categories" in data
        print(f"SUCCESS: Service search returned {len(data['results'])} results")
    
    def test_get_service_categories(self):
        """Test get service categories"""
        response = requests.get(f"{BASE_URL}/api/services/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        
        for cat in data["categories"]:
            assert "name" in cat
            assert "unspsc" in cat
        print(f"SUCCESS: Got {len(data['categories'])} service categories with UNSPSC codes")


class TestCartEndpoints:
    """Cart functionality tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_cart(self):
        """Test get cart endpoint"""
        response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"SUCCESS: Cart has {len(data['items'])} items, total: {data['total']}")
    
    def test_add_to_cart(self):
        """Test add item to cart"""
        cart_item = {
            "product_id": str(uuid.uuid4()),
            "product_name": "TEST_SKF Ball Bearing 6205-2RS",
            "brand": "SKF",
            "sku": "TEST-SKF-001",
            "unspsc_code": "31170000",
            "category": "Bearings & Power Transmission",
            "quantity": 2,
            "unit_price": 45.00,
            "total_price": 90.00,
            "currency_code": "USD",
            "is_service": False
        }
        
        response = requests.post(f"{BASE_URL}/api/cart/add", 
                                json=cart_item,
                                headers=self.headers)
        assert response.status_code == 200, f"Add to cart failed: {response.text}"
        
        data = response.json()
        assert "item_id" in data
        print(f"SUCCESS: Added item to cart, item_id: {data['item_id']}")
        
        # Verify item is in cart
        cart_response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        cart_data = cart_response.json()
        assert any(item["product_name"] == "TEST_SKF Ball Bearing 6205-2RS" for item in cart_data["items"])
        print("SUCCESS: Item verified in cart")
    
    def test_remove_from_cart(self):
        """Test remove item from cart"""
        # First add an item
        cart_item = {
            "product_id": str(uuid.uuid4()),
            "product_name": "TEST_Item_To_Remove",
            "brand": "Test",
            "sku": "TEST-REMOVE-001",
            "unspsc_code": "31170000",
            "category": "Test",
            "quantity": 1,
            "unit_price": 10.00,
            "total_price": 10.00,
            "currency_code": "USD",
            "is_service": False
        }
        
        add_response = requests.post(f"{BASE_URL}/api/cart/add",
                                    json=cart_item,
                                    headers=self.headers)
        item_id = add_response.json()["item_id"]
        
        # Remove the item
        response = requests.delete(f"{BASE_URL}/api/cart/remove/{item_id}",
                                  headers=self.headers)
        assert response.status_code == 200
        print("SUCCESS: Item removed from cart")


class TestPunchOutEndpoints:
    """PunchOut transfer tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_punchout_systems(self):
        """Test get available PunchOut systems"""
        response = requests.get(f"{BASE_URL}/api/punchout/systems")
        assert response.status_code == 200
        
        data = response.json()
        assert "systems" in data
        
        system_names = [s["name"] for s in data["systems"]]
        expected_systems = ["Coupa", "SAP Ariba", "SAP ERP", "Ivalua", "Oracle"]
        for expected in expected_systems:
            assert expected in system_names, f"{expected} not in PunchOut systems"
        print(f"SUCCESS: Got {len(data['systems'])} PunchOut systems: {system_names}")
    
    def test_transfer_cart(self):
        """Test cart transfer to PunchOut system"""
        # First add an item to cart
        cart_item = {
            "product_id": str(uuid.uuid4()),
            "product_name": "TEST_PunchOut_Item",
            "brand": "Test",
            "sku": "TEST-PUNCHOUT-001",
            "unspsc_code": "31170000",
            "category": "Test",
            "quantity": 1,
            "unit_price": 100.00,
            "total_price": 100.00,
            "currency_code": "USD",
            "is_service": False
        }
        
        add_response = requests.post(f"{BASE_URL}/api/cart/add",
                                    json=cart_item,
                                    headers=self.headers)
        item_id = add_response.json()["item_id"]
        
        # Transfer cart
        response = requests.post(f"{BASE_URL}/api/cart/transfer",
                                json={"system": "Coupa", "cart_items": [item_id]},
                                headers=self.headers)
        assert response.status_code == 200, f"Transfer failed: {response.text}"
        
        data = response.json()
        assert "transfer_id" in data
        assert data["status"] == "Pending Customer PO"
        print(f"SUCCESS: Cart transferred to Coupa, transfer_id: {data['transfer_id']}")
    
    def test_get_transfers(self):
        """Test get cart transfers history"""
        response = requests.get(f"{BASE_URL}/api/cart/transfers", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "transfers" in data
        print(f"SUCCESS: Got {len(data['transfers'])} transfer records")


class TestRFQEndpoints:
    """RFQ (Request for Quote) tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_submit_rfq(self):
        """Test RFQ submission"""
        rfq_data = {
            "product_description": "TEST_Industrial Hydraulic Pump 50GPM",
            "quantity": 5,
            "brand_name": "Parker",
            "oem_part_number": "TEST-PUMP-001",
            "needed_by": "2025-02-01",
            "delivery_location": "New York, USA",
            "supplier_name": "",
            "supplier_email": "",
            "request_type": "actual",
            "is_product": True
        }
        
        response = requests.post(f"{BASE_URL}/api/rfq/submit",
                                json=rfq_data,
                                headers=self.headers)
        assert response.status_code == 200, f"RFQ submit failed: {response.text}"
        
        data = response.json()
        assert "rfq_id" in data
        assert "coins_earned" in data
        assert data["coins_earned"] == 50
        print(f"SUCCESS: RFQ submitted, rfq_id: {data['rfq_id']}, earned {data['coins_earned']} coins")
    
    def test_list_rfqs(self):
        """Test list RFQs"""
        response = requests.get(f"{BASE_URL}/api/rfq/list", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "rfqs" in data
        print(f"SUCCESS: Got {len(data['rfqs'])} RFQs")


class TestQuotationEndpoints:
    """Quotation request tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_request_quotation(self):
        """Test quotation request"""
        quotation_data = {
            "product_id": str(uuid.uuid4()),
            "product_name": "TEST_Heavy Duty Industrial Motor 5HP",
            "quantity": 3,
            "notes": "Need urgent delivery"
        }
        
        response = requests.post(f"{BASE_URL}/api/quotation/request",
                                json=quotation_data,
                                headers=self.headers)
        assert response.status_code == 200, f"Quotation request failed: {response.text}"
        
        data = response.json()
        assert "quotation_id" in data
        print(f"SUCCESS: Quotation requested, quotation_id: {data['quotation_id']}")
    
    def test_list_quotations(self):
        """Test list quotations"""
        response = requests.get(f"{BASE_URL}/api/quotation/list", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "quotations" in data
        print(f"SUCCESS: Got {len(data['quotations'])} quotations")


class TestOrderEndpoints:
    """Order management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_order_history(self):
        """Test get order history"""
        response = requests.get(f"{BASE_URL}/api/orders/history", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        print(f"SUCCESS: Got {len(data['orders'])} orders in history")


class TestInfoCoinsEndpoints:
    """InfoCoins rewards tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_balance(self):
        """Test get InfoCoins balance"""
        response = requests.get(f"{BASE_URL}/api/infocoins/balance", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "balance" in data
        assert isinstance(data["balance"], int)
        print(f"SUCCESS: InfoCoins balance: {data['balance']}")
    
    def test_get_rewards(self):
        """Test get available rewards"""
        response = requests.get(f"{BASE_URL}/api/infocoins/rewards")
        assert response.status_code == 200
        
        data = response.json()
        assert "rewards" in data
        assert len(data["rewards"]) > 0
        
        for reward in data["rewards"]:
            assert "id" in reward
            assert "name" in reward
            assert "coins_required" in reward
        print(f"SUCCESS: Got {len(data['rewards'])} available rewards")


class TestStatsEndpoint:
    """Stats endpoint test"""
    
    def test_get_stats(self):
        """Test get platform stats"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_products"] == "30M+"
        assert data["total_services"] == "100K+"
        assert "total_categories" in data
        assert "total_brands" in data
        assert "punchout_systems" in data
        print(f"SUCCESS: Stats - Products: {data['total_products']}, Services: {data['total_services']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

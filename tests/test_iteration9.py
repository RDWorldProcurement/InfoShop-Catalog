"""
Test Suite for OMNISupply.io Iteration 9
Testing: Category icons, Brand color dots, Product comparison feature
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://omnisupply-platform.preview.emergentagent.com')

class TestBrandsAPI:
    """Test brands endpoint for color dots feature"""
    
    def test_brands_list_includes_new_vendors(self):
        """Verify Donaldson, Avantor, Markem-Imaje are in brands list"""
        response = requests.get(f"{BASE_URL}/api/products/brands")
        assert response.status_code == 200
        
        data = response.json()
        assert "brands" in data
        
        brand_names = [b["name"] for b in data["brands"]]
        assert "Donaldson" in brand_names, "Donaldson brand missing"
        assert "Avantor" in brand_names, "Avantor brand missing"
        assert "Markem-Imaje" in brand_names, "Markem-Imaje brand missing"
        print(f"SUCCESS: Found {len(brand_names)} brands including new vendors")


class TestCategoriesAPI:
    """Test categories endpoint"""
    
    def test_categories_list(self):
        """Verify categories are returned"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        
        # Check for key categories that should have icons
        category_names = [c["name"] for c in data["categories"]]
        expected_categories = [
            "IT Equipment - Laptops",
            "IT Equipment - Monitors",
            "Safety & PPE",
            "Filtration"
        ]
        
        for cat in expected_categories:
            assert cat in category_names, f"Category '{cat}' missing"
        
        print(f"SUCCESS: Found {len(category_names)} categories")


class TestAuthAndSearch:
    """Test authentication and search functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token via demo login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token")
    
    def test_demo_login(self):
        """Test demo user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"SUCCESS: Demo login works, user: {data['user'].get('email')}")
    
    def test_admin_login(self):
        """Test admin user login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("SUCCESS: Admin login works")
    
    def test_search_donaldson_products(self, auth_token):
        """Search for Donaldson products"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/products/search",
            params={"q": "Donaldson", "limit": 10},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        
        # Check that Donaldson products are returned
        donaldson_products = [p for p in data["results"] if p.get("brand") == "Donaldson"]
        assert len(donaldson_products) >= 1, "No Donaldson products found"
        print(f"SUCCESS: Found {len(donaldson_products)} Donaldson products")
    
    def test_search_avantor_products(self, auth_token):
        """Search for Avantor products"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/products/search",
            params={"q": "Avantor", "limit": 10},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        
        avantor_products = [p for p in data["results"] if p.get("brand") == "Avantor"]
        assert len(avantor_products) >= 1, "No Avantor products found"
        print(f"SUCCESS: Found {len(avantor_products)} Avantor products")
    
    def test_search_markem_products(self, auth_token):
        """Search for Markem-Imaje products"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/products/search",
            params={"q": "Markem", "limit": 10},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        
        markem_products = [p for p in data["results"] if p.get("brand") == "Markem-Imaje"]
        assert len(markem_products) >= 1, "No Markem-Imaje products found"
        print(f"SUCCESS: Found {len(markem_products)} Markem-Imaje products")


class TestCartAndRFQ:
    """Test cart and RFQ functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        return response.json().get("token")
    
    def test_get_cart(self, auth_token):
        """Test getting cart"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/cart", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"SUCCESS: Cart has {len(data['items'])} items")
    
    def test_add_to_cart(self, auth_token):
        """Test adding item to cart"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        cart_item = {
            "product_id": "TEST-PROD-001",
            "product_name": "Test Product for Cart",
            "brand": "TestBrand",
            "sku": "TEST-SKU-001",
            "unspsc_code": "12345678",
            "category": "Test Category",
            "quantity": 1,
            "unit_price": 99.99,
            "total_price": 99.99,
            "currency_code": "USD",
            "is_service": False
        }
        response = requests.post(f"{BASE_URL}/api/cart/add", json=cart_item, headers=headers)
        assert response.status_code == 200
        print("SUCCESS: Added item to cart")
    
    def test_submit_rfq(self, auth_token):
        """Test RFQ submission"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        rfq_data = {
            "product_description": "Test RFQ for iteration 9 testing",
            "quantity": 5,
            "brand_name": "TestBrand",
            "oem_part_number": "TEST-123",
            "needed_by": "2026-02-01",
            "delivery_location": "New York, USA",
            "supplier_name": "",
            "supplier_email": "",
            "request_type": "actual",
            "is_product": True
        }
        response = requests.post(f"{BASE_URL}/api/rfq/submit", json=rfq_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: RFQ submitted - {data['message']}")


class TestPunchoutSystems:
    """Test punchout systems endpoint"""
    
    def test_get_punchout_systems(self):
        """Test getting punchout systems list"""
        response = requests.get(f"{BASE_URL}/api/punchout/systems")
        assert response.status_code == 200
        data = response.json()
        assert "systems" in data
        assert len(data["systems"]) > 0
        
        system_names = [s["name"] for s in data["systems"]]
        print(f"SUCCESS: Found {len(system_names)} punchout systems: {system_names}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

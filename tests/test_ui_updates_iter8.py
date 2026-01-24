"""
Test suite for UI Updates - Iteration 8
Tests: Login page admin credentials, new vendor products (Donaldson, Avantor, Markem-Imaje)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smart-procurement-19.preview.emergentagent.com')

class TestLoginAndAuth:
    """Test login functionality with demo and admin credentials"""
    
    def test_demo_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == "demo@infosys.com"
        assert data["country"] == "USA"
        assert data["currency"]["code"] == "USD"
        print(f"SUCCESS: Demo login works - token received")
    
    def test_admin_login_success(self):
        """Test login with admin credentials (admin / admin123)
        Note: Login page shows admin@omnisupply.io but backend expects 'admin'
        """
        # Admin login uses 'username' field - backend expects 'admin' not 'admin@omnisupply.io'
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        # Admin login should work
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "success" in data
        print(f"SUCCESS: Admin login endpoint works")


class TestNewVendorProducts:
    """Test new vendor products - Donaldson, Avantor, Markem-Imaje"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_donaldson_products_search(self):
        """Test searching for Donaldson filtration products"""
        response = requests.get(
            f"{BASE_URL}/api/products/search",
            params={"q": "Donaldson", "limit": 10},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        results = data.get("results", [])
        
        # Should find Donaldson products
        donaldson_products = [p for p in results if p.get("brand") == "Donaldson"]
        assert len(donaldson_products) >= 4, f"Expected at least 4 Donaldson products, found {len(donaldson_products)}"
        
        # Check for specific products
        product_names = [p["name"] for p in donaldson_products]
        assert any("PowerCore" in name for name in product_names), "PowerCore Air Filter not found"
        assert any("Hydraulic" in name for name in product_names), "Hydraulic Filter not found"
        
        # Check category is Filtration
        filtration_products = [p for p in donaldson_products if p.get("category") == "Filtration"]
        assert len(filtration_products) >= 3, "Donaldson products should be in Filtration category"
        
        # Check images are from Emergent CDN
        for product in donaldson_products:
            if product.get("image_url"):
                assert "emergentagent.com" in product["image_url"], f"Image not from CDN: {product['image_url']}"
        
        print(f"SUCCESS: Found {len(donaldson_products)} Donaldson products with correct images")
    
    def test_avantor_products_search(self):
        """Test searching for Avantor laboratory products"""
        response = requests.get(
            f"{BASE_URL}/api/products/search",
            params={"q": "Avantor", "limit": 10},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        results = data.get("results", [])
        
        # Should find Avantor products
        avantor_products = [p for p in results if p.get("brand") == "Avantor"]
        assert len(avantor_products) >= 4, f"Expected at least 4 Avantor products, found {len(avantor_products)}"
        
        # Check for specific products
        product_names = [p["name"] for p in avantor_products]
        assert any("Reagent" in name or "J.T.Baker" in name for name in product_names), "Reagent Chemicals Kit not found"
        assert any("Glassware" in name for name in product_names), "Glassware Set not found"
        
        # Check category is Laboratory Supplies
        lab_products = [p for p in avantor_products if p.get("category") == "Laboratory Supplies"]
        assert len(lab_products) >= 3, "Avantor products should be in Laboratory Supplies category"
        
        # Check images are from Emergent CDN
        for product in avantor_products:
            if product.get("image_url"):
                assert "emergentagent.com" in product["image_url"], f"Image not from CDN: {product['image_url']}"
        
        print(f"SUCCESS: Found {len(avantor_products)} Avantor products with correct images")
    
    def test_markem_products_search(self):
        """Test searching for Markem-Imaje industrial coding products"""
        response = requests.get(
            f"{BASE_URL}/api/products/search",
            params={"q": "Markem", "limit": 10},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        results = data.get("results", [])
        
        # Should find Markem-Imaje products
        markem_products = [p for p in results if p.get("brand") == "Markem-Imaje"]
        assert len(markem_products) >= 4, f"Expected at least 4 Markem-Imaje products, found {len(markem_products)}"
        
        # Check for specific products
        product_names = [p["name"] for p in markem_products]
        assert any("Inkjet" in name for name in product_names), "Inkjet Printer not found"
        assert any("Laser" in name for name in product_names), "Laser Coder not found"
        
        # Check category is Industrial Coding
        coding_products = [p for p in markem_products if p.get("category") == "Industrial Coding"]
        assert len(coding_products) >= 3, "Markem-Imaje products should be in Industrial Coding category"
        
        # Check images are from Emergent CDN
        for product in markem_products:
            if product.get("image_url"):
                assert "emergentagent.com" in product["image_url"], f"Image not from CDN: {product['image_url']}"
        
        print(f"SUCCESS: Found {len(markem_products)} Markem-Imaje products with correct images")
    
    def test_new_categories_exist(self):
        """Test that Filtration and Industrial Coding categories exist"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        categories = data.get("categories", [])
        
        category_names = [c["name"] for c in categories]
        assert "Filtration" in category_names, "Filtration category not found"
        assert "Industrial Coding" in category_names, "Industrial Coding category not found"
        
        print(f"SUCCESS: Filtration and Industrial Coding categories exist")
    
    def test_new_brands_exist(self):
        """Test that Donaldson, Avantor, Markem-Imaje brands exist"""
        response = requests.get(f"{BASE_URL}/api/products/brands")
        assert response.status_code == 200
        data = response.json()
        brands = data.get("brands", [])
        
        brand_names = [b["name"] for b in brands]
        assert "Donaldson" in brand_names, "Donaldson brand not found"
        assert "Avantor" in brand_names, "Avantor brand not found"
        assert "Markem-Imaje" in brand_names, "Markem-Imaje brand not found"
        
        print(f"SUCCESS: All new brands exist (Donaldson, Avantor, Markem-Imaje)")


class TestCartFunctionality:
    """Test cart add/remove functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_add_to_cart(self):
        """Test adding a product to cart"""
        # First get a product
        response = requests.get(
            f"{BASE_URL}/api/products/search",
            params={"q": "HP", "limit": 1},
            headers=self.headers
        )
        assert response.status_code == 200
        products = response.json().get("results", [])
        assert len(products) > 0, "No products found"
        
        product = products[0]
        
        # Add to cart
        cart_item = {
            "product_id": product["id"],
            "product_name": product["name"],
            "brand": product.get("brand", ""),
            "sku": product.get("sku", ""),
            "unspsc_code": product.get("unspsc_code", ""),
            "category": product.get("category", ""),
            "quantity": 1,
            "unit_price": product.get("price", 0),
            "total_price": product.get("price", 0),
            "currency_code": product.get("currency_code", "USD"),
            "image_url": product.get("image_url"),
            "is_service": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json=cart_item,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data or "id" in data
        print(f"SUCCESS: Added product to cart")
    
    def test_get_cart(self):
        """Test getting cart contents"""
        response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"SUCCESS: Cart retrieved with {len(data['items'])} items")


class TestRFQSubmission:
    """Test RFQ submission functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_submit_rfq(self):
        """Test submitting an RFQ"""
        rfq_data = {
            "product_description": "Test RFQ for custom industrial equipment",
            "quantity": 10,
            "brand_name": "Custom",
            "oem_part_number": "TEST-001",
            "needed_by": "2025-02-01",
            "delivery_location": "New York, USA",
            "supplier_name": "",
            "supplier_email": "",
            "request_type": "actual",
            "is_product": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/rfq/submit",
            json=rfq_data,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data or "rfq_id" in data
        print(f"SUCCESS: RFQ submitted successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Test Suite for Iteration 10 - OMNISupply.io
Features to test:
1. Engage Infosys Tactical Buyers button on Upload Quotation page
2. Backend endpoint /api/procurement/quotation/{id}/engage-tactical-buyers
3. Add to Cart on Catalog page opens PunchOut modal directly
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smart-procurement-19.preview.emergentagent.com').rstrip('/')

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_demo_login(self):
        """Test demo user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data.get("email") == "demo@infosys.com", "Email not in response"
        print(f"Login successful for {data.get('email')}")


class TestQuotationUpload:
    """Test quotation upload and analysis endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_quotation_upload_and_analysis(self, auth_token):
        """Test uploading a quotation file and getting analysis"""
        # Create a simple test file
        test_file_content = b"Test quotation file content for testing purposes"
        files = {
            'file': ('test_quotation.pdf', test_file_content, 'application/pdf')
        }
        data = {
            'supplier_name': 'Test Supplier',
            'supplier_email': 'supplier@test.com',
            'document_language': 'en',
            'notes': 'Test upload'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/procurement/quotation/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        assert result.get("success") == True, "Upload not successful"
        assert "quotation_id" in result, "quotation_id not in response"
        assert "analysis" in result, "analysis not in response"
        
        # Verify analysis structure
        analysis = result["analysis"]
        assert "extracted_data" in analysis, "extracted_data not in analysis"
        assert "price_benchmark" in analysis, "price_benchmark not in analysis"
        
        return result["quotation_id"]
    
    def test_engage_tactical_buyers_endpoint(self, auth_token):
        """Test the engage tactical buyers endpoint"""
        # First upload a quotation
        test_file_content = b"Test quotation for tactical buyers"
        files = {
            'file': ('test_quotation.pdf', test_file_content, 'application/pdf')
        }
        data = {
            'supplier_name': 'Test Supplier',
            'supplier_email': 'supplier@test.com',
            'document_language': 'en',
            'notes': 'Test for tactical buyers'
        }
        
        upload_response = requests.post(
            f"{BASE_URL}/api/procurement/quotation/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        quotation_id = upload_response.json().get("quotation_id")
        assert quotation_id, "No quotation_id returned"
        
        # Now test engage tactical buyers endpoint
        engage_response = requests.post(
            f"{BASE_URL}/api/procurement/quotation/{quotation_id}/engage-tactical-buyers",
            json={},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert engage_response.status_code == 200, f"Engage tactical buyers failed: {engage_response.text}"
        result = engage_response.json()
        assert result.get("success") == True, "Engage tactical buyers not successful"
        assert "request_id" in result, "request_id not in response"
        assert "message" in result, "message not in response"
        assert "Infosys" in result.get("message", ""), "Message should mention Infosys"
        
        print(f"Engage tactical buyers successful: {result}")
        return result
    
    def test_engage_tactical_buyers_invalid_quotation(self, auth_token):
        """Test engage tactical buyers with invalid quotation ID"""
        response = requests.post(
            f"{BASE_URL}/api/procurement/quotation/invalid-quotation-id/engage-tactical-buyers",
            json={},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_engage_tactical_buyers_no_auth(self):
        """Test engage tactical buyers without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/procurement/quotation/some-id/engage-tactical-buyers",
            json={}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestCatalogAndCart:
    """Test catalog and cart functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_product_search(self, auth_token):
        """Test product search endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/search", params={
            "q": "",
            "limit": 10
        }, headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "results" in data, "results not in response"
        assert len(data["results"]) > 0, "No products returned"
        
        # Verify product structure
        product = data["results"][0]
        assert "id" in product, "id not in product"
        assert "name" in product, "name not in product"
        print(f"Found {len(data['results'])} products")
    
    def test_add_to_cart(self, auth_token):
        """Test adding item to cart"""
        # First get a product
        search_response = requests.get(f"{BASE_URL}/api/products/search", params={
            "q": "",
            "limit": 1
        }, headers={"Authorization": f"Bearer {auth_token}"})
        
        assert search_response.status_code == 200
        products = search_response.json().get("results", [])
        assert len(products) > 0, "No products to add to cart"
        
        product = products[0]
        
        # Add to cart
        cart_item = {
            "product_id": product["id"],
            "product_name": product["name"],
            "brand": product.get("brand", "Test Brand"),
            "sku": product.get("sku", "TEST-SKU"),
            "unspsc_code": product.get("unspsc_code", "00000000"),
            "category": product.get("category", "Test Category"),
            "quantity": 1,
            "unit_price": product.get("price", 100),
            "total_price": product.get("price", 100),
            "currency_code": product.get("currency_code", "USD"),
            "image_url": product.get("image_url"),
            "is_service": False
        }
        
        response = requests.post(f"{BASE_URL}/api/cart/add", json=cart_item, 
                                headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200, f"Add to cart failed: {response.text}"
        data = response.json()
        assert "item_id" in data or "message" in data, "Add to cart response invalid"
        print(f"Added {product['name'][:30]}... to cart")
    
    def test_get_cart(self, auth_token):
        """Test getting cart contents"""
        response = requests.get(f"{BASE_URL}/api/cart", 
                               headers={"Authorization": f"Bearer {auth_token}"})
        
        assert response.status_code == 200, f"Get cart failed: {response.text}"
        data = response.json()
        assert "items" in data, "items not in response"
        print(f"Cart has {len(data['items'])} items")
    
    def test_punchout_systems(self):
        """Test getting punchout systems list"""
        response = requests.get(f"{BASE_URL}/api/punchout/systems")
        
        assert response.status_code == 200, f"Get punchout systems failed: {response.text}"
        data = response.json()
        assert "systems" in data, "systems not in response"
        
        # Verify expected systems
        systems = data["systems"]
        system_names = [s["name"] for s in systems]
        expected_systems = ["Coupa", "SAP Ariba", "SAP ERP", "Ivalua", "Oracle"]
        
        for expected in expected_systems:
            assert expected in system_names, f"{expected} not in punchout systems"
        
        return data
    
    def test_cart_transfer(self):
        """Test cart transfer to punchout system"""
        # First add an item to cart
        search_response = requests.get(f"{BASE_URL}/api/products/search", params={
            "q": "",
            "limit": 1
        })
        
        products = search_response.json().get("results", [])
        if products:
            product = products[0]
            cart_item = {
                "product_id": product["id"],
                "product_name": product["name"],
                "brand": product.get("brand", "Test Brand"),
                "sku": product.get("sku", "TEST-SKU"),
                "unspsc_code": product.get("unspsc_code", "00000000"),
                "category": product.get("category", "Test Category"),
                "quantity": 1,
                "unit_price": product.get("price", 100),
                "total_price": product.get("price", 100),
                "currency_code": product.get("currency_code", "USD"),
                "is_service": False
            }
            requests.post(f"{BASE_URL}/api/cart/add", json=cart_item)
        
        # Get cart items
        cart_response = requests.get(f"{BASE_URL}/api/cart")
        cart_items = cart_response.json().get("items", [])
        
        if not cart_items:
            pytest.skip("No items in cart to transfer")
        
        # Transfer cart
        transfer_response = requests.post(f"{BASE_URL}/api/cart/transfer", json={
            "system": "Coupa",
            "cart_items": [item["id"] for item in cart_items]
        })
        
        assert transfer_response.status_code == 200, f"Cart transfer failed: {transfer_response.text}"
        data = transfer_response.json()
        assert data.get("success") == True, "Cart transfer not successful"
        
        return data


class TestQuotationAddToCart:
    """Test quotation add to cart functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_quotation_add_to_cart(self, auth_token):
        """Test adding quotation items to cart"""
        # First upload a quotation
        test_file_content = b"Test quotation for add to cart"
        files = {
            'file': ('test_quotation.pdf', test_file_content, 'application/pdf')
        }
        data = {
            'supplier_name': 'Test Supplier',
            'supplier_email': 'supplier@test.com',
            'document_language': 'en',
            'notes': 'Test for add to cart'
        }
        
        upload_response = requests.post(
            f"{BASE_URL}/api/procurement/quotation/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        quotation_id = upload_response.json().get("quotation_id")
        
        # Add quotation items to cart
        add_to_cart_response = requests.post(
            f"{BASE_URL}/api/procurement/quotation/{quotation_id}/add-to-cart",
            json={},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert add_to_cart_response.status_code == 200, f"Add to cart failed: {add_to_cart_response.text}"
        result = add_to_cart_response.json()
        assert "items_added" in result, "items_added not in response"
        
        print(f"Added {result.get('items_added')} items to cart")
        return result


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

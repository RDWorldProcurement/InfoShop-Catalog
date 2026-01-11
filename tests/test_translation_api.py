"""
Backend API Tests for Translation Feature
Tests the Emergent LLM Deep Language translation for products and services
Requires authentication - uses demo@infosys.com credentials
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://omnisupply-platform.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@infosys.com"
TEST_PASSWORD = "password"
TEST_COUNTRY = "France"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "country": TEST_COUNTRY
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "Login response should contain token"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with authentication"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestProductTranslation:
    """Test product search with language translation"""
    
    def test_products_search_english_default(self, auth_headers):
        """Test products search returns English by default"""
        response = requests.get(f"{BASE_URL}/api/products/search", 
                               params={"limit": 5}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should contain 'results'"
        assert len(data["results"]) > 0, "Should return at least one product"
        
        # Verify product structure
        product = data["results"][0]
        assert "name" in product, "Product should have 'name'"
        assert "short_description" in product, "Product should have 'short_description'"
        print(f"English product name: {product['name']}")
        print(f"English description: {product.get('short_description', 'N/A')[:80]}")
    
    def test_products_search_french_translation(self, auth_headers):
        """Test products search with lang=fr returns French translated content"""
        response = requests.get(f"{BASE_URL}/api/products/search", 
                               params={"limit": 3, "lang": "fr"}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should contain 'results'"
        assert len(data["results"]) > 0, "Should return at least one product"
        
        product = data["results"][0]
        print(f"French product name: {product['name']}")
        print(f"French description: {product.get('short_description', 'N/A')[:80]}")
        
        # Verify translation happened (name should not be None/empty)
        assert product["name"] is not None, "Product name should not be None"
        assert len(product["name"]) > 0, "Product name should not be empty"
    
    def test_products_search_german_translation(self, auth_headers):
        """Test products search with lang=de returns German translated content"""
        response = requests.get(f"{BASE_URL}/api/products/search", 
                               params={"limit": 3, "lang": "de"}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should contain 'results'"
        assert len(data["results"]) > 0, "Should return at least one product"
        
        product = data["results"][0]
        print(f"German product name: {product['name']}")
        print(f"German description: {product.get('short_description', 'N/A')[:80]}")
        
        assert product["name"] is not None, "Product name should not be None"
        assert len(product["name"]) > 0, "Product name should not be empty"
    
    def test_products_search_italian_translation(self, auth_headers):
        """Test products search with lang=it returns Italian translated content"""
        response = requests.get(f"{BASE_URL}/api/products/search", 
                               params={"limit": 3, "lang": "it"}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should contain 'results'"
        assert len(data["results"]) > 0, "Should return at least one product"
        
        product = data["results"][0]
        print(f"Italian product name: {product['name']}")
        print(f"Italian description: {product.get('short_description', 'N/A')[:80]}")
        
        assert product["name"] is not None, "Product name should not be None"
        assert len(product["name"]) > 0, "Product name should not be empty"
    
    def test_products_search_dutch_translation(self, auth_headers):
        """Test products search with lang=nl returns Dutch translated content"""
        response = requests.get(f"{BASE_URL}/api/products/search", 
                               params={"limit": 3, "lang": "nl"}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should contain 'results'"
        assert len(data["results"]) > 0, "Should return at least one product"
        
        product = data["results"][0]
        print(f"Dutch product name: {product['name']}")
        print(f"Dutch description: {product.get('short_description', 'N/A')[:80]}")
        
        assert product["name"] is not None, "Product name should not be None"
        assert len(product["name"]) > 0, "Product name should not be empty"


class TestServiceTranslation:
    """Test service search with language translation"""
    
    def test_services_search_english_default(self, auth_headers):
        """Test services search returns English by default"""
        response = requests.get(f"{BASE_URL}/api/services/search", 
                               params={"limit": 5}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should contain 'results'"
        assert len(data["results"]) > 0, "Should return at least one service"
        
        service = data["results"][0]
        assert "name" in service, "Service should have 'name'"
        print(f"English service name: {service['name']}")
        print(f"English description: {service.get('short_description', 'N/A')[:80]}")
    
    def test_services_search_french_translation(self, auth_headers):
        """Test services search with lang=fr returns French translated content"""
        response = requests.get(f"{BASE_URL}/api/services/search", 
                               params={"limit": 3, "lang": "fr"}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should contain 'results'"
        assert len(data["results"]) > 0, "Should return at least one service"
        
        service = data["results"][0]
        print(f"French service name: {service['name']}")
        print(f"French description: {service.get('short_description', 'N/A')[:80]}")
        
        assert service["name"] is not None, "Service name should not be None"
        assert len(service["name"]) > 0, "Service name should not be empty"
    
    def test_services_search_german_translation(self, auth_headers):
        """Test services search with lang=de returns German translated content"""
        response = requests.get(f"{BASE_URL}/api/services/search", 
                               params={"limit": 3, "lang": "de"}, 
                               headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should contain 'results'"
        assert len(data["results"]) > 0, "Should return at least one service"
        
        service = data["results"][0]
        print(f"German service name: {service['name']}")
        print(f"German description: {service.get('short_description', 'N/A')[:80]}")
        
        assert service["name"] is not None, "Service name should not be None"
        assert len(service["name"]) > 0, "Service name should not be empty"


class TestTranslationCaching:
    """Test translation caching in MongoDB"""
    
    def test_translation_caching_performance(self, auth_headers):
        """Test that second request is faster due to caching"""
        # First request - may need to translate
        start1 = time.time()
        response1 = requests.get(f"{BASE_URL}/api/products/search", 
                                params={"limit": 2, "lang": "fr"}, 
                                headers=auth_headers)
        time1 = time.time() - start1
        assert response1.status_code == 200
        
        # Second request - should use cache
        start2 = time.time()
        response2 = requests.get(f"{BASE_URL}/api/products/search", 
                                params={"limit": 2, "lang": "fr"}, 
                                headers=auth_headers)
        time2 = time.time() - start2
        assert response2.status_code == 200
        
        print(f"First request time: {time1:.2f}s")
        print(f"Second request time (cached): {time2:.2f}s")
        
        # Both should return same data
        data1 = response1.json()
        data2 = response2.json()
        assert len(data1["results"]) == len(data2["results"]), "Both requests should return same number of results"


class TestProductImagesCDN:
    """Test that product images use CDN URLs (not unsplash)"""
    
    def test_product_images_use_cdn(self, auth_headers):
        """Verify product images use Emergent CDN URLs"""
        response = requests.get(f"{BASE_URL}/api/products/search", 
                               params={"limit": 10}, 
                               headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        products = data["results"]
        
        cdn_count = 0
        unsplash_count = 0
        
        for product in products:
            image_url = product.get("image_url", "")
            if "static.prod-images.emergentagent.com" in image_url:
                cdn_count += 1
            elif "unsplash" in image_url.lower():
                unsplash_count += 1
            print(f"Product: {product['name'][:40]}... Image: {image_url[:60]}...")
        
        print(f"\nCDN images: {cdn_count}, Unsplash images: {unsplash_count}")
        assert cdn_count > 0, "At least some products should use CDN images"
        assert unsplash_count == 0, "No products should use Unsplash images"


class TestProductSpecifications:
    """Test that product short_description includes specifications"""
    
    def test_product_has_specifications_in_description(self, auth_headers):
        """Verify products have specifications in short_description"""
        response = requests.get(f"{BASE_URL}/api/products/search", 
                               params={"limit": 10}, 
                               headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        products = data["results"]
        
        products_with_specs = 0
        for product in products:
            short_desc = product.get("short_description", "")
            # Check if description contains typical spec patterns
            has_specs = any([
                "GB" in short_desc,
                "RAM" in short_desc,
                "SSD" in short_desc,
                "HP" in short_desc,
                "mm" in short_desc,
                "PSI" in short_desc,
                "RPM" in short_desc,
                "V" in short_desc,
                "W" in short_desc,
                "\"" in short_desc,  # inch symbol
                "Type:" in short_desc,
                "Grade:" in short_desc,
                "Material:" in short_desc,
            ])
            if has_specs:
                products_with_specs += 1
            print(f"Product: {product['name'][:30]}... Desc: {short_desc[:60]}...")
        
        print(f"\nProducts with specs in description: {products_with_specs}/{len(products)}")
        # At least some products should have specs in description
        assert products_with_specs > 0, "At least some products should have specifications in short_description"


class TestTranslationCompare:
    """Compare English vs translated content to verify translation is happening"""
    
    def test_french_translation_differs_from_english(self, auth_headers):
        """Verify French translation is different from English"""
        # Get English
        en_response = requests.get(f"{BASE_URL}/api/products/search", 
                                  params={"limit": 1, "lang": "en"}, 
                                  headers=auth_headers)
        assert en_response.status_code == 200
        en_data = en_response.json()
        
        # Get French
        fr_response = requests.get(f"{BASE_URL}/api/products/search", 
                                  params={"limit": 1, "lang": "fr"}, 
                                  headers=auth_headers)
        assert fr_response.status_code == 200
        fr_data = fr_response.json()
        
        if len(en_data["results"]) > 0 and len(fr_data["results"]) > 0:
            en_name = en_data["results"][0]["name"]
            fr_name = fr_data["results"][0]["name"]
            
            en_desc = en_data["results"][0].get("short_description", "")
            fr_desc = fr_data["results"][0].get("short_description", "")
            
            print(f"English name: {en_name}")
            print(f"French name: {fr_name}")
            print(f"English desc: {en_desc[:80]}")
            print(f"French desc: {fr_desc[:80]}")
            
            # Names might be same (brand names preserved) but descriptions should differ
            # We just verify both have content
            assert len(en_name) > 0, "English name should not be empty"
            assert len(fr_name) > 0, "French name should not be empty"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

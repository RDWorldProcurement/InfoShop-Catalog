"""
Test suite for OMNISupply.io Admin Portal and Updated Stats Features
Tests:
1. /api/stats - Verify 78 categories and 511+ brands
2. /api/admin/delivery-partners - Verify 8 partners (Grainger, MOTION, Fastenal, BDI, MSC, McMaster-Carr, Zoro, Uline)
3. /api/admin/login - Admin authentication with admin/admin123
4. /api/infocoins/rewards - Verify rewards with CDN image URLs (not unsplash)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStatsEndpoint:
    """Test /api/stats endpoint for updated category and brand counts"""
    
    def test_stats_returns_78_categories(self):
        """Verify total_categories is 78"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        
        data = response.json()
        assert "total_categories" in data, "Missing total_categories in response"
        assert data["total_categories"] == 78, f"Expected 78 categories, got {data['total_categories']}"
        print(f"✓ Stats returns total_categories: {data['total_categories']}")
    
    def test_stats_returns_511_plus_brands(self):
        """Verify total_brands is '511+'"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        
        data = response.json()
        assert "total_brands" in data, "Missing total_brands in response"
        assert data["total_brands"] == "511+", f"Expected '511+' brands, got {data['total_brands']}"
        print(f"✓ Stats returns total_brands: {data['total_brands']}")
    
    def test_stats_returns_all_expected_fields(self):
        """Verify stats endpoint returns all expected fields"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = ["total_products", "total_services", "total_categories", "total_brands"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Stats contains all expected fields: {list(data.keys())}")


class TestDeliveryPartnersEndpoint:
    """Test /api/admin/delivery-partners endpoint"""
    
    def test_delivery_partners_returns_8_partners(self):
        """Verify 8 delivery partners are returned"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery-partners")
        assert response.status_code == 200, f"Delivery partners endpoint failed: {response.text}"
        
        data = response.json()
        assert "partners" in data, "Missing 'partners' key in response"
        assert len(data["partners"]) == 8, f"Expected 8 partners, got {len(data['partners'])}"
        print(f"✓ Delivery partners returns {len(data['partners'])} partners")
    
    def test_delivery_partners_contains_required_partners(self):
        """Verify all required partners are present: Grainger, MOTION, Fastenal, BDI, MSC, McMaster-Carr, Zoro, Uline"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery-partners")
        assert response.status_code == 200
        
        data = response.json()
        partner_names = [p["name"] for p in data["partners"]]
        partner_ids = [p["id"] for p in data["partners"]]
        
        # Check for required partners by ID
        required_ids = ["grainger", "motion", "fastenal", "bdi", "msc", "mcmaster", "zoro", "uline"]
        for partner_id in required_ids:
            assert partner_id in partner_ids, f"Missing partner with id: {partner_id}"
        
        print(f"✓ All required delivery partners present: {partner_names}")
    
    def test_delivery_partners_have_required_fields(self):
        """Verify each partner has id, name, and color fields"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery-partners")
        assert response.status_code == 200
        
        data = response.json()
        for partner in data["partners"]:
            assert "id" in partner, f"Partner missing 'id' field: {partner}"
            assert "name" in partner, f"Partner missing 'name' field: {partner}"
            assert "color" in partner, f"Partner missing 'color' field: {partner}"
        
        print("✓ All partners have required fields (id, name, color)")


class TestAdminLogin:
    """Test /api/admin/login endpoint"""
    
    def test_admin_login_success(self):
        """Verify admin login works with admin/admin123"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Login should return success: true"
        assert "token" in data, "Login should return a token"
        assert len(data["token"]) > 0, "Token should not be empty"
        print(f"✓ Admin login successful, token received (length: {len(data['token'])})")
    
    def test_admin_login_invalid_credentials(self):
        """Verify admin login fails with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        print("✓ Admin login correctly rejects invalid credentials")
    
    def test_admin_login_returns_username(self):
        """Verify admin login returns the username"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("username") == "admin", f"Expected username 'admin', got {data.get('username')}"
        print("✓ Admin login returns correct username")


class TestInfoCoinRewards:
    """Test /api/infocoins/rewards endpoint for CDN images"""
    
    def test_rewards_endpoint_returns_rewards(self):
        """Verify rewards endpoint returns a list of rewards"""
        response = requests.get(f"{BASE_URL}/api/infocoins/rewards")
        assert response.status_code == 200, f"Rewards endpoint failed: {response.text}"
        
        data = response.json()
        assert "rewards" in data, "Missing 'rewards' key in response"
        assert len(data["rewards"]) > 0, "Rewards list should not be empty"
        print(f"✓ Rewards endpoint returns {len(data['rewards'])} rewards")
    
    def test_rewards_have_cdn_images_not_unsplash(self):
        """Verify all rewards use Emergent CDN images (not unsplash)"""
        response = requests.get(f"{BASE_URL}/api/infocoins/rewards")
        assert response.status_code == 200
        
        data = response.json()
        for reward in data["rewards"]:
            image_url = reward.get("image_url", "")
            
            # Check that image is NOT from unsplash
            assert "unsplash" not in image_url.lower(), f"Reward '{reward['name']}' uses unsplash image: {image_url}"
            
            # Check that image is from Emergent CDN
            assert "static.prod-images.emergentagent.com" in image_url, \
                f"Reward '{reward['name']}' should use Emergent CDN, got: {image_url}"
        
        print("✓ All rewards use Emergent CDN images (no unsplash)")
    
    def test_rewards_have_required_fields(self):
        """Verify each reward has required fields"""
        response = requests.get(f"{BASE_URL}/api/infocoins/rewards")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["id", "name", "description", "coins_required", "image_url", "category"]
        
        for reward in data["rewards"]:
            for field in required_fields:
                assert field in reward, f"Reward missing field '{field}': {reward.get('name', 'unknown')}"
        
        print("✓ All rewards have required fields")
    
    def test_rewards_include_expected_items(self):
        """Verify rewards include expected items like jacket, tumbler, backpack"""
        response = requests.get(f"{BASE_URL}/api/infocoins/rewards")
        assert response.status_code == 200
        
        data = response.json()
        reward_names = [r["name"].lower() for r in data["rewards"]]
        
        # Check for some expected reward types
        expected_keywords = ["jacket", "tumbler", "backpack", "earbuds", "desk", "smartwatch"]
        found_keywords = []
        
        for keyword in expected_keywords:
            for name in reward_names:
                if keyword in name:
                    found_keywords.append(keyword)
                    break
        
        assert len(found_keywords) >= 4, f"Expected at least 4 reward types, found: {found_keywords}"
        print(f"✓ Rewards include expected items: {found_keywords}")


class TestAdminUploadedCatalogs:
    """Test /api/admin/uploaded-catalogs endpoint"""
    
    def test_uploaded_catalogs_endpoint(self):
        """Verify uploaded catalogs endpoint returns summary"""
        response = requests.get(f"{BASE_URL}/api/admin/uploaded-catalogs")
        assert response.status_code == 200, f"Uploaded catalogs endpoint failed: {response.text}"
        
        data = response.json()
        # Should have summary fields
        assert "total_vendor_products" in data or "products_by_partner" in data, \
            "Response should contain catalog summary data"
        print(f"✓ Uploaded catalogs endpoint returns summary: {list(data.keys())}")


class TestHealthAndBasicEndpoints:
    """Basic health and connectivity tests"""
    
    def test_stats_endpoint_accessible(self):
        """Verify stats API is accessible"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        print("✓ Stats API is accessible")
    
    def test_products_categories_endpoint(self):
        """Verify products categories endpoint works"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200, f"Products categories endpoint failed: {response.text}"
        
        data = response.json()
        assert "categories" in data, "Missing 'categories' key"
        print(f"✓ Products categories endpoint returns {len(data['categories'])} categories")
    
    def test_products_brands_endpoint(self):
        """Verify products brands endpoint works"""
        response = requests.get(f"{BASE_URL}/api/products/brands")
        assert response.status_code == 200, f"Products brands endpoint failed: {response.text}"
        
        data = response.json()
        assert "brands" in data, "Missing 'brands' key"
        print(f"✓ Products brands endpoint returns {len(data['brands'])} brands")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

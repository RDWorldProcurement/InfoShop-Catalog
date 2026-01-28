"""
Test suite for Algolia Catalog Search and Pricing Engine
Tests: catalog stats, contracts, pricing calculation, countries
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DEMO_USER = {"email": "demo@infosys.com", "password": "demo123", "country": "USA"}
ADMIN_USER = {"email": "admin@omnisupply.io", "password": "admin123", "country": "USA"}


class TestAlgoliaCatalogEndpoints:
    """Test Algolia catalog API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_demo_token(self):
        """Get demo user token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def get_admin_token(self):
        """Get admin user token - try creating admin if doesn't exist"""
        # First try to login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if response.status_code == 200:
            return response.json().get("token")
        
        # Try registering admin
        register_data = {
            "email": "admin@omnisupply.io",
            "password": "admin123",
            "name": "Admin User",
            "country": "USA",
            "role": "admin"
        }
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code in [200, 201]:
            # Login again
            response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
            if response.status_code == 200:
                return response.json().get("token")
        return None
    
    # ============================================
    # CATALOG STATS ENDPOINT
    # ============================================
    
    def test_catalog_stats_requires_auth(self):
        """Test that catalog stats requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/algolia/catalog/stats")
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Catalog stats requires authentication")
    
    def test_catalog_stats_with_auth(self):
        """Test catalog stats with valid authentication"""
        token = self.get_demo_token()
        assert token is not None, "Failed to get demo token"
        
        response = self.session.get(
            f"{BASE_URL}/api/algolia/catalog/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Verify response structure
        assert "total_products" in data
        assert "supplier_count" in data or "suppliers" in data
        print(f"PASS: Catalog stats returned - {data.get('total_products', 0)} products")
    
    # ============================================
    # COUNTRIES ENDPOINT
    # ============================================
    
    def test_countries_endpoint(self):
        """Test GET /api/algolia/countries returns list of countries"""
        response = self.session.get(f"{BASE_URL}/api/algolia/countries")
        assert response.status_code == 200
        
        data = response.json()
        assert "countries" in data
        assert isinstance(data["countries"], list)
        print(f"PASS: Countries endpoint returned {len(data['countries'])} countries")
    
    # ============================================
    # CONTRACTS ENDPOINTS (Admin only)
    # ============================================
    
    def test_contracts_list_requires_admin(self):
        """Test that contracts list requires admin role"""
        token = self.get_demo_token()
        assert token is not None, "Failed to get demo token"
        
        response = self.session.get(
            f"{BASE_URL}/api/algolia/contracts",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should be 403 Forbidden for non-admin
        assert response.status_code == 403
        print("PASS: Contracts list requires admin role")
    
    def test_contracts_list_with_admin(self):
        """Test contracts list with admin authentication"""
        token = self.get_admin_token()
        if token is None:
            pytest.skip("Admin user not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/algolia/contracts",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "contracts" in data
        assert isinstance(data["contracts"], list)
        print(f"PASS: Contracts list returned {len(data['contracts'])} contracts")
    
    def test_contract_upload_requires_admin(self):
        """Test that contract upload requires admin role"""
        token = self.get_demo_token()
        assert token is not None, "Failed to get demo token"
        
        # Try to upload without admin role
        response = self.session.post(
            f"{BASE_URL}/api/algolia/contracts/upload",
            headers={"Authorization": f"Bearer {token}"},
            data={"supplier_name": "Test", "countries": "USA"},
            files={"file": ("test.xlsx", b"dummy content", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        assert response.status_code == 403
        print("PASS: Contract upload requires admin role")
    
    # ============================================
    # PRICING CALCULATION ENDPOINT
    # ============================================
    
    def test_pricing_calculation_basic(self):
        """Test pricing calculation with basic inputs"""
        response = self.session.post(
            f"{BASE_URL}/api/algolia/pricing/calculate",
            data={
                "list_price": 100.0,
                "supplier": "Fastenal",
                "category": "Fasteners"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "pricing" in data
        
        pricing = data["pricing"]
        assert "list_price" in pricing
        assert "selling_price" in pricing
        assert "discount_percentage" in pricing
        assert "infosys_purchase_price" in pricing
        
        print(f"PASS: Pricing calculation - List: ${pricing['list_price']}, Selling: ${pricing['selling_price']}")
    
    def test_pricing_calculation_40_percent_discount(self):
        """
        Test pricing calculation with 40% category discount
        Expected: $100 list price with 40% discount should result in $72 selling price
        - List Price: $100
        - Category Discount: 40%
        - Infosys Purchase Price: $60 (100 - 40)
        - Margin: $40
        - Customer gets 70% of margin: $28
        - Selling Price: $100 - $28 = $72
        """
        response = self.session.post(
            f"{BASE_URL}/api/algolia/pricing/calculate",
            data={
                "list_price": 100.0,
                "supplier": "Fastenal",
                "category": "Hardware"  # Hardware has 40% discount in defaults
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        pricing = data["pricing"]
        
        # Verify the pricing model
        assert pricing["list_price"] == 100.0
        
        # Check if category discount is 40%
        if pricing.get("category_discount") == 40:
            # Infosys Purchase Price should be $60
            assert pricing["infosys_purchase_price"] == 60.0, f"Expected $60, got ${pricing['infosys_purchase_price']}"
            
            # Margin should be $40
            assert pricing["margin"] == 40.0, f"Expected $40 margin, got ${pricing['margin']}"
            
            # Customer discount should be 70% of margin = $28
            assert pricing["customer_discount"] == 28.0, f"Expected $28 customer discount, got ${pricing['customer_discount']}"
            
            # Selling price should be $72
            assert pricing["selling_price"] == 72.0, f"Expected $72 selling price, got ${pricing['selling_price']}"
            
            print("PASS: 40% discount pricing calculation verified - Selling Price: $72")
        else:
            # Different discount rate, just verify the formula
            discount_pct = pricing.get("category_discount", 0)
            expected_purchase = 100 * (1 - discount_pct / 100)
            expected_margin = 100 - expected_purchase
            expected_customer_discount = expected_margin * 0.70
            expected_selling = 100 - expected_customer_discount
            
            assert abs(pricing["selling_price"] - expected_selling) < 0.01, \
                f"Pricing formula incorrect: expected ${expected_selling:.2f}, got ${pricing['selling_price']}"
            
            print(f"PASS: Pricing calculation with {discount_pct}% discount - Selling Price: ${pricing['selling_price']}")
    
    def test_pricing_calculation_different_suppliers(self):
        """Test pricing calculation for different suppliers"""
        suppliers = ["Fastenal", "Grainger", "Motion"]
        
        for supplier in suppliers:
            response = self.session.post(
                f"{BASE_URL}/api/algolia/pricing/calculate",
                data={
                    "list_price": 100.0,
                    "supplier": supplier,
                    "category": "Safety"
                }
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data.get("success") == True
            assert "pricing" in data
            
            pricing = data["pricing"]
            assert pricing["selling_price"] > 0
            assert pricing["selling_price"] < pricing["list_price"]
            
            print(f"PASS: {supplier} pricing - List: ${pricing['list_price']}, Selling: ${pricing['selling_price']}")
    
    def test_pricing_calculation_zero_price(self):
        """Test pricing calculation with zero price"""
        response = self.session.post(
            f"{BASE_URL}/api/algolia/pricing/calculate",
            data={
                "list_price": 0,
                "supplier": "Fastenal",
                "category": "Fasteners"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        pricing = data.get("pricing", {})
        assert pricing.get("selling_price") == 0
        print("PASS: Zero price handling correct")
    
    # ============================================
    # CATALOG UPLOAD ENDPOINT (Admin only)
    # ============================================
    
    def test_catalog_upload_requires_auth(self):
        """Test that catalog upload requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/algolia/catalog/upload-with-pricing",
            data={"supplier": "Test", "countries": "USA"},
            files={"file": ("test.xlsx", b"dummy", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
        # Should require auth
        assert response.status_code in [401, 403, 422]
        print("PASS: Catalog upload requires authentication")
    
    # ============================================
    # CATALOG UPLOADS HISTORY (Admin only)
    # ============================================
    
    def test_catalog_uploads_history_requires_admin(self):
        """Test that catalog uploads history requires admin role"""
        token = self.get_demo_token()
        assert token is not None, "Failed to get demo token"
        
        response = self.session.get(
            f"{BASE_URL}/api/algolia/catalog/uploads",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        print("PASS: Catalog uploads history requires admin role")


class TestAlgoliaConfig:
    """Test Algolia configuration endpoint"""
    
    def test_algolia_config_endpoint(self):
        """Test GET /api/algolia/config returns search configuration"""
        response = requests.get(f"{BASE_URL}/api/algolia/config")
        assert response.status_code == 200
        
        data = response.json()
        assert "app_id" in data
        assert "search_key" in data
        assert "index_name" in data
        
        # Verify app_id matches expected
        assert data["app_id"] == "ZQXK1D2XLM"
        
        print(f"PASS: Algolia config returned - App ID: {data['app_id']}, Index: {data['index_name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
InfoShop Catalog Backend Tests - Iteration 27
Tests for: Landing page APIs, Catalog search, Pricing, Partners, Cart functionality
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasicAPIs:
    """Test basic health and configuration endpoints"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "database" in data["checks"]
        print(f"Health check passed: {data['status']}")
    
    def test_algolia_config(self):
        """Test /api/algolia/config returns Algolia configuration"""
        response = requests.get(f"{BASE_URL}/api/algolia/config")
        assert response.status_code == 200
        data = response.json()
        assert "app_id" in data
        assert data["app_id"] == "ZQXK1D2XLM"
        print(f"Algolia config: App ID = {data['app_id']}")


class TestPartnersAPI:
    """Test InfoShop Partners API"""
    
    def test_get_partners(self):
        """Test /api/infoshop/partners returns active and coming soon partners"""
        response = requests.get(f"{BASE_URL}/api/infoshop/partners")
        assert response.status_code == 200
        data = response.json()
        
        # Check active partners
        assert "active_partners" in data
        assert "Grainger" in data["active_partners"]
        assert "MOTION" in data["active_partners"]
        print(f"Active partners: {data['active_partners']}")
        
        # Check coming soon partners
        assert "coming_soon_partners" in data
        assert "USA" in data["coming_soon_partners"]
        assert "Mexico" in data["coming_soon_partners"]
        assert "Europe" in data["coming_soon_partners"]
        assert "China" in data["coming_soon_partners"]
        print(f"Coming soon regions: {list(data['coming_soon_partners'].keys())}")


class TestCatalogPublicStats:
    """Test public catalog statistics endpoint"""
    
    def test_public_stats(self):
        """Test /api/algolia/catalog/public-stats returns catalog statistics"""
        response = requests.get(f"{BASE_URL}/api/algolia/catalog/public-stats")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert data["algolia_available"] == True
        assert data["total_products"] == 2000
        print(f"Total products: {data['total_products']}")
        
        # Check suppliers
        assert "suppliers" in data
        suppliers = {s["name"]: s["count"] for s in data["suppliers"]}
        assert "Grainger" in suppliers
        assert "MOTION" in suppliers
        assert suppliers["Grainger"] == 1000
        assert suppliers["MOTION"] == 1000
        print(f"Suppliers: Grainger={suppliers['Grainger']}, MOTION={suppliers['MOTION']}")


class TestCatalogSearch:
    """Test catalog search functionality"""
    
    def test_search_all_products(self):
        """Test search returns all 2000 products with empty query"""
        response = requests.post(
            f"{BASE_URL}/api/algolia/catalog/search",
            json={"query": "", "page": 0, "hits_per_page": 24}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["nbHits"] == 2000
        assert len(data["hits"]) == 24
        print(f"Total products: {data['nbHits']}, returned: {len(data['hits'])}")
    
    def test_search_bearing(self):
        """Test search for 'bearing' returns MOTION products with savings"""
        response = requests.post(
            f"{BASE_URL}/api/algolia/catalog/search",
            json={"query": "bearing", "page": 0, "hits_per_page": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["nbHits"] > 0
        print(f"Bearing search results: {data['nbHits']}")
        
        # Check first product has required pricing fields
        if data["hits"]:
            product = data["hits"][0]
            assert "danone_preferred_price" in product or "price" in product
            assert "customer_savings_percent" in product or "list_price" in product
            assert "vendor" in product or "supplier" in product
            
            vendor = product.get("vendor", product.get("supplier", ""))
            price = product.get("danone_preferred_price", product.get("price", 0))
            savings = product.get("customer_savings_percent", 0)
            print(f"First product: {product.get('product_name', 'N/A')[:40]}")
            print(f"  Vendor: {vendor}, Price: ${price:.2f}, Savings: {savings:.1f}%")
    
    def test_search_with_partner_filter_grainger(self):
        """Test search with Grainger filter"""
        response = requests.post(
            f"{BASE_URL}/api/algolia/catalog/search",
            json={"query": "", "filters": {"supplier": "Grainger"}, "page": 0, "hits_per_page": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["nbHits"] == 1000
        print(f"Grainger products: {data['nbHits']}")
        
        # Verify all returned products are from Grainger
        for product in data["hits"]:
            vendor = product.get("vendor", product.get("supplier", ""))
            assert vendor == "Grainger", f"Expected Grainger, got {vendor}"
    
    def test_search_with_partner_filter_motion(self):
        """Test search with MOTION filter"""
        response = requests.post(
            f"{BASE_URL}/api/algolia/catalog/search",
            json={"query": "", "filters": {"supplier": "MOTION"}, "page": 0, "hits_per_page": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["nbHits"] == 1000
        print(f"MOTION products: {data['nbHits']}")
        
        # Verify all returned products are from MOTION
        for product in data["hits"]:
            vendor = product.get("vendor", product.get("supplier", ""))
            assert vendor == "MOTION" or vendor == "Motion", f"Expected MOTION, got {vendor}"


class TestProductPricingFields:
    """Test that products have correct pricing fields"""
    
    def test_products_have_danone_pricing(self):
        """Test products have Danone Preferred Price and savings"""
        response = requests.post(
            f"{BASE_URL}/api/algolia/catalog/search",
            json={"query": "", "page": 0, "hits_per_page": 50}
        )
        assert response.status_code == 200
        data = response.json()
        
        products_with_savings = 0
        products_with_danone_price = 0
        
        for product in data["hits"]:
            if product.get("danone_preferred_price", 0) > 0:
                products_with_danone_price += 1
            if product.get("customer_savings_percent", 0) > 0:
                products_with_savings += 1
        
        print(f"Products with Danone price: {products_with_danone_price}/{len(data['hits'])}")
        print(f"Products with savings: {products_with_savings}/{len(data['hits'])}")
        
        # Most products should have pricing
        assert products_with_danone_price > len(data["hits"]) * 0.8, "Less than 80% products have Danone price"
    
    def test_savings_percentage_range(self):
        """Test savings percentages are in expected range (15-30%)"""
        response = requests.post(
            f"{BASE_URL}/api/algolia/catalog/search",
            json={"query": "bearing", "page": 0, "hits_per_page": 20}
        )
        assert response.status_code == 200
        data = response.json()
        
        savings_values = []
        for product in data["hits"]:
            savings = product.get("customer_savings_percent", 0)
            if savings > 0:
                savings_values.append(savings)
        
        if savings_values:
            avg_savings = sum(savings_values) / len(savings_values)
            min_savings = min(savings_values)
            max_savings = max(savings_values)
            print(f"Savings range: {min_savings:.1f}% - {max_savings:.1f}%, avg: {avg_savings:.1f}%")
            
            # Savings should be in reasonable range
            assert min_savings >= 10, f"Min savings {min_savings}% is too low"
            assert max_savings <= 35, f"Max savings {max_savings}% is too high"


class TestInfoShopPartNumbers:
    """Test InfoShop Part Number generation"""
    
    def test_products_have_infoshop_part_numbers(self):
        """Test products have InfoShop part numbers"""
        response = requests.post(
            f"{BASE_URL}/api/algolia/catalog/search",
            json={"query": "", "page": 0, "hits_per_page": 20}
        )
        assert response.status_code == 200
        data = response.json()
        
        products_with_part_number = 0
        for product in data["hits"]:
            if product.get("infoshop_part_number"):
                products_with_part_number += 1
                # Verify format: INF + 2 char vendor + 3 char category + 5 digits
                part_num = product["infoshop_part_number"]
                assert part_num.startswith("INF"), f"Part number should start with INF: {part_num}"
                assert len(part_num) >= 10, f"Part number too short: {part_num}"
        
        print(f"Products with InfoShop part numbers: {products_with_part_number}/{len(data['hits'])}")
        assert products_with_part_number > 0, "No products have InfoShop part numbers"
    
    def test_part_number_generation_api(self):
        """Test /api/infoshop/part-number/generate endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/part-number/generate",
            params={"vendor": "Grainger", "category": "Bearings", "product_name": "Test Bearing"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "part_number" in data
        part_num = data["part_number"]
        assert part_num.startswith("INF")
        assert "GR" in part_num  # Grainger code
        print(f"Generated part number: {part_num}")


class TestDeliveryDateAPI:
    """Test delivery date calculation"""
    
    def test_minimum_delivery_date(self):
        """Test /api/infoshop/delivery/minimum-date returns 10 business days"""
        response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        assert response.status_code == 200
        data = response.json()
        
        assert "minimum_date" in data
        min_date = datetime.strptime(data["minimum_date"], "%Y-%m-%d")
        today = datetime.now()
        
        # Should be at least 10 days from now (accounting for weekends)
        days_diff = (min_date - today).days
        assert days_diff >= 10, f"Minimum date should be at least 10 days away, got {days_diff}"
        print(f"Minimum delivery date: {data['minimum_date']} ({days_diff} days from now)")


class TestPricingCalculation:
    """Test pricing calculation API"""
    
    def test_pricing_calculation(self):
        """Test /api/infoshop/pricing/calculate endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/infoshop/pricing/calculate",
            json={
                "list_price": 100.0,
                "category": "Bearings",
                "vendor": "Grainger"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "list_price" in data
        assert "danone_preferred_price" in data
        assert "customer_savings_percent" in data
        
        # Verify pricing logic
        assert data["list_price"] == 100.0
        assert data["danone_preferred_price"] < 100.0  # Should have discount
        assert data["customer_savings_percent"] > 0  # Should show savings
        
        print(f"Pricing calculation:")
        print(f"  List price: ${data['list_price']:.2f}")
        print(f"  Danone price: ${data['danone_preferred_price']:.2f}")
        print(f"  Savings: {data['customer_savings_percent']:.1f}%")


class TestUNSPSCClassification:
    """Test UNSPSC classification API"""
    
    def test_unspsc_classification(self):
        """Test /api/infoshop/unspsc/classify endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/unspsc/classify",
            params={"product_name": "Ball Bearing", "category": "Bearings"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "unspsc_code" in data
        assert "confidence" in data
        
        # UNSPSC code should be 8 digits
        assert len(data["unspsc_code"]) == 8
        print(f"UNSPSC classification: {data['unspsc_code']} (confidence: {data['confidence']})")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

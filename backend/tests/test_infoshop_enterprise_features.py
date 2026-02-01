"""
InfoShop Enterprise Features Test Suite
Tests for new Danone InfoShop Catalog endpoints:
- GET /api/infoshop/partners - Active and coming soon partners
- POST /api/infoshop/pricing/calculate - Danone preferred pricing with sliding margin
- GET /api/infoshop/delivery/minimum-date - 2 business week minimum delivery
- GET /api/infoshop/part-number/generate - InfoShop part number generation
- GET /api/infoshop/unspsc/classify - UNSPSC auto-classification
- POST /api/infoshop/cart/prepare-transfer - Cart transfer with shipping validation
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://omnishop-catalog.preview.emergentagent.com"


class TestInfoShopPartners:
    """Test GET /api/infoshop/partners - Active and coming soon partners"""
    
    def test_get_partners_returns_200(self):
        """Test that partners endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/infoshop/partners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_partners_has_active_partners(self):
        """Test that response includes active partners list"""
        response = requests.get(f"{BASE_URL}/api/infoshop/partners")
        data = response.json()
        
        assert "active_partners" in data, "Response missing 'active_partners' field"
        assert isinstance(data["active_partners"], list), "active_partners should be a list"
        assert len(data["active_partners"]) > 0, "active_partners should not be empty"
        
        # Verify expected partners
        assert "Grainger" in data["active_partners"], "Grainger should be an active partner"
        assert "MOTION" in data["active_partners"], "MOTION should be an active partner"
    
    def test_get_partners_has_coming_soon_partners(self):
        """Test that response includes coming soon partners by region"""
        response = requests.get(f"{BASE_URL}/api/infoshop/partners")
        data = response.json()
        
        assert "coming_soon_partners" in data, "Response missing 'coming_soon_partners' field"
        assert isinstance(data["coming_soon_partners"], dict), "coming_soon_partners should be a dict"
        
        # Verify regions exist
        expected_regions = ["USA", "Mexico", "Europe", "China"]
        for region in expected_regions:
            assert region in data["coming_soon_partners"], f"Missing region: {region}"
            assert isinstance(data["coming_soon_partners"][region], list), f"{region} should have a list of partners"
    
    def test_get_partners_has_total_coming_soon_count(self):
        """Test that response includes total coming soon count"""
        response = requests.get(f"{BASE_URL}/api/infoshop/partners")
        data = response.json()
        
        assert "total_coming_soon" in data, "Response missing 'total_coming_soon' field"
        assert isinstance(data["total_coming_soon"], int), "total_coming_soon should be an integer"
        assert data["total_coming_soon"] > 0, "total_coming_soon should be greater than 0"


class TestInfoShopPricingCalculation:
    """Test POST /api/infoshop/pricing/calculate - Danone preferred pricing with sliding margin"""
    
    def test_pricing_calculate_returns_200(self):
        """Test that pricing calculation endpoint returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/infoshop/pricing/calculate",
            data={"list_price": 100.00, "category_discount": 10.0}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_pricing_calculate_returns_all_fields(self):
        """Test that pricing response includes all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/infoshop/pricing/calculate",
            data={"list_price": 100.00, "category_discount": 10.0}
        )
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert "pricing" in data, "Response missing 'pricing' field"
        
        pricing = data["pricing"]
        required_fields = [
            "list_price", "category_discount_percent", "infosys_purchase_price",
            "gross_margin_percent", "danone_preferred_price", "customer_savings_percent",
            "infosys_margin_amount"
        ]
        for field in required_fields:
            assert field in pricing, f"Pricing missing field: {field}"
    
    def test_pricing_sliding_margin_low_price(self):
        """Test sliding margin for low price items ($10) - should be ~9.2%"""
        response = requests.post(
            f"{BASE_URL}/api/infoshop/pricing/calculate",
            data={"list_price": 10.00, "category_discount": 0.0}
        )
        data = response.json()
        pricing = data["pricing"]
        
        # For $10 item with 0% discount, margin should be close to 9.2%
        assert 8.5 <= pricing["gross_margin_percent"] <= 9.3, \
            f"Low price margin should be ~9.2%, got {pricing['gross_margin_percent']}%"
    
    def test_pricing_sliding_margin_high_price(self):
        """Test sliding margin for high price items ($5000+) - should be ~5.92%"""
        response = requests.post(
            f"{BASE_URL}/api/infoshop/pricing/calculate",
            data={"list_price": 5000.00, "category_discount": 0.0}
        )
        data = response.json()
        pricing = data["pricing"]
        
        # For $5000 item with 0% discount, margin should be close to 5.92%
        assert 5.8 <= pricing["gross_margin_percent"] <= 6.6, \
            f"High price margin should be ~5.92%, got {pricing['gross_margin_percent']}%"
    
    def test_pricing_with_category_discount(self):
        """Test pricing calculation with category discount applied"""
        response = requests.post(
            f"{BASE_URL}/api/infoshop/pricing/calculate",
            data={"list_price": 100.00, "category_discount": 20.0}
        )
        data = response.json()
        pricing = data["pricing"]
        
        # Infosys purchase price should be 80% of list price (100 - 20% discount)
        assert pricing["infosys_purchase_price"] == 80.00, \
            f"Expected purchase price $80.00, got ${pricing['infosys_purchase_price']}"
        
        # Danone preferred price should be higher than purchase price (margin added)
        assert pricing["danone_preferred_price"] > pricing["infosys_purchase_price"], \
            "Danone price should be higher than purchase price"
    
    def test_pricing_formula_explanation(self):
        """Test that response includes formula explanation"""
        response = requests.post(
            f"{BASE_URL}/api/infoshop/pricing/calculate",
            data={"list_price": 100.00, "category_discount": 10.0}
        )
        data = response.json()
        
        assert "formula_explanation" in data, "Response missing 'formula_explanation'"
        explanation = data["formula_explanation"]
        
        # Verify explanation steps exist
        assert "step1" in explanation, "Missing step1 in explanation"
        assert "step2" in explanation, "Missing step2 in explanation"
        assert "step3" in explanation, "Missing step3 in explanation"
        assert "step4" in explanation, "Missing step4 in explanation"
        assert "step5" in explanation, "Missing step5 in explanation"


class TestInfoShopDeliveryDate:
    """Test GET /api/infoshop/delivery/minimum-date - 2 business week minimum delivery"""
    
    def test_minimum_date_returns_200(self):
        """Test that minimum date endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_minimum_date_returns_valid_date(self):
        """Test that minimum date is a valid date format"""
        response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        data = response.json()
        
        assert "minimum_delivery_date" in data, "Response missing 'minimum_delivery_date'"
        
        # Verify date format YYYY-MM-DD
        min_date = data["minimum_delivery_date"]
        try:
            parsed_date = datetime.strptime(min_date, "%Y-%m-%d")
        except ValueError:
            pytest.fail(f"Invalid date format: {min_date}, expected YYYY-MM-DD")
    
    def test_minimum_date_is_at_least_2_weeks_out(self):
        """Test that minimum date is at least 2 weeks (10 business days) from today"""
        response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        data = response.json()
        
        min_date = datetime.strptime(data["minimum_delivery_date"], "%Y-%m-%d")
        today = datetime.now()
        
        # Should be at least 10 calendar days out (2 weeks minimum)
        days_diff = (min_date - today).days
        assert days_diff >= 10, f"Minimum date should be at least 10 days out, got {days_diff} days"
    
    def test_minimum_date_returns_business_days_count(self):
        """Test that response includes business days count"""
        response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        data = response.json()
        
        assert "business_days" in data, "Response missing 'business_days'"
        assert data["business_days"] == 10, f"Expected 10 business days, got {data['business_days']}"
    
    def test_minimum_date_returns_note(self):
        """Test that response includes delivery note"""
        response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        data = response.json()
        
        assert "note" in data, "Response missing 'note'"
        assert "Infosys" in data["note"], "Note should mention Infosys"


class TestInfoShopPartNumberGeneration:
    """Test GET /api/infoshop/part-number/generate - InfoShop part number generation"""
    
    def test_part_number_generate_returns_200(self):
        """Test that part number generation returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/part-number/generate",
            params={"vendor": "Grainger", "category": "Bearings", "product_name": "Ball Bearing"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_part_number_format_correct(self):
        """Test that generated part number follows INF + Vendor(2) + Category(3) + Random(5) format"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/part-number/generate",
            params={"vendor": "Grainger", "category": "Bearings", "product_name": "Ball Bearing"}
        )
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert "infoshop_part_number" in data, "Response missing 'infoshop_part_number'"
        
        part_number = data["infoshop_part_number"]
        
        # Verify format: INF + 2 chars + 3 chars + 5 digits = 13 characters total
        assert len(part_number) == 13, f"Part number should be 13 chars, got {len(part_number)}: {part_number}"
        assert part_number.startswith("INF"), f"Part number should start with 'INF': {part_number}"
        
        # Verify last 5 characters are digits
        assert part_number[-5:].isdigit(), f"Last 5 chars should be digits: {part_number}"
    
    def test_part_number_vendor_code_grainger(self):
        """Test that Grainger vendor code is 'GR'"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/part-number/generate",
            params={"vendor": "Grainger", "category": "Bearings", "product_name": "Test"}
        )
        data = response.json()
        part_number = data["infoshop_part_number"]
        
        # Vendor code should be at position 3-4 (after INF)
        vendor_code = part_number[3:5]
        assert vendor_code == "GR", f"Grainger vendor code should be 'GR', got '{vendor_code}'"
    
    def test_part_number_vendor_code_motion(self):
        """Test that MOTION vendor code is 'MO'"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/part-number/generate",
            params={"vendor": "MOTION", "category": "Fasteners", "product_name": "Test"}
        )
        data = response.json()
        part_number = data["infoshop_part_number"]
        
        vendor_code = part_number[3:5]
        assert vendor_code == "MO", f"MOTION vendor code should be 'MO', got '{vendor_code}'"
    
    def test_part_number_uniqueness(self):
        """Test that multiple calls generate unique part numbers"""
        part_numbers = set()
        
        for i in range(5):
            response = requests.get(
                f"{BASE_URL}/api/infoshop/part-number/generate",
                params={"vendor": "Grainger", "category": "Tools", "product_name": f"Product {i}"}
            )
            data = response.json()
            part_numbers.add(data["infoshop_part_number"])
        
        # All 5 should be unique
        assert len(part_numbers) == 5, f"Expected 5 unique part numbers, got {len(part_numbers)}"


class TestInfoShopUNSPSCClassification:
    """Test GET /api/infoshop/unspsc/classify - UNSPSC auto-classification"""
    
    def test_unspsc_classify_returns_200(self):
        """Test that UNSPSC classification returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/unspsc/classify",
            params={"product_name": "Ball Bearing SKF 6205"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_unspsc_classify_returns_code(self):
        """Test that classification returns UNSPSC code"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/unspsc/classify",
            params={"product_name": "Ball Bearing SKF 6205"}
        )
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert "classification" in data, "Response missing 'classification'"
        
        classification = data["classification"]
        assert "unspsc_code" in classification, "Classification missing 'unspsc_code'"
        
        # UNSPSC code should be 8 digits
        unspsc = classification["unspsc_code"]
        assert len(unspsc) == 8, f"UNSPSC code should be 8 digits, got {len(unspsc)}: {unspsc}"
        assert unspsc.isdigit(), f"UNSPSC code should be numeric: {unspsc}"
    
    def test_unspsc_classify_bearing_product(self):
        """Test UNSPSC classification for bearing product"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/unspsc/classify",
            params={"product_name": "Ball Bearing", "category": "Bearings"}
        )
        data = response.json()
        classification = data["classification"]
        
        # Bearings should be classified under 31171500
        assert classification["unspsc_code"] == "31171500", \
            f"Bearing should be 31171500, got {classification['unspsc_code']}"
    
    def test_unspsc_classify_safety_product(self):
        """Test UNSPSC classification for safety product"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/unspsc/classify",
            params={"product_name": "Safety Gloves", "category": "PPE"}
        )
        data = response.json()
        classification = data["classification"]
        
        # Safety gloves should be classified under 46 segment (Defense and Law Enforcement / Safety)
        # Can be 46181500 (safety category) or 46181504 (specific glove code)
        assert classification["unspsc_code"].startswith("4618"), \
            f"Safety gloves should be in 4618xxxx segment, got {classification['unspsc_code']}"
    
    def test_unspsc_classify_returns_confidence(self):
        """Test that classification returns confidence score"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/unspsc/classify",
            params={"product_name": "Industrial Pump"}
        )
        data = response.json()
        classification = data["classification"]
        
        assert "confidence" in classification, "Classification missing 'confidence'"
        assert isinstance(classification["confidence"], (int, float)), "Confidence should be numeric"
        assert 0 <= classification["confidence"] <= 100, "Confidence should be 0-100"
    
    def test_unspsc_classify_returns_segment_name(self):
        """Test that classification returns segment name"""
        response = requests.get(
            f"{BASE_URL}/api/infoshop/unspsc/classify",
            params={"product_name": "Hydraulic Valve"}
        )
        data = response.json()
        classification = data["classification"]
        
        assert "segment_name" in classification, "Classification missing 'segment_name'"
        assert isinstance(classification["segment_name"], str), "Segment name should be string"


class TestInfoShopCartPrepareTransfer:
    """Test POST /api/infoshop/cart/prepare-transfer - Cart transfer with shipping validation"""
    
    def test_cart_transfer_requires_session_token(self):
        """Test that cart transfer requires valid session token"""
        # Get minimum date first
        date_response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        min_date = date_response.json()["minimum_delivery_date"]
        
        response = requests.post(
            f"{BASE_URL}/api/infoshop/cart/prepare-transfer",
            json={
                "session_token": "invalid_token_12345",
                "items": [{"product_name": "Test", "quantity": 1, "unit_price": 10.00}],
                "shipping_info": {
                    "shipping_address": "123 Test Street, Test City, TX 12345",
                    "delivery_attention": "John Doe",
                    "requested_delivery_date": min_date
                }
            }
        )
        
        # Should return 404 for invalid session
        assert response.status_code == 404, f"Expected 404 for invalid session, got {response.status_code}"
    
    def test_cart_transfer_validates_delivery_date(self):
        """Test that cart transfer validates delivery date is at least 2 weeks out"""
        # Use a date that's too soon (tomorrow)
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/infoshop/cart/prepare-transfer",
            json={
                "session_token": "test_session_123",
                "items": [{"product_name": "Test", "quantity": 1, "unit_price": 10.00}],
                "shipping_info": {
                    "shipping_address": "123 Test Street, Test City, TX 12345",
                    "delivery_attention": "John Doe",
                    "requested_delivery_date": tomorrow
                }
            }
        )
        
        # Should return 400 for date too soon
        assert response.status_code == 400, f"Expected 400 for date too soon, got {response.status_code}"
        assert "2 business weeks" in response.text.lower() or "minimum" in response.text.lower(), \
            "Error should mention minimum delivery date requirement"
    
    def test_cart_transfer_validates_shipping_address(self):
        """Test that cart transfer validates shipping address is provided"""
        # Get minimum date first
        date_response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        min_date = date_response.json()["minimum_delivery_date"]
        
        response = requests.post(
            f"{BASE_URL}/api/infoshop/cart/prepare-transfer",
            json={
                "session_token": "test_session_123",
                "items": [{"product_name": "Test", "quantity": 1, "unit_price": 10.00}],
                "shipping_info": {
                    "shipping_address": "short",  # Too short
                    "delivery_attention": "John Doe",
                    "requested_delivery_date": min_date
                }
            }
        )
        
        # Should return 400 for invalid address
        assert response.status_code == 400, f"Expected 400 for short address, got {response.status_code}"
    
    def test_cart_transfer_validates_delivery_attention(self):
        """Test that cart transfer validates delivery attention is provided"""
        # Get minimum date first
        date_response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        min_date = date_response.json()["minimum_delivery_date"]
        
        response = requests.post(
            f"{BASE_URL}/api/infoshop/cart/prepare-transfer",
            json={
                "session_token": "test_session_123",
                "items": [{"product_name": "Test", "quantity": 1, "unit_price": 10.00}],
                "shipping_info": {
                    "shipping_address": "123 Test Street, Test City, TX 12345",
                    "delivery_attention": "",  # Empty
                    "requested_delivery_date": min_date
                }
            }
        )
        
        # Should return 400 for missing attention
        assert response.status_code == 400, f"Expected 400 for missing attention, got {response.status_code}"


class TestInfoShopDeliveryValidation:
    """Test POST /api/infoshop/delivery/validate - Delivery date validation"""
    
    def test_delivery_validate_returns_200_for_valid_date(self):
        """Test that valid delivery date returns 200"""
        # Get minimum date first
        date_response = requests.get(f"{BASE_URL}/api/infoshop/delivery/minimum-date")
        min_date = date_response.json()["minimum_delivery_date"]
        
        response = requests.post(
            f"{BASE_URL}/api/infoshop/delivery/validate",
            data={"requested_date": min_date}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("valid") == True, "Valid date should return valid=True"
    
    def test_delivery_validate_rejects_past_date(self):
        """Test that past delivery date is rejected"""
        past_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/infoshop/delivery/validate",
            data={"requested_date": past_date}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("valid") == False, "Past date should return valid=False"
    
    def test_delivery_validate_rejects_too_soon_date(self):
        """Test that date less than 2 weeks out is rejected"""
        too_soon = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/infoshop/delivery/validate",
            data={"requested_date": too_soon}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("valid") == False, "Date too soon should return valid=False"
    
    def test_delivery_validate_returns_minimum_date(self):
        """Test that validation response includes minimum date"""
        response = requests.post(
            f"{BASE_URL}/api/infoshop/delivery/validate",
            data={"requested_date": "2025-01-01"}
        )
        data = response.json()
        
        assert "minimum_date" in data, "Response should include minimum_date"


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

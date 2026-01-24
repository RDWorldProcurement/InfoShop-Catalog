"""
Test AI Procurement Agent Intelligence Features
Tests for:
- is_likely_not_in_catalog() function
- assess_requirement_complexity() function
- ai_agent_conversation endpoint with intelligent detection
- show_quotation_upload and show_managed_services flags
- intelligent_guidance response
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIAgentIntelligence:
    """Test AI Agent intelligent business logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        # Login to get auth token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.session_id = f"test_session_{os.urandom(4).hex()}"
    
    # ============ NOT_IN_CATALOG Detection Tests ============
    
    def test_blue_bike_with_red_dots_not_in_catalog(self):
        """Test: 'blue bike with red dots' should detect NOT_IN_CATALOG"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "blue bike with red dots",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Verify NOT_IN_CATALOG detection
        assert data.get("show_quotation_upload") == True, "show_quotation_upload should be True for consumer item"
        assert data.get("show_managed_services") == True, "show_managed_services should be True for consumer item"
        assert data.get("context", {}).get("intent") == "NOT_IN_CATALOG", "Intent should be NOT_IN_CATALOG"
        
        # Verify intelligent_guidance is present
        guidance = data.get("intelligent_guidance")
        assert guidance is not None, "intelligent_guidance should be present"
        assert "reason" in guidance, "intelligent_guidance should have reason"
        assert "recommended_paths" in guidance, "intelligent_guidance should have recommended_paths"
        
        print(f"✓ 'blue bike with red dots' correctly detected as NOT_IN_CATALOG")
        print(f"  - show_quotation_upload: {data.get('show_quotation_upload')}")
        print(f"  - show_managed_services: {data.get('show_managed_services')}")
        print(f"  - intelligent_guidance reason: {guidance.get('reason')}")
    
    def test_furniture_not_in_catalog(self):
        """Test: 'custom furniture for office' should detect NOT_IN_CATALOG"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "custom furniture for office",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Furniture is a consumer indicator
        assert data.get("show_quotation_upload") == True, "show_quotation_upload should be True for furniture"
        assert data.get("show_managed_services") == True, "show_managed_services should be True for furniture"
        
        print(f"✓ 'custom furniture for office' correctly detected as NOT_IN_CATALOG")
    
    def test_clothing_not_in_catalog(self):
        """Test: 'company branded shirts' should detect NOT_IN_CATALOG"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "company branded shirts",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Clothing is a consumer indicator
        assert data.get("show_quotation_upload") == True, "show_quotation_upload should be True for clothing"
        assert data.get("show_managed_services") == True, "show_managed_services should be True for clothing"
        
        print(f"✓ 'company branded shirts' correctly detected as NOT_IN_CATALOG")
    
    def test_bicycle_not_in_catalog(self):
        """Test: 'bicycle' should detect NOT_IN_CATALOG"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "bicycle for employee wellness program",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        assert data.get("show_quotation_upload") == True, "show_quotation_upload should be True for bicycle"
        assert data.get("show_managed_services") == True, "show_managed_services should be True for bicycle"
        
        print(f"✓ 'bicycle' correctly detected as NOT_IN_CATALOG")
    
    # ============ Valid Catalog Item Tests ============
    
    def test_donaldson_filters_in_catalog(self):
        """Test: 'Donaldson filters' should return products from catalog"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "Donaldson filters",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Should find products
        products = data.get("products", [])
        assert len(products) > 0, "Should find Donaldson products in catalog"
        
        # Verify at least one product is from Donaldson
        donaldson_found = any("donaldson" in p.get("brand", "").lower() or "donaldson" in p.get("name", "").lower() for p in products)
        assert donaldson_found, "Should find Donaldson brand products"
        
        print(f"✓ 'Donaldson filters' found {len(products)} products in catalog")
        for p in products[:3]:
            print(f"  - {p.get('name')} ({p.get('brand')})")
    
    def test_hp_laptop_in_catalog(self):
        """Test: 'HP laptop' should return products from catalog"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "HP laptop",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Should find products
        products = data.get("products", [])
        assert len(products) > 0, "Should find HP laptop products in catalog"
        
        print(f"✓ 'HP laptop' found {len(products)} products in catalog")
    
    def test_safety_equipment_in_catalog(self):
        """Test: 'safety helmet' should return products from catalog"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "3M safety helmet",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Should find products
        products = data.get("products", [])
        # May or may not find exact match, but should not trigger NOT_IN_CATALOG
        intent = data.get("context", {}).get("intent")
        assert intent != "NOT_IN_CATALOG", "Safety equipment should not be flagged as NOT_IN_CATALOG"
        
        print(f"✓ '3M safety helmet' search completed - intent: {intent}")
    
    # ============ Complex Requirement Detection Tests ============
    
    def test_complex_requirement_multiple_specialized(self):
        """Test: Complex requirement with multiple specialized items should suggest Managed Services"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "multiple specialized equipment with installation and configuration",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Complex requirements should show managed services
        assert data.get("show_managed_services") == True, "Complex requirement should show managed services"
        
        print(f"✓ Complex requirement correctly detected")
        print(f"  - show_managed_services: {data.get('show_managed_services')}")
    
    def test_complex_requirement_long_term_contract(self):
        """Test: Long-term contract requirement should suggest Managed Services"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "long-term contract for ongoing maintenance services",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Long-term/ongoing requirements should show managed services
        assert data.get("show_managed_services") == True, "Long-term requirement should show managed services"
        
        print(f"✓ Long-term contract requirement correctly detected")
    
    def test_complex_requirement_bulk_volume(self):
        """Test: Bulk/volume requirement should suggest Managed Services"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "large quantity bulk order of specialized components",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Bulk requirements should show managed services
        assert data.get("show_managed_services") == True, "Bulk requirement should show managed services"
        
        print(f"✓ Bulk volume requirement correctly detected")
    
    # ============ Response Structure Tests ============
    
    def test_response_structure_has_required_fields(self):
        """Test: Response should have all required fields"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "test query",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Check required fields exist
        required_fields = [
            "message", "engines_used", "action", "products", "services",
            "context", "show_quotation_upload", "show_managed_services"
        ]
        
        for field in required_fields:
            assert field in data, f"Response missing required field: {field}"
        
        print(f"✓ Response structure has all required fields")
    
    def test_intelligent_guidance_structure(self):
        """Test: intelligent_guidance should have proper structure when present"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "blue bike with red dots",  # Known NOT_IN_CATALOG trigger
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        guidance = data.get("intelligent_guidance")
        if guidance:
            assert "reason" in guidance, "intelligent_guidance should have 'reason'"
            assert "recommended_paths" in guidance, "intelligent_guidance should have 'recommended_paths'"
            assert isinstance(guidance["recommended_paths"], list), "recommended_paths should be a list"
            
            print(f"✓ intelligent_guidance structure is correct")
            print(f"  - reason: {guidance.get('reason')}")
            print(f"  - recommended_paths: {guidance.get('recommended_paths')}")
    
    # ============ Quotation Intent Tests ============
    
    def test_quotation_intent_detection(self):
        """Test: Quotation-related queries should trigger quotation upload"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "I have a quotation from a supplier that I'd like analyzed",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Should show quotation upload
        assert data.get("show_quotation_upload") == True, "Quotation query should show quotation upload"
        
        intent = data.get("context", {}).get("intent")
        assert intent == "QUOTATION_ANALYSIS", f"Intent should be QUOTATION_ANALYSIS, got {intent}"
        
        print(f"✓ Quotation intent correctly detected")
    
    # ============ Managed Services Intent Tests ============
    
    def test_managed_services_intent_detection(self):
        """Test: Strategic sourcing queries should trigger managed services"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "I need help with a complex strategic sourcing engagement",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Should show managed services
        assert data.get("show_managed_services") == True, "Strategic sourcing should show managed services"
        
        intent = data.get("context", {}).get("intent")
        assert intent == "MANAGED_SERVICES", f"Intent should be MANAGED_SERVICES, got {intent}"
        
        print(f"✓ Managed services intent correctly detected")


class TestAIAgentEndpointHealth:
    """Basic health and connectivity tests"""
    
    def test_api_health(self):
        """Test: API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print(f"✓ API health check passed")
    
    def test_ai_agent_requires_auth(self):
        """Test: AI agent endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "test",
                "session_id": "test",
                "context": {},
                "language": "en",
                "currency": "USD"
            }
        )
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print(f"✓ AI agent endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

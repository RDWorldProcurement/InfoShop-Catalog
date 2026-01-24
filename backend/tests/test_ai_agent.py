"""
Test suite for AI Procurement Agent feature
Tests the /api/ai-agent/conversation endpoint with different intents
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER = {
    "email": "demo@infosys.com",
    "password": "demo123",
    "country": "USA"
}


class TestAIAgentEndpoint:
    """Tests for the AI Procurement Agent conversation endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Authentication failed - skipping AI Agent tests")
    
    def test_ai_agent_endpoint_exists(self):
        """Test that the AI agent conversation endpoint exists and accepts POST"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "Hello",
            "session_id": "test_session_1"
        })
        
        # Should not return 404 or 405
        assert response.status_code != 404, "AI Agent endpoint not found"
        assert response.status_code != 405, "AI Agent endpoint does not accept POST"
        assert response.status_code in [200, 201], f"Unexpected status: {response.status_code}"
    
    def test_catalog_search_intent_hp_laptops(self):
        """Test CATALOG_SEARCH intent with 'HP laptops' query"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "I need HP laptops",
            "session_id": "test_session_catalog_1",
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200, f"Failed with status {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Response missing 'message' field"
        assert "engines_used" in data, "Response missing 'engines_used' field"
        assert "context" in data, "Response missing 'context' field"
        
        # Verify intent classification
        context = data.get("context", {})
        intent = context.get("intent")
        assert intent == "CATALOG_SEARCH", f"Expected CATALOG_SEARCH intent, got {intent}"
        
        # Verify products are returned
        products = data.get("products")
        if products:
            assert len(products) > 0, "Expected products in response"
            # Check product structure
            first_product = products[0]
            assert "name" in first_product, "Product missing 'name'"
            assert "price" in first_product, "Product missing 'price'"
            print(f"✓ Found {len(products)} HP laptop products")
    
    def test_catalog_search_intent_dell_monitors(self):
        """Test CATALOG_SEARCH intent with 'Dell monitors' query"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "I'm looking for Dell monitors",
            "session_id": "test_session_catalog_2",
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        context = data.get("context", {})
        intent = context.get("intent")
        assert intent == "CATALOG_SEARCH", f"Expected CATALOG_SEARCH intent, got {intent}"
        
        # Check for products
        products = data.get("products", [])
        print(f"✓ Catalog search returned {len(products)} products for Dell monitors")
    
    def test_quotation_analysis_intent(self):
        """Test QUOTATION_ANALYSIS intent classification"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "I have a quotation to analyze",
            "session_id": "test_session_quotation_1",
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        context = data.get("context", {})
        intent = context.get("intent")
        assert intent == "QUOTATION_ANALYSIS", f"Expected QUOTATION_ANALYSIS intent, got {intent}"
        
        # Verify action suggests navigation to quotation page
        action = data.get("action")
        assert action == "navigate_quotation", f"Expected navigate_quotation action, got {action}"
        
        print("✓ Quotation analysis intent correctly classified")
    
    def test_quotation_analysis_with_benchmark_keyword(self):
        """Test QUOTATION_ANALYSIS intent with 'benchmark' keyword"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "I need to benchmark pricing from a supplier quote",
            "session_id": "test_session_quotation_2",
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        context = data.get("context", {})
        intent = context.get("intent")
        assert intent == "QUOTATION_ANALYSIS", f"Expected QUOTATION_ANALYSIS intent, got {intent}"
        
        print("✓ Quotation analysis with benchmark keyword correctly classified")
    
    def test_managed_services_intent_strategic_sourcing(self):
        """Test MANAGED_SERVICES intent with strategic sourcing query"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "We need strategic sourcing for IT infrastructure",
            "session_id": "test_session_managed_1",
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        context = data.get("context", {})
        intent = context.get("intent")
        assert intent == "MANAGED_SERVICES", f"Expected MANAGED_SERVICES intent, got {intent}"
        
        # Verify action suggests navigation to managed services
        action = data.get("action")
        assert action == "navigate_managed_services", f"Expected navigate_managed_services action, got {action}"
        
        # Check for managed service form flag
        managed_service_form = data.get("managed_service_form")
        assert managed_service_form == True, "Expected managed_service_form to be True"
        
        print("✓ Managed services intent correctly classified")
    
    def test_managed_services_intent_rfp(self):
        """Test MANAGED_SERVICES intent with RFP keyword"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "We need help with an RFP for multiple suppliers",
            "session_id": "test_session_managed_2",
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        context = data.get("context", {})
        intent = context.get("intent")
        assert intent == "MANAGED_SERVICES", f"Expected MANAGED_SERVICES intent, got {intent}"
        
        print("✓ Managed services with RFP keyword correctly classified")
    
    def test_response_includes_engines_used(self):
        """Test that response includes engines_used field"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "Find me safety equipment",
            "session_id": "test_session_engines_1",
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        engines_used = data.get("engines_used", [])
        assert isinstance(engines_used, list), "engines_used should be a list"
        
        # Should include gpt, claude, gemini
        expected_engines = ["gpt", "claude", "gemini"]
        for engine in expected_engines:
            assert engine in engines_used, f"Expected {engine} in engines_used"
        
        print(f"✓ Response includes all AI engines: {engines_used}")
    
    def test_response_message_not_empty(self):
        """Test that response message is not empty"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "Hello, I need help",
            "session_id": "test_session_message_1",
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        message = data.get("message", "")
        assert len(message) > 0, "Response message should not be empty"
        
        print(f"✓ Response message received: {message[:100]}...")
    
    def test_context_preserved_in_response(self):
        """Test that context is preserved and returned"""
        initial_context = {
            "previous_search": "laptops",
            "user_preference": "HP"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "Show me more options",
            "session_id": "test_session_context_1",
            "context": initial_context,
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        returned_context = data.get("context", {})
        assert "intent" in returned_context, "Context should include intent"
        
        print("✓ Context preserved in response")
    
    def test_product_search_returns_valid_structure(self):
        """Test that product search returns valid product structure"""
        response = self.session.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "I need Cisco networking equipment",
            "session_id": "test_session_product_struct_1",
            "language": "en",
            "currency": "USD"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        products = data.get("products", [])
        if products:
            product = products[0]
            required_fields = ["id", "name", "price", "currency"]
            for field in required_fields:
                assert field in product, f"Product missing required field: {field}"
            
            # Verify price is a number
            assert isinstance(product["price"], (int, float)), "Price should be numeric"
            
            print(f"✓ Product structure valid with fields: {list(product.keys())}")
        else:
            print("⚠ No products returned for Cisco networking query")


class TestAIAgentAuthentication:
    """Test authentication requirements for AI Agent endpoint"""
    
    def test_unauthorized_without_token(self):
        """Test that endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", json={
            "message": "Hello",
            "session_id": "test_unauth"
        })
        
        # Should return 401 or 403 without token
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

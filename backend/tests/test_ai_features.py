"""
Test AI Price Benchmarking Features
Tests the new AI-powered price benchmarking with 3 LLMs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://prompt-supply.preview.emergentagent.com')

class TestDemoAnalysisAPI:
    """Test the demo analysis endpoint"""
    
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
    
    def test_demo_analysis_endpoint_exists(self, auth_token):
        """Test that demo-analysis endpoint exists and returns data"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/quotation/demo-analysis",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        print(f"✓ Demo analysis endpoint returns success")
    
    def test_demo_analysis_has_ai_engines(self, auth_token):
        """Test that response includes ai_engines_used field"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/quotation/demo-analysis",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for ai_engines_used field
        assert "ai_engines_used" in data, "Response should have ai_engines_used field"
        ai_engines = data["ai_engines_used"]
        assert len(ai_engines) == 3, f"Should have 3 AI engines, got {len(ai_engines)}"
        
        # Check for specific engines
        engine_names = [e.lower() for e in ai_engines]
        assert any("openai" in e or "gpt" in e for e in engine_names), "Should include OpenAI/GPT"
        assert any("claude" in e for e in engine_names), "Should include Claude"
        assert any("gemini" in e for e in engine_names), "Should include Gemini"
        print(f"✓ AI engines: {ai_engines}")
    
    def test_demo_analysis_has_line_items(self, auth_token):
        """Test that response includes line items with pricing"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/quotation/demo-analysis",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for line_items in nested structure
        assert "analysis" in data, "Response should have analysis"
        assert "extracted_data" in data["analysis"], "Analysis should have extracted_data"
        assert "line_items" in data["analysis"]["extracted_data"], "extracted_data should have line_items"
        
        line_items = data["analysis"]["extracted_data"]["line_items"]
        assert len(line_items) >= 3, f"Should have at least 3 line items, got {len(line_items)}"
        
        # Check line item structure
        for item in line_items:
            assert "description" in item, "Line item should have description"
            assert "unit_price" in item, "Line item should have unit_price"
            assert "quantity" in item, "Line item should have quantity"
        
        print(f"✓ Found {len(line_items)} line items")
    
    def test_demo_analysis_has_potential_savings(self, auth_token):
        """Test that response includes potential savings"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/quotation/demo-analysis",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for potential_savings in nested structure or recommendations
        analysis = data.get("analysis", {})
        has_savings = (
            "total_potential_savings" in analysis or 
            "potential_savings" in analysis or
            any("savings" in str(r).lower() for r in analysis.get("recommendations", []))
        )
        assert has_savings, "Response should have potential_savings info"
        
        # Check recommendations mention savings
        recommendations = analysis.get("recommendations", [])
        savings_mentioned = any("$4,535" in str(r) or "savings" in str(r).lower() for r in recommendations)
        assert savings_mentioned, "Recommendations should mention savings"
        print(f"✓ Potential savings mentioned in recommendations")
    
    def test_demo_analysis_has_supplier_info(self, auth_token):
        """Test that response includes supplier information"""
        response = requests.get(
            f"{BASE_URL}/api/procurement/quotation/demo-analysis",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for supplier info in nested structure
        analysis = data.get("analysis", {})
        extracted_data = analysis.get("extracted_data", {})
        
        # Supplier might be in extracted_data or at top level
        supplier = extracted_data.get("supplier") or data.get("supplier")
        assert supplier is not None, "Response should have supplier info"
        assert "name" in supplier, "Supplier should have name"
        print(f"✓ Supplier: {supplier.get('name')}")


class TestLandingPageContent:
    """Test landing page content via API"""
    
    def test_health_endpoint(self):
        """Test health endpoint is working"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

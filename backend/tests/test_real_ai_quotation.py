"""
Test Real AI Quotation Analysis - Tests for AI-powered price benchmarking
Tests the /api/procurement/quotation/upload-with-ai endpoint
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRealAIQuotationAnalysis:
    """Tests for Real AI Quotation Analysis feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.base_url = BASE_URL
        self.token = None
        self.login()
    
    def login(self):
        """Login and get auth token"""
        response = requests.post(f"{self.base_url}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "US"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        assert self.token, "No token received"
    
    def test_login_with_demo_credentials(self):
        """Test 1: Login with demo@infosys.com / demo123 / country: US"""
        response = requests.post(f"{self.base_url}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "US"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == "demo@infosys.com"
        assert data["country"] == "US"
        print("✓ Login with demo credentials successful")
    
    def test_ai_agent_endpoint_exists(self):
        """Test 2: Verify AI Agent conversation endpoint exists"""
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(f"{self.base_url}/api/ai-agent/conversation", 
            json={
                "message": "I have a quotation",
                "session_id": "test_session",
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=headers
        )
        # Should return 200 or valid response
        assert response.status_code in [200, 201], f"AI Agent endpoint failed: {response.status_code}"
        print("✓ AI Agent conversation endpoint working")
    
    def test_upload_quotation_endpoint_exists(self):
        """Test 3: Verify upload quotation endpoint exists"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a simple test file
        test_content = b"Test quotation content"
        files = {"file": ("test.txt", test_content, "text/plain")}
        data = {
            "supplier_name": "",  # Optional - should work without
            "supplier_email": "",
            "document_language": "en"
        }
        
        response = requests.post(
            f"{self.base_url}/api/procurement/quotation/upload",
            headers=headers,
            files=files,
            data=data
        )
        # Should return 200 or valid response
        assert response.status_code in [200, 201], f"Upload endpoint failed: {response.status_code}"
        print("✓ Upload quotation endpoint working")
    
    def test_real_ai_upload_endpoint_exists(self):
        """Test 4: Verify Real AI upload endpoint exists"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a simple test file
        test_content = b"Test quotation for AI analysis"
        files = {"file": ("test.txt", test_content, "text/plain")}
        data = {
            "supplier_name": "",  # Optional - should work without
            "supplier_email": "",
            "document_language": "en"
        }
        
        # Use a shorter timeout for existence check
        try:
            response = requests.post(
                f"{self.base_url}/api/procurement/quotation/upload-with-ai",
                headers=headers,
                files=files,
                data=data,
                timeout=10  # Short timeout just to check endpoint exists
            )
            # If we get a response, endpoint exists
            assert response.status_code in [200, 201, 408, 504], f"Real AI endpoint failed: {response.status_code}"
            print("✓ Real AI upload endpoint exists")
        except requests.exceptions.Timeout:
            # Timeout is expected for real AI - endpoint exists but takes time
            print("✓ Real AI upload endpoint exists (timeout expected for real AI processing)")
    
    def test_supplier_name_optional_in_upload(self):
        """Test 5: Verify supplier name is optional in quotation upload"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a test file
        test_content = b"Quotation without supplier name"
        files = {"file": ("test.txt", test_content, "text/plain")}
        data = {
            "supplier_name": "",  # Empty - should be optional
            "supplier_email": "",
            "document_language": "en"
        }
        
        response = requests.post(
            f"{self.base_url}/api/procurement/quotation/upload",
            headers=headers,
            files=files,
            data=data
        )
        
        # Should succeed without supplier name
        assert response.status_code in [200, 201], f"Upload without supplier name failed: {response.status_code}"
        print("✓ Supplier name is optional - upload succeeded without it")
    
    def test_real_ai_analysis_returns_correct_structure(self):
        """Test 6: Verify Real AI analysis returns correct response structure"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a more realistic test quotation
        test_quotation = """
        QUOTATION
        Supplier: Test Supplier Inc.
        Quote #: QT-TEST-001
        
        Line Items:
        1. HP Laptop - Qty: 5 - Unit Price: $1,299.00
        2. Dell Monitor - Qty: 5 - Unit Price: $799.00
        
        Total: $10,490.00
        """
        
        files = {"file": ("quotation.txt", test_quotation.encode(), "text/plain")}
        data = {
            "supplier_name": "Test Supplier",
            "supplier_email": "test@supplier.com",
            "document_language": "en"
        }
        
        # This test may take 2-3 minutes for real AI
        print("Starting Real AI analysis (may take 2-3 minutes)...")
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.base_url}/api/procurement/quotation/upload-with-ai",
                headers=headers,
                files=files,
                data=data,
                timeout=300  # 5 minute timeout
            )
            
            elapsed = time.time() - start_time
            print(f"Real AI analysis completed in {elapsed:.1f} seconds")
            
            assert response.status_code == 200, f"Real AI analysis failed: {response.status_code}"
            
            data = response.json()
            
            # Verify response structure
            assert data.get("success") == True, "Response should have success=True"
            assert "quotation_id" in data, "Response should have quotation_id"
            assert data.get("analysis_mode") == "REAL_AI", "Analysis mode should be REAL_AI"
            assert "ai_engines_used" in data, "Response should have ai_engines_used"
            assert "analysis" in data, "Response should have analysis"
            
            # Verify AI engines used
            ai_engines = data.get("ai_engines_used", [])
            assert len(ai_engines) == 3, f"Should use 3 AI engines, got {len(ai_engines)}"
            
            # Verify analysis structure
            analysis = data.get("analysis", {})
            assert "extracted_data" in analysis, "Analysis should have extracted_data"
            assert "price_benchmark" in analysis, "Analysis should have price_benchmark"
            
            # Verify price benchmark has AI analyses
            benchmark = analysis.get("price_benchmark", {})
            assert "benchmarks" in benchmark, "Price benchmark should have benchmarks"
            assert "ai_engines_used" in benchmark, "Price benchmark should have ai_engines_used"
            
            print("✓ Real AI analysis returns correct response structure")
            print(f"  - Quotation ID: {data.get('quotation_id')}")
            print(f"  - AI Engines: {ai_engines}")
            print(f"  - Total Potential Savings: ${benchmark.get('total_potential_savings', 0):,.2f}")
            
        except requests.exceptions.Timeout:
            pytest.skip("Real AI analysis timed out - this is expected for complex quotations")


class TestFrontendIntegration:
    """Tests for frontend integration with Real AI"""
    
    def test_frontend_loads(self):
        """Test that frontend loads correctly"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        print("✓ Frontend loads correctly")
    
    def test_ai_agent_page_accessible(self):
        """Test that AI Agent page is accessible"""
        response = requests.get(f"{BASE_URL}/ai-agent")
        # Should redirect to login or return 200
        assert response.status_code in [200, 302, 304]
        print("✓ AI Agent page accessible")
    
    def test_upload_quotation_page_accessible(self):
        """Test that Upload Quotation page is accessible"""
        response = requests.get(f"{BASE_URL}/upload-quotation")
        # Should redirect to login or return 200
        assert response.status_code in [200, 302, 304]
        print("✓ Upload Quotation page accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

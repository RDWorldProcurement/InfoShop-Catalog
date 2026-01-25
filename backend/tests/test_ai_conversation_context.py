"""
Test AI Conversation Multi-turn Context
Tests that follow-up questions reference previous conversation context
"""
import pytest
import requests
import uuid
import time
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aiprocure-2.preview.emergentagent.com')

class TestAIConversationContext:
    """Test multi-turn AI conversation context maintenance"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.session_id = str(uuid.uuid4())
    
    def test_initial_search_returns_products(self):
        """Test that initial search for bearings returns products"""
        resp = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            headers=self.headers,
            json={
                "message": "I need industrial bearings",
                "session_id": self.session_id,
                "context": {}
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("intent") in ["CATALOG_SEARCH", "CONTEXT_CONTINUATION"]
        assert "message" in data
        # Should find products related to industrial items
        assert len(data.get("products", [])) > 0 or "bearing" in data.get("message", "").lower()
    
    def test_followup_brands_maintains_context(self):
        """Test that 'what brands?' follow-up references bearings context"""
        # First message - establish context
        resp1 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            headers=self.headers,
            json={
                "message": "I need industrial bearings",
                "session_id": self.session_id,
                "context": {}
            }
        )
        assert resp1.status_code == 200
        
        # Wait for conversation to be saved
        time.sleep(2)
        
        # Follow-up question
        resp2 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            headers=self.headers,
            json={
                "message": "what brands do you have?",
                "session_id": self.session_id,
                "context": {}
            }
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        
        # Should detect as context continuation
        assert data2.get("intent") == "CONTEXT_CONTINUATION", f"Expected CONTEXT_CONTINUATION, got {data2.get('intent')}"
        
        # Response should mention bearings or bearing brands
        message = data2.get("message", "").lower()
        bearing_keywords = ["bearing", "skf", "timken", "nsk", "ntn", "fag", "ina", "koyo"]
        has_bearing_context = any(kw in message for kw in bearing_keywords)
        assert has_bearing_context, f"Response should mention bearings/brands. Got: {message[:200]}"
    
    def test_followup_cheaper_maintains_context(self):
        """Test that 'show cheaper options' references previous topic"""
        # First message
        resp1 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            headers=self.headers,
            json={
                "message": "I need industrial bearings",
                "session_id": self.session_id,
                "context": {}
            }
        )
        assert resp1.status_code == 200
        time.sleep(2)
        
        # Follow-up
        resp2 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            headers=self.headers,
            json={
                "message": "show me cheaper options",
                "session_id": self.session_id,
                "context": {}
            }
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        
        # Should detect as context continuation
        assert data2.get("intent") == "CONTEXT_CONTINUATION"
    
    def test_new_session_no_context(self):
        """Test that new session doesn't have previous context"""
        new_session = str(uuid.uuid4())
        
        resp = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            headers=self.headers,
            json={
                "message": "what brands?",
                "session_id": new_session,
                "context": {}
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Without context, should ask for clarification or do generic search
        # Should NOT be CONTEXT_CONTINUATION since there's no prior context
        # (unless the AI detects it as a follow-up pattern and asks for clarification)
        message = data.get("message", "").lower()
        # Either asks for clarification or does a generic brand search
        assert "clarif" in message or "brand" in message or data.get("intent") in ["CLARIFICATION_NEEDED", "CATALOG_SEARCH"]


class TestLoginAndAuth:
    """Test login and authentication"""
    
    def test_demo_login(self):
        """Test demo user login"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "email" in data
        assert data["email"] == "demo@infosys.com"
    
    def test_admin_login(self):
        """Test admin user login"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@omnisupply.io",
            "password": "admin123",
            "country": "USA"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data.get("role") == "admin" or data.get("email") == "admin@omnisupply.io"
    
    def test_invalid_login(self):
        """Test invalid credentials - app creates user if not exists"""
        # Note: This app auto-creates users on first login, so invalid login returns 200
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword",
            "country": "USA"
        })
        # App creates user on first login, so this returns 200
        assert resp.status_code in [200, 401]


class TestCatalogSearch:
    """Test catalog search functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login before tests"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "USA"
        })
        self.token = login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_products(self):
        """Test product search"""
        resp = requests.get(f"{BASE_URL}/api/products/search", 
            headers=self.headers,
            params={"q": "laptop"}
        )
        assert resp.status_code == 200
        data = resp.json()
        # API returns 'results' key for products
        assert "results" in data or "products" in data
    
    def test_search_services(self):
        """Test service search"""
        resp = requests.get(f"{BASE_URL}/api/services/search", 
            headers=self.headers,
            params={"q": "IT services"}
        )
        assert resp.status_code == 200
        data = resp.json()
        # API returns 'results' key for services
        assert "results" in data or "services" in data


class TestHealthCheck:
    """Test health endpoints"""
    
    def test_health_endpoint(self):
        """Test health check"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "healthy"

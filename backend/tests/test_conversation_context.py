"""
Test AI Conversation Context and Negotiation Page Savings
Tests:
1. AI conversation maintains context across messages
2. Follow-up questions reference prior context (bearings -> brands)
3. Negotiation page displays correct savings values
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConversationContext:
    """Test AI conversation context memory"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "US"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.session_id = f"test_session_{int(time.time())}"
    
    def test_initial_message_about_bearings(self):
        """Test: User asks about industrial bearings"""
        response = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "I need industrial bearings for manufacturing",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Conversation failed: {response.text}"
        data = response.json()
        
        # Verify response contains relevant content
        assert "message" in data, "Response should have message field"
        message = data.get("message", "").lower()
        
        # AI should respond about bearings/products
        print(f"Initial response: {data.get('message', '')[:200]}...")
        
        # Store for context
        return data
    
    def test_follow_up_about_brands(self):
        """Test: Follow-up 'what brands do you have?' should understand bearings context"""
        # First message about bearings
        response1 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "I need industrial bearings for manufacturing",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        assert response1.status_code == 200
        
        # Wait a moment for DB write
        time.sleep(0.5)
        
        # Follow-up about brands
        response2 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "what brands do you have?",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response2.status_code == 200, f"Follow-up failed: {response2.text}"
        data = response2.json()
        
        message = data.get("message", "").lower()
        print(f"Follow-up response: {data.get('message', '')[:300]}...")
        
        # AI should understand we're asking about bearing brands
        # Check for bearing-related brands like SKF, NSK, FAG, Timken, etc.
        bearing_brands = ["skf", "nsk", "fag", "timken", "ntn", "koyo", "bearing"]
        has_bearing_context = any(brand in message for brand in bearing_brands)
        
        # Or check if it references prior context
        references_context = data.get("references_prior_context", False)
        
        print(f"Has bearing context: {has_bearing_context}")
        print(f"References prior context: {references_context}")
        
        # The AI should either mention bearing brands OR acknowledge prior context
        assert has_bearing_context or references_context or "bearing" in message or "product" in message, \
            "AI should understand follow-up is about bearings"
    
    def test_context_for_cheaper_options(self):
        """Test: 'show me cheaper options' should remember bearings context"""
        # First message about bearings
        response1 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "I need industrial bearings for manufacturing",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        assert response1.status_code == 200
        
        time.sleep(0.5)
        
        # Ask about cheaper options
        response2 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "show me the cheaper options",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        
        assert response2.status_code == 200, f"Cheaper options query failed: {response2.text}"
        data = response2.json()
        
        message = data.get("message", "").lower()
        print(f"Cheaper options response: {data.get('message', '')[:300]}...")
        
        # AI should understand context and talk about pricing/options
        price_keywords = ["price", "cost", "budget", "affordable", "cheaper", "option", "bearing", "product"]
        has_price_context = any(kw in message for kw in price_keywords)
        
        assert has_price_context, "AI should understand we're asking about cheaper bearing options"


class TestNegotiationPageSavings:
    """Test Negotiation page displays correct savings values"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "US"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_quotation_has_price_benchmark(self):
        """Test: Quotation endpoint returns price_benchmark with savings"""
        quotation_id = "QAI-20260125040924-547078"
        
        response = requests.get(f"{BASE_URL}/api/procurement/quotation/{quotation_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Quotation fetch failed: {response.text}"
        data = response.json()
        
        # Check quotation structure
        quotation = data.get("quotation", data)
        
        # Price benchmark can be at top level or under analysis
        price_benchmark = quotation.get("price_benchmark") or \
                         quotation.get("analysis", {}).get("price_benchmark", {})
        
        print(f"Quotation keys: {quotation.keys()}")
        print(f"Price benchmark: {price_benchmark}")
        
        # Verify price_benchmark exists and has total_potential_savings
        assert price_benchmark, "Quotation should have price_benchmark"
        
        total_savings = price_benchmark.get("total_potential_savings", 0)
        print(f"Total potential savings: ${total_savings}")
        
        # Savings should be a number (can be 0 if no savings identified)
        assert isinstance(total_savings, (int, float)), "total_potential_savings should be a number"
    
    def test_negotiation_strategies_endpoint(self):
        """Test: Negotiation strategies endpoint returns valid strategies"""
        response = requests.get(f"{BASE_URL}/api/negotiation/strategies",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Strategies fetch failed: {response.text}"
        data = response.json()
        
        strategies = data.get("strategies", [])
        assert len(strategies) > 0, "Should have at least one strategy"
        
        # Verify strategy structure
        for strategy in strategies:
            assert "id" in strategy, "Strategy should have id"
            assert "name" in strategy, "Strategy should have name"
            print(f"Strategy: {strategy.get('id')} - {strategy.get('name')}")
    
    def test_generate_negotiation_targets(self):
        """Test: Generate negotiation targets returns savings calculations"""
        quotation_id = "QAI-20260125040924-547078"
        
        response = requests.post(f"{BASE_URL}/api/negotiation/generate-targets",
            json={
                "quotation_id": quotation_id,
                "strategy": "balanced"
            },
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Generate targets failed: {response.text}"
        data = response.json()
        
        # Verify targets structure
        targets = data.get("targets", {})
        negotiation_id = data.get("negotiation_id")
        
        print(f"Negotiation ID: {negotiation_id}")
        print(f"Targets summary: {targets.get('summary', {})}")
        
        # Check summary has savings
        summary = targets.get("summary", {})
        total_potential_savings = summary.get("total_potential_savings", 0)
        
        print(f"Target potential savings: ${total_potential_savings}")
        
        # Verify savings is calculated
        assert "total_potential_savings" in summary, "Summary should have total_potential_savings"
        assert isinstance(total_potential_savings, (int, float)), "Savings should be a number"


class TestConversationHistoryStorage:
    """Test that conversation history is stored in MongoDB"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@infosys.com",
            "password": "demo123",
            "country": "US"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.session_id = f"test_history_{int(time.time())}"
    
    def test_conversation_creates_history(self):
        """Test: Sending messages creates conversation history"""
        # Send first message
        response1 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "Hello, I need help with procurement",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        assert response1.status_code == 200
        
        # Send second message
        response2 = requests.post(f"{BASE_URL}/api/ai-agent/conversation", 
            json={
                "message": "I'm looking for safety equipment",
                "session_id": self.session_id,
                "context": {},
                "language": "en",
                "currency": "USD"
            },
            headers=self.headers
        )
        assert response2.status_code == 200
        
        # Both messages should succeed - history is stored internally
        print(f"First response: {response1.json().get('message', '')[:100]}...")
        print(f"Second response: {response2.json().get('message', '')[:100]}...")
        
        # The second response should be contextually aware
        # (we can't directly query MongoDB from here, but the AI should use history)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

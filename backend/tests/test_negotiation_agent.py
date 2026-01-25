"""
Test Negotiation Agent API Endpoints
Phase 1: Target pricing, strategy playbooks, email generation, counter-offer tracking
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@infosys.com"
TEST_PASSWORD = "demo123"
TEST_COUNTRY = "US"

# Existing quotation ID for testing
TEST_QUOTATION_ID = "QAI-20260125040924-547078"


class TestNegotiationStrategies:
    """Test GET /api/negotiation/strategies endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_strategies_returns_5_strategies(self):
        """Test that strategies endpoint returns exactly 5 strategies"""
        response = requests.get(f"{BASE_URL}/api/negotiation/strategies", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "strategies" in data
        assert len(data["strategies"]) == 5
    
    def test_strategies_have_required_fields(self):
        """Test that each strategy has all required fields"""
        response = requests.get(f"{BASE_URL}/api/negotiation/strategies", headers=self.headers)
        
        assert response.status_code == 200
        strategies = response.json()["strategies"]
        
        required_fields = ["id", "name", "description", "target_discount", "max_rounds", "tone", "best_for"]
        
        for strategy in strategies:
            for field in required_fields:
                assert field in strategy, f"Strategy missing field: {field}"
    
    def test_strategies_include_all_types(self):
        """Test that all 5 strategy types are present"""
        response = requests.get(f"{BASE_URL}/api/negotiation/strategies", headers=self.headers)
        
        assert response.status_code == 200
        strategies = response.json()["strategies"]
        strategy_ids = [s["id"] for s in strategies]
        
        expected_ids = ["aggressive", "balanced", "relationship", "volume_based", "urgent"]
        for expected_id in expected_ids:
            assert expected_id in strategy_ids, f"Missing strategy: {expected_id}"


class TestNegotiationTargets:
    """Test POST /api/negotiation/generate-targets endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_generate_targets_success(self):
        """Test generating negotiation targets for a quotation"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/generate-targets",
            headers=self.headers,
            json={
                "quotation_id": TEST_QUOTATION_ID,
                "strategy": "balanced"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "negotiation_id" in data
        assert "targets" in data
        assert data["quotation_id"] == TEST_QUOTATION_ID
        assert data["strategy"] == "balanced"
    
    def test_generate_targets_returns_item_targets(self):
        """Test that targets include item-level pricing"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/generate-targets",
            headers=self.headers,
            json={
                "quotation_id": TEST_QUOTATION_ID,
                "strategy": "aggressive"
            }
        )
        
        assert response.status_code == 200
        targets = response.json()["targets"]
        
        assert "item_targets" in targets
        assert len(targets["item_targets"]) > 0
        
        # Check item target fields
        item = targets["item_targets"][0]
        assert "quoted_price" in item
        assert "target_price" in item
        assert "potential_savings" in item
        assert "recommendation" in item
    
    def test_generate_targets_returns_summary(self):
        """Test that targets include summary with totals"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/generate-targets",
            headers=self.headers,
            json={
                "quotation_id": TEST_QUOTATION_ID,
                "strategy": "balanced"
            }
        )
        
        assert response.status_code == 200
        summary = response.json()["targets"]["summary"]
        
        assert "total_quoted" in summary
        assert "total_target" in summary
        assert "total_potential_savings" in summary
        assert "savings_percent" in summary
    
    def test_generate_targets_invalid_quotation(self):
        """Test error handling for invalid quotation ID"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/generate-targets",
            headers=self.headers,
            json={
                "quotation_id": "INVALID-QUOTATION-ID",
                "strategy": "balanced"
            }
        )
        
        assert response.status_code == 404


class TestNegotiationEmail:
    """Test POST /api/negotiation/generate-email endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_generate_email_success(self):
        """Test generating negotiation email"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/generate-email",
            headers=self.headers,
            json={
                "quotation_id": TEST_QUOTATION_ID,
                "strategy": "balanced",
                "buyer_name": "Test Buyer",
                "company_name": "Test Company"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "email" in data
    
    def test_generate_email_has_required_fields(self):
        """Test that generated email has all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/generate-email",
            headers=self.headers,
            json={
                "quotation_id": TEST_QUOTATION_ID,
                "strategy": "balanced",
                "buyer_name": "Test Buyer",
                "company_name": "Test Company"
            }
        )
        
        assert response.status_code == 200
        email = response.json()["email"]
        
        assert "subject" in email
        assert "body" in email
        assert "tone" in email
        assert "target_savings_percent" in email
    
    def test_generate_email_different_strategies(self):
        """Test email generation with different strategies"""
        strategies = ["aggressive", "balanced", "relationship", "volume_based", "urgent"]
        
        for strategy in strategies:
            response = requests.post(
                f"{BASE_URL}/api/negotiation/generate-email",
                headers=self.headers,
                json={
                    "quotation_id": TEST_QUOTATION_ID,
                    "strategy": strategy,
                    "buyer_name": "Test Buyer",
                    "company_name": "Test Company"
                }
            )
            
            assert response.status_code == 200, f"Failed for strategy: {strategy}"
            email = response.json()["email"]
            assert len(email["body"]) > 100, f"Email body too short for strategy: {strategy}"


class TestCounterOffer:
    """Test POST /api/negotiation/counter-offer endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and create a negotiation session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Create a negotiation session for testing
        targets_response = requests.post(
            f"{BASE_URL}/api/negotiation/generate-targets",
            headers=self.headers,
            json={
                "quotation_id": TEST_QUOTATION_ID,
                "strategy": "balanced"
            }
        )
        assert targets_response.status_code == 200
        self.negotiation_id = targets_response.json()["negotiation_id"]
    
    def test_counter_offer_success(self):
        """Test processing a counter-offer"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/counter-offer",
            headers=self.headers,
            json={
                "negotiation_id": self.negotiation_id,
                "their_offer": 4400
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "counter_offer" in data
        assert "savings_achieved" in data
    
    def test_counter_offer_returns_recommendation(self):
        """Test that counter-offer includes recommendation"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/counter-offer",
            headers=self.headers,
            json={
                "negotiation_id": self.negotiation_id,
                "their_offer": 4400
            }
        )
        
        assert response.status_code == 200
        counter = response.json()["counter_offer"]
        
        assert "recommendation" in counter
        assert counter["recommendation"] in ["COUNTER", "ESCALATE_OR_WALK"]
        assert "our_counter" in counter
        assert "message" in counter
    
    def test_counter_offer_tracks_rounds(self):
        """Test that counter-offer tracks negotiation rounds"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/counter-offer",
            headers=self.headers,
            json={
                "negotiation_id": self.negotiation_id,
                "their_offer": 4400
            }
        )
        
        assert response.status_code == 200
        counter = response.json()["counter_offer"]
        
        assert "round" in counter
        assert "rounds_remaining" in counter
        assert counter["round"] >= 1
    
    def test_counter_offer_invalid_negotiation(self):
        """Test error handling for invalid negotiation ID"""
        response = requests.post(
            f"{BASE_URL}/api/negotiation/counter-offer",
            headers=self.headers,
            json={
                "negotiation_id": "INVALID-NEGOTIATION-ID",
                "their_offer": 4400
            }
        )
        
        assert response.status_code == 404


class TestNegotiationIntegration:
    """Integration tests for full negotiation flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_full_negotiation_flow(self):
        """Test complete negotiation flow: strategies -> targets -> email -> counter-offer"""
        # Step 1: Get strategies
        strategies_response = requests.get(
            f"{BASE_URL}/api/negotiation/strategies",
            headers=self.headers
        )
        assert strategies_response.status_code == 200
        assert len(strategies_response.json()["strategies"]) == 5
        
        # Step 2: Generate targets
        targets_response = requests.post(
            f"{BASE_URL}/api/negotiation/generate-targets",
            headers=self.headers,
            json={
                "quotation_id": TEST_QUOTATION_ID,
                "strategy": "aggressive"
            }
        )
        assert targets_response.status_code == 200
        negotiation_id = targets_response.json()["negotiation_id"]
        
        # Step 3: Generate email
        email_response = requests.post(
            f"{BASE_URL}/api/negotiation/generate-email",
            headers=self.headers,
            json={
                "quotation_id": TEST_QUOTATION_ID,
                "negotiation_id": negotiation_id,
                "strategy": "aggressive",
                "buyer_name": "Integration Test",
                "company_name": "Test Corp"
            }
        )
        assert email_response.status_code == 200
        assert "email" in email_response.json()
        
        # Step 4: Process counter-offer
        counter_response = requests.post(
            f"{BASE_URL}/api/negotiation/counter-offer",
            headers=self.headers,
            json={
                "negotiation_id": negotiation_id,
                "their_offer": 4200
            }
        )
        assert counter_response.status_code == 200
        assert counter_response.json()["success"] is True
        
        print("Full negotiation flow completed successfully!")

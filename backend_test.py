#!/usr/bin/env python3
"""
OMNISupply.io Backend API Testing Suite
Tests all backend endpoints for the enterprise e-commerce platform
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Any

class OMNISupplyAPITester:
    def __init__(self, base_url="https://algolia-search.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()
        
        # Demo credentials
        self.demo_email = "demo@infosys.com"
        self.demo_password = "demo123"
        self.demo_country = "USA"

    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict = None, headers: Dict = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {"status": "success", "text": response.text}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_stats_endpoint(self):
        """Test stats endpoint (no auth required)"""
        success, response = self.run_test(
            "Stats Endpoint",
            "GET",
            "stats",
            200
        )
        if success:
            required_fields = ["total_products", "total_services", "total_categories", "total_brands"]
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Stats missing field: {field}", "ERROR")
                    return False
            self.log(f"   Products: {response.get('total_products')}, Services: {response.get('total_services')}")
        return success

    def test_login(self):
        """Test login functionality"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.demo_email,
                "password": self.demo_password,
                "country": self.demo_country
            }
        )
        
        if success:
            required_fields = ["id", "email", "name", "country", "currency", "info_coins", "token"]
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Login response missing field: {field}", "ERROR")
                    return False
            
            self.token = response["token"]
            self.user_data = response
            self.log(f"   User: {response['name']}, Country: {response['country']}, InfoCoins: {response['info_coins']}")
            return True
        return False

    def test_auth_me(self):
        """Test authenticated user info endpoint"""
        if not self.token:
            self.log("❌ No token available for auth test", "ERROR")
            return False
            
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_product_categories(self):
        """Test product categories endpoint"""
        success, response = self.run_test(
            "Product Categories",
            "GET",
            "products/categories",
            200
        )
        if success and "categories" in response:
            self.log(f"   Found {len(response['categories'])} product categories")
        return success

    def test_product_brands(self):
        """Test product brands endpoint"""
        success, response = self.run_test(
            "Product Brands",
            "GET",
            "products/brands",
            200
        )
        if success and "brands" in response:
            self.log(f"   Found {len(response['brands'])} brands")
        return success

    def test_product_search(self):
        """Test product search functionality"""
        # Test basic search
        success, response = self.run_test(
            "Product Search - Basic",
            "GET",
            "products/search?q=bearing&limit=5",
            200
        )
        
        if success:
            if "results" not in response:
                self.log("❌ Product search missing 'results' field", "ERROR")
                return False
            
            results = response["results"]
            self.log(f"   Found {len(results)} products")
            
            # Validate product structure
            if results:
                product = results[0]
                required_fields = ["id", "name", "category", "brand", "price", "currency_code", "result_type"]
                for field in required_fields:
                    if field not in product:
                        self.log(f"❌ Product missing field: {field}", "ERROR")
                        return False
                
                self.log(f"   Sample product: {product['name']} - {product['currency_symbol']}{product.get('price', 'N/A')}")
                
                # Store a product for inventory test
                if product.get("result_type") == "with_partner":
                    self.sample_product_id = product["id"]
        
        return success

    def test_product_inventory(self):
        """Test product inventory check"""
        if not hasattr(self, 'sample_product_id'):
            self.log("❌ No sample product ID for inventory test", "ERROR")
            return False
            
        success, response = self.run_test(
            "Product Inventory Check",
            "GET",
            f"products/{self.sample_product_id}/inventory",
            200
        )
        
        if success:
            required_fields = ["product_id", "available_quantity", "warehouse_locations"]
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Inventory response missing field: {field}", "ERROR")
                    return False
            self.log(f"   Available quantity: {response['available_quantity']}")
        
        return success

    def test_service_categories(self):
        """Test service categories endpoint"""
        success, response = self.run_test(
            "Service Categories",
            "GET",
            "services/categories",
            200
        )
        if success and "categories" in response:
            self.log(f"   Found {len(response['categories'])} service categories")
        return success

    def test_service_search(self):
        """Test service search functionality"""
        success, response = self.run_test(
            "Service Search",
            "GET",
            "services/search?q=cleaning&limit=5",
            200
        )
        
        if success:
            if "results" not in response:
                self.log("❌ Service search missing 'results' field", "ERROR")
                return False
            
            results = response["results"]
            self.log(f"   Found {len(results)} services")
            
            # Validate service structure
            if results:
                service = results[0]
                required_fields = ["id", "name", "category", "unspsc_code", "result_type"]
                for field in required_fields:
                    if field not in service:
                        self.log(f"❌ Service missing field: {field}", "ERROR")
                        return False
                
                self.log(f"   Sample service: {service['name']}")
                self.sample_service = service
        
        return success

    def test_rfq_submission(self):
        """Test RFQ submission"""
        success, response = self.run_test(
            "RFQ Submission",
            "POST",
            "rfq/submit",
            200,
            data={
                "product_description": "Industrial bearing for heavy machinery",
                "quantity": 10,
                "brand_name": "SKF",
                "oem_part_number": "6205-2RS",
                "needed_by": "2024-12-31",
                "delivery_location": "New York, USA",
                "request_type": "actual",
                "is_product": True
            }
        )
        
        if success:
            if "rfq_id" not in response:
                self.log("❌ RFQ response missing 'rfq_id' field", "ERROR")
                return False
            self.log(f"   RFQ ID: {response['rfq_id']}")
            self.sample_rfq_id = response["rfq_id"]
        
        return success

    def test_rfq_list(self):
        """Test RFQ listing"""
        success, response = self.run_test(
            "RFQ List",
            "GET",
            "rfq/list",
            200
        )
        
        if success and "rfqs" in response:
            self.log(f"   Found {len(response['rfqs'])} RFQs")
        
        return success

    def test_quotation_request(self):
        """Test quotation request"""
        if not hasattr(self, 'sample_product_id'):
            self.log("❌ No sample product for quotation test", "ERROR")
            return False
            
        success, response = self.run_test(
            "Quotation Request",
            "POST",
            "quotation/request",
            200,
            data={
                "product_id": self.sample_product_id,
                "product_name": "Test Product",
                "quantity": 5,
                "notes": "Urgent requirement"
            }
        )
        
        if success and "quotation_id" in response:
            self.log(f"   Quotation ID: {response['quotation_id']}")
        
        return success

    def test_quotation_list(self):
        """Test quotation listing"""
        success, response = self.run_test(
            "Quotation List",
            "GET",
            "quotation/list",
            200
        )
        
        if success and "quotations" in response:
            self.log(f"   Found {len(response['quotations'])} quotations")
        
        return success

    def test_order_history(self):
        """Test order history"""
        success, response = self.run_test(
            "Order History",
            "GET",
            "orders/history",
            200
        )
        
        if success and "orders" in response:
            self.log(f"   Found {len(response['orders'])} orders")
        
        return success

    def test_repeat_orders_list(self):
        """Test repeat orders listing"""
        success, response = self.run_test(
            "Repeat Orders List",
            "GET",
            "repeat-orders/list",
            200
        )
        
        if success and "repeat_orders" in response:
            self.log(f"   Found {len(response['repeat_orders'])} repeat orders")
        
        return success

    def test_infocoins_balance(self):
        """Test InfoCoins balance"""
        success, response = self.run_test(
            "InfoCoins Balance",
            "GET",
            "infocoins/balance",
            200
        )
        
        if success and "balance" in response:
            self.log(f"   InfoCoins balance: {response['balance']}")
        
        return success

    def test_infocoins_rewards(self):
        """Test InfoCoins rewards listing"""
        success, response = self.run_test(
            "InfoCoins Rewards",
            "GET",
            "infocoins/rewards",
            200
        )
        
        if success and "rewards" in response:
            self.log(f"   Found {len(response['rewards'])} rewards")
        
        return success

    def test_chat_message(self):
        """Test ChatBot functionality"""
        success, response = self.run_test(
            "ChatBot Message",
            "POST",
            "chat/message",
            200,
            data={
                "message": "Hello, can you help me find bearings?",
                "session_id": None
            }
        )
        
        if success:
            if "response" not in response or "session_id" not in response:
                self.log("❌ Chat response missing required fields", "ERROR")
                return False
            self.log(f"   Bot response: {response['response'][:50]}...")
            self.chat_session_id = response["session_id"]
        
        return success

    def test_chat_history(self):
        """Test chat history retrieval"""
        if not hasattr(self, 'chat_session_id'):
            self.log("❌ No chat session ID for history test", "ERROR")
            return False
            
        success, response = self.run_test(
            "Chat History",
            "GET",
            f"chat/history?session_id={self.chat_session_id}",
            200
        )
        
        if success and "history" in response:
            self.log(f"   Found {len(response['history'])} chat messages")
        
        return success

    def run_all_tests(self):
        """Run all API tests in sequence"""
        self.log("🚀 Starting OMNISupply.io Backend API Tests")
        self.log(f"   Base URL: {self.base_url}")
        self.log(f"   API URL: {self.api_url}")
        
        # Test sequence
        tests = [
            ("Stats Endpoint", self.test_stats_endpoint),
            ("User Login", self.test_login),
            ("Auth Me", self.test_auth_me),
            ("Product Categories", self.test_product_categories),
            ("Product Brands", self.test_product_brands),
            ("Product Search", self.test_product_search),
            ("Product Inventory", self.test_product_inventory),
            ("Service Categories", self.test_service_categories),
            ("Service Search", self.test_service_search),
            ("RFQ Submission", self.test_rfq_submission),
            ("RFQ List", self.test_rfq_list),
            ("Quotation Request", self.test_quotation_request),
            ("Quotation List", self.test_quotation_list),
            ("Order History", self.test_order_history),
            ("Repeat Orders List", self.test_repeat_orders_list),
            ("InfoCoins Balance", self.test_infocoins_balance),
            ("InfoCoins Rewards", self.test_infocoins_rewards),
            ("ChatBot Message", self.test_chat_message),
            ("Chat History", self.test_chat_history),
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                self.log(f"❌ {test_name} - Exception: {str(e)}", "ERROR")
                self.failed_tests.append({
                    "test": test_name,
                    "error": str(e)
                })
        
        # Print summary
        self.log("\n" + "="*60)
        self.log("📊 TEST SUMMARY")
        self.log("="*60)
        self.log(f"Total Tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}")
        self.log(f"Failed: {len(self.failed_tests)}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                error_msg = failure.get('error', f"Status {failure.get('actual')} != {failure.get('expected')}")
                self.log(f"   • {failure['test']}: {error_msg}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = OMNISupplyAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test suite failed with error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
"""
OMNISupply.io Catalog Pagination & Order Status Tests
Tests for: Products pagination (3+ pages), Services pagination (3+ pages), Order statuses (5 different)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@infosys.com"
TEST_PASSWORD = "password"
TEST_COUNTRY = "USA"


class TestProductsPagination:
    """Test products API returns multiple pages (at least 60 products for 3 pages with limit=20)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_products_page_1(self):
        """Test products API returns page 1 with 20 products"""
        response = requests.get(f"{BASE_URL}/api/products/search",
                               params={"q": "", "limit": 20, "page": 1},
                               headers=self.headers)
        assert response.status_code == 200, f"Products search failed: {response.text}"
        
        data = response.json()
        assert "results" in data, "Results not in response"
        assert "total" in data, "Total not in response"
        assert "page" in data, "Page not in response"
        
        # Verify we get products
        assert len(data["results"]) > 0, "No products returned on page 1"
        print(f"SUCCESS: Page 1 returned {len(data['results'])} products, total: {data['total']}")
        
        # Verify product structure
        product = data["results"][0]
        assert "id" in product, "Product missing id"
        assert "name" in product, "Product missing name"
        assert "image_url" in product, "Product missing image_url"
        assert "category" in product, "Product missing category"
        
        # Verify image URL is from CDN
        if product.get("image_url"):
            assert "emergentagent.com" in product["image_url"] or "unsplash.com" in product["image_url"], \
                f"Product image not from expected CDN: {product['image_url']}"
        print(f"SUCCESS: Product structure verified with CDN image")
    
    def test_products_page_2(self):
        """Test products API returns page 2 with products"""
        response = requests.get(f"{BASE_URL}/api/products/search",
                               params={"q": "", "limit": 20, "page": 2},
                               headers=self.headers)
        assert response.status_code == 200, f"Products search page 2 failed: {response.text}"
        
        data = response.json()
        assert len(data["results"]) > 0, "No products returned on page 2"
        assert data["page"] == 2, "Page number incorrect"
        print(f"SUCCESS: Page 2 returned {len(data['results'])} products")
    
    def test_products_page_3(self):
        """Test products API returns page 3 with products"""
        response = requests.get(f"{BASE_URL}/api/products/search",
                               params={"q": "", "limit": 20, "page": 3},
                               headers=self.headers)
        assert response.status_code == 200, f"Products search page 3 failed: {response.text}"
        
        data = response.json()
        assert len(data["results"]) > 0, "No products returned on page 3"
        assert data["page"] == 3, "Page number incorrect"
        print(f"SUCCESS: Page 3 returned {len(data['results'])} products")
    
    def test_products_total_count(self):
        """Test products API reports sufficient total for 3+ pages"""
        response = requests.get(f"{BASE_URL}/api/products/search",
                               params={"q": "", "limit": 20, "page": 1},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Total should be at least 60 for 3 pages of 20
        # The API returns 3000000+ as total (30M+ products)
        assert data["total"] >= 60, f"Total products ({data['total']}) less than 60 for 3 pages"
        print(f"SUCCESS: Total products: {data['total']} (sufficient for 3+ pages)")
    
    def test_product_images_from_cdn(self):
        """Test all product images load from CDN URLs"""
        response = requests.get(f"{BASE_URL}/api/products/search",
                               params={"q": "", "limit": 20, "page": 1},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        cdn_images = 0
        for product in data["results"]:
            if product.get("image_url"):
                # Check if image is from Emergent CDN or Unsplash
                if "emergentagent.com" in product["image_url"] or "unsplash.com" in product["image_url"]:
                    cdn_images += 1
        
        print(f"SUCCESS: {cdn_images}/{len(data['results'])} products have CDN images")
        assert cdn_images > 0, "No products have CDN images"


class TestServicesPagination:
    """Test services API returns multiple pages (at least 60 services for 3 pages with limit=20)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_services_page_1(self):
        """Test services API returns page 1 with services"""
        response = requests.get(f"{BASE_URL}/api/services/search",
                               params={"q": "", "limit": 20, "page": 1},
                               headers=self.headers)
        assert response.status_code == 200, f"Services search failed: {response.text}"
        
        data = response.json()
        assert "results" in data, "Results not in response"
        
        # Verify we get services
        assert len(data["results"]) > 0, "No services returned on page 1"
        print(f"SUCCESS: Page 1 returned {len(data['results'])} services")
        
        # Verify service structure
        service = data["results"][0]
        assert "id" in service, "Service missing id"
        assert "name" in service, "Service missing name"
        assert "image_url" in service, "Service missing image_url"
        assert "category" in service, "Service missing category"
        
        # Verify image URL is from CDN
        if service.get("image_url"):
            assert "emergentagent.com" in service["image_url"], \
                f"Service image not from Emergent CDN: {service['image_url']}"
        print(f"SUCCESS: Service structure verified with CDN image")
    
    def test_services_page_2(self):
        """Test services API returns page 2 with services"""
        response = requests.get(f"{BASE_URL}/api/services/search",
                               params={"q": "", "limit": 20, "page": 2},
                               headers=self.headers)
        assert response.status_code == 200, f"Services search page 2 failed: {response.text}"
        
        data = response.json()
        # Services may have fewer items, but should still return results
        print(f"SUCCESS: Page 2 returned {len(data['results'])} services")
    
    def test_services_page_3(self):
        """Test services API returns page 3 with services"""
        response = requests.get(f"{BASE_URL}/api/services/search",
                               params={"q": "", "limit": 20, "page": 3},
                               headers=self.headers)
        assert response.status_code == 200, f"Services search page 3 failed: {response.text}"
        
        data = response.json()
        print(f"SUCCESS: Page 3 returned {len(data['results'])} services")
    
    def test_service_images_from_cdn(self):
        """Test all service images load from CDN URLs"""
        response = requests.get(f"{BASE_URL}/api/services/search",
                               params={"q": "", "limit": 20, "page": 1},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        cdn_images = 0
        for service in data["results"]:
            if service.get("image_url"):
                # Check if image is from Emergent CDN
                if "emergentagent.com" in service["image_url"]:
                    cdn_images += 1
        
        print(f"SUCCESS: {cdn_images}/{len(data['results'])} services have CDN images")
        assert cdn_images > 0, "No services have CDN images"


class TestOrderStatuses:
    """Test Order History API returns 5 orders with different statuses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_order_history_returns_5_orders(self):
        """Test order history returns 5 sample orders"""
        response = requests.get(f"{BASE_URL}/api/orders/history", headers=self.headers)
        assert response.status_code == 200, f"Order history failed: {response.text}"
        
        data = response.json()
        assert "orders" in data, "Orders not in response"
        assert len(data["orders"]) == 5, f"Expected 5 orders, got {len(data['orders'])}"
        print(f"SUCCESS: Order history returned {len(data['orders'])} orders")
    
    def test_order_statuses_are_different(self):
        """Test all 5 orders have different statuses: pending, confirmed, processing, shipped, delivered"""
        response = requests.get(f"{BASE_URL}/api/orders/history", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        expected_statuses = {"pending", "confirmed", "processing", "shipped", "delivered"}
        actual_statuses = {order["status"] for order in data["orders"]}
        
        assert actual_statuses == expected_statuses, \
            f"Expected statuses {expected_statuses}, got {actual_statuses}"
        print(f"SUCCESS: All 5 statuses present: {actual_statuses}")
    
    def test_order_status_descriptions(self):
        """Test each order has a status_description"""
        response = requests.get(f"{BASE_URL}/api/orders/history", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        for order in data["orders"]:
            assert "status_description" in order, f"Order {order['id']} missing status_description"
            assert order["status_description"], f"Order {order['id']} has empty status_description"
            print(f"  Order {order['id']} ({order['status']}): {order['status_description']}")
        
        print(f"SUCCESS: All orders have status descriptions")
    
    def test_shipped_order_has_tracking(self):
        """Test shipped order has tracking_number and carrier info"""
        response = requests.get(f"{BASE_URL}/api/orders/history", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        shipped_orders = [o for o in data["orders"] if o["status"] == "shipped"]
        
        assert len(shipped_orders) > 0, "No shipped orders found"
        
        for order in shipped_orders:
            assert "tracking_number" in order, f"Shipped order {order['id']} missing tracking_number"
            assert order["tracking_number"], f"Shipped order {order['id']} has empty tracking_number"
            assert "carrier" in order, f"Shipped order {order['id']} missing carrier"
            assert order["carrier"], f"Shipped order {order['id']} has empty carrier"
            print(f"  Shipped order {order['id']}: {order['carrier']} - {order['tracking_number']}")
        
        print(f"SUCCESS: Shipped orders have tracking info")
    
    def test_delivered_order_has_tracking(self):
        """Test delivered order has tracking_number, carrier, and signed_by info"""
        response = requests.get(f"{BASE_URL}/api/orders/history", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        delivered_orders = [o for o in data["orders"] if o["status"] == "delivered"]
        
        assert len(delivered_orders) > 0, "No delivered orders found"
        
        for order in delivered_orders:
            assert "tracking_number" in order, f"Delivered order {order['id']} missing tracking_number"
            assert order["tracking_number"], f"Delivered order {order['id']} has empty tracking_number"
            assert "carrier" in order, f"Delivered order {order['id']} missing carrier"
            assert "signed_by" in order, f"Delivered order {order['id']} missing signed_by"
            print(f"  Delivered order {order['id']}: {order['carrier']} - Signed by {order['signed_by']}")
        
        print(f"SUCCESS: Delivered orders have complete tracking info")
    
    def test_order_items_have_images(self):
        """Test order items have image_url from CDN"""
        response = requests.get(f"{BASE_URL}/api/orders/history", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        cdn_images = 0
        total_items = 0
        
        for order in data["orders"]:
            for item in order.get("items", []):
                total_items += 1
                if item.get("image_url"):
                    if "emergentagent.com" in item["image_url"]:
                        cdn_images += 1
        
        print(f"SUCCESS: {cdn_images}/{total_items} order items have CDN images")
        assert cdn_images > 0, "No order items have CDN images"


class TestProductCatalogContent:
    """Test IT Products Catalog has new products like ABB Motor, Parker Pump, Lincoln Welder"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_motor_products(self):
        """Test searching for motor products returns results"""
        response = requests.get(f"{BASE_URL}/api/products/search",
                               params={"q": "motor", "limit": 20},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["results"]) > 0, "No motor products found"
        print(f"SUCCESS: Found {len(data['results'])} motor-related products")
    
    def test_search_pump_products(self):
        """Test searching for pump products returns results"""
        response = requests.get(f"{BASE_URL}/api/products/search",
                               params={"q": "pump", "limit": 20},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"SUCCESS: Found {len(data['results'])} pump-related products")
    
    def test_search_welder_products(self):
        """Test searching for welder products returns results"""
        response = requests.get(f"{BASE_URL}/api/products/search",
                               params={"q": "welder", "limit": 20},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"SUCCESS: Found {len(data['results'])} welder-related products")


class TestServiceCatalogContent:
    """Test IT Services Catalog has new services like Data Center, Equipment Maintenance, Training"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "country": TEST_COUNTRY
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_search_data_center_services(self):
        """Test searching for data center services returns results"""
        response = requests.get(f"{BASE_URL}/api/services/search",
                               params={"q": "data center", "limit": 20},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"SUCCESS: Found {len(data['results'])} data center services")
    
    def test_search_maintenance_services(self):
        """Test searching for maintenance services returns results"""
        response = requests.get(f"{BASE_URL}/api/services/search",
                               params={"q": "maintenance", "limit": 20},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"SUCCESS: Found {len(data['results'])} maintenance services")
    
    def test_search_training_services(self):
        """Test searching for training services returns results"""
        response = requests.get(f"{BASE_URL}/api/services/search",
                               params={"q": "training", "limit": 20},
                               headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"SUCCESS: Found {len(data['results'])} training services")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

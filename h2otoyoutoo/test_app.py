import requests
import json
import time

BASE_URL = 'http://127.0.0.1:5000'

def run_tests():
    session = requests.Session()

    print("1. Testing Registration for Resident...")
    reg_data = {
        'role': 'resident',
        'identifier': '502',
        'password': 'testpassresident'
    }
    r = session.post(f"{BASE_URL}/api/register", json=reg_data)
    print("Register Status:", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()['username'] == 'flat-502'

    print("\n2. Testing Registration for Supplier...")
    reg_sup = {
        'role': 'supplier',
        'identifier': 'HydroSuper',
        'password': 'testpasssupplier'
    }
    r = session.post(f"{BASE_URL}/api/register", json=reg_sup)
    print("Supplier Register Status:", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()['username'] == 'supply-HydroSuper'

    print("\n3. Testing Registration for Admin...")
    reg_adm = {
        'role': 'admin',
        'identifier': 'HQ99',
        'password': 'testpassadmin'
    }
    r = session.post(f"{BASE_URL}/api/register", json=reg_adm)
    print("Admin Register Status:", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()['username'] == 'admin-HQ99'

    print("\n4. Testing Login as Resident (flat-502)...")
    r = session.post(f"{BASE_URL}/api/login", json={'username': 'flat-502', 'password': 'testpassresident'})
    print("Login Status:", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()['redirect_role'] == 'resident'

    print("\n5. Testing Resident Water Request <= 20L (Should Auto-Approve)...")
    r = session.post(f"{BASE_URL}/api/requests", json={'liters': 18, 'purpose': 'Drinking'})
    print("Request <=20L:", r.json())
    assert r.json()['request']['admin_status'] == 'auto_approved'

    print("\n6. Testing Resident Water Request > 20L (Should Require Admin Approval)...")
    r = session.post(f"{BASE_URL}/api/requests", json={'liters': 45, 'purpose': 'Tank Clean'})
    print("Request >20L:", r.json())
    req_high_id = r.json()['request']['id']
    assert r.json()['request']['admin_status'] == 'pending'
    assert r.json()['request']['needs_admin_approval'] == True

    print("\n7. Testing Login as Admin (admin-001)...")
    admin_session = requests.Session()
    r = admin_session.post(f"{BASE_URL}/api/login", json={'username': 'admin-001', 'password': 'admin123'})
    assert r.status_code == 200

    print("\n8. Admin Approving >20L Water Request...")
    r = admin_session.post(f"{BASE_URL}/api/requests/{req_high_id}/verify", json={'action': 'approve', 'notes': 'Approved by society secretary.'})
    print("Admin verify response:", r.json())
    assert r.status_code == 200

    print("\n9. Testing Login as Supplier (supply-AquaFlow)...")
    sup_session = requests.Session()
    r = sup_session.post(f"{BASE_URL}/api/login", json={'username': 'supply-AquaFlow', 'password': 'water123'})
    assert r.status_code == 200

    print("\n10. Supplier Setting Delivery Timing...")
    r = sup_session.post(f"{BASE_URL}/api/requests/{req_high_id}/schedule", json={'delivery_timing': 'Today at 06:15 PM', 'delivery_status': 'scheduled'})
    print("Supplier schedule response:", r.json())
    assert r.status_code == 200

    print("\n11. Verifying Resident Sees Supplier Timing...")
    r = session.get(f"{BASE_URL}/api/requests")
    reqs = r.json()['requests']
    matching = [x for x in reqs if x['id'] == req_high_id][0]
    print(f"Resident Request #{matching['request_code']} timing: '{matching['delivery_timing']}', status: '{matching['delivery_status']}'")
    assert matching['delivery_timing'] == 'Today at 06:15 PM'

    print("\n[SUCCESS] ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()

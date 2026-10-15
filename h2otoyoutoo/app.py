import os
import random
import string
from datetime import datetime
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from database import get_db, init_db, seed_sample_data

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'h2otoyoutoo_secret_key_water_is_life_2026'

# Ensure database is initialized
init_db()
seed_sample_data()

def generate_request_code(identifier):
    clean_id = ''.join(c for c in identifier if c.isalnum())[:6] or 'GEN'
    random_digits = ''.join(random.choices(string.digits, k=4))
    return f"REQ-{clean_id}-{random_digits}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/me', methods=['GET'])
def get_current_user():
    username = session.get('username')
    if not username:
        return jsonify({'logged_in': False})
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, role, identifier FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        session.clear()
        return jsonify({'logged_in': False})

    return jsonify({
        'logged_in': True,
        'user': {
            'id': row['id'],
            'username': row['username'],
            'role': row['role'],
            'identifier': row['identifier']
        }
    })

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    role = data.get('role', '').strip().lower()
    raw_id = data.get('identifier', '').strip()
    password = data.get('password', '').strip()

    if not role or role not in ['resident', 'supplier', 'admin']:
        return jsonify({'success': False, 'message': 'Please select a valid role (Resident, Supplier, or Admin).'}), 400

    if not raw_id:
        name_map = {'resident': 'Flat Number', 'supplier': 'Supplier Name', 'admin': 'Admin ID'}
        return jsonify({'success': False, 'message': f'Please provide your {name_map.get(role, "Identifier")}.'}), 400

    if not password:
        return jsonify({'success': False, 'message': 'Please choose a password.'}), 400

    # Format username based on user specifications:
    # Resident: flat-<flatnumber>
    # Supplier: supply-<suppliername>
    # Admin: admin-<adminid>
    # Sanitize identifier to eliminate spaces for clean URL/username handling
    clean_identifier = raw_id.replace(' ', '')
    if role == 'resident':
        generated_username = f"flat-{clean_identifier}"
    elif role == 'supplier':
        generated_username = f"supply-{clean_identifier}"
    elif role == 'admin':
        generated_username = f"admin-{clean_identifier}"
    else:
        return jsonify({'success': False, 'message': 'Invalid role.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Check if username exists
    cursor.execute('SELECT id FROM users WHERE username = ?', (generated_username,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'message': f'Username "{generated_username}" already exists. Please use a unique identifier or log in.'}), 409

    cursor.execute(
        'INSERT INTO users (username, role, identifier, password) VALUES (?, ?, ?, ?)',
        (generated_username, role, raw_id, password)
    )
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'username': generated_username,
        'password': password,
        'role': role,
        'identifier': raw_id,
        'message': 'Account registered successfully!'
    })

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'success': False, 'message': 'Please enter both username and password.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'success': False, 'message': f'User "{username}" not found. Please check your username or register as a new user.'}), 404

    if user['password'] != password:
        return jsonify({'success': False, 'message': 'Incorrect password. Please try again.'}), 401

    # Verify role prefix
    role = user['role']
    if role == 'resident' and not username.startswith('flat-'):
        return jsonify({'success': False, 'message': 'Invalid resident username format (expected flat-<flatnumber>).'}), 400
    if role == 'supplier' and not username.startswith('supply-'):
        return jsonify({'success': False, 'message': 'Invalid supplier username format (expected supply-<suppliername>).'}), 400
    if role == 'admin' and not username.startswith('admin-'):
        return jsonify({'success': False, 'message': 'Invalid admin username format (expected admin-<adminid>).'}), 400

    session['username'] = user['username']
    session['role'] = user['role']

    return jsonify({
        'success': True,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'identifier': user['identifier']
        },
        'redirect_role': role
    })

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully.'})

@app.route('/api/requests', methods=['GET'])
def list_requests():
    username = session.get('username')
    role = session.get('role')

    conn = get_db()
    cursor = conn.cursor()

    if role == 'resident':
        # Show requests made by this resident (Emergency prioritized to top)
        cursor.execute('''
            SELECT * FROM water_requests 
            WHERE username = ? 
            ORDER BY 
                CASE WHEN purpose LIKE '%Emergency%' THEN 0 ELSE 1 END,
                created_at DESC
        ''', (username,))
    elif role == 'supplier':
        # Suppliers can see all approved requests (Emergency prioritized to top)
        cursor.execute('''
            SELECT * FROM water_requests 
            WHERE admin_status IN ('auto_approved', 'approved')
            ORDER BY 
                CASE WHEN purpose LIKE '%Emergency%' THEN 0 ELSE 1 END,
                CASE delivery_status 
                    WHEN 'pending' THEN 1 
                    WHEN 'scheduled' THEN 2 
                    WHEN 'in_transit' THEN 3 
                    WHEN 'delivered' THEN 4 
                    ELSE 5 
                END,
                created_at DESC
        ''')
    elif role == 'admin':
        # Admin sees all requests (Emergency prioritized to top)
        cursor.execute('''
            SELECT * FROM water_requests 
            ORDER BY 
                CASE WHEN purpose LIKE '%Emergency%' THEN 0 ELSE 1 END,
                CASE 
                    WHEN needs_admin_approval = 1 AND admin_status = 'pending' THEN 0 
                    ELSE 1 
                END,
                created_at DESC
        ''')
    else:
        # Default or fallback
        cursor.execute('''
            SELECT * FROM water_requests 
            ORDER BY 
                CASE WHEN purpose LIKE '%Emergency%' THEN 0 ELSE 1 END,
                created_at DESC 
            LIMIT 50
        ''')

    rows = cursor.fetchall()
    conn.close()

    requests_list = []
    for row in rows:
        requests_list.append({
            'id': row['id'],
            'request_code': row['request_code'],
            'flat_number': row['flat_number'],
            'username': row['username'],
            'liters': row['liters'],
            'purpose': row['purpose'],
            'needs_admin_approval': bool(row['needs_admin_approval']),
            'admin_status': row['admin_status'],
            'admin_verified_by': row['admin_verified_by'],
            'admin_notes': row['admin_notes'],
            'supplier_username': row['supplier_username'],
            'delivery_timing': row['delivery_timing'],
            'delivery_status': row['delivery_status'],
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })

    return jsonify({'success': True, 'requests': requests_list})

@app.route('/api/requests', methods=['POST'])
def create_request():
    username = session.get('username')
    role = session.get('role')

    if not username or role != 'resident':
        return jsonify({'success': False, 'message': 'Only registered residents can request water.'}), 403

    data = request.get_json() or {}
    try:
        liters = float(data.get('liters', 0))
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Please specify a valid numeric water amount in liters.'}), 400

    if liters <= 0:
        return jsonify({'success': False, 'message': 'Water amount must be greater than 0 Liters.'}), 400

    purpose = data.get('purpose', 'General Household').strip() or 'General Household'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT identifier FROM users WHERE username = ?', (username,))
    user_row = cursor.fetchone()
    flat_number = user_row['identifier'] if user_row else username.replace('flat-', '')

    request_code = generate_request_code(flat_number)
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Approval Rule:
    # "verify if the water requirement by the resident is valid and approve it but this is only required if ordered water exceeds 20L"
    if liters > 20.0:
        needs_admin_approval = 1
        admin_status = 'pending'
        delivery_status = 'pending' # Waiting for admin approval
    else:
        needs_admin_approval = 0
        admin_status = 'auto_approved' # Auto-approved since <= 20L
        delivery_status = 'approved'   # Direct to supplier for scheduling

    cursor.execute('''
        INSERT INTO water_requests (
            request_code, flat_number, username, liters, purpose, 
            needs_admin_approval, admin_status, delivery_status, 
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (request_code, flat_number, username, liters, purpose, 
          needs_admin_approval, admin_status, delivery_status, now, now))
    
    req_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Water request for {liters}L submitted successfully!',
        'request': {
            'id': req_id,
            'request_code': request_code,
            'liters': liters,
            'needs_admin_approval': bool(needs_admin_approval),
            'admin_status': admin_status,
            'delivery_status': delivery_status
        }
    })

@app.route('/api/requests/<int:req_id>/verify', methods=['POST'])
def verify_request(req_id):
    username = session.get('username')
    role = session.get('role')

    if not username or role != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized: Admin access required.'}), 403

    data = request.get_json() or {}
    action = data.get('action', 'approve').strip().lower() # 'approve' or 'reject'
    notes = data.get('notes', '').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM water_requests WHERE id = ?', (req_id,))
    req = cursor.fetchone()

    if not req:
        conn.close()
        return jsonify({'success': False, 'message': 'Request not found.'}), 404

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if action == 'approve':
        new_admin_status = 'approved'
        new_delivery_status = 'approved' # Now available to suppliers
        msg = f"Request #{req['request_code']} ({req['liters']}L) has been approved by {username}."
    else:
        new_admin_status = 'rejected'
        new_delivery_status = 'rejected'
        msg = f"Request #{req['request_code']} has been rejected."

    cursor.execute('''
        UPDATE water_requests 
        SET admin_status = ?, admin_verified_by = ?, admin_notes = ?, 
            delivery_status = ?, updated_at = ?
        WHERE id = ?
    ''', (new_admin_status, username, notes, new_delivery_status, now, req_id))

    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': msg})

@app.route('/api/requests/<int:req_id>/schedule', methods=['POST'])
def schedule_timing(req_id):
    username = session.get('username')
    role = session.get('role')

    if not username or role != 'supplier':
        return jsonify({'success': False, 'message': 'Unauthorized: Supplier access required.'}), 403

    data = request.get_json() or {}
    delivery_timing = data.get('delivery_timing', '').strip()
    new_status = data.get('delivery_status', 'scheduled').strip()

    if not delivery_timing:
        return jsonify({'success': False, 'message': 'Please provide the delivery timing/estimated arrival time.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM water_requests WHERE id = ?', (req_id,))
    req = cursor.fetchone()

    if not req:
        conn.close()
        return jsonify({'success': False, 'message': 'Request not found.'}), 404

    # Check if request is approved
    if req['admin_status'] not in ['auto_approved', 'approved']:
        conn.close()
        return jsonify({'success': False, 'message': 'Cannot schedule delivery: This request requires admin verification.'}), 400

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    cursor.execute('''
        UPDATE water_requests 
        SET delivery_timing = ?, supplier_username = ?, delivery_status = ?, updated_at = ?
        WHERE id = ?
    ''', (delivery_timing, username, new_status, now, req_id))

    conn.commit()
    conn.close()

    return jsonify({
        'success': True, 
        'message': f"Delivery timing updated to '{delivery_timing}' for Request #{req['request_code']}."
    })

@app.route('/api/requests/<int:req_id>/status', methods=['POST'])
def update_status(req_id):
    username = session.get('username')
    role = session.get('role')

    if not username or role not in ['supplier', 'admin']:
        return jsonify({'success': False, 'message': 'Unauthorized.'}), 403

    data = request.get_json() or {}
    new_status = data.get('delivery_status', '').strip()
    if new_status not in ['scheduled', 'in_transit', 'delivered', 'cancelled']:
        return jsonify({'success': False, 'message': 'Invalid status.'}), 400

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE water_requests 
        SET delivery_status = ?, updated_at = ?
        WHERE id = ?
    ''', (new_status, now, req_id))
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': f'Delivery status updated to {new_status}.'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*), COALESCE(SUM(liters), 0) FROM water_requests')
    total_reqs, total_liters = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) FROM water_requests WHERE needs_admin_approval = 1 AND admin_status = 'pending'")
    pending_approvals = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM water_requests WHERE delivery_status IN ('scheduled', 'in_transit')")
    active_deliveries = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM water_requests WHERE delivery_status = 'delivered'")
    completed_deliveries = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'resident'")
    total_residents = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'supplier'")
    total_suppliers = cursor.fetchone()[0]

    conn.close()

    return jsonify({
        'success': True,
        'stats': {
            'total_requests': total_reqs,
            'total_liters': round(total_liters, 1),
            'pending_approvals': pending_approvals,
            'active_deliveries': active_deliveries,
            'completed_deliveries': completed_deliveries,
            'total_residents': total_residents,
            'total_suppliers': total_suppliers,
            'domain': 'h2otoyoutoo.in'
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f">> H2O To You Too (h2otoyoutoo.in) server running on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)

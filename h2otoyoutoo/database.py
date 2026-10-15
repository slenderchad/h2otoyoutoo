import sqlite3
import os
import random
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'h2o.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Create Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            identifier TEXT NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create Water Requests table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS water_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_code TEXT UNIQUE NOT NULL,
            flat_number TEXT NOT NULL,
            username TEXT NOT NULL,
            liters REAL NOT NULL,
            purpose TEXT DEFAULT 'Drinking & Cooking',
            needs_admin_approval INTEGER DEFAULT 0,
            admin_status TEXT DEFAULT 'auto_approved',
            admin_verified_by TEXT,
            admin_notes TEXT,
            supplier_username TEXT,
            delivery_timing TEXT,
            delivery_status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

def seed_sample_data():
    conn = get_db()
    cursor = conn.cursor()

    # Seed initial demo accounts if users table is empty
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        demo_users = [
            ('flat-101', 'resident', '101', 'water123'),
            ('flat-204', 'resident', '204', 'water123'),
            ('flat-405', 'resident', '405', 'water123'),
            ('supply-AquaFlow', 'supplier', 'AquaFlow', 'water123'),
            ('supply-BlueWave', 'supplier', 'BlueWave', 'water123'),
            ('admin-001', 'admin', '001', 'admin123')
        ]
        cursor.executemany(
            'INSERT INTO users (username, role, identifier, password) VALUES (?, ?, ?, ?)',
            demo_users
        )

        # Seed sample requests demonstrating both <= 20L and > 20L scenarios
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        demo_requests = [
            # <= 20L request: auto approved, timing scheduled
            ('REQ-101-7001', '101', 'flat-101', 15.0, 'Drinking & Cooking', 0, 'auto_approved', None, 'Standard order under 20L limit', 'supply-AquaFlow', 'Today at 05:00 PM', 'scheduled', now, now),
            # > 20L request: pending admin verification
            ('REQ-204-7002', '204', 'flat-204', 35.0, 'Family Event / Gathering', 1, 'pending', None, None, None, None, 'pending', now, now),
            # > 20L request: already approved by admin, awaiting supplier timing
            ('REQ-405-7003', '405', 'flat-405', 50.0, 'Tank Maintenance Cleaning', 1, 'approved', 'admin-001', 'Verified with society office. Approved for tank fill.', None, None, 'approved', now, now),
            # <= 20L request: completed delivery
            ('REQ-101-7004', '101', 'flat-101', 20.0, 'Daily Dispenser Refill', 0, 'auto_approved', None, 'Standard order', 'supply-BlueWave', 'Completed at 02:15 PM', 'delivered', now, now)
        ]

        cursor.executemany('''
            INSERT INTO water_requests (
                request_code, flat_number, username, liters, purpose, 
                needs_admin_approval, admin_status, admin_verified_by, 
                admin_notes, supplier_username, delivery_timing, 
                delivery_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', demo_requests)

        conn.commit()

    conn.close()

if __name__ == '__main__':
    init_db()
    seed_sample_data()
    print("Database initialized and sample data seeded successfully!")

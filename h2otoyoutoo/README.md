# 💧 H2O To You Too (`h2otoyoutoo.in`)

A comprehensive, aquatic-themed residential water management and distribution platform built with Python (Flask), SQLite, and modern responsive CSS/JavaScript.

---

## 🌊 Key Features & System Requirements

### 1. Water-Themed Visual Experience
- Aquatic glassmorphism UI with oceanic color palettes (`#00d4ff`, `#0a2540`).
- Floating water bubble particles, ambient aquatic glow, animated water waves.
- Interactive **liquid water tank visualizer** that fills dynamically as residents adjust liter volume.

### 2. Role-Based Account System & Dynamic Username Formatting
On the **Registration Page**, users select their role and enter their specific identifier:
- **Resident**: Inputs **Flat Number** $\rightarrow$ Generated Username: `flat-<flatnumber>` (e.g. `flat-101`, `flat-402`)
- **Supplier**: Inputs **Supplier Name** $\rightarrow$ Generated Username: `supply-<suppliername>` (e.g. `supply-AquaFlow`, `supply-BlueStream`)
- **Admin**: Inputs **Admin ID** $\rightarrow$ Generated Username: `admin-<adminid>` (e.g. `admin-001`, `admin-HQ`)
- **Password**: User sets their custom password.
- **Mandatory Credential Display Modal**:
  - Displays the generated username and password in a prominent modal dialog.
  - Keeps the credentials on screen until the user presses **"OK • Proceed to Login"**.
  - Once "OK" is pressed, redirects the user to the main Login page and pre-fills their username.

### 3. Role-Based Login & Routing
- Logging in as `flat-<flatnumber>` $\rightarrow$ Redirects to **Resident Portal**.
- Logging in as `supply-<suppliername>` $\rightarrow$ Redirects to **Supplier Portal**.
- Logging in as `admin-<adminid>` $\rightarrow$ Redirects to **Admin Portal**.

### 4. Resident Portal (`flat-<flatnumber>`)
- Water Request Form with volume presets (10L, 15L, 20L, 35L, 50L, 100L) and slider.
- Real-time **Water Tank Visualizer** showing container water height.
- Quota notification:
  - $\le 20\text{L}$: Auto-Approved immediately and sent to suppliers.
  - $> 20\text{L}$: Notifies user that Society Admin approval is required.
- **My Requests Table**: Shows Request Code, Quantity, Purpose, Admin Verification Status, Supplier House Arrival Timing, and Delivery State.

### 5. Supplier Portal (`supply-<suppliername>`)
- Shows all approved requests ready for fulfillment.
- Input estimated **delivery timing** by which water will reach the house (e.g. *"Today at 5:00 PM"*).
- Instant status updates: *"🚚 In Transit"*, *"✅ Delivered"*.
- Changes are instantly synced to the resident and admin dashboards.

### 6. Admin Portal (`admin-<adminid>`)
- High-level analytics: Total Liters Ordered, Total Requests, Pending >20L Approvals, Deliveries in Progress.
- **Water Verification Queue (> 20L Rule)**:
  - Specifically flags requests exceeding 20L.
  - Admin can verify and click **"✅ Verify & Approve"** or **"❌ Reject"**.
  - Verified orders are immediately unlocked for suppliers to assign delivery timings.
- **Master Society Requests & Supplier Timings Ledger**:
  - View all user requests together with supplier assigned timings in one unified view.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Flask (`pip install flask`)

### 2. Run the Server
From the project folder:
```powershell
python database.py
python app.py
```
Or double-click `start.bat`.

### 3. Open in Browser
Navigate to:
```
http://127.0.0.1:5000
```

---

## 🔑 Demo Test Accounts

The database comes pre-seeded with sample data so you can test all roles immediately:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Resident** | `flat-101` | `water123` | Request water, view request IDs & timings |
| **Resident** | `flat-204` | `water123` | Has active >20L request pending admin check |
| **Supplier** | `supply-AquaFlow` | `water123` | Set delivery arrival timings & dispatch |
| **Admin** | `admin-001` | `admin123` | Verify >20L orders, oversee society timings |

---

## 🌐 GoDaddy Custom Domain (`h2otoyoutoo.in`)

For complete step-by-step instructions on pointing your GoDaddy domain `h2otoyoutoo.in` to this app, refer to [GODADDY_SETUP.md](file:///C:/Users/mohit/.gemini/antigravity/scratch/h2otoyoutoo/GODADDY_SETUP.md).

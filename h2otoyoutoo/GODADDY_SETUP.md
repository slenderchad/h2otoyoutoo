# GoDaddy Domain Configuration Guide for `h2otoyoutoo.in`

This guide explains how to connect your domain **`h2otoyoutoo.in`** purchased on **GoDaddy** to your live **H2O To You Too** water distribution application.

---

## 1. Architecture Overview

```
                      +-----------------------------+
                      |   User Visits In Browser    |
                      |   https://h2otoyoutoo.in    |
                      +--------------+--------------+
                                     |
                                     v
                       +---------------------------+
                       |    GoDaddy DNS Servers    |
                       |    (A & CNAME Records)    |
                       +-------------+-------------+
                                     |
                                     v
                       +---------------------------+
                       |     Web / Cloud Host      |
                       | (Render, PythonAnywhere,  |
                       |    VPS, DigitalOcean)     |
                       |       [Flask App]         |
                       +---------------------------+
```

---

## 2. Choosing Where to Host the Website

You have several easy and budget-friendly choices to host this Python/Flask application:

### Option A: Render.com (Recommended - Free & Instant SSL)
1. Push this folder to a GitHub repository.
2. Sign up on [Render.com](https://render.com) (Free tier available).
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Set:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python app.py` (or `gunicorn app:app`)
6. Render will assign you a URL like `h2otoyoutoo.onrender.com`.
7. In the Render Dashboard, go to **Settings** -> **Custom Domains**, and add:
   - `h2otoyoutoo.in`
   - `www.h2otoyoutoo.in`
8. Render will display the exact DNS records to put in GoDaddy.

---

### Option B: Cloud VPS (DigitalOcean Droplet, Linode, AWS EC2, or Hostinger VPS)
If you deploy to a Linux VPS (Ubuntu):
1. Copy the code to `/var/www/h2otoyoutoo`.
2. Install Python, virtualenv, and dependencies:
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv nginx certbot python3-certbot-nginx -y
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt gunicorn
   ```
3. Run with Gunicorn & systemd on port `5000`.
4. Point Nginx reverse proxy to `http://127.0.0.1:5000`.
5. Get free automatic SSL with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d h2otoyoutoo.in -d www.h2otoyoutoo.in
   ```

---

## 3. Configuring DNS in GoDaddy

1. Log into your [GoDaddy Account](https://account.godaddy.com/).
2. Navigate to **My Products** -> Click **DNS** next to **`h2otoyoutoo.in`** (or go to [GoDaddy DNS Management](https://dcc.godaddy.com/manage/dns)).
3. Under **DNS Records**, add or edit the following:

### If using a VPS (IP Address based):
| Type | Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `YOUR_SERVER_PUBLIC_IP` (e.g. `165.22.45.10`) | `1 Hour` (or `600 seconds`) |
| **CNAME** | `www` | `@` | `1 Hour` |

### If using Render / PaaS:
| Type | Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `216.24.57.1` (Provided by Render) | `1 Hour` |
| **CNAME** | `www` | `h2otoyoutoo.onrender.com` | `1 Hour` |

> [!NOTE]
> DNS propagation typically takes between **10 minutes to 24 hours** (usually around 15–30 minutes). You can check propagation on [whatsmydns.net](https://www.whatsmydns.net/#A/h2otoyoutoo.in).

---

## 4. Testing Your Domain

Once the DNS propagates:
- Open `https://h2otoyoutoo.in` in your browser.
- Ensure the SSL padlock 🔒 appears in the address bar.
- Test the resident water request flow, supplier arrival timing, and admin verification (>20L).

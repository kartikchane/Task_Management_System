# Hostinger VPS Deployment

Use this guide for Hostinger KVM 4 with Ubuntu 22.04 or 24.04.

## 1. Point Domain

In your domain DNS, add:

```text
A record: @      -> YOUR_VPS_IP
A record: www    -> YOUR_VPS_IP
```

Wait until DNS resolves.

## 2. Login To VPS

```bash
ssh root@YOUR_VPS_IP
```

## 3. Install Server Tools

```bash
apt update && apt upgrade -y
apt install -y nginx git curl ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

## 4. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

## 5. Upload Project

Recommended path:

```bash
mkdir -p /var/www
cd /var/www
git clone YOUR_GITHUB_REPO_URL taskflow
cd taskflow
```

If you upload ZIP manually, extract it into:

```text
/var/www/taskflow
```

## 6. Backend Setup

```bash
cd /var/www/taskflow/server
npm install --omit=dev
cp .env.example .env
nano .env
```

Production `.env` example:

```env
PORT=5000
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/taskflow
JWT_SECRET=put_a_long_random_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=https://yourdomain.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=chanekarkartik2@gmail.com
SMTP_PASS=your_gmail_app_password_without_spaces
SMTP_FROM="Ganesh Gauri Industries <chanekarkartik2@gmail.com>"
UPLOAD_PROVIDER=local
```

Start backend:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

After `pm2 startup`, run the command PM2 prints.

## 7. Frontend Build

```bash
cd /var/www/taskflow/client
npm install
nano .env.production
```

Add:

```env
VITE_API_URL=https://yourdomain.com/api
```

Build:

```bash
npm run build
```

## 8. Nginx Config

Create:

```bash
nano /etc/nginx/sites-available/taskflow
```

Paste:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/taskflow/client/dist;
    index index.html;

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable:

```bash
ln -s /etc/nginx/sites-available/taskflow /etc/nginx/sites-enabled/taskflow
nginx -t
systemctl reload nginx
```

## 9. SSL Certificate

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 10. Create First Super Admin

If database is empty, run a one-time reset/seed script locally or create a production seed command. Do not keep demo users in production.

Current login after your reset:

```text
Email: superadmin@taskflow.com
Password: Password@123
```

Change the password after first login.

## 11. Useful Commands

```bash
pm2 status
pm2 logs taskflow-api
pm2 restart taskflow-api
systemctl status nginx
nginx -t
```

After code changes:

```bash
cd /var/www/taskflow
git pull
cd server && npm install --omit=dev && pm2 restart taskflow-api
cd ../client && npm install && npm run build
systemctl reload nginx
```

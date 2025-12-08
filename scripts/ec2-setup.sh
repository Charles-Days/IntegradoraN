#!/bin/bash
# EC2 Setup Script for Hotel Housekeeping PWA
# Run this after SSH into your Ubuntu EC2 instance

set -e

echo "=========================================="
echo "1. Updating system packages..."
echo "=========================================="
sudo apt update && sudo apt upgrade -y

echo "=========================================="
echo "2. Installing Node.js 20 LTS..."
echo "=========================================="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=========================================="
echo "3. Installing Docker..."
echo "=========================================="
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

echo "=========================================="
echo "4. Installing Jenkins..."
echo "=========================================="
sudo wget -O /usr/share/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update
sudo apt install -y fontconfig openjdk-17-jre jenkins

# Start Jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins

# Add Jenkins to docker group
sudo usermod -aG docker jenkins

echo "=========================================="
echo "5. Installing Git..."
echo "=========================================="
sudo apt install -y git

echo "=========================================="
echo "6. Creating app directory..."
echo "=========================================="
sudo mkdir -p /var/www/hotel-housekeeping
sudo chown -R $USER:$USER /var/www/hotel-housekeeping

echo "=========================================="
echo "7. Cloning repository..."
echo "=========================================="
cd /var/www/hotel-housekeeping
# Replace with your actual GitHub repository URL
# git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

echo "=========================================="
echo "SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Log out and log back in (for docker group to take effect)"
echo "2. Get Jenkins initial password:"
echo "   sudo cat /var/lib/jenkins/secrets/initialAdminPassword"
echo "3. Access Jenkins at: http://YOUR_EC2_PUBLIC_IP:8080"
echo "4. Clone your repo:"
echo "   cd /var/www/hotel-housekeeping"
echo "   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git ."
echo "5. Create .env file with your configuration"
echo "6. Run: docker compose up -d"
echo ""
echo "Versions installed:"
node --version
npm --version
docker --version
java --version

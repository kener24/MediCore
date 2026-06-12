#!/usr/bin/env bash
set -euo pipefail

sudo apt update
sudo apt install -y python3-venv python3-dev build-essential default-libmysqlclient-dev pkg-config mysql-server nginx git curl

sudo systemctl enable --now mysql
sudo systemctl enable --now nginx

echo "Bootstrap complete. Create the MySQL database/user and then run the deployment steps."

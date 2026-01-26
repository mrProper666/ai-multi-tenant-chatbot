#!/bin/bash

# Script to grant permissions to app_user
# This script connects as postgres superuser to grant permissions

DB_NAME="app_dev"
DB_USER="app_user"

echo "Granting permissions to $DB_USER on database $DB_NAME..."
echo "You may be prompted for the postgres user password"

psql -U postgres -d "$DB_NAME" <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
  echo "✓ Permissions granted successfully!"
else
  echo "✗ Failed to grant permissions. Make sure you're running as a user with postgres access."
  echo "  You can also run manually: psql -U postgres -d $DB_NAME -f scripts/grant-permissions.sql"
fi

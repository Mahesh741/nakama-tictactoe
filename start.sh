#!/bin/sh
echo "Database address: $NAKAMA_DATABASE_ADDRESS"
/nakama/nakama migrate up --database.address "$NAKAMA_DATABASE_ADDRESS"
exec /nakama/nakama --name nakama1 --database.address "$NAKAMA_DATABASE_ADDRESS" --logger.level DEBUG
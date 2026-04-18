FROM heroiclabs/nakama:3.22.0

COPY build/ /nakama/data/modules/

EXPOSE 7349 7350 7351

ENTRYPOINT ["/bin/sh", "-c", "/nakama/nakama migrate up --database.address $NAKAMA_DATABASE_ADDRESS && exec /nakama/nakama --name nakama1 --database.address $NAKAMA_DATABASE_ADDRESS --logger.level DEBUG"]
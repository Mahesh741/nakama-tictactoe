FROM heroiclabs/nakama:3.22.0

COPY build/ /nakama/data/modules/
COPY start.sh /nakama/start.sh

RUN chmod +x /nakama/start.sh

EXPOSE 7349 7350 7351

ENTRYPOINT ["/nakama/start.sh"]
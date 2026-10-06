FROM livekit/livekit-server:latest

RUN apk add --no-cache socat tini bind-tools ca-certificates

COPY infra/livekit/railway/entrypoint.sh /railway-entrypoint.sh
RUN chmod +x /railway-entrypoint.sh

ENV TINI_SUBREAPER=1 \
    TINI_KILL_PROCESS_GROUP=1

EXPOSE 7880
ENTRYPOINT ["/railway-entrypoint.sh"]

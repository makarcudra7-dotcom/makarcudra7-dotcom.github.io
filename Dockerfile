FROM caddy:2-alpine

RUN apk add --no-cache nodejs

WORKDIR /srv
COPY . .

ENV PORT=8080
ENV PV_SCHEDULER_INTERVAL_SECONDS=15

EXPOSE 8080

CMD ["/bin/sh", "/srv/scripts/start-site-with-scheduler.sh"]

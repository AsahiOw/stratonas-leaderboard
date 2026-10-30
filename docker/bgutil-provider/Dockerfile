FROM node:22.23.4-bookworm-slim AS node-runtime
FROM brainicism/bgutil-ytdlp-pot-provider:1.3.1
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node

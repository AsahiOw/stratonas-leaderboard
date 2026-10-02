#!/bin/sh
set -eu
# Bind mounts hide image ownership. Only the worker needs to write source files.
mkdir -p /data/BAAD /data/chibi
find /data/BAAD -type d -exec chown chibi:chibi {} +
chown chibi:chibi /data/chibi
exec setpriv --reuid=chibi --regid=chibi --init-groups "$@"

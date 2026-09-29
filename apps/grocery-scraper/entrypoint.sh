#!/bin/sh
set -eu

exec xvfb-run -a \
    --server-args="-screen 0 1280x1024x24 -nolisten tcp" \
    node dist/worker.js

#!/bin/sh
set -e

Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp &
XVFB_PID=$!

export DISPLAY=:99

# Wait until the X11 socket exists
while [ ! -S /tmp/.X11-unix/X99 ]; do
    sleep 0.1
done

exec node dist/worker.js

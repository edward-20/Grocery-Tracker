#!/bin/sh
set -eu

# xvfb-run is a wrapper to Xvfb
# sets up an X authority file, writes a cookie to it and then starts the Xvfb X
# server as a background process
#
# conceptually:
# finds an available display number `DISPLAY=:99`
# starts and Xvfb server `Xvfb :99 &`
# tells the child process where the X server is `export DISPLAY=:99`
# runs the application `node dist/worker.js`
# waits for the application to stop
# stop xvfb `kill <xvfb-pid>`

# -a try to get a free servernum
# --server-args pass arguments to the xvfb server

xvfb-run -e /dev/stderr -a \
  --server-args="-screen 0 1280x1024x24 -nolisten tcp" \
  node dist/worker.js

#!/bin/bash

cd `dirname $0`

if [ -f daemon_pid ]; then
  kill -9 `cat daemon_pid`
fi
rm -f daemon_pid

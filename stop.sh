#!/bin/bash

cd `dirname $0`

if [ -f pid ]; then
  kill -9 `cat pid`
fi
rm -f pid

#!/bin/bash

cd `dirname $0`

rm -f pid
nohup node Server.js 1>> 1.log 2>> 2.log &
echo $! > pid
disown

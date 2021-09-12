#!/bin/bash

cd `dirname $0`

function procedure () {
    while true; do
        tail -f /dev/null --pid=`cat pid`
        ./restart.sh
    done
}

./daemon_stop.sh
procedure >/dev/null 2>&1 &
echo $! > daemon_pid
disown

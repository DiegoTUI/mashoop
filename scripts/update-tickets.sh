#!/usr/bin/env sh
current="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
/usr/local/bin/node $current/update-tickets.js

#!/usr/bin/env sh
current="$( cd "$( dirname "$0" )" && pwd )"
/usr/local/bin/node $current/../lib/batch/update-hotels.js

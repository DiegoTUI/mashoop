current="$( cd "$( dirname "$0" )" && pwd )"
forever start -a -l /var/tuiinnovation/log/node.log $current/app.js

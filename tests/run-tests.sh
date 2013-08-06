current="$( cd "$( dirname "$0" )" && pwd )"

$current/../node_modules/nodeunit/bin/nodeunit param-string-tests.js
$current/../node_modules/nodeunit/bin/nodeunit util-tests.js
$current/../node_modules/nodeunit/bin/nodeunit xmlreader-tests.js
$current/../node_modules/nodeunit/bin/nodeunit at-ticket-avail-tests.js
$current/../node_modules/nodeunit/bin/nodeunit ajax-tests.js
$current/../node_modules/nodeunit/bin/nodeunit fs-venue-search-tests.js

# product-reports
A place to hack together unofficial lists of TiQ customers who match certain conditions

You'll need to make a `.env` file on the repo root (replace `{placeholders}`), for example:

````
username={first.last@tealium.com}
password={password123}
cacheRequests={true}◊
requestStore={/Users/firstlast/.git/product-reports/resources/requests}
dBStore={/Users/firstlast/.git/product-reports/resources/dbs}
````

This hacking ground uses [this excellent tool](https://tealium.atlassian.net/wiki/spaces/~705630984/pages/1524269102/Magic+Metric+Tool+Overview) as the core, so those same environment file settings are also supported.
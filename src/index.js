/**
 * KuCoin Sniper
 * 
 * @author Jonathan Tordesillas <yamato.takato@gmail.com>
 * @todo Write a description.
 */

/**
 * Initialize the api and configuration.
 */
const promptly = require("promptly");
const api = require("kucoin-node-sdk");
api.init(require("./../kucoin-config"));

/**
 * Create Buy Order
 */
const createBuyOrder = (market = "", funds = 0) => {
    return new Promise((resolve, reject) => {
        console.time("createBuyOrder");
        
        const payload = {
            symbol: market,
            clientOid: new Date(),
            type: "market",
            side: "buy",
            funds,
        }

        api.rest.Trade.Orders.postOrder(payload)
            .then((response) => {
                resolve(response);
            })
            .catch((error) => {
                reject(error);
            })
            .finally(() => {
                console.timeEnd("createBuyOrder");
            });
    });
}

/**
 * Check if the market is available.
 */
const pollMarketExistence = (baseCurrency = null, quoteCurrency = null, funds = null, limit = 10, delay = 100) => {
    if (!baseCurrency || !quoteCurrency || !funds) {
        return;
    };

    const market = `${baseCurrency}-${quoteCurrency}`;
    const now = new Date();
    console.log(`[${now}] [${limit}] Polling: ${market}`);

    if (limit < 1) {
        console.log("Market failed to materialize.");
        return;
    }

    api.rest.Market.Symbols.getTicker(market)
        .then((response) => {
            if (!response.data) {
                setTimeout(() => {
                    pollMarketExistence(baseCurrency, quoteCurrency, funds, (limit - 1));
                }, delay);
            } else {
                createBuyOrder(market, funds)
                    .then((response) => {
                        if (response.code != "200004") {
                            pollMarketExistence(baseCurrency, quoteCurrency, funds, (limit - 1));
                        }

                        console.log(response);
                    })
                    .catch((error) => {
                        pollMarketExistence(baseCurrency, quoteCurrency, funds, (limit - 1));
                        console.error(error);
                    });
            }
        })
        .catch((error) => {
            console.log("error", error);
        });
}

/**
 * Execute the script.
 */
const execute = async () => {
    const baseCurrency = await promptly.prompt("Please enter base currency (What you want to buy): ");
    const quoteCurrency = await promptly.prompt("Please enter quote currency (What you are buying with): ");
    const funds = await promptly.prompt(`Please enter amount of ${quoteCurrency} you want to use: `);
    const limit = await promptly.prompt(`Please enter limit (Amount of times you want to check): `);
    const delay = await promptly.prompt(`Please enter delay in miliseconds between checks: `);

    console.log(`Checking the markets ${limit} times, once every ${delay}ms.`);
    pollMarketExistence(baseCurrency, quoteCurrency, funds, limit, delay);
};

execute();

import { cdeApp } from './src/api/cdeAppClient.js';
import { base44 } from './src/api/base44Client.js';

async function debug() {
    try {
        console.log("Fetching 1 Production from CDEApp...");
        const productions = await cdeApp.syncProductions();
        let prod = null;
        if (Array.isArray(productions)) prod = productions[0];
        else if (productions.data && Array.isArray(productions.data)) prod = productions.data[0];
        
        console.log("CDEApp Data Keys:", prod ? Object.keys(prod) : "No data");
        if (prod) console.log("CDEApp Sample:", JSON.stringify(prod, null, 2));

        console.log("\nFetching 1 WorkOrder from Base44...");
        const orders = await base44.entities.WorkOrder.list({ limit: 1 });
        let order = null;
        if (Array.isArray(orders)) order = orders[0];
        else if (orders.items) order = orders.items[0];

        console.log("Base44 Data Keys:", order ? Object.keys(order) : "No data");
        if (order) console.log("Base44 Sample:", JSON.stringify(order, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

debug();

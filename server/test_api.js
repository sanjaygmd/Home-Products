import fetch from 'node-fetch';

async function testApi() {
    try {
        const res = await fetch('http://localhost:5000/product/allproducts');
        const data = await res.json();
        console.log("API DATA COUNT:", data.data.length);
        console.log("FIRST PRODUCT:", JSON.stringify(data.data[0], null, 2));
        process.exit(0);
    } catch (err) {
        console.error("API TEST ERROR:", err);
        process.exit(1);
    }
}

testApi();

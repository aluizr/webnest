const url2 = "https://job-boards.eu.greenhouse.io/hotmartcareersbr/jobs/4603620101?gh_src=jcd3dsi2teu&source=LinkedIn";

async function run() {
    const targetUrl = new URL("https://api.microlink.io");
    targetUrl.searchParams.set("url", url2);
    targetUrl.searchParams.set("screenshot", "true");
    
    console.log("Fetching: " + targetUrl.toString());
    const res = await fetch(targetUrl.toString());
    const data = await res.json();
    console.log("Microlink status: " + res.status);
    console.log(JSON.stringify(data, null, 2));
}

run();

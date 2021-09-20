// serve and render progress in 6-hour extract cycle
// usage: ACCT_1_INSIGHTS_QUERY_KEY='...' ~/.deno/bin/deployctl run server.js

let html = await Deno.readFile("./remaining.html")
let query = `select task, remaining from eldoradoTask where remaining is not null since 24 hours ago limit 400`

addEventListener("fetch", async (event) => {
  let { pathname, search, origin } = new URL(event.request.url)
  if (pathname == `/`) {
    event.respondWith(
      new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=UTF-8",
        }
      })
    )
  } else if (pathname == `/result.json`) {
    let result = (await nrql(query))
    if (result && result.performanceStats)
      console.log(result.performanceStats)
    else
      console.log(result)
    event.respondWith(
      new Response(JSON.stringify(result,null,2)), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*"
        }
      })
  } else {
    event.respondWith(
      new Response(`can't handle ${event.request.url}`, {
        status: 500,
        headers: {
          "content-type": "text/html",
          "access-control-allow-origin": "*"
        }
      })
    )
  } 
})

function nrql(query) {
  let site = `https://staging-insights-api.newrelic.com`
  let route = `v1/accounts/1/query`
  let url = `${site}/${route}?nrql=${query}`
  let headers = {
    "Accept": "application/json",
    "X-Query-Key": Deno.env.get("ACCT_1_INSIGHTS_QUERY_KEY")
  }
  return fetch(url, {headers})
    .then(res => res.ok ? res.json() : console.log(res.statusText))
    .catch(err => console.log('fetch rejected',err))
}

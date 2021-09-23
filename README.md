# Extracts Remaining

We monitor a batch job that extracts and aggregates operational data on a six-hour cycle. 
The workload has grown to 45 scripts, many of which managage async parallel queries, but are themselves run sequentially.
We report remaining work count to New Relic on completion of each script which we render as a descending timeseries in a dashboard.
This slow and bursty data does not render well in charts designed for 1000's of events per second.
So here we try to do better. [details](http://found.ward.bay.wiki.org/extracts-remaining.html)

# result.json

We start with a sample query result consisting of events. 
This was retrieved through the dashboard UI and saved to a local file for further rendering experiments. 

```
        {
          "timestamp": 1631678623862,
          "remaining": 13,
          "task": "pagerduty"
        },
```

# remaining.html

We develop an html script that reads the results and renders it as an SVG image.
This ran from localhost until we wanted to incorporate live data from New Relic.
We moved the html script to Deno Deploy which would then manage the query credentials.

We drew points in a Polyline that stepped first over and then down.

```
  let points = `${x(seq[0])},${y(seq[0])} `
  for (let i = 1; i<seq.length; i++) {
    points += `${x(seq[i-1])},${y(seq[i])} `
    points += `${x(seq[i])},${y(seq[i])} `
  }
```

# server.js

We provide endpoints that will serve live data to the html script that is also served from Deno Deploy.
As an experiment in server-side rendering we copied the SVG generation to the server and reported that as an image.

```
if (pathname == `/result.svg`) {
    let result = (await nrql(query))
    event.respondWith(
      new Response(svg(result), {
        status: 200,
        headers: {
          "content-type": "image/svg+xml",
          "access-control-allow-origin": "*"
        }
      }))
  }
```

# live results

We incorporate this on-demand rerendered chart using the same syntax used for images in GitHub markdown.
This disapoints as the 'no-cache' header doesn't prevent GitHub from caching the image. Try it [live](https://extracts.deno.dev/result.svg).

```
  ![Extracts Remaining](https://extracts.deno.dev/result.svg)
```

![Extracts Remaining](https://extracts.deno.dev/result.svg)
Live NRQL data rendered as SVG at the edge by Deno Deploy then included in GitHub Markdown as an image.

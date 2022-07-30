// serve and render progress in 6-hour extract cycle
// usage: ACCT_1_INSIGHTS_QUERY_KEY='...' deno run --allow-net --allow-read  --allow-env server.js

import { serve } from "https://deno.land/std/http/server.ts"
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts"

await serve(async request => {
  try {
    let { pathname, search, origin } = new URL(request.url)
    let params = new URLSearchParams(search)
    let headers = Object.fromEntries(request.headers.entries())
    console.log('headers', headers)
    let admin = headers.cookie && headers.cookie.match(/admin=\d/)
    console.log('admin',admin)

    const head = mime => ({"content-type": `${mime}; charset=UTF-8`, "access-control-allow-origin": "*"})
    const resp = (status, headers, body) => new Response(body, {status, headers})
    const nrdb = async query => {
      let result = (await nrql(query))
      log(query, result)
      return resp(200, head('application/json'), JSON.stringify(result||{},null,2))
    }

    if (pathname == `/`) {
      return resp(200, head('text/html'), await Deno.readFile("./client.html"))
    }
    else if (pathname == `/latest.json`) {
      return nrdb(`SELECT latest(log), latest(timestamp), latest(exitStatus), latest(elapsed), latest(type) from eldoradoTask where exitStatus > 0 facet task since 1 month ago limit 100`)
    }
    else if (pathname == `/history.json`) {
      return nrdb(`SELECT * from eldoradoTask where task='${(params.get('task')||'transform.sh').replace(/[^\d\w.-]/g,'')}' since 1 month ago limit 200`)
    }
    else if (pathname == `/result.json`) {
      return nrdb(`select task, remaining from eldoradoTask where remaining is not null since 48 hours ago limit 400`)
    }
    else if (pathname == `/result.svg`) {
      let query = `select task, remaining from eldoradoTask where remaining is not null since 1 week ago limit 1500`
      let result = await nrql(query)
      log(query, result)
      return resp(200, {...head('image/svg+xml'),"Cache-Control":"no-cache"}, svg(result))
    }
    else if (pathname == `/login`) {
      const hash = Deno.env.get("ADMIN_PW_HASH")
      const plain = await request.text()
      const ok = bcrypt.compareSync(plain, hash)
      const headers = {
        "Content-Type": "text/plain",
        "Set-Cookie": ok?`admin=${Date.now()}; Max-Age=${365*24*60*60}`:`admin=; Max-Age=0`
      }
      return resp(200,headers,ok?'ok':'try again')
    }
    else {
      return resp(400,head('text/html'),`can't handle ${event.request.url}`)
    }
  } catch(e) {
    console.log(e)
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

function log(query, result) {
  if (result && result.performanceStats)
    console.log(query, result.performanceStats)
  else
    console.log('unexpected result', query, result)
}

function svg(result) {
  console.log('nrql guid', result.metadata.guid, 'query time', result.performanceStats.wallClockTime, 'event count', result.results[0].events.length)
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <svg viewBox="0 0 600 300" style="background-color:white"
        xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g stroke="#ccc" fill="none" stroke-width="1">
        <polyline points="0,0 0,300 600,300 600,0 0,0" stroke-width="4"/>
        <polyline points="100,0 100,300"/>
        <polyline points="200,0 200,300"/>
        <polyline points="300,0 300,300"/>
        <polyline points="400,0 400,300"/>
        <polyline points="500,0 500,300"/>
        <g stroke-width="3" stroke-linejoin="round">
        ${lines(result)}
        </g>
      </g>
      <text text-anchor="end" x="590" y="275" style="fill:lightgray">${new Date().toLocaleDateString("en-US", {timeZone: "America/Los_Angeles"})}</text>
      <text text-anchor="end" x="590" y="290" style="fill:lightgray">${new Date().toLocaleTimeString("en-US", {timeZone: "America/Los_Angeles"})}</text>
    </svg>`
}

function lines(result) {
  let events = result.results[0].events
  let interval = 6*60*60*1000
  let last = events[0].timestamp
  let start = last - last%interval

  let now = events[0]
  now.timestamp = Date.now()
  events.unshift(now)
  events.reverse()

  let runs = []
  let first = events[0].timestamp
  let older = start
  let look = ['red', 0.7]
  while (older > first) {
    let seq = events.filter(event => event.timestamp >= older && event.timestamp < older+interval)
    if(seq.length) runs.push(draw(seq, ...look))
    older -= interval
    look = ['gray', 0.1]
  }
  return runs.reverse().join("\n")


  function draw(seq, color, opacity) {
    let t0 = seq[0].timestamp - seq[0].timestamp % interval
    const x = s => (s.timestamp-t0) * (600/interval)
    const y = s => 300 - s.remaining * (300/50)
    let points = `${x(seq[0])},${y(seq[0])} `
    for (let i = 1; i<seq.length; i++) {
      points += `${x(seq[i-1])},${y(seq[i])} `
      points += `${x(seq[i])},${y(seq[i])} `
    }
    // line.setAttribute('points',points)
    return `
      <polyline
        points="${points}"
        stroke="${color}"
        stroke-opacity="${opacity}"
      />
    `
  }

}

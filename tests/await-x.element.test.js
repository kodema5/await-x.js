// test_dom.ts
import { assertEquals } from "https://deno.land/std@0.218.2/assert/mod.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import { AwaitX, ElementChannel } from '../src/index.js'

Deno.test("element channel test", async () => {
    const html = `
        <html>
        <body>
            <div id="myDiv">Hello</div>
        </body>
        </html>
    `
    const doc = new DOMParser().parseFromString(html, "text/html")
    if (!doc) return

    const myDiv = doc.getElementById("myDiv")
    assertEquals(myDiv?.textContent, "Hello")

    // wraps an element as a channel
    const channel = new ElementChannel(myDiv)

    // add listeners
    AwaitX.init({
        fa: (a,b) => a + b
    }, {
        channel
    })

    // add accessors
    const fns = AwaitX.init(null, {channel})

    // test call
    assertEquals(await fns.fa(1,2), 3)
})

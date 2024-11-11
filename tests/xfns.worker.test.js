import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { XFns, XMsg, } from '../src/index.js'

Deno.test("XFns worker", async (t) => {

    const w = new Worker(
        new URL("./worker.js", import.meta.url).href,
        { type: "module" })

    await t.step("can call worker function", async () => {
        const f = (new XFns(
            null,
            w,
            {
                // if want a custom event validator
                // ex: check origin
                decode:(event) => {
                    return XMsg.decode(event)
                },
            },
        )).proxy
        assertEquals(await f.foo(1,2), 3)
    })

})
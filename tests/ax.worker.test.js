import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { Ax, XMsg, } from '../src/index.js'

Deno.test("Ax worker", async (t) => {

    const w = new Worker(
        new URL("./worker.js", import.meta.url).href,
        { type: "module" })

    await t.step("can call worker function", async () => {
        const f = (new Ax(
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
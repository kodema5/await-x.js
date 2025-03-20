import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { AwaitX, Messenger, } from '../src/index.js'

Deno.test("AwaitX worker", async (t) => {

    const w = new Worker(
        new URL("./await-x.worker.js", import.meta.url).href,
        { type: "module" })

    await t.step("can call worker function", async () => {
        const f = AwaitX.init(
            null,
            {
                // put web-worker as channel of communication
                channel: w,

                // if want a custom event validator
                // ex: check origin
                decode:(event) => {

                    // Messenger decode has to be called to be processed
                    return Messenger.decode(event)
                },
            },
        )
        assertEquals(await f.foo(1,2), 3)
    })

})
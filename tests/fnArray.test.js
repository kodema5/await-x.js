import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { FnArray, FnMap, } from '../src/index.js'

Deno.test("FnArray", async (t) => {

    await t.step("calls array functions", async () => {

        const fn = FnArray
            .fromArray([
                (a,b) => a + b,
                (a,b) => a * b,
                3
            ])
            .bind(null)


        assertEquals(FnArray.toArray(fn(1,2)), [3,2,3])
    })

})


Deno.test("FnMap", async (t) => {

    await t.step("calls map functions", async () => {

        const fn = FnMap
            .fromObject({
                foo: (a,b) => a + b,
                bar: (a,b) => a * b,
                baz: 3
            })
            .bind(null)


        assertEquals(FnMap.toObject(fn(1,2)), {foo:3, bar:2, baz:3})
    })

})
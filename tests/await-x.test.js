import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { AwaitX, MessageOption, TIMED_OUT, } from '../src/index.js'


Deno.test("AwaitX", async (t) => {
    const fn1 = AwaitX.init({fn1: (a,b) => a + b}, {id:"fn1"})
    AwaitX.init({fn2: (a,b) => a * b, var2:111}, {id:"fn2"})
    AwaitX.init({fn3: (a,b) => a - b}, {id:"fn3a"})
    AwaitX.init({fn3: (a,b) => a - 2 * b}, {id:"fn3b"})

    let fn4Cnt = 0   
    AwaitX.init({fn4: (a) => { fn4Cnt+=a+1 }}, {id:"fn4a"})
    AwaitX.init({fn4: (a) => { fn4Cnt+=a+2 }}, {id:"fn4b"})

    await t.step("can call local function", async () => {
        assertEquals(await fn1.fn1(1,2), 3)
    })

    await t.step("can call service accross channel", async () => {
        assertEquals(await fn1.fn2(1,2), 2)
    })

    await t.step("can access remote variable as a function", async () => {
        assertEquals(await fn1.var2(), 111)
        assertEquals(await fn1.var2(222), 222) // returns the new value
        assertEquals(await fn1.var2(), 222)
    })

    await t.step("can directly call specific service", async () => {
        assertEquals(await fn1['fn3'](1,2), -1) // this returns first to register
        assertEquals(await fn1['fn3b.fn3'](1,2), -3)
    })

    await t.step("timed-out if not found", async () => {
        try {
            await fn1.fnone(new MessageOption({timeout:1000}), 1,2)
        } catch(e) {
            assertEquals(e,TIMED_OUT)
        }
    })

    await t.step("can publish with '_' postfix", () => {
        // fn1["fn4_"](2)
        fn1.fn4_(2)
        assertEquals(fn4Cnt, 7)

        // publish to specific function
        fn1["fn4b.fn4_"](2)
        assertEquals(fn4Cnt, 11)
    })


    await t.step("discover services while developing", () => {
        fn1._dir()
        const rs = fn1._fns
        assertEquals(
            Object.keys(rs).sort(),
            ['fn1', 'fn2', 'fn3a', 'fn3b', 'fn4a', 'fn4b']
        )
    })

    await t.step("setting/deleting local", async () => {
        // setting by variable
        fn1.foo_bar = 123
        assertEquals(await fn1.foo_bar(), 123) // access is a function

        // setting by function for uniformity, it can be exported elsewhere
        fn1.foo_bar(456)
        assertEquals(await fn1.foo_bar(), 456)

        assertEquals('foo_bar' in fn1, true)
        assertEquals(Object.keys(fn1), ['fn1', 'foo_bar'])

        delete fn1.foo_bar
        assertEquals('foo_bar' in fn1, false)
        assertEquals(Object.keys(fn1), ['fn1'])
    })

    await t.step("sharing a channel for multiple sub-channels", async () => {
        

        const g1a = AwaitX.init({f1a:11}, { channelId:"g1" })
        AwaitX.init({f1b:12}, { channelId:"g1" })
        const g2a = AwaitX.init({f2a:21}, { channelId:"g2" })
        AwaitX.init({f2b:22}, { channelId:"g2" })

        // list functions available in specific channelid
        g1a._dir()
        assertEquals(Object.values(g1a._fns).flat().sort(), ['f1a', 'f1b'])
        g2a._dir()
        assertEquals(Object.values(g2a._fns).flat().sort(), ['f2a', 'f2b'])

        assertEquals(await g1a.f1b(), 12)
        try { await g1a.f2b(new MessageOption({timeout:1000})) } catch(e) { assertEquals(e, TIMED_OUT ) }
        assertEquals(await g2a.f2b(), 22)
    })

})



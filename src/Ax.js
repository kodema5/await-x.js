import { XMsg, SERVICE_UNAVAILABLE } from './XMsg.js'

/**
 * Ax proxies local functions
 */
export class Ax {
    /**
     * creates a proxy that checks functions else, post message to channel
     * @param {Object} fns hashmap of fucntions
     * @param {Object} channel to post message if not locally found
     * @param {Object} {id}
     */
    constructor(
        fns,
        channel = globalThis,
        {
            id = crypto.randomUUID(),
            channelId = '',
            timeout = 1000,
            decode = XMsg.decode,
        } = {},
    ) {
        this.id = id
        this.local = fns || {}

        // wraps a channel for messaging
        //
        this.xMsg = new XMsg({
            id,
            channel,
            channelId,
            decode,
            exec:({name, args}) => {

                const ns = name.split('.')
                const [fnId, id] = ns.length===1 ?  [null, ...ns] : ns

                // return if incorrectly addressed
                //
                if (fnId && fnId!==this.id) {
                    throw SERVICE_UNAVAILABLE
                }

                // prefixed by _ to access local/private member only
                //
                if (id.startsWith('_')) {
                    const m = id.slice(1)
                    if (!(m in this)) {
                        throw SERVICE_UNAVAILABLE
                    }

                    const f = this[m]
                    return typeof(f) === 'function'
                        ? f.apply(this, args)
                        : f
                }

                // check local functions to be executed
                //
                if (id in this.local) {
                    const fn = this.local[id]
                    if (typeof(fn) === 'function') {
                        return fn.apply(null, args)
                    }
                    if (args.length===1) {
                        this.local[id] = args[0]
                        return this.local[id]
                    }
                    return fn
                }

                throw SERVICE_UNAVAILABLE
            }
        })

        // wraps calls to local or remote
        //
        this.proxy = new Proxy(this, {
            get(me, name) {

                // ex: (fn)
                if (typeof(name)==='symbol') {
                    return
                }

                // "_" postfix means publish (not waiting for return)
                // ex: fn.remoteName_
                //
                const isPublish = name.endsWith('_')
                if (me.xMsg && isPublish) {
                    return (...args) => {
                        return me.xMsg.publish({
                            name: name.slice(0,-1),
                            args,
                        })
                    }
                }

                // "_" prefix is to access object member
                // ex: fn._property
                //
                if (name.startsWith('_')) {
                    const f = me[name.slice(1)]
                    return typeof(f) === 'function'
                        ? f.bind(me)
                        : f
                }

                // check locally defined functions
                // ex: fn.local_name where name is in me.local
                //
                if (name in me.local) {
                    const fn = me.local[name]
                    if (typeof (fn)==='function') {
                        return fn
                    }
                    return function () {
                        if (arguments.length===1) {
                            const v = arguments[0]
                            me.local[name] = v
                            return v
                        }
                        return fn
                    }
                }

                // if not locally found, try remote call
                // ex: fn.remoteName
                //
                if (me.xMsg && !isPublish) {
                    return async (...args) => {
                        return await me.xMsg.post({name, args}, {timeout})
                    }
                }

                throw SERVICE_UNAVAILABLE
            },

            // set/overrides local
            set (me, name, value) {
                me.local[name] = value
                return me
            },

            // checks local handlers
            has (me, name) {
                return name in me.local
            },

            // get local handlers keys
            ownKeys (me) {
                return Reflect.ownKeys(me.local)
            },

            // get own property-descriptor
            getOwnPropertyDescriptor(me, name) {
                if (!(name in me.local)) return

                return {
                    enumerable: true,
                    configurable: true,
                    value: me.local[name],
                }
            },

            // removes from local
            deleteProperty(me, name) {
                return delete me.local[name]
            },
        })

        this.regs = {
            [this.id]: Object.keys(this.local || {})
        }
    }

    /**
     * closes the channel and only serve locally
     */
    close() {
        if (this.xMsg) {
            this.xMsg.close()
            delete this.xMsg
        }
    }


    /**
     * synchronized regs for all nodes
     * timing is undeterministic (as it goes through nodes)
     * typically during development to discover various functions
     * @param {*} {callback, from, fs}
     */
    sync_reg({callback, from, fns} = {}) {

        // when received response
        //
        if (from) {
            this.regs[from] = fns || []
            return
        }

        // initiate sync_reg to all
        //
        if (!callback) {
            this.proxy['_sync_reg_']({ callback:`_sync_reg_` })
            return
        }

        // pass local function
        //
        if (callback) {
            this.proxy[callback]({
                from: this.id,
                fns: this.regs[this.id],
            })
            return
        }
    }

}

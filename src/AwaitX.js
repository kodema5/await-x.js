import { MessageOption, Messenger, SERVICE_UNAVAILABLE } from './Messenger.js'
import { LocalChannel } from "./LocalChannel.js"

const isWebWorker = () => {
    try {
        // deno web-worker does not have importScripts
        return typeof importScripts === 'function' 
            || globalThis instanceof WorkerGlobalScope;
    } catch (_) {
        return false
    }
 }
  
  
/**
 * Ax proxies local functions
 */
export class AwaitX {
    /**
     * creates a proxy that checks functions else, post message to channel
     * @param {object} fns hashmap of local functions
     * @param {string} id id of data
     * @param {Object} channel that accepts postMessage and onMessage
     * @param {string} channelId a sub-channel within 
     * @param {function} decode to decode the event data/detail
     */
    constructor(
        fns,
        {
            // random uuid
            id = crypto.randomUUID(),
            
            // local-channel is faster
            channel = isWebWorker() 
                ? globalThis 
                : LocalChannel.default,
            
            // sub/channel grouping of message
            channelId = '',

            // to decode event.data/detail
            decode = Messenger.decode,
        } = {},
    ) {
        this.id = id
        this.local = fns || {}

        // wraps a channel for messaging
        //
        this.xMsg = new Messenger({
            id,
            channel,
            channelId,
            decode,

            // handles reqeusts received
            //
            exec: ({name, args}) => {

                const ns = name.split('.')
                const [fnId, id] = ns.length===1 ?  [null, ...ns] : ns

                // throws if an addressed message (fnId)
                // and address is incorrect
                //
                if (fnId && fnId!==this.id) {
                    throw SERVICE_UNAVAILABLE
                }

                // prefixed by _ to access object instance method
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

                // check local element to be executed
                //
                if (id in this.local) {

                    const fn = this.local[id]

                    // execute local function
                    //
                    if (typeof(fn) === 'function') {
                        return fn.apply(null, args)
                    }

                    // if to set local variable
                    //
                    if (args.length===1) {
                        this.local[id] = args[0]
                        return this.local[id]
                    }

                    // else a get to local variable
                    //
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
                        const { args } = AwaitX.parseOptArgs(arguments)

                        // check if a local set
                        //
                        if (args.length===1) {
                            const v = args[0]
                            me.local[name] = v
                            return v
                        }

                        // check if a local get
                        return fn
                    }
                }

                // if not locally found, try remote call
                // ex: fn.remoteName
                //
                if (me.xMsg && !isPublish) {
                    return async (...a) => {
                        const { opt, args } = AwaitX.parseOptArgs(a)
                        return await me.xMsg.post({name, args}, opt)
                    }
                }

                throw SERVICE_UNAVAILABLE
            },

            // ----------------------------------------------
            // below are for access to local(!!) not remote
            // likely for debugging for dynamic updates
            // ----------------------------------------------

            // set/overrides local(!!)
            // 
            set (me, name, value) {
                me.local[name] = value
                return me
            },

            // checks if has in local(!!)
            has (me, name) {
                return name in me.local
            },

            // get local(!!) keys
            ownKeys (me) {
                return Reflect.ownKeys(me.local)
            },

            // removes from local(!!)
            deleteProperty(me, name) {
                return delete me.local[name]
            },

            // get own property-descriptor in local(!!)
            getOwnPropertyDescriptor(me, name) {
                if (!(name in me.local)) return

                return {
                    enumerable: true,
                    configurable: true,
                    value: me.local[name],
                }
            },

        })

        this.fns = {
            [this.id]: Object.keys(this.local || {})
        }
    }

    // check if first arg is a message-option
    //
    static parseOptArgs(args) {
        const hasOpt = args.length>0 && args[0] instanceof MessageOption 
        const opt = hasOpt ? args[0] : new MessageOption()
        return { 
            opt, 
            args: hasOpt ? args.slice(1) : args 
        }
    }

    // initialize and return proxy
    //
    static init(...args) {
        return new AwaitX(...args).proxy
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
    dir({callback, from, fns} = {}) {

        // when received response
        //
        if (from) {
            this.fns[from] = fns || []
            return
        }

        // publish _dir_ to all connected
        //
        if (!callback) {
            this.proxy['_dir_']({
                callback:`_dir_`
            })
            return
        }

        // pass local function
        //
        if (callback) {
            this.proxy[callback]({
                from: this.id,
                fns: this.fns[this.id],
            })
            return
        }
    }

}

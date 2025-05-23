export const SERVICE_UNAVAILABLE = '__SERVICE_UNAVAILABLE__'
export const TIMED_OUT = '__TIMED_OUT__'
const XMSG_REQUEST = 'X-MSG-REQUEST'
const XMSG_RESPONSE = 'X-MSG-RESPONSE'
const XMSG_PUBLISH = 'X-MSG-PUBLISH'



export class MessageOption {
    constructor({timeout=0} = {}) {
        this.timeout = timeout
    }
}

/**
 * XMsg wraps message passing to/from a channel
 */
export class Messenger {

    /**
     * default decoding of data in the event object
     * @param {Event} event to be validated.
     * @return {Object}
     */
    static decode(event) {
        const a = event.data  // for Event
            || event.detail   // for CustomEvent
            || {}
        return  Object.prototype.toString.call(a) === '[object Object]'
            ? a
            : {}
    }



    /**
     * initialize channel
     * @param {Object} channel implements postMessage and add/removeEventListeners
     * @param {Function} exec, a function to full-fill a request
     * @param {Function} decode, a function to decode event
     * @param {String} id, a string to identify instance
     */
    constructor({
        channel,
        channelId = '',
        id = crypto.randomUUID(),
        exec = () => { throw SERVICE_UNAVAILABLE },
        decode = Messenger.decode,
    } = {}) {

        this.id = id
        this.channel = channel

        this.channelId = channelId
        this.requestType = `${channelId}:${XMSG_REQUEST}`
        this.responseType = `${channelId}:${XMSG_RESPONSE}`
        this.publishType = `${channelId}:${XMSG_PUBLISH}`

        this.exec = exec
        this.decode = decode
        this.listener = this.listen.bind(this)
        this.channel.addEventListener('message', this.listener)
    }

    // tracks the requests made
    requestId = 0
    requests = {}


    /**
     * registers and post requests to channel and waits for response
     * @param {Object} data, to be passed to channel
     * @param {Object} config, default timeout=1000 ms
     * @returns a promise
     */
    post(data, opt = new MessageOption()) {

        return new Promise( (resolve, reject) => {

            // store in request-map to capture callback
            //
            const requestId = `${this.id}.${++this.requestId}`
            this.requests[requestId] = {
                resolve,
                reject,
                ts: Date.now(),
                opt,
                tmId: opt.timeout
                    ?  setTimeout(() => {
                        delete this.requests[requestId]

                        reject(TIMED_OUT)
                    }, opt.timeout)
                    : null,
            }

            // post message to channel
            //
            this.channel.postMessage({
                type: this.requestType,
                data,
                requestId,
                from: this.id,
            })
        })
    }


    /**
     * publish data
     * @param {Object} data, to be passed to channel
     */
    publish(data)  {

        // simply publish to channel
        //
        this.channel.postMessage({
            type: this.publishType,
            data,
            from: this.id,
        })
    }

    /**
     * a listener to messages in channel.
     * if a response, complete promise.
     * if a request, execute and return response
     * @param {Event} event that contains message from channel
     */
    async listen(event) {
        const {type, data, error, requestId, responseId, from} = this.decode(event)

        // ignore if request comes from same messenger
        //
        if (from === this.id) {
            return
        }

        // validate message type and request-id
        //
        const isRequest = type === this.requestType && requestId
        const isResponse = type === this.responseType && responseId
        const isPublish = type === this.publishType
        if (!isRequest && !isResponse && !isPublish) {
            return
        }


        // ignore unknown response ex: request has been terminated
        //
        if (isResponse && !(responseId in this.requests)) {
            return
        }

        // first response will be taken, the rest will be ignored
        //
        if (isResponse) {
            const res = this.requests[responseId]
            delete this.requests[responseId]

            if (res.tmId) {
                clearTimeout(res.tmId)
            }

            if (error) {
                res.reject(error)
            } else {
                res.resolve(data)
            }
            return
        }

        // if a request, process, wait and post-back response
        //
        if (isRequest) {
            let data_, error_
            try {
                data_ = await this.exec(data)
            } catch(err) {
                if (err === SERVICE_UNAVAILABLE) {
                    return
                }
                error_ = err
            }

            // post-back reqsponse
            //
            this.channel.postMessage({
                type: this.responseType,
                responseId: requestId,
                data: data_,
                error: error_,
                from: this.id,
            })

            return
        }

        // if a publish, execute but need not wait for response
        //
        if (isPublish) {
            try {
                this.exec(data)
            } catch(err) {
                if (err === SERVICE_UNAVAILABLE) {
                    return
                }
                console.log(`${this.id}>`,err)
            }

            return
        }

        throw 'unknown operation'
    }

    /**
     * removes the channel listeners
     */
    close() {
        this.channel.removeEventListener('message', this.listener)
    }
}
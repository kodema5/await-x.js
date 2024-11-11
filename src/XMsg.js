export const SERVICE_UNAVAILABLE = '__SERVICE_UNAVAILABLE__'
export const TIMED_OUT = '__TIMED_OUT__'
export const XMSG_REQUEST = 'X-MSG-REQUEST'
export const XMSG_RESPONSE = 'X-MSG-RESPONSE'
export const XMSG_PUBLISH = 'X-MSG-PUBLISH'


/**
 * XMsg wraps message passing to/from a channel
 */
export class XMsg {

    /**
     * default validation of an event
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
        id = crypto.randomUUID(),
        exec = () => { throw SERVICE_UNAVAILABLE },
        decode = XMsg.decode,
    } = {}) {

        this.id = id
        this.channel = channel
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
    post(data,
        {
            timeout=1000,
        } = {}
    )  {
        return new Promise( (resolve, reject) => {
            const requestId = `${this.id}.${++this.requestId}`
            this.requests[requestId] = {
                resolve,
                reject,
                ts: Date.now(),
                tmId: timeout
                    ?  setTimeout(() => {
                        delete this.requests[requestId]

                        reject(TIMED_OUT)
                    }, timeout)
                    : null,
            }

            this.channel.postMessage({
                type: XMSG_REQUEST,
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
        this.channel.postMessage({
            type: XMSG_PUBLISH,
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

        if (from === this.id) {
            return
        }

        const isRequest = type === XMSG_REQUEST && requestId
        const isResponse = type === XMSG_RESPONSE && responseId
        const isPublish = type === XMSG_PUBLISH
        if (!isRequest && !isResponse && !isPublish) {
            return
        }


        // ignore unknown response
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

        // if a request, process and post-back response
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

            this.channel.postMessage({
                type: XMSG_RESPONSE,
                responseId: requestId,
                data: data_,
                error: error_,
                from: this.id,
            })

            return
        }

        // call result
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
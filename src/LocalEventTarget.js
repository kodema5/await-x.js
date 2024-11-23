import { FnArray, } from './FnArray.js'

/**
 * LocalEventTarget implements EventTarget for local-channel
 */
export class LocalEventTarget extends EventTarget {

    listeners = {}

    /**
     * adds listener
     * @param {string} type of listener. ex: message
     * @param {Function} listener function
     */
    addEventListener(type, listener) {
        if (!(type in this.listeners)) {
            this.listeners[type] = new FnArray()
        }
        this.listeners[type].push(listener)
    }

    /**
     * removes listener
     * @param {String} type of listner ex: message
     * @param {Function} listener function
     */
    removeEventListener(type, listener) {
        const ls = this.listeners[type]
        if (!ls) return false

        const i = ls.indexOf(listener)
        if (i<0) return false

        ls.splice(i, 1)
        return true
    }

    /**
     * dispatch event to listeners
     * @param {String} type of listener
     * @param {Any} data, detail of event
     * @param {Any} targetOrigin scope of call
     */
    dispatchEvent({type, data, detail, targetOrigin} = {}) {
        const ls = this.listeners[type]
        if (!ls) return true

        ls.call(targetOrigin, {data, detail})
        return false

    }

    /**
     * dispatch message event
     * @param {Any} message
     * @param {Any} targetOrigin
     */
    postMessage(message, targetOrigin=null) {
        this.dispatchEvent({
            type: 'message',
            data: message,
            targetOrigin
        })
    }
}
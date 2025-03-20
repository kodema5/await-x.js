/**
 * wraps an html-element/event-target
 */
export class ElementChannel {

    /**
     * exports addEventListener and postMessage to an element
     * @param {HTMLElement} el
     */
    constructor(el) {
        this.ref = el
        this.addEventListener = el.addEventListener.bind(el)
    }

    /**
     * dispatch a "message" custom-event with data
     * @param {Object} data
     * @returns
     */
    postMessage(data) {
        if (!this.ref) return

        const e = new CustomEvent("message", {
            detail:data
        })

        this.ref.dispatchEvent(e)
    }

    /**
     * removes references to element
     */
    close() {
        this.ref = null
    }
}
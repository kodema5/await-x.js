/**
 * FnArray extends Array, implements apply, call and bind
 */
export class FnArray extends Array {
    /**
     * execute if f a function else returns value
     * @param {Object} f/else
     * @param {Object} thisArg context
     * @param  {...any} args arguments
     * @returns function result
     */
    #exec(f, thisArg, ...args) {
        return typeof(f)==='function'
            ? f.call(thisArg, ...args)
            : f
    }

    /**
     * calls apply
     * @param {any} thisArg context
     * @param {[any]} args array
     * @returns array of result
     */
    apply(thisArg, args=[]) {
        return this.map(f => this.#exec(f, thisArg, ...args))
    }

    /**
     * call function
     * @param {any} thisArg context
     * @param {[any]} args array
     * @returns array of result
     */
    call(thisArg, ...args) {
        return this.map(f => this.#exec(f, thisArg, ...args))
    }

    /**
     * return a function that binds to context
     * @param {any} thisArg context
     * @returns
     */
    bind(thisArg) {
        return (...args) => this.call(thisArg, ...args)
    }

    /**
     * converts array to FnAray
     * @param {Array} arr
     * @returns
     */
    static fromArray(arr) {
        return new FnArray(...(Array.from(arr)))
    }

    /**
     * converts fnArray to Array
     * @param {fnArray} fnArray
     * @returns
     */
    static toArray(fnArray) {
        return [...fnArray]
    }
}

/**
 * FnMap extends Map, implements apply, call, and bind
 */
export class FnMap extends Map {

    /**
     * execute if f a function else returns value
     * @param {Object} f/else
     * @param {Object} thisArg context
     * @param  {...any} args arguments
     * @returns function result
     */
    #exec(f, thisArg, ...args) {
        return typeof(f)==='function'
            ? f.call(thisArg, ...args)
            : f
    }

    /**
     *
     * @param {any} thisArg context
     * @param {[any]} args array argument
     * @returns retuns
     */
    apply(thisArg, args=[]) {
        const m = new Map()
        for (const [key, fn] of this.entries()) {
            m.set(key, this.#exec(fn, thisArg, ...args))
        }
        return m
    }

    /**
     * call function
     * @param {any} thisArg context
     * @param {[any]} args array
     * @returns array of result
     */
    call(thisArg, ...args) {
        const m = new Map()
        for (const [key, fn] of this.entries()) {
            m.set(key, this.#exec(fn, thisArg, ...args))
        }
        return m
    }

    /**
     * converts array to FnAray
     * @param {[any]} arr
     * @returns
     */
    bind(thisArg) {
        return (...args) => this.call(thisArg, ...args)
    }

    /**
     * converts Object to FnMap
     * @param {Object} obj
     * @returns
     */
    static fromObject(obj) {
        const ite = obj instanceof Iterator
            ? obj
            : Object.entries(obj)
        return new FnMap(ite)
    }

    /**
     * converts FnMap to Object
     * @param {FnMap} fnMap
     * @returns
     */
    static toObject(fnMap) {
        return Object.fromEntries(fnMap.entries())
    }

}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Registry = void 0;
class Registry {
    constructor() {
        this.state = {};
    }
    static getInstance() {
        if (!Registry.instance) {
            Registry.instance = new Registry();
        }
        return Registry.instance;
    }
    put(entry) {
        if (this.state[entry.name])
            return this.state[entry.name];
        const server = {
            // uid: serveruid,
            api: entry.api
        };
        this.state[entry.name] = { server };
        return server;
    }
    get(name) {
        const state = this.state[name];
        if (!state)
            return;
        const server = state.server;
        return server;
    }
}
exports.Registry = Registry;
//# sourceMappingURL=registry.js.map
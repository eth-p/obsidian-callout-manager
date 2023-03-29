"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.isInstalled = exports.getApi = exports.PLUGIN_API_VERSION = exports.PLUGIN_ID = void 0;
__exportStar(require("./functions"), exports);
__exportStar(require("./callout"), exports);
__exportStar(require("./events"), exports);
exports.PLUGIN_ID = "callout-manager";
exports.PLUGIN_API_VERSION = "v1";
/**
 * @internal
 */
function getApi(plugin) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var app, plugins, calloutManagerInstance;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    app = ((_a = plugin === null || plugin === void 0 ? void 0 : plugin.app) !== null && _a !== void 0 ? _a : globalThis.app);
                    if (!isInstalled(app)) {
                        return [2 /*return*/, undefined];
                    }
                    plugins = app.plugins;
                    return [4 /*yield*/, waitFor(function (resolve) {
                            var instance = plugins.plugins[exports.PLUGIN_ID];
                            if (instance != null)
                                resolve(instance);
                        })];
                case 1:
                    calloutManagerInstance = _b.sent();
                    // Create a new API handle.
                    return [2 /*return*/, calloutManagerInstance.newApiHandle(exports.PLUGIN_API_VERSION, plugin, function () {
                            calloutManagerInstance.destroyApiHandle(exports.PLUGIN_API_VERSION, plugin);
                        })];
            }
        });
    });
}
exports.getApi = getApi;
/**
 * Checks if Callout Manager is installed.
 */
function isInstalled(app) {
    // Check if the plugin is available and loaded.
    var plugins = (app !== null && app !== void 0 ? app : globalThis.app).plugins;
    return (exports.PLUGIN_ID in plugins.manifests && plugins.enabledPlugins.has(exports.PLUGIN_ID));
}
exports.isInstalled = isInstalled;
/**
 * Runs a function every 10 milliseconds, returning a promise that resolves when the function resolves.
 *
 * @param fn A function that runs periodically, waiting for something to happen.
 * @returns A promise that resolves to whatever the function wants to return.
 */
function waitFor(fn) {
    return new Promise(function (doResolve, reject) {
        var queueAttempt = function () {
            setTimeout(attempt, 10);
        };
        var resolve = function (value) {
            queueAttempt = function () { };
            doResolve(value);
        };
        function attempt() {
            try {
                var promise = fn(resolve);
                if (promise === undefined) {
                    queueAttempt();
                    return;
                }
                promise.then(queueAttempt, function (ex) { return reject(ex); });
            }
            catch (ex) {
                reject(ex);
            }
        }
        attempt();
    });
}

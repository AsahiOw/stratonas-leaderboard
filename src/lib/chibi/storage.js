"use strict";
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chibiRoots = chibiRoots;
exports.artifactPath = artifactPath;
exports.existingArtifactPath = existingArtifactPath;
var node_path_1 = require("node:path");
var promises_1 = require("node:fs/promises");
function chibiRoots() {
    // These directories are mounted runtime data, never build inputs.
    return {
        source: node_path_1.default.resolve(/*turbopackIgnore: true*/ process.env.CHIBI_SOURCE_DIR || 'Development_data/BAAD'),
        data: node_path_1.default.resolve(/*turbopackIgnore: true*/ process.env.CHIBI_DATA_DIR || 'Development_data/chibi'),
        tools: node_path_1.default.resolve(/*turbopackIgnore: true*/ process.env.CHIBI_TOOLS_DIR || 'Development_data/chibi-tools'),
    };
}
function artifactPath(key, root) {
    if (root === void 0) { root = chibiRoots().data; }
    if (!key || key.includes('\\') || key.includes(':') || key.includes('\0') || key.startsWith('/')
        || key.split('/').some(function (part) { return !part || part === '.' || part === '..'; })) {
        throw new Error('Invalid chibi artifact key');
    }
    var resolved = node_path_1.default.resolve.apply(node_path_1.default, __spreadArray([/*turbopackIgnore: true*/ root], key.split('/'), false));
    if (!resolved.startsWith(node_path_1.default.resolve(root) + node_path_1.default.sep))
        throw new Error('Invalid chibi artifact key');
    return resolved;
}
function existingArtifactPath(key) {
    return __awaiter(this, void 0, void 0, function () {
        var root, resolved;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, promises_1.realpath)(/*turbopackIgnore: true*/ chibiRoots().data)];
                case 1:
                    root = _a.sent();
                    return [4 /*yield*/, (0, promises_1.realpath)(/*turbopackIgnore: true*/ artifactPath(key, root))];
                case 2:
                    resolved = _a.sent();
                    if (!resolved.startsWith(root + node_path_1.default.sep))
                        throw new Error('Artifact escapes chibi storage');
                    return [2 /*return*/, resolved];
            }
        });
    });
}

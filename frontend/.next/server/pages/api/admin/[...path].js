"use strict";
(() => {
var exports = {};
exports.id = 640;
exports.ids = [640];
exports.modules = {

/***/ 8280:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "config": () => (/* binding */ config),
  "default": () => (/* binding */ handler)
});

;// CONCATENATED MODULE: external "http-proxy"
const external_http_proxy_namespaceObject = require("http-proxy");
var external_http_proxy_default = /*#__PURE__*/__webpack_require__.n(external_http_proxy_namespaceObject);
;// CONCATENATED MODULE: ./pages/api/admin/[...path].js

// Create proxy server once
const proxy = external_http_proxy_default().createProxyServer();
const config = {
    api: {
        bodyParser: false
    }
};
function handler(req, res) {
    // Forward /api/admin/* to backend admin endpoints
    const target = process.env.BACKEND_URL || "http://localhost:3003";
    req.url = req.url.replace(/^\/api/, "");
    proxy.web(req, res, {
        target
    }, (e)=>{
        console.error("Proxy error:", e);
        res.status(500).json({
            error: "Proxy error",
            detail: String(e)
        });
    });
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(8280));
module.exports = __webpack_exports__;

})();
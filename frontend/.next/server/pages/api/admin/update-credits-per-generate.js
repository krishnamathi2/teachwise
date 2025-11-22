"use strict";
(() => {
var exports = {};
exports.id = 631;
exports.ids = [631];
exports.modules = {

/***/ 455:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }
    try {
        const authHeader = req.headers.authorization;
        const headers = {
            "Content-Type": "application/json"
        };
        if (authHeader) {
            headers.Authorization = authHeader;
        }
        const response = await fetch("http://localhost:3003/admin/update-credits-per-generate", {
            method: "POST",
            headers,
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Update credits per generate proxy error:", error);
        res.status(500).json({
            error: "Failed to update credits per generate"
        });
    }
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(455));
module.exports = __webpack_exports__;

})();
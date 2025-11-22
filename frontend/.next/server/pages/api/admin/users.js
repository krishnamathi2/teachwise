"use strict";
(() => {
var exports = {};
exports.id = 651;
exports.ids = [651];
exports.modules = {

/***/ 6722:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
async function handler(req, res) {
    if (req.method !== "GET") {
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
        const response = await fetch("http://localhost:3003/admin/users", {
            headers
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Admin users proxy error:", error);
        res.status(500).json({
            error: "Failed to fetch users data"
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
var __webpack_exports__ = (__webpack_exec__(6722));
module.exports = __webpack_exports__;

})();
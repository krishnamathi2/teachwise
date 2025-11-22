"use strict";
(() => {
var exports = {};
exports.id = 472;
exports.ids = [472];
exports.modules = {

/***/ 2034:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
// API route to update user credits manually (admin only)
async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }
    try {
        // Forward to backend with authorization header
        const backendResponse = await fetch("http://localhost:3003/admin/update-credits", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": req.headers.authorization || ""
            },
            body: JSON.stringify(req.body)
        });
        const result = await backendResponse.json();
        res.status(backendResponse.status).json(result);
    } catch (error) {
        console.error("Update credits API error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to update credits",
            details: error.message
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
var __webpack_exports__ = (__webpack_exec__(2034));
module.exports = __webpack_exports__;

})();
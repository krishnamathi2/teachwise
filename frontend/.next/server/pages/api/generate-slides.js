"use strict";
(() => {
var exports = {};
exports.id = 182;
exports.ids = [182];
exports.modules = {

/***/ 3257:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
// API proxy for slide generation
async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }
    try {
        const backendBase = process.env.NEXT_PUBLIC_BACKEND || "http://localhost:3003";
        const response = await fetch(`${backendBase.replace(/\/$/, "")}/generate-slides`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        res.status(200).json(data);
    } catch (error) {
        console.error("Slide generation error:", error);
        res.status(500).json({
            error: "Failed to generate slides",
            detail: error.message
        });
    }
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(3257));
module.exports = __webpack_exports__;

})();
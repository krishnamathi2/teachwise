"use strict";
(() => {
var exports = {};
exports.id = 649;
exports.ids = [649];
exports.modules = {

/***/ 1515:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
// API route to forward UPI payment confirmation to backend
async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }
    try {
        const { email , amount , transactionId , planType  } = req.body;
        // Forward the request to the backend
        const backendResponse = await fetch("http://localhost:3003/upi-payment-confirm", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                amount,
                transactionId,
                planType
            })
        });
        const result = await backendResponse.json();
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error("Payment confirmation API error:", error);
        res.status(500).json({
            error: "Failed to process payment confirmation",
            details: error.message
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
var __webpack_exports__ = (__webpack_exec__(1515));
module.exports = __webpack_exports__;

})();
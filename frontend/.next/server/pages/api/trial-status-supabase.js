"use strict";
(() => {
var exports = {};
exports.id = 217;
exports.ids = [217];
exports.modules = {

/***/ 2885:
/***/ ((module) => {

module.exports = require("@supabase/supabase-js");

/***/ }),

/***/ 9938:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2885);
/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__);
// API route for trial status using Supabase backend

const supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)("https://fnbmngpucvahupgyxzre.supabase.co", process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuYm1uZ3B1Y3ZhaHVwZ3l4enJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjY1MDQsImV4cCI6MjA3NjU0MjUwNH0.xOP4I9ysM3XkPQZvnD63iXf79sHhhrakaCBoR1-8T9E");
async function handler(req, res) {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");
    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }
    const { email  } = req.query;
    if (!email) {
        return res.status(400).json({
            error: "Email is required"
        });
    }
    try {
        console.log(`[${new Date().toISOString()}] Checking trial status for: ${email}`);
        // Query user from Supabase
        const { data: user , error: userError  } = await supabase.from("user_trials").select("*").eq("email", email).single();
        if (userError && userError.code !== "PGRST116") {
            throw userError;
        }
        const now = new Date();
        const trialDurationMs = 20 * 60 * 1000 // 20 minutes
        ;
        if (!user) {
            // New user - create trial entry
            const newUser = {
                email,
                registered_at: now.toISOString(),
                trial_used: false,
                credits: 0,
                paid_amount: 0,
                ip_address: req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "unknown"
            };
            const { data: createdUser , error: createError  } = await supabase.from("user_trials").insert(newUser).select().single();
            if (createError) throw createError;
            const trialStartTime = new Date(createdUser.registered_at);
            const trialEndTime = new Date(trialStartTime.getTime() + trialDurationMs);
            const timeRemaining = Math.max(0, trialEndTime.getTime() - now.getTime());
            return res.status(200).json({
                success: true,
                hasTrialAccess: true,
                trialTimeRemaining: timeRemaining,
                trialStarted: createdUser.registered_at,
                creditsRemaining: createdUser.credits || 0,
                isPaid: (createdUser.paid_amount || 0) > 0,
                trialExpired: false,
                isNewUser: true
            });
        }
        // Existing user
        const registrationTime = new Date(user.registered_at);
        const trialEndTime1 = new Date(registrationTime.getTime() + trialDurationMs);
        const timeRemaining1 = Math.max(0, trialEndTime1.getTime() - now.getTime());
        const trialExpired = timeRemaining1 === 0;
        // Check if user has paid access
        const isPaid = (user.paid_amount || 0) > 0;
        const hasTrialAccess = !trialExpired || isPaid;
        return res.status(200).json({
            success: true,
            hasTrialAccess,
            trialTimeRemaining: timeRemaining1,
            trialStarted: user.registered_at,
            creditsRemaining: user.credits || 0,
            isPaid,
            trialExpired,
            isNewUser: false
        });
    } catch (error) {
        console.error("Trial status error:", error);
        return res.status(500).json({
            error: "Database error",
            message: "Failed to retrieve trial status"
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
var __webpack_exports__ = (__webpack_exec__(9938));
module.exports = __webpack_exports__;

})();
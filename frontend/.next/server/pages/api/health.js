"use strict";
(() => {
var exports = {};
exports.id = 837;
exports.ids = [837];
exports.modules = {

/***/ 2885:
/***/ ((module) => {

module.exports = require("@supabase/supabase-js");

/***/ }),

/***/ 4495:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
// Health check API route to verify backend connectivity
async function handler(req, res) {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }
    const results = {
        timestamp: new Date().toISOString(),
        frontend: {
            status: "ok",
            environment: "production" || 0,
            version: process.env.npm_package_version || "unknown"
        },
        backend: {
            status: "unknown",
            url: null,
            error: null,
            responseTime: null
        },
        environment: {
            publicBackendUrl: process.env.NEXT_PUBLIC_BACKEND || "https://teachwise-mvp.vercel.app",
            nodeEnv: "production"
        }
    };
    try {
        // Test Supabase connectivity instead of external backend
        const startTime = Date.now();
        // Test Supabase connection by making a simple query
        const { createClient  } = __webpack_require__(2885);
        const supabase = createClient("https://fnbmngpucvahupgyxzre.supabase.co", process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuYm1uZ3B1Y3ZhaHVwZ3l4enJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjY1MDQsImV4cCI6MjA3NjU0MjUwNH0.xOP4I9ysM3XkPQZvnD63iXf79sHhhrakaCBoR1-8T9E");
        // Test database connectivity
        const { data , error  } = await supabase.from("user_trials").select("*", {
            count: "exact",
            head: true
        });
        results.backend.responseTime = Date.now() - startTime;
        results.backend.url = "https://fnbmngpucvahupgyxzre.supabase.co";
        if (error) {
            results.backend.status = "error";
            results.backend.error = `Supabase error: ${error.message}`;
        } else {
            results.backend.status = "ok";
            results.backend.note = "Supabase database accessible";
            results.backend.data = {
                connection: "successful"
            };
        }
    } catch (error1) {
        results.backend.status = "error";
        results.backend.error = error1.message;
        if (error1.name === "TimeoutError") {
            results.backend.error = "Backend timeout (>5s)";
        } else if (error1.code === "ECONNREFUSED") {
            results.backend.error = "Connection refused - backend not running";
        }
    }
    // Determine overall status
    const overallStatus = results.backend.status === "ok" ? "healthy" : "degraded";
    return res.status(results.backend.status === "ok" ? 200 : 503).json({
        status: overallStatus,
        ...results
    });
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(4495));
module.exports = __webpack_exports__;

})();
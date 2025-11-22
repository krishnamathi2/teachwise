"use strict";
(() => {
var exports = {};
exports.id = 109;
exports.ids = [109];
exports.modules = {

/***/ 2885:
/***/ ((module) => {

module.exports = require("@supabase/supabase-js");

/***/ }),

/***/ 4330:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2885);
/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__);
// Debug API to test Supabase connection and table structure

const supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)("https://fnbmngpucvahupgyxzre.supabase.co", process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuYm1uZ3B1Y3ZhaHVwZ3l4enJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjY1MDQsImV4cCI6MjA3NjU0MjUwNH0.xOP4I9ysM3XkPQZvnD63iXf79sHhhrakaCBoR1-8T9E");
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
    const debug = {
        timestamp: new Date().toISOString(),
        environment: {
            supabaseUrl:  true ? "SET" : 0,
            supabaseKey: process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuYm1uZ3B1Y3ZhaHVwZ3l4enJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjY1MDQsImV4cCI6MjA3NjU0MjUwNH0.xOP4I9ysM3XkPQZvnD63iXf79sHhhrakaCBoR1-8T9E" ? "SET" : 0,
            nodeEnv: "production"
        },
        tests: {}
    };
    try {
        // Test 1: Basic connection
        debug.tests.basicConnection = "Testing...";
        const { data: basicData , error: basicError  } = await supabase.from("user_trials").select("count", {
            count: "exact",
            head: true
        });
        if (basicError) {
            debug.tests.basicConnection = {
                error: basicError.message,
                code: basicError.code
            };
        } else {
            debug.tests.basicConnection = {
                success: true,
                count: basicData
            };
        }
        // Test 2: Simple select
        debug.tests.simpleSelect = "Testing...";
        const { data: selectData , error: selectError  } = await supabase.from("user_trials").select("*").limit(1);
        if (selectError) {
            debug.tests.simpleSelect = {
                error: selectError.message,
                code: selectError.code
            };
        } else {
            debug.tests.simpleSelect = {
                success: true,
                rowCount: selectData ? selectData.length : 0
            };
        }
        // Test 3: Insert test (simulate trial-status API)
        debug.tests.insertTest = "Testing...";
        try {
            const testUser = {
                email: "debug-test@example.com",
                registered_at: new Date().toISOString(),
                trial_used: false,
                credits: 0,
                paid_amount: 0
            };
            const { data: insertData , error: insertError  } = await supabase.from("user_trials").insert(testUser).select().single();
            if (insertError) {
                debug.tests.insertTest = {
                    error: insertError.message,
                    code: insertError.code
                };
            } else {
                debug.tests.insertTest = {
                    success: true,
                    insertedData: insertData
                };
                // Clean up test record
                await supabase.from("user_trials").delete().eq("email", "debug-test@example.com");
            }
        } catch (insertErr) {
            debug.tests.insertTest = {
                error: insertErr.message
            };
        }
        // Test 4: Check specific email query
        debug.tests.emailQuery = "Testing...";
        const { data: emailData , error: emailError  } = await supabase.from("user_trials").select("*").eq("email", "test@example.com");
        if (emailError) {
            debug.tests.emailQuery = {
                error: emailError.message,
                code: emailError.code
            };
        } else {
            debug.tests.emailQuery = {
                success: true,
                foundRows: emailData ? emailData.length : 0
            };
        }
    } catch (error) {
        debug.tests.catchAll = {
            error: error.message
        };
    }
    return res.status(200).json(debug);
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(4330));
module.exports = __webpack_exports__;

})();
(function () {
    function headers(profile) {
        return {
            "Content-Type": "application/json",
            "x-ops-tier": profile?.tier || "guest",
            "x-ops-role": profile?.role || "guest",
            "x-store-ids": (profile?.storeIds || []).join(",")
        };
    }

    async function request(path, profile, options = {}) {
        const response = await fetch(path, {
            ...options,
            headers: {
                ...headers(profile),
                ...(options.headers || {})
            }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "API request failed.");
        return payload.data;
    }

    function storeSummary(profile) {
        return request("/api/store/summary", profile);
    }

    function publicStores() {
        return request("/api/public/stores", null);
    }

    function storeOrders(profile) {
        return request("/api/store/orders", profile);
    }

    function storeProducts(profile) {
        return request("/api/store/products", profile);
    }

    function adminStores(profile) {
        return request("/api/admin/stores", profile);
    }

    function adminUsers(profile) {
        return request("/api/admin/users", profile);
    }

    function storeUsers(profile) {
        return request("/api/store/users", profile);
    }

    function auditLogs(profile) {
        return request("/api/admin/audit-logs", profile);
    }

    window.ChanhTeaDashboardApi = {
        publicStores,
        storeSummary,
        storeOrders,
        storeProducts,
        adminStores,
        adminUsers,
        storeUsers,
        auditLogs
    };
})();

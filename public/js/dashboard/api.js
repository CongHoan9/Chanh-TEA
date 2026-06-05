(function () {
    function headers(profile) {
        return {
            "Content-Type": "application/json",
            "x-ops-tier": profile?.tier || "guest",
            "x-ops-role": profile?.role || "guest",
            "x-store-ids": (profile?.storeIds || []).join(","),
            "Authorization": profile?.token ? `Bearer ${profile.token}` : undefined
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

    function createAdminStore(profile, body) {
        return request("/api/admin/stores", profile, {
            method: "POST",
            body: JSON.stringify(body)
        });
    }

    function updateAdminStore(profile, id, body) {
        return request(`/api/admin/stores/${id}`, profile, {
            method: "PUT",
            body: JSON.stringify(body)
        });
    }

    function adminSummary(profile) {
        return request("/api/admin/summary", profile);
    }

    function adminRegionReport(profile) {
        return request("/api/admin/regions-stores-report", profile);
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

    async function adminAnalyticsBranches() {
        return fetchAuth('/api/admin/analytics/branches');
    }

    async function adminAnalyticsProducts() {
        return fetchAuth('/api/admin/analytics/products');
    }

    window.ChanhTeaDashboardApi = {
        publicStores,
        storeSummary,
        storeOrders,
        storeProducts,
        adminStores,
        createAdminStore,
        updateAdminStore,
        adminSummary,
        adminRegionReport,
        adminUsers,
        storeUsers,
        auditLogs,
        adminAnalyticsBranches,
        adminAnalyticsProducts
    };
})();

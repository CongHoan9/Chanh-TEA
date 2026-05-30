(function () {
    const SESSION_KEY = "chanhTeaOpsSession";

    function loadSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY));
        } catch (error) {
            return null;
        }
    }

    function saveSession(profile) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    }

    function clearSession() {
        localStorage.removeItem(SESSION_KEY);
    }

    function signIn(tier, store) {
        const profile = tier === "command"
            ? {
                id: "command-session",
                fullName: "Tổng quản trị ChanhTea",
                email: "admin@chanhtea.local",
                role: "system_admin",
                tier: "command",
                storeIds: ["*"]
            }
            : {
                id: "store-session",
                fullName: `Quản lý ${store.name}`,
                email: "store@chanhtea.local",
                role: "store_manager",
                tier: "store",
                storeIds: [store.id],
                storeName: store.name
            };

        saveSession(profile);
        return profile;
    }

    window.ChanhTeaOpsState = {
        loadSession,
        saveSession,
        clearSession,
        signIn
    };
})();

(function () {
    const SESSION_KEY = "chanhTeaOpsSession";

    function loadSession() {
        try {
            const token = localStorage.getItem('auth_token');
            const userInfoStr = localStorage.getItem('user_info');
            if (token && userInfoStr) {
                const user = JSON.parse(userInfoStr);
                const isCommand = user.role === 'system_admin' || user.role === 'regional_manager' || user.role === 'support' || user.role === 'admin';
                return {
                    id: user.id,
                    fullName: user.full_name || user.email,
                    email: user.email,
                    role: user.role,
                    tier: isCommand ? "command" : "store",
                    storeIds: isCommand ? ["*"] : [user.store_id],
                    token: token
                };
            }
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
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
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

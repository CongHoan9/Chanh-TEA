(function () {
    const roleCapabilities = {
        guest: ["guest.entry"],
        store_staff: ["store.orders.read", "store.orders.status"],
        store_manager: [
            "store.orders.read",
            "store.orders.status",
            "store.inventory.manage",
            "store.reports.read",
            "store.members.read"
        ],
        regional_manager: [
            "store.orders.read",
            "store.reports.read",
            "command.stores.read",
            "command.orders.read",
            "command.audit.read"
        ],
        system_admin: [
            "store.orders.read",
            "store.orders.status",
            "store.inventory.manage",
            "store.reports.read",
            "store.members.read",
            "command.stores.manage",
            "command.members.manage",
            "command.orders.read",
            "command.audit.read"
        ]
    };

    function has(profile, capability) {
        if (!profile) return capability === "guest.entry";
        return (roleCapabilities[profile.role] || []).includes(capability);
    }

    function visiblePanels(profile) {
        if (!profile) return [];

        const panels = [];
        if (has(profile, "store.orders.read")) panels.push("store-orders");
        if (has(profile, "store.inventory.manage")) panels.push("inventory");
        if (has(profile, "store.reports.read")) panels.push("store-report");
        if (has(profile, "command.stores.read") || has(profile, "command.stores.manage")) panels.push("admin-stores");
        if (has(profile, "command.members.manage") || has(profile, "store.members.read")) panels.push("admin-users");
        if (has(profile, "command.audit.read")) panels.push("audit-log");
        return panels;
    }

    window.ChanhTeaRBAC = {
        has,
        visiblePanels
    };
})();

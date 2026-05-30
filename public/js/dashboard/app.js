(function () {
    const root = document.getElementById("dashboardRoot");
    let loginStores = [];

    function formatCurrency(value) {
        return Number(value || 0).toLocaleString("vi-VN") + " ₫";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderTable(moduleName, rows, columns) {
        const body = document.querySelector(`[data-table-body="${moduleName}"]`);
        if (!body) return;
        if (!rows.length) {
            body.innerHTML = `<tr><td colspan="${columns.length}">Chưa có dữ liệu.</td></tr>`;
            return;
        }
        body.innerHTML = rows.map(row => `
            <tr>${columns.map(column => `<td>${escapeHtml(column(row))}</td>`).join("")}</tr>
        `).join("");
    }

    function renderOrders(orders) {
        document.querySelectorAll("[data-order-lane] .order-list").forEach(list => {
            list.innerHTML = "";
        });

        orders.forEach(order => {
            const laneStatus = order.status === "accepted" ? "assigned" : order.status;
            const list = document.querySelector(`[data-order-lane="${laneStatus}"] .order-list`);
            if (!list) return;
            const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.qty || item.quantity || 1), 0);
            list.insertAdjacentHTML("beforeend", `
                <article class="ops-card order-card" data-order-id="${escapeHtml(order.id)}">
                    <strong>${escapeHtml(order.code)}</strong>
                    <span>${escapeHtml(order.customer_name)} · ${escapeHtml(order.customer_phone)}</span>
                    <span>${itemCount} món · ${formatCurrency(order.total)}</span>
                </article>
            `);
        });

        document.querySelectorAll("[data-order-lane] .order-list").forEach(list => {
            if (!list.children.length) {
                list.innerHTML = `<p class="ops-muted">${escapeHtml(list.dataset.empty || "Chưa có đơn")}</p>`;
            }
        });
    }

    async function hydrate(profile, panels) {
        if (!profile || !panels.length) return;
        try {
            if (panels.includes("store-orders") || panels.includes("store-report")) {
                const [summary, orders] = await Promise.all([
                    window.ChanhTeaDashboardApi.storeSummary(profile),
                    window.ChanhTeaDashboardApi.storeOrders(profile)
                ]);
                document.getElementById("metricNewOrders").textContent = summary.new_orders;
                document.getElementById("metricPreparing").textContent = summary.preparing;
                document.getElementById("metricDelivering").textContent = summary.delivering;
                document.getElementById("metricRevenue").textContent = formatCurrency(summary.revenue_today);
                renderOrders(orders);
            }

            if (panels.includes("inventory")) {
                const products = await window.ChanhTeaDashboardApi.storeProducts(profile);
                renderTable("store-products", products, [
                    row => row.name,
                    row => row.stock_status,
                    row => formatCurrency(row.price),
                    row => row.is_available ? "Đang bán" : "Tạm ngưng"
                ]);
            }

            if (panels.includes("admin-stores")) {
                const stores = await window.ChanhTeaDashboardApi.adminStores(profile);
                renderTable("admin-stores", stores, [
                    row => row.name,
                    row => row.province,
                    row => row.is_active ? "Đang hoạt động" : "Tạm ngưng",
                    row => `${row.service_radius_m}m`
                ]);
            }

            if (panels.includes("admin-users")) {
                const users = profile.tier === "command"
                    ? await window.ChanhTeaDashboardApi.adminUsers(profile)
                    : await window.ChanhTeaDashboardApi.storeUsers(profile);
                renderTable("store-members", users, [
                    row => row.full_name,
                    row => row.email,
                    row => row.role,
                    row => row.store_name
                ]);
            }

            if (panels.includes("audit-log")) {
                const logs = await window.ChanhTeaDashboardApi.auditLogs(profile);
                renderTable("audit-log", logs, [
                    row => new Date(row.created_at).toLocaleString("vi-VN"),
                    row => row.actor,
                    row => row.action,
                    row => `${row.entity_type}:${row.entity_id}`
                ]);
            }
        } catch (error) {
            root.insertAdjacentHTML("afterbegin", `<p class="ops-alert">Không tải được dữ liệu dashboard: ${escapeHtml(error.message)}</p>`);
        }
    }

    async function hydrateGatewayStores() {
        const select = document.getElementById("opsStoreId");
        if (!select) return;
        try {
            loginStores = await window.ChanhTeaDashboardApi.publicStores();
            select.innerHTML = loginStores.map(store => `<option value="${escapeHtml(store.id)}">${escapeHtml(store.name)} · ${escapeHtml(store.province)}</option>`).join("");
        } catch (error) {
            select.innerHTML = `<option value="">Không tải được chi nhánh</option>`;
        }
    }

    function render() {
        const profile = window.ChanhTeaOpsState.loadSession();
        if (!profile) {
            root.innerHTML = window.ChanhTeaDashboardTemplates.guestGateway();
            hydrateGatewayStores();
            return;
        }

        const panels = window.ChanhTeaRBAC.visiblePanels(profile);
        root.innerHTML = window.ChanhTeaDashboardTemplates.shell(profile, panels);
        hydrate(profile, panels);
    }

    document.addEventListener("submit", event => {
        const form = event.target.closest("#opsLoginForm");
        if (!form) return;
        event.preventDefault();
        const tier = document.getElementById("opsTier").value;
        const storeId = document.getElementById("opsStoreId")?.value;
        const store = loginStores.find(item => item.id === storeId);
        if (tier === "store" && !store) {
            alert("Vui lòng chọn chi nhánh.");
            return;
        }
        window.ChanhTeaOpsState.signIn(tier, store);
        render();
    });

    document.addEventListener("change", event => {
        if (event.target.closest("#opsTier")) {
            const isStore = event.target.value === "store";
            document.querySelector("[data-store-login-field]")?.toggleAttribute("hidden", !isStore);
        }
    });

    document.addEventListener("click", event => {
        const tab = event.target.closest("[data-dashboard-tab]");
        if (tab) {
            const target = tab.dataset.dashboardTab;
            document.querySelectorAll("[data-dashboard-tab]").forEach(item => {
                item.classList.toggle("is-active", item === tab);
            });
            document.querySelectorAll("[data-dashboard-panel]").forEach(panel => {
                panel.classList.toggle("is-active", panel.dataset.dashboardPanel === target);
            });
            return;
        }

        if (event.target.closest('[data-action="sign-out"]')) {
            window.ChanhTeaOpsState.clearSession();
            render();
        }
    });

    render();
})();

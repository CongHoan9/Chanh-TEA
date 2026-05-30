(function () {
    const panelLabels = {
        "store-orders": "Đơn cửa hàng",
        inventory: "Tồn kho",
        "store-report": "Báo cáo cửa hàng",
        "admin-stores": "Quản lý cửa hàng",
        "admin-users": "Nhân sự",
        "audit-log": "Audit log"
    };

    function guestGateway() {
        return `
            <section class="ops-panel dashboard-gateway" data-tier="guest">
                <div class="ops-grid">
                    <div class="ops-card">
                        <p class="ops-eyebrow">Khách</p>
                        <h2>Bạn đang ở chế độ khách</h2>
                        <p class="ops-muted">Khách không cần đăng nhập để xem menu, đặt hàng và theo dõi đơn. Khu vận hành chỉ mở sau khi nhân sự cửa hàng hoặc tổng quản trị đăng nhập.</p>
                        <a class="green-button" href="/menu">Tiếp tục mua hàng</a>
                    </div>
                    <div class="ops-card">
                        <p class="ops-eyebrow">Đăng nhập vận hành</p>
                        <h2>Chọn tầng quản trị</h2>
                        <form id="opsLoginForm" class="ops-form">
                            <label>
                                <span>Tầng truy cập</span>
                                <select id="opsTier">
                                    <option value="store">Tầng cửa hàng</option>
                                    <option value="command">Tầng tổng quan sát</option>
                                </select>
                            </label>
                            <label data-store-login-field>
                                <span>Chi nhánh</span>
                                <select id="opsStoreId">
                                    <option value="">Đang tải chi nhánh...</option>
                                </select>
                            </label>
                            <button class="green-button" type="submit">Vào dashboard</button>
                        </form>
                    </div>
                </div>
            </section>
        `;
    }

    function shell(profile, panels) {
        const firstPanel = panels[0] || "";
        return `
            <section class="dashboard-shell" data-tier="${profile.tier}">
                <aside class="dashboard-sidebar" data-module="rbac-navigation">
                    <div class="dashboard-profile" data-profile-shell>
                        <strong>${profile.fullName}</strong>
                        <span>${profile.role}</span>
                    </div>
                    ${panels.map((panel, index) => `
                        <button class="dashboard-tab ${index === 0 ? "is-active" : ""}" data-dashboard-tab="${panel}">
                            ${panelLabels[panel]}
                        </button>
                    `).join("")}
                    <button class="dashboard-tab" data-action="sign-out">Đăng xuất</button>
                </aside>
                <section class="dashboard-main">
                    <div class="dashboard-header">
                        <div>
                            <p class="ops-eyebrow">${profile.tier === "command" ? "Tổng quan sát" : "Cửa hàng"}</p>
                            <h1>${profile.tier === "command" ? "Trung tâm điều phối ChanhTea" : "Dashboard cửa hàng"}</h1>
                        </div>
                        ${storeSwitcher(profile)}
                    </div>
                    ${panels.map(panel => panelTemplate(panel, panel === firstPanel)).join("")}
                </section>
            </section>
        `;
    }

    function storeSwitcher(profile) {
        if (profile.tier !== "store" && profile.role !== "system_admin") return "";
        return `
            <div class="store-switcher" data-module="store-context">
                <label>
                    <span>Cửa hàng hiện tại</span>
                    <select id="dashboardStoreSelect" data-rbac-scope="store">
                        ${(profile.storeIds || []).map(storeId => `<option value="${storeId}">${profile.storeName || storeId}</option>`).join("")}
                    </select>
                </label>
            </div>
        `;
    }

    function panelTemplate(panel, active) {
        const className = `dashboard-panel ${active ? "is-active" : ""}`;
        const map = {
            "store-orders": storeOrders,
            inventory,
            "store-report": storeReport,
            "admin-stores": adminStores,
            "admin-users": adminUsers,
            "audit-log": auditLog
        };
        return (map[panel] || emptyPanel)(className, panel);
    }

    function storeOrders(className, panel) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="store-order-board" data-realtime-topic="orders:store">
                <div class="ops-grid dashboard-metrics">
                    <div class="ops-card"><span>Đơn mới</span><strong id="metricNewOrders">0</strong></div>
                    <div class="ops-card"><span>Đang pha chế</span><strong id="metricPreparing">0</strong></div>
                    <div class="ops-card"><span>Đang giao</span><strong id="metricDelivering">0</strong></div>
                    <div class="ops-card"><span>Doanh thu hôm nay</span><strong id="metricRevenue">0 ₫</strong></div>
                </div>
                <div class="order-board">
                    ${lane("assigned", "Đơn mới")}
                    ${lane("preparing", "Đang pha chế")}
                    ${lane("ready", "Sẵn sàng")}
                    ${lane("delivering", "Đang giao")}
                </div>
            </section>
        `;
    }

    function lane(status, title) {
        return `<section class="order-lane" data-order-lane="${status}"><h3>${title}</h3><div class="order-list" data-empty="Chưa có đơn"></div></section>`;
    }

    function inventory(className, panel) {
        return tablePanel(className, panel, "Tồn kho và menu cửa hàng", "store-products", ["Sản phẩm", "Trạng thái", "Giá", "Cập nhật"]);
    }

    function storeReport(className, panel) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="store-report">
                <div class="panel-toolbar"><h2>Báo cáo cửa hàng</h2><input id="reportDate" type="date"></div>
                <div class="ops-grid dashboard-metrics">
                    <div class="ops-card"><span>Tổng đơn</span><strong>0</strong></div>
                    <div class="ops-card"><span>Hoàn tất</span><strong>0</strong></div>
                    <div class="ops-card"><span>Từ chối</span><strong>0</strong></div>
                    <div class="ops-card"><span>Thời gian xử lý TB</span><strong>0 phút</strong></div>
                </div>
            </section>
        `;
    }

    function adminStores(className, panel) {
        return tablePanel(className, panel, "Quản lý cửa hàng", "admin-stores", ["Cửa hàng", "Tỉnh/Thành", "Trạng thái", "Bán kính"]);
    }

    function adminUsers(className, panel) {
        return tablePanel(className, panel, "Nhân sự và phân quyền", "store-members", ["Nhân sự", "Email", "Vai trò", "Cửa hàng"]);
    }

    function auditLog(className, panel) {
        return tablePanel(className, panel, "Audit log", "audit-log", ["Thời gian", "Người thao tác", "Hành động", "Đối tượng"]);
    }

    function tablePanel(className, panel, title, module, headers) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="${module}">
                <div class="panel-toolbar"><h2>${title}</h2></div>
                <div class="table-shell">
                    <table>
                        <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
                        <tbody data-table-body="${module}"><tr><td colspan="${headers.length}">Đang chờ dữ liệu.</td></tr></tbody>
                    </table>
                </div>
            </section>
        `;
    }

    function emptyPanel(className, panel) {
        return `<section class="${className}" data-dashboard-panel="${panel}"></section>`;
    }

    window.ChanhTeaDashboardTemplates = {
        guestGateway,
        shell
    };
})();

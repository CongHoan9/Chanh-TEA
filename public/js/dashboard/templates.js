(function () {
    const panelLabels = {
        "admin-overview": "Tổng quan",
        "admin-analytics": "Phân tích & Xếp hạng",
        "store-orders": "Đơn cửa hàng",
        inventory: "Tồn kho",
        "admin-store-report": "Báo cáo cửa hàng",
        "store-report": "Báo cáo nội bộ",
        "store-history": "Quản lý hóa đơn",
        "audit-log": "Audit Log"
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
            <section class="admin-shell" data-tier="${profile.tier}" style="display:block;">
                <header>
                    <div class="Container">
                        <nav class="navbar">
                            <div class="nav-left">
                                <div class="logo">
                                    <span class="logo-yellow">Chanh</span><span class="logo-green">Tea</span>
                                </div>
                                <ul class="nav-links" data-module="rbac-navigation">
                                    ${panels.map((panel, index) => `
                                        <li><a class="nav-tab ${index === 0 ? "is-active" : ""}" data-dashboard-tab="${panel}" style="cursor:pointer; color: ${index === 0 ? '#16a34a' : '#2c3e50'};">${panelLabels[panel]}</a></li>
                                    `).join("")}
                                </ul>
                            </div>
                            <div class="nav-actions">
                                <a class="outline-button" data-action="sign-out">Đăng xuất</a>
                            </div>
                        </nav>
                    </div>
                </header>
                
                <div id="panels-container">
                    ${panels.map(panel => panelTemplate(panel, panel === firstPanel, profile)).join("")}
                </div>
            </section>
        `;
    }

    function heroHeader(title, quote, gradient) {
        return `
            <section class="dashboard-hero-full" style="background: ${gradient};">
                <div class="Container">
                    <div class="dashboard-hero-content">
                        <h2>${title}</h2>
                        <p>${quote}</p>
                    </div>
                </div>
            </section>
        `;
    }

    function storeSwitcher(profile) {
        return "";
    }

    function panelTemplate(panel, active, profile) {
        const className = `dashboard-panel ${active ? "is-active" : ""}`;
        const map = {
            "admin-overview": adminOverview,
            "admin-analytics": adminAnalytics,
            "admin-store-report": adminStoreReport,
            "store-orders": storeOrders,
            inventory,
            "store-report": storeReport,
            "store-history": storeHistory,
            "audit-log": auditLog
        };
        return (map[panel] || emptyPanel)(className, panel, profile);
    }

    function adminAnalytics(className, panel, profile) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="admin-analytics">
                ${heroHeader("Phân Tích & Báo Cáo Chuyên Sâu", '"Dữ liệu lên tiếng, quản trị thông minh." - Chào mừng ' + profile.fullName, 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)')}
                
                <div class="Container dashboard-content">
                    <!-- Branch Ranking -->
                    <div class="ops-grid">
                        <div class="ops-card" style="grid-column: span 12;">
                            <h3><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg> Quản Lý & So Sánh Hiệu Năng Chi Nhánh</h3>
                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-top: 20px;">
                                <div>
                                    <h4 class="ops-eyebrow">Top Doanh Thu & Thời Gian Xử Lý Đơn</h4>
                                    <div class="table-container">
                                        <table class="ops-table">
                                            <thead>
                                                <tr>
                                                    <th>Hạng</th>
                                                    <th>Chi Nhánh</th>
                                                    <th>Doanh Thu</th>
                                                    <th>Số Đơn</th>
                                                    <th>TG Xử Lý TB</th>
                                                </tr>
                                            </thead>
                                            <tbody id="analyticsBranchRanking">
                                                <tr><td colspan="5" class="ops-muted">Đang tải...</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="ops-eyebrow">Bản Đồ Mật Độ Đơn Hàng</h4>
                                    <div id="analyticsHeatmap" style="height: 300px; border-radius: 8px; border: 1px solid #e5e7eb; background: #f3f4f6;"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Product Analytics -->
                    <div class="ops-grid" style="margin-top: 24px;">
                        <div class="ops-card" style="grid-column: span 12;">
                            <h3><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Phân Tích Sản Phẩm & Menu</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px;">
                                
                                <div>
                                    <h4 class="ops-eyebrow">Top Bán Chạy & Sinh Lời Cao Nhất</h4>
                                    <div class="table-container" style="max-height: 350px; overflow-y: auto;">
                                        <table class="ops-table">
                                            <thead>
                                                <tr>
                                                    <th>Sản Phẩm</th>
                                                    <th>Đã Bán</th>
                                                    <th>Lợi Nhuận</th>
                                                </tr>
                                            </thead>
                                            <tbody id="analyticsTopProducts">
                                                <tr><td colspan="3" class="ops-muted">Đang tải...</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <h4 class="ops-eyebrow">Biểu Đồ Lợi Nhuận (Gà Đẻ Trứng Vàng)</h4>
                                    <div style="position: relative; height: 300px; width: 100%;">
                                        <canvas id="analyticsProfitChart"></canvas>
                                    </div>
                                </div>

                                <div>
                                    <h4 class="ops-eyebrow">Tần Suất Mua Kèm (Upsell)</h4>
                                    <div class="table-container" style="max-height: 350px; overflow-y: auto;">
                                        <table class="ops-table">
                                            <thead>
                                                <tr>
                                                    <th>Cặp Sản Phẩm</th>
                                                    <th>Tần Suất</th>
                                                </tr>
                                            </thead>
                                            <tbody id="analyticsUpsell">
                                                <tr><td colspan="2" class="ops-muted">Đang tải...</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>
            </section>
        `;
    }

    function adminOverview(className, panel, profile) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="admin-overview">
                ${heroHeader("Tổng quan hệ thống", '"Tầm nhìn bao quát, quyết định chính xác." - Chào mừng ' + profile.fullName, 'linear-gradient(135deg, #15803d 0%, #eab308 100%)')}
                <main class="Container" style="padding-top: 30px;">
                    ${storeSwitcher(profile)}
                    <div class="admin-flat-metrics">
                        <div class="admin-flat-card">
                            <span>Doanh thu hôm nay</span>
                            <strong id="adminMetricRevenue">0 ₫</strong>
                        </div>
                        <div class="admin-flat-card">
                            <span>Tổng đơn hôm nay</span>
                            <strong id="adminMetricOrders">0</strong>
                        </div>
                        <div class="admin-flat-card">
                            <span>Đơn chờ xử lý</span>
                            <strong id="adminMetricNewOrders">0</strong>
                        </div>
                        <div class="admin-flat-card">
                            <span>Chi nhánh HĐ</span>
                            <strong id="adminMetricStores">0</strong>
                        </div>
                    </div>
                    
                    <div class="admin-flat-layout">
                        <div class="admin-flat-card" style="flex:2">
                            <h3>Biểu đồ doanh thu (7 ngày)</h3>
                            <div style="height: 300px;"><canvas id="adminRevenueChart"></canvas></div>
                        </div>
                        <div class="admin-flat-card" style="flex:1">
                            <h3>Top Chi nhánh</h3>
                            <table class="admin-flat-table">
                                <thead><tr><th>Chi nhánh</th><th>Doanh thu</th></tr></thead>
                                <tbody data-table-body="admin-top-stores">
                                    <tr><td colspan="2">Đang tải...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </section>
        `;
    }

    function adminStoreReport(className, panel, profile) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="admin-store-report">
                ${heroHeader("Báo cáo hệ thống", '"Dữ liệu là dòng chảy nuôi dưỡng mọi chiến lược thành công."', 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)')}
                <main class="Container" style="padding-top: 30px;">
                    ${storeSwitcher(profile)}
                    <div class="panel-toolbar" style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; gap:10px;">
                            <input type="text" id="adminReportSearch" placeholder="Tìm chi nhánh..." style="padding:8px; border:1px solid #ccc; border-radius:6px;">
                            <select id="adminReportRegionFilter" style="padding:8px; border:1px solid #ccc; border-radius:6px;">
                                <option value="">Tất cả khu vực</option>
                            </select>
                        </div>
                        <button class="green-button" onclick="document.getElementById('createStoreModal').style.display='flex'">+ Tạo chi nhánh</button>
                    </div>
                    <div class="admin-flat-card" style="padding:0; border:none; background:transparent;">
                        <div id="adminReportContainer">Đang tải báo cáo...</div>
                    </div>

                    <!-- Create Store Modal -->
                    <div id="createStoreModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;">
                        <div class="modal-content" style="background:#fff; padding:20px; border-radius:12px; width:450px; max-width:100%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); box-sizing:border-box;">
                            <h3 style="margin-top:0; font-size:18px;">Tạo chi nhánh mới</h3>
                            <form id="createStoreForm" class="ops-form" style="display:flex; flex-direction:column; gap:15px; margin-top:15px;">
                                <label><span>Tên chi nhánh</span><input style="padding:8px; border:1px solid #ccc; border-radius:6px; width:100%;" type="text" name="name" required></label>
                                <label><span>Tỉnh/Thành</span><input style="padding:8px; border:1px solid #ccc; border-radius:6px; width:100%;" type="text" name="province" required></label>
                                <label><span>Địa chỉ chi tiết</span><input style="padding:8px; border:1px solid #ccc; border-radius:6px; width:100%;" type="text" name="address" required></label>
                                <div style="display:flex; gap:15px;">
                                    <label style="flex:1"><span>Kinh độ (Lng)</span><input style="padding:8px; border:1px solid #ccc; border-radius:6px; width:100%;" type="number" step="0.000001" name="lng" required></label>
                                    <label style="flex:1"><span>Vĩ độ (Lat)</span><input style="padding:8px; border:1px solid #ccc; border-radius:6px; width:100%;" type="number" step="0.000001" name="lat" required></label>
                                </div>
                                <label><span>Bán kính (m)</span><input style="padding:8px; border:1px solid #ccc; border-radius:6px; width:100%;" type="number" name="service_radius_m" value="3000" required></label>
                                
                                <div style="margin-top:10px; display:flex; gap:10px; justify-content:flex-end;">
                                    <button type="button" class="btn" style="background:#f3f4f6; padding:8px 16px; border:none; border-radius:6px; cursor:pointer;" onclick="document.getElementById('createStoreModal').style.display='none'">Hủy</button>
                                    <button type="submit" class="green-button" style="padding:8px 16px; border:none; border-radius:6px; cursor:pointer;">Lưu chi nhánh</button>
                                </div>
                            </form>
                        </div>
                    </div>


                </main>
            </section>
        `;
    }

    function storeOrders(className, panel, profile) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="store-order-board" data-realtime-topic="orders:store">
                ${heroHeader("Đơn hàng", '"Mỗi đơn hàng hoàn thành là một nụ cười khách hàng được gửi trao."', 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)')}
                <main class="Container" style="padding-top: 30px;">
                    ${storeSwitcher(profile)}
                    <div class="ops-grid dashboard-metrics" style="margin-bottom: 20px;">
                        <div class="ops-card" style="padding: 15px;"><span>Đơn mới</span><strong id="metricNewOrders">0</strong></div>
                        <div class="ops-card" style="padding: 15px;"><span>Đang pha chế</span><strong id="metricPreparing">0</strong></div>
                        <div class="ops-card" style="padding: 15px;"><span>Đang giao</span><strong id="metricDelivering">0</strong></div>
                    </div>
                    <div class="order-board">
                        ${lane("assigned", "Đơn mới")}
                        ${lane("preparing", "Đang pha chế")}
                        ${lane("ready", "Sẵn sàng")}
                        ${lane("delivering", "Đang giao")}
                    </div>
                </main>
            </section>
        `;
    }

    function lane(status, title) {
        return `<section class="order-lane" data-order-lane="${status}"><h3>${title}</h3><div class="order-list" data-empty="Chưa có đơn"></div></section>`;
    }

    function inventory(className, panel, profile) {
        return tablePanel(className, panel, profile, "Tồn kho", '"Quản lý thông minh, tối ưu hóa mọi nguồn lực tại cửa hàng."', "store-products", ["Sản phẩm", "Trạng thái", "Giá", "Cập nhật"], 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)');
    }

    function storeReport(className, panel, profile) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="store-report">
                ${heroHeader("Báo cáo cửa hàng", '"Hiểu rõ hoạt động, bứt phá doanh thu từng ngày."', 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)')}
                <main class="Container" style="padding-top: 30px;">
                    ${storeSwitcher(profile)}
                    <div class="panel-toolbar" style="margin-bottom: 20px;"><input id="reportDate" type="date" style="padding:8px; border:1px solid #ccc; border-radius:6px;"></div>
                    <div class="ops-grid dashboard-metrics">
                        <div class="ops-card" style="padding: 15px;"><span>Tổng đơn</span><strong>0</strong></div>
                        <div class="ops-card" style="padding: 15px;"><span>Hoàn tất</span><strong>0</strong></div>
                        <div class="ops-card" style="padding: 15px;"><span>Từ chối</span><strong>0</strong></div>
                        <div class="ops-card" style="padding: 15px;"><span>Doanh thu hôm nay</span><strong id="metricRevenue">0 ₫</strong></div>
                    </div>
                </main>
            </section>
        `;
    }

    function storeHistory(className, panel, profile) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="store-history">
                ${heroHeader("Quản lý hóa đơn", '"Lưu trữ lịch sử, tra cứu dễ dàng."', 'linear-gradient(135deg, #64748b 0%, #475569 100%)')}
                <main class="Container" style="padding-top: 30px;">
                    ${storeSwitcher(profile)}
                    <div class="panel-toolbar" style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center;">
                        <input id="historyDate" type="date" style="padding:8px; border:1px solid #ccc; border-radius:6px;">
                    </div>
                    <div class="table-shell">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr>
                                    <th>Mã Đơn</th>
                                    <th>Khách Hàng</th>
                                    <th>Trạng Thái</th>
                                    <th>Thời Gian</th>
                                    <th>Tổng Tiền</th>
                                </tr>
                            </thead>
                            <tbody id="historyTableBody">
                                <tr><td colspan="5">Đang tải lịch sử...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </main>
            </section>
        `;
    }

    function adminUsers(className, panel, profile) {
        return tablePanel(className, panel, profile, "Nhân sự", '"Nhân sự là cốt lõi của mọi thành công vĩ đại."', "store-members", ["Nhân sự", "Email", "Vai trò", "Cửa hàng"], 'linear-gradient(135deg, #ea580c 0%, #facc15 100%)');
    }

    function auditLog(className, panel, profile) {
        return tablePanel(className, panel, profile, "Audit Log", '"Minh bạch tuyệt đối, an toàn hệ thống đặt lên hàng đầu."', "audit-log", ["Thời gian", "Người thao tác", "Hành động", "Đối tượng"], 'linear-gradient(135deg, #475569 0%, #0f172a 100%)');
    }

    function tablePanel(className, panel, profile, title, quote, module, headers, gradient) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}" data-module="${module}">
                ${heroHeader(title, quote, gradient)}
                <main class="Container" style="padding-top: 30px;">
                    ${storeSwitcher(profile)}
                    <div class="table-shell">
                        <table>
                            <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
                            <tbody data-table-body="${module}"><tr><td colspan="${headers.length}">Đang chờ dữ liệu.</td></tr></tbody>
                        </table>
                    </div>
                </main>
            </section>
        `;
    }

    function emptyPanel(className, panel, profile) {
        return `
            <section class="${className}" data-dashboard-panel="${panel}">
                ${heroHeader(panel, '"Đang cập nhật..."', 'linear-gradient(135deg, #64748b 0%, #334155 100%)')}
                <main class="Container" style="padding-top: 30px;"></main>
            </section>
        `;
    }

    window.ChanhTeaDashboardTemplates = {
        guestGateway,
        shell
    };
})();

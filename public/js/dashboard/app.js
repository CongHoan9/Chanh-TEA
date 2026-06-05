(function () {
    const root = document.getElementById("dashboardRoot");
    let loginStores = [];

    function formatCurrency(value) {
        return Number(value || 0).toLocaleString("vi-VN") + " ₫";
    }

    // Global function for store detailed tabs in admin
    window.switchAdminStoreTab = function(btn, tabClass) {
        const header = btn.parentElement;
        Array.from(header.children).forEach(c => {
            c.style.color = '#64748b';
            c.style.fontWeight = '500';
            c.style.borderBottom = 'none';
        });
        btn.style.color = '#059669';
        btn.style.fontWeight = '600';
        btn.style.borderBottom = '2px solid #059669';
        
        const contentWrapper = header.nextElementSibling;
        Array.from(contentWrapper.children).forEach(c => {
            c.style.display = 'none';
        });
        const target = contentWrapper.querySelector('.' + tabClass);
        if (target) target.style.display = 'block';
    };

    window.submitAdminStoreUpdate = async function(e, storeId) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const oldText = btn.textContent;
        btn.textContent = 'Đang lưu...';
        btn.disabled = true;

        try {
            const isActive = document.getElementById(`update-status-${storeId}`).value === '1';
            const radius = parseInt(document.getElementById(`update-radius-${storeId}`).value);
            const latStr = document.getElementById(`update-lat-${storeId}`).value;
            const lngStr = document.getElementById(`update-lng-${storeId}`).value;
            
            const body = {
                is_active: isActive,
                service_radius_m: radius
            };
            if (latStr && lngStr) {
                body.lat = parseFloat(latStr);
                body.lng = parseFloat(lngStr);
            }

            const res = await window.ChanhTeaDashboardApi.updateAdminStore(ChanhTeaState.profile, storeId, body);
            if (res && res.success) {
                alert('Cập nhật thành công!');
                await loadAdminStores(); // Reload list
            } else {
                alert('Lỗi: ' + (res.message || 'Không thể cập nhật'));
            }
        } catch (err) {
            console.error(err);
            alert('Đã xảy ra lỗi.');
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    };

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
                    <div class="order-card-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                        <strong style="font-size: 16px; color: #1e293b;">${escapeHtml(order.code)}</strong>
                        <span style="font-weight: 600; color: #10b981;">${formatCurrency(order.total)}</span>
                    </div>
                    <div class="order-card-body" style="display: flex; flex-direction: column; gap: 4px; font-size: 14px; color: #475569;">
                        <span>👤 ${escapeHtml(order.customer_name)}</span>
                        <span>📞 ${escapeHtml(order.customer_phone)}</span>
                        <span>📦 ${itemCount} món</span>
                    </div>
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
            if (panels.includes("admin-overview")) {
                const summary = await window.ChanhTeaDashboardApi.adminSummary(profile);
                if (document.getElementById("adminMetricRevenue")) {
                    document.getElementById("adminMetricRevenue").textContent = formatCurrency(summary.revenue_today);
                    document.getElementById("adminMetricOrders").textContent = summary.total_orders;
                    document.getElementById("adminMetricNewOrders").textContent = summary.new_orders;
                    document.getElementById("adminMetricStores").textContent = summary.active_stores;
                    
                    renderTable("admin-top-stores", summary.top_stores, [
                        row => row.name,
                        row => formatCurrency(row.revenue)
                    ]);

                    if (window.Chart) {
                        const ctx = document.getElementById('adminRevenueChart');
                        if (ctx) {
                            new window.Chart(ctx, {
                                type: 'line',
                                data: {
                                    labels: summary.chart_data.map(d => new Date(d.date).toLocaleDateString('vi-VN')),
                                    datasets: [{
                                        label: 'Doanh thu',
                                        data: summary.chart_data.map(d => d.revenue),
                                        borderColor: '#10b981',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        tension: 0.4,
                                        fill: true
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: { y: { beginAtZero: true } }
                                }
                            });
                        }
                    }
                }
            }

            if (panels.includes("admin-analytics")) {
                try {
                    const branches = await window.ChanhTeaDashboardApi.adminAnalyticsBranches();
                    const products = await window.ChanhTeaDashboardApi.adminAnalyticsProducts();
                    const storesRes = await window.ChanhTeaDashboardApi.adminStores(profile);
                    
                    const rankingHtml = branches.data.map((b, i) => `
                        <tr>
                            <td><strong>#${i + 1}</strong></td>
                            <td>${b.name}</td>
                            <td style="color: #16a34a; font-weight: bold;">${formatCurrency(b.total_revenue)}</td>
                            <td>${b.total_orders}</td>
                            <td>${Math.round(b.avg_processing_seconds / 60)} phút</td>
                        </tr>
                    `).join("");
                    document.getElementById("analyticsBranchRanking").innerHTML = rankingHtml || '<tr><td colspan="5" class="ops-muted">Chưa có dữ liệu</td></tr>';

                    const topProductsHtml = products.data.topProducts.map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>${p.total_sold}</td>
                            <td style="color: #2563eb; font-weight: bold;">${formatCurrency(p.total_profit)}</td>
                        </tr>
                    `).join("");
                    document.getElementById("analyticsTopProducts").innerHTML = topProductsHtml || '<tr><td colspan="3" class="ops-muted">Chưa có dữ liệu</td></tr>';

                    const upsellHtml = products.data.upsell.map(u => `
                        <tr>
                            <td>${u.product_a} <br><small class="ops-muted">+ ${u.product_b}</small></td>
                            <td><span style="background: #fef08a; color: #854d0e; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 0.8rem;">${u.frequency} lần</span></td>
                        </tr>
                    `).join("");
                    document.getElementById("analyticsUpsell").innerHTML = upsellHtml || '<tr><td colspan="2" class="ops-muted">Chưa có dữ liệu</td></tr>';

                    if (window.Chart) {
                        const ctx = document.getElementById('analyticsProfitChart');
                        if (ctx) {
                            new window.Chart(ctx, {
                                type: 'doughnut',
                                data: {
                                    labels: products.data.topProducts.map(p => p.name).slice(0, 5),
                                    datasets: [{
                                        data: products.data.topProducts.map(p => p.total_profit).slice(0, 5),
                                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                                    }]
                                },
                                options: { responsive: true, maintainAspectRatio: false }
                            });
                        }
                    }

                    if (window.L && document.getElementById('analyticsHeatmap')) {
                        // Use Hanoi as center
                        const map = L.map('analyticsHeatmap').setView([21.0285, 105.8542], 11);
                        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                            attribution: '©OpenStreetMap, ©CartoDB'
                        }).addTo(map);

                        storesRes.data.forEach(store => {
                            const branchPerf = branches.data.find(b => b.id === store.id);
                            if (branchPerf && branchPerf.total_orders > 0) {
                                // Draw circles. Size based on orders, color based on revenue
                                const radius = Math.min(Math.max(branchPerf.total_orders * 50, 200), 2000);
                                L.circle([store.lat, store.lng], {
                                    color: '#ef4444',
                                    fillColor: '#ef4444',
                                    fillOpacity: 0.5,
                                    radius: radius
                                }).addTo(map).bindPopup(`<b>${store.name}</b><br>Doanh thu: ${formatCurrency(branchPerf.total_revenue)}`);
                            } else {
                                L.circleMarker([store.lat, store.lng], {
                                    color: '#9ca3af',
                                    radius: 5
                                }).addTo(map).bindPopup(store.name);
                            }
                        });
                    }
                } catch (e) {
                    console.error("Lỗi tải Analytics", e);
                }
            }

            if (panels.includes("admin-store-report")) {
                const reportData = await window.ChanhTeaDashboardApi.adminRegionReport(profile);
                const container = document.getElementById("adminReportContainer");
                const searchInput = document.getElementById("adminReportSearch");
                const regionFilter = document.getElementById("adminReportRegionFilter");
                
                if (!document.getElementById('admin-responsive-styles')) {
                    const style = document.createElement('style');
                    style.id = 'admin-responsive-styles';
                    style.innerHTML = `
                        @media (max-width: 1200px) { .col-address { display: none !important; } }
                        @media (max-width: 992px) { .col-orders { display: none !important; } }
                        @media (max-width: 768px) { .col-revenue { display: none !important; } }
                    `;
                    document.head.appendChild(style);
                }
                
                // Populate region filter
                regionFilter.innerHTML = '<option value="">Tất cả khu vực</option>' + reportData.map(r => `<option value="${r.region_id}">${escapeHtml(r.region_name)}</option>`).join("");
                
                function renderReport() {
                    const q = searchInput.value.toLowerCase();
                    const rFilter = regionFilter.value;
                    
                    let html = '';
                    let hasAnyStores = false;

                    reportData.forEach(region => {
                        if (rFilter && region.region_id !== rFilter) return;
                        
                        const filteredStores = region.stores.filter(s => s.name.toLowerCase().includes(q));
                        if (!filteredStores.length) return;
                        hasAnyStores = true;
                        
                        html += `
                            <div class="admin-region-block" style="margin-bottom: 30px;">
                                <div onclick="const grid = this.nextElementSibling; const icon = this.querySelector('svg:last-child'); if (grid.style.display === 'none') { grid.style.display = 'block'; icon.style.transform = 'rotate(180deg)'; } else { grid.style.display = 'none'; icon.style.transform = 'rotate(0deg)'; }" style="display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9; cursor: pointer; user-select: none; margin-bottom: 20px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                                    <span style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(16,185,129,0.2);">
                                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
                                        ${escapeHtml(region.region_name)}
                                    </span>
                                    <span style="color: #64748b; font-size: 14px; font-weight: 500; background: #f1f5f9; padding: 4px 10px; border-radius: 12px;">${filteredStores.length} chi nhánh</span>
                                    <div style="flex: 1;"></div>
                                    <svg width="20" height="20" fill="#64748b" viewBox="0 0 20 20" style="transition: transform 0.3s ease; transform: rotate(0deg);"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                </div>
                                <div style="display: block;">
                                    <div>
                                        <div style="display: flex; padding: 16px; background: transparent; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; margin-bottom: 8px;">
                                            <div style="flex: 0.5;">Mã</div>
                                            <div style="flex: 1.5;">Tên chi nhánh</div>
                                            <div style="flex: 1;">Khu vực</div>
                                            <div class="col-address" style="flex: 2;">Địa chỉ</div>
                                            <div class="col-orders" style="flex: 1; text-align: right; padding-right: 24px;">Tổng đơn</div>
                                            <div class="col-revenue" style="flex: 1; text-align: right; padding-right: 24px;">Doanh thu</div>
                                            <div style="flex: 1; text-align: right;">Trạng thái</div>
                                            <div style="width: 40px;"></div>
                                        </div>
                        `;

                        filteredStores.forEach((s, idx) => {
                            const storeId = s.id || s.store_id || 'ST0000';
                            const storeIdStr = storeId.substring(0,6).toUpperCase();
                            const isActive = s.is_active !== false; 
                            const statusBadge = `<span style="background: ${isActive ? '#ecfdf5' : '#fef2f2'}; color: ${isActive ? '#059669' : '#dc2626'}; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid ${isActive ? '#a7f3d0' : '#fecaca'};">${isActive ? 'Hoạt động' : 'Tạm ngưng'}</span>`;
                            const borderBottom = idx < filteredStores.length - 1 ? 'border-bottom: 1px solid #e2e8f0;' : '';

                            html += `
                            <div class="store-list-row" style="${borderBottom} background: transparent;">
                                <div class="store-row-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none';" style="display: flex; align-items: center; padding: 16px; cursor: pointer; transition: background 0.2s; border-radius: 8px; margin-bottom: 4px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                                    <div style="flex: 0.5; font-family: monospace; color: #64748b; font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px;">${storeIdStr}</div>
                                    <div style="flex: 1.5; color: #0f172a; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px;">${escapeHtml(s.name)}</div>
                                    <div style="flex: 1; color: #64748b; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px;">${escapeHtml(region.region_name)}</div>
                                    <div class="col-address" style="flex: 2; color: #64748b; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 16px;">${escapeHtml(s.address)}</div>
                                    <div class="col-orders" style="flex: 1; text-align: right; padding-right: 24px; font-weight: 600; color: #0f172a;">${s.order_count}</div>
                                    <div class="col-revenue" style="flex: 1; text-align: right; padding-right: 24px; font-weight: 600; color: #10b981;">${formatCurrency(s.revenue)}</div>
                                    <div style="flex: 1; text-align: right;">${statusBadge}</div>
                                    <div style="width: 40px; text-align: right;">
                                        <svg width="20" height="20" fill="#94a3b8" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                    </div>
                                </div>
                                
                                <div class="store-row-body" style="display: none; background: #fafaf9; border-top: 1px solid #e2e8f0;">
                                    
                                    <div style="display: flex; gap: 24px; padding: 0 24px; border-bottom: 1px solid #e2e8f0; background: transparent;">
                                        <div onclick="window.switchAdminStoreTab(this, 'tab-tong-quan')" style="font-weight: 600; color: #059669; border-bottom: 2px solid #059669; padding: 12px 0; cursor: pointer;">Tổng quan</div>
                                        <div onclick="window.switchAdminStoreTab(this, 'tab-log')" style="font-weight: 500; color: #64748b; padding: 12px 0; cursor: pointer;">Log</div>
                                        <div onclick="window.switchAdminStoreTab(this, 'tab-nhan-su')" style="font-weight: 500; color: #64748b; padding: 12px 0; cursor: pointer;">Nhân sự</div>
                                    </div>
                                    
                                    <div>
                                        <div class="tab-tong-quan" style="display: block; padding: 24px;">
                                            <div style="display: flex; gap: 40px; align-items: center;">
                                                <div style="flex: 1;">
                                                    <div style="color: #475569; font-size: 13px; display: flex; flex-direction: column; gap: 8px;">
                                                        <div><span style="font-weight: 600; color: #334155; width: 130px; display: inline-block;">Địa chỉ:</span> ${escapeHtml(s.address)}</div>
                                                        <div><span style="font-weight: 600; color: #334155; width: 130px; display: inline-block;">Tọa độ:</span> Lng: ${s.lng || 'N/A'}, Lat: ${s.lat || 'N/A'}</div>
                                                        <div><span style="font-weight: 600; color: #334155; width: 130px; display: inline-block;">Bán kính:</span> ${s.service_radius_m || 3000}m</div>
                                                    </div>
                                                </div>

                                                <div style="flex: 1.5;">
                                                    <span style="display: block; color: #64748b; font-size: 11px; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Cấu hình nhanh</span>
                                                    <form class="ops-form" onsubmit="window.submitAdminStoreUpdate(event, '${s.id}')" style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;">
                                                        <label style="flex: 1; min-width: 100px;">
                                                            <span style="display: block; font-size: 12px; color: #475569; margin-bottom: 6px; font-weight: 500;">Trạng thái</span>
                                                            <select id="update-status-${s.id}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: transparent;">
                                                                <option value="1" ${isActive ? 'selected' : ''}>Hoạt động</option>
                                                                <option value="0" ${!isActive ? 'selected' : ''}>Tạm ngưng</option>
                                                            </select>
                                                        </label>
                                                        <label style="flex: 1; min-width: 80px;">
                                                            <span style="display: block; font-size: 12px; color: #475569; margin-bottom: 6px; font-weight: 500;">Bán kính (m)</span>
                                                            <input type="number" id="update-radius-${s.id}" value="${s.service_radius_m || 3000}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: transparent;">
                                                        </label>
                                                        <label style="flex: 1; min-width: 80px;">
                                                            <span style="display: block; font-size: 12px; color: #475569; margin-bottom: 6px; font-weight: 500;">Vĩ độ (Lat)</span>
                                                            <input type="number" step="any" id="update-lat-${s.id}" value="${s.lat || ''}" placeholder="21.028" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: transparent;">
                                                        </label>
                                                        <label style="flex: 1; min-width: 80px;">
                                                            <span style="display: block; font-size: 12px; color: #475569; margin-bottom: 6px; font-weight: 500;">Kinh độ (Lng)</span>
                                                            <input type="number" step="any" id="update-lng-${s.id}" value="${s.lng || ''}" placeholder="105.854" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: transparent;">
                                                        </label>
                                                        <button type="submit" class="green-button" style="padding: 8px 16px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; font-size: 13px; height: 35px; white-space: nowrap;">Cập nhật</button>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="tab-log" style="display: none; padding: 24px;">
                                            <div style="color: #64748b; font-size: 13px; padding: 16px 0; text-align: left;">Chưa có dữ liệu log cho chi nhánh này.</div>
                                        </div>
                                        
                                        <div class="tab-nhan-su" style="display: none; padding: 24px;">
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                                                <h4 style="margin: 0; font-size: 14px; color: #0f172a;">Danh sách nhân viên</h4>
                                                <button class="btn" style="background: transparent; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; color: #475569;">+ Thêm nhân viên</button>
                                            </div>
                                            <div style="background: transparent;">
                                                <div style="display: flex; padding: 0 0 12px 0; border-bottom: 2px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">
                                                    <div style="flex: 2;">Tên nhân viên</div>
                                                    <div style="flex: 1.5;">Vai trò</div>
                                                    <div style="flex: 1;">Trạng thái</div>
                                                </div>
                                                <div style="padding: 16px 0; color: #94a3b8; font-size: 13px;">
                                                    Danh sách nhân sự đang trống...
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                            `;
                        });
                        html += `
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    if (!hasAnyStores) {
                        html = '<div style="padding: 40px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">Không tìm thấy chi nhánh nào phù hợp với bộ lọc.</div>';
                    }
                    container.innerHTML = html;
                }
                
                searchInput.addEventListener("input", renderReport);
                regionFilter.addEventListener("change", renderReport);
                renderReport();
            }

            if (panels.includes("store-orders") || panels.includes("store-report") || panels.includes("store-history")) {
                const [summary, orders] = await Promise.all([
                    window.ChanhTeaDashboardApi.storeSummary(profile),
                    window.ChanhTeaDashboardApi.storeOrders(profile)
                ]);
                
                if (panels.includes("store-orders")) {
                    document.getElementById("metricNewOrders").textContent = summary.new_orders;
                    document.getElementById("metricPreparing").textContent = summary.preparing;
                    document.getElementById("metricDelivering").textContent = summary.delivering;
                    renderOrders(orders);
                }

                if (panels.includes("store-report")) {
                    document.getElementById("metricRevenue").textContent = formatCurrency(summary.revenue_today);
                    // Update other metrics if needed
                }

                if (panels.includes("store-history")) {
                    const historyOrders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');
                    renderTable("store-history", historyOrders, [
                        row => row.code,
                        row => `${row.customer_name} - ${row.customer_phone}`,
                        row => row.status === 'completed' ? 'Hoàn tất' : 'Đã hủy',
                        row => new Date(row.created_at).toLocaleString('vi-VN'),
                        row => formatCurrency(row.total)
                    ]);
                }
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
            window.location.href = '/';
            return;
        }

        const panels = window.ChanhTeaRBAC.visiblePanels(profile);
        root.innerHTML = window.ChanhTeaDashboardTemplates.shell(profile, panels);
        hydrate(profile, panels);
    }

    document.addEventListener("submit", async event => {
        const createStoreForm = event.target.closest("#createStoreForm");
        if (createStoreForm) {
            event.preventDefault();
            const formData = new FormData(createStoreForm);
            const body = Object.fromEntries(formData.entries());
            body.lat = Number(body.lat);
            body.lng = Number(body.lng);
            body.service_radius_m = Number(body.service_radius_m);
            
            const submitBtn = createStoreForm.querySelector("button[type='submit']");
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Đang xử lý...";
            submitBtn.disabled = true;
            
            try {
                const profile = window.ChanhTeaOpsState.loadSession();
                const store = await window.ChanhTeaDashboardApi.createAdminStore(profile, body);
                alert(`Tạo chi nhánh thành công!\n- Mã chi nhánh: ${store.code}\n- Email: ${store.email}\n- Mật khẩu: ${store.code}`);
                document.getElementById('createStoreModal').style.display = 'none';
                createStoreForm.reset();
                hydrate(profile, ["admin-stores"]);
            } catch (err) {
                alert(`Lỗi: ${err.message}`);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
            return;
        }

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
            window.location.href = '/';
        }
    });



    render();
})();

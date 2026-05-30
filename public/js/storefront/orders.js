(function () {
    const CREATED_ORDERS_KEY = "chanhTeaCreatedOrders";

    function getCreatedOrders() {
        return window.ChanhTeaStorage.read(CREATED_ORDERS_KEY, []);
    }

    function saveCreatedOrders(orders) {
        window.ChanhTeaStorage.write(CREATED_ORDERS_KEY, orders);
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: orders }));
    }

    function normalizeItems(cartItems) {
        return cartItems.map(item => ({
            product_id: item.product_id,
            name: item.name,
            qty: item.quantity,
            unit_price: parseInt(String(item.price).replace(/[^\d]/g, ""), 10) || 0
        }));
    }

    function buildLocalOrderPayload(form, cartItems, store, location) {
        const total = cartItems.reduce((sum, item) => {
            const price = parseInt(item.price.replace(/[^\d]/g, ""));
            return sum + price * item.quantity;
        }, 0);
        return {
            code: `CT-${String(Date.now()).slice(-6)}`,
            status: "assigned",
            assigned_store: store,
            customer_name: $("#customerName").val().trim(),
            customer_phone: $("#customerPhone").val().trim(),
            customer_address: $("#customerAddress").val().trim(),
            fulfillment_method: $(form).find('input[name="fulfillment_method"]:checked').val(),
            note: $("#orderNote").val().trim(),
            location,
            items: cartItems,
            total,
            created_at: new Date().toISOString()
        };
    }

    async function createLocalOrder(form, cartItems) {
        if (!cartItems.length) {
            alert("Giỏ hàng đang trống.");
            return null;
        }

        const location = window.ChanhTeaLocation.getCustomerLocation() || {
            source: "manual",
            address: $("#customerAddress").val().trim()
        };
        const store = await window.ChanhTeaLocation.resolveNearestStore(location, cartItems);
        if (!store) {
            alert("Vui lòng cung cấp vị trí hoặc địa chỉ để gán cửa hàng.");
            return null;
        }

        const draft = buildLocalOrderPayload(form, cartItems, store, location);
        const response = await fetch($(form).data("endpoint") || "/api/public/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_name: draft.customer_name,
                customer_phone: draft.customer_phone,
                customer_address: draft.customer_address,
                fulfillment_method: draft.fulfillment_method,
                note: draft.note,
                location,
                items: normalizeItems(cartItems)
            })
        });
        const payload = await response.json();
        if (!response.ok || !payload.data) {
            alert(payload.message || "Không tạo được đơn hàng.");
            return null;
        }
        const order = {
            ...payload.data,
            assigned_store: payload.data.assigned_store || store,
            items: payload.data.items || cartItems
        };

        const createdOrders = getCreatedOrders();
        createdOrders.unshift(order);
        saveCreatedOrders(createdOrders);
        renderCreatedOrder(order);
        renderLookupStatus(order);
        return order;
    }

    function renderCreatedOrder(order) {
        $("#createdOrderCode").text(order.code);
        $("#createdOrderMessage").text(`Đơn đã được gán cho ${order.assigned_store.name}. Dashboard cửa hàng sẽ nhận đơn này khi API được nối.`);
        $("#orderCreatedPanel").prop("hidden", false);
        $("#lookupOrderCode").val(order.code);
        $("#lookupPhone").val(order.customer_phone);
    }

    function renderLookupStatus(order) {
        if (!order) return;
        $("#lookupStatusTitle").text(`${order.code} · ${order.assigned_store?.name || "Chưa gán cửa hàng"} · ${order.status}`);
        const orderIndex = ["pending", "assigned", "preparing", "delivering", "completed"];
        const currentIndex = Math.max(orderIndex.indexOf(order.status), 0);
        $("#lookupTimeline li").each(function () {
            const index = orderIndex.indexOf($(this).data("status"));
            $(this).toggleClass("is-complete", index >= 0 && index < currentIndex);
            $(this).toggleClass("is-active", index === currentIndex);
        });
    }

    async function findOrder(code, phone) {
        const response = await fetch(`/api/public/orders/${encodeURIComponent(code)}?phone=${encodeURIComponent(phone)}`);
        if (response.status === 404) return null;
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Không tra cứu được đơn hàng.");
        return payload.data || null;
    }

    window.ChanhTeaOrders = {
        getCreatedOrders,
        saveCreatedOrders,
        createLocalOrder,
        renderLookupStatus,
        findOrder
    };
})();

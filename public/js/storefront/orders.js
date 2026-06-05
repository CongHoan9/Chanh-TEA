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
        
        let store = null;
        try {
            store = await window.ChanhTeaLocation.resolveNearestStore(location, cartItems);
        } catch (error) {
            console.warn("Could not resolve nearest store by distance:", error.message);
        }

        // Fallback: If no store is within radius or GPS fails, just pick the first active store
        if (!store) {
            try {
                const res = await fetch("/api/public/stores");
                const data = await res.json();
                if (data.success && data.data && data.data.length > 0) {
                    store = data.data[0]; // Pick the first available store
                }
            } catch (err) {
                console.error("Failed to fetch fallback stores", err);
            }
        }

        if (!store) {
            alert("Vui lòng cung cấp vị trí hoặc địa chỉ để gán cửa hàng.");
            return null;
        }

        const draft = buildLocalOrderPayload(form, cartItems, store, location);
        const orderData = await window.ChanhTeaAPI.createGuestOrder({
            customer_name: draft.customer_name,
            customer_phone: draft.customer_phone,
            customer_address: draft.customer_address,
            fulfillment_method: draft.fulfillment_method,
            note: draft.note,
            location,
            items: normalizeItems(cartItems)
        });
        if (!orderData) {
            alert("Không tạo được đơn hàng.");
            return null;
        }
        const order = {
            ...orderData,
            assigned_store: orderData.assigned_store || store,
            items: orderData.items || cartItems
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
        const orderData = await window.ChanhTeaAPI.getPublicOrder(code, phone);
        return orderData || null;
    }

    window.ChanhTeaOrders = {
        getCreatedOrders,
        saveCreatedOrders,
        createLocalOrder,
        renderLookupStatus,
        findOrder
    };
})();

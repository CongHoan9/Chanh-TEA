(function () {
    // Simple wrapper around backend public APIs for the storefront.
    async function fetchPublicProducts() {
        const response = await fetch('/api/public/products');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Failed to load products.');
        return payload.data || [];
    }

    async function resolveNearestStore(location, items = []) {
        const response = await fetch('/api/public/resolve-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location, items })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Could not resolve store.');
        return payload.data;
    }

    async function createGuestOrder(orderPayload) {
        const response = await fetch('/api/public/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Order creation failed.');
        return payload.data;
    }

    async function getPublicOrder(code, phone) {
        const response = await fetch(`/api/public/orders/${encodeURIComponent(code)}?phone=${encodeURIComponent(phone)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Order lookup failed.');
        return payload.data;
    }

    async function fetchPublicStores() {
        const response = await fetch('/api/public/stores');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Failed to load stores.');
        return payload.data || [];
    }

    // expose as a global namespace for other storefront scripts
    window.ChanhTeaAPI = {
        fetchPublicProducts,
        fetchPublicStores,
        resolveNearestStore,
        createGuestOrder,
        getPublicOrder
    };
})();

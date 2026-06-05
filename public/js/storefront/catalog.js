(function () {
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



    async function fetchPublicProducts() {
        try {
            const products = await window.ChanhTeaAPI.fetchPublicProducts();
            return products;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }


    async function addToCart(productEl) {
        if (!productEl) return;
        const productId = productEl.dataset.id || productEl.dataset.productId;
        if (!productId) return;
        
        try {
            const products = await fetchPublicProducts();
            const product = products.find(p => String(p.id) === String(productId));
            if (product && typeof window.openProductModal === 'function') {
                window.openProductModal(product);
            } else {
                console.warn('Product not found or openProductModal not available', productId);
            }
        } catch (e) {
            console.error(e);
        }
    }

    window.ChanhTeaCatalog = {
        addToCart
    };
})();

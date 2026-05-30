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

    function productCard(product) {
        return `
            <div class="product card SlideInBottom"
                data-product-id="${escapeHtml(product.id)}"
                data-category="${escapeHtml(product.category_slug || "")}"
                data-price="${Number(product.base_price || 0)}"
                data-store-scope="nearest">
                <div class="image-layout">
                    <img src="${escapeHtml(product.image_url || "")}" alt="${escapeHtml(product.image_alt || product.name)}">
                </div>
                <div class="product-body">
                    <h3>${escapeHtml(product.name)}</h3>
                    <p>${escapeHtml(product.description || "")}</p>
                </div>
                <div class="product-footer">
                    <span class="price">${formatCurrency(product.base_price)}</span>
                    <button class="add-btn" onclick="Addproduct(this.closest('.product'))">
                        <svg class="scale" width="30px" height="30px" viewBox="0 0 32 32">
                            <path transform="translate(-466.000000, -1089.000000)"
                                d="M488,1106 L483,1106 L483,1111 C483,1111.55 482.553,1112 482,1112 C481.447,1112 481,1111.55 481,1111 L481,1106 L476,1106 C475.447,1106 475,1105.55 475,1105 C475,1104.45 475.447,1104 476,1104 L481,1104 L481,1099 C481,1098.45 481.447,1098 482,1098 C482.553,1098 483,1098.45 483,1099 L483,1104 L488,1104 C488.553,1104 489,1104.45 489,1105 C489,1105.55 488.553,1106 488,1106 L488,1106 Z M482,1089 C473.163,1089 466,1096.16 466,1105 C466,1113.84 473.163,1121 482,1121 C490.837,1121 498,1113.84 498,1105 C498,1096.16 490.837,1089 482,1089 L482,1089 Z">
                            </path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    async function loadCatalog() {
        const list = document.getElementById("list-products");
        if (!list) return;

        const response = await fetch("/api/public/products");
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Không tải được sản phẩm.");

        list.innerHTML = payload.data.map(productCard).join("");
        renderCategoryFilter(payload.data);
        const count = document.querySelector(".count");
        if (count) count.textContent = `Hiển thị ${payload.data.length} sản phẩm`;
    }

    function renderCategoryFilter(products) {
        const form = document.getElementById("categoryFilter");
        if (!form) return;

        const categories = [];
        products.forEach(product => {
            if (!product.category_slug) return;
            if (categories.some(category => category.slug === product.category_slug)) return;
            categories.push({
                slug: product.category_slug,
                name: product.category_name || product.category_slug
            });
        });

        form.innerHTML = `
            <label class="radio-item">
                <input type="radio" name="category" onclick="FilterProduct('all')" checked>
                <span>Tất cả</span>
            </label>
            ${categories.map(category => `
                <label class="radio-item">
                    <input type="radio" name="category" onclick="FilterProduct('${escapeHtml(category.slug)}')">
                    <span>${escapeHtml(category.name)}</span>
                </label>
            `).join("")}
        `;
    }

    window.ChanhTeaCatalog = {
        loadCatalog
    };
})();

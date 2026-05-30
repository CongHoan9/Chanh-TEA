function FilterProduct(key) {
    let visibleCount = 0;
    const keyword = key.trim().toLowerCase();
    $("#list-products .product").each(function () {
        const $product = $(this);
        const category = String($product.data("category") || "").toLowerCase();
        const name = $product.find("h3").text().trim().toLowerCase();
        const match = keyword === "all" || keyword === "tất cả" || category.includes(keyword) || name.includes(keyword);
        $product.toggle(match);
        if (match) visibleCount++;
    });
    $(".count").text(`Hiển thị ${visibleCount} sản phẩm`);
}

function SortProducts() {
    const sorted = $("#list-products .product").sort(function (a, b) {
        const priceA = parseInt($(a).find(".price").text().replace(/[^\d]/g, ""), 10);
        const priceB = parseInt($(b).find(".price").text().replace(/[^\d]/g, ""), 10);
        const nameA = $(a).find("h3").text().trim().toLowerCase();
        const nameB = $(b).find("h3").text().trim().toLowerCase();
        switch ($("#sort").val()) {
            case "price-asc": return priceA - priceB;
            case "price-desc": return priceB - priceA;
            case "az": return nameA.localeCompare(nameB);
            case "za": return nameB.localeCompare(nameA);
            default: return 0;
        }
    });
    $("#list-products").html(sorted);
}

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

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('gallery-products');
    if (!track) return;

    // Đảm bảo có đủ phần tử để lấp đầy màn hình (tránh bị khoảng trống khi mảng gốc quá ngắn)
    const firstElement = track.firstElementChild;
    if (firstElement) {
        const style = window.getComputedStyle(firstElement);
        const marginLeft = parseFloat(style.marginLeft) || 0;
        const marginRight = parseFloat(style.marginRight) || 0;
        const cardWidth = firstElement.offsetWidth;
        const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
        const totalWidth = cardWidth + marginLeft + marginRight + gap;
        const requiredWidth = window.innerWidth * 2; // Cần ít nhất 2 lần chiều rộng màn hình
        let currentWidth = track.children.length * totalWidth;
        const originalHTML = track.innerHTML;
        
        while (currentWidth < requiredWidth && currentWidth > 0) {
            track.innerHTML += originalHTML;
            currentWidth += (track.children.length * totalWidth) - currentWidth; // Update length
        }
    }

    let position = 0;
    const autoSpeed = 0.5; // Tốc độ tự động cuộn
    let isHovered = false;

    // Lắng nghe sự kiện lăn chuột (Scroll) để cuộn 2 chiều
    const container = track.parentElement;
    container.addEventListener('wheel', (e) => {
        e.preventDefault(); 
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        position -= delta;
    }, { passive: false });

    container.addEventListener('mouseenter', () => isHovered = true);
    container.addEventListener('mouseleave', () => isHovered = false);

    function animateMarquee() {
        if (track.children.length > 0) {
            if (!isHovered) {
                position -= autoSpeed;
            }

            const cards = track.children;
            const middleIndex = Math.floor(cards.length / 2);
            let middleCard = cards[middleIndex];
            let middleRect = middleCard.getBoundingClientRect();
            let middleCardCenter = middleRect.left + middleRect.width / 2;
            const screenCenter = window.innerWidth / 2;

            const firstCard = track.firstElementChild;
            const style = window.getComputedStyle(firstCard);
            const marginLeft = parseFloat(style.marginLeft) || 0;
            const marginRight = parseFloat(style.marginRight) || 0;
            const cardWidth = firstCard.offsetWidth;
            const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
            const totalWidth = cardWidth + marginLeft + marginRight + gap;

            // Dịch từ đầu xuống cuối khi thẻ giữa lệch quá sang TRÁI
            while (middleCardCenter < screenCenter - (totalWidth / 2)) {
                track.appendChild(track.firstElementChild);
                position += totalWidth;
                middleCardCenter += totalWidth; // Cập nhật lại tâm của thẻ giữa mới
            }

            // Dịch từ cuối lên đầu khi thẻ giữa lệch quá sang PHẢI
            while (middleCardCenter > screenCenter + (totalWidth / 2)) {
                track.insertBefore(track.lastElementChild, track.firstElementChild);
                position -= totalWidth;
                middleCardCenter -= totalWidth; // Cập nhật lại tâm của thẻ giữa mới
            }

            track.style.transform = `translateX(${position}px)`;
        }
        requestAnimationFrame(animateMarquee);
    }

    requestAnimationFrame(animateMarquee);
});

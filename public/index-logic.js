function updateTrackingButton() {
    // Check for active orders (in transit)
    const allOrders = JSON.parse(localStorage.getItem("chanhTeaCreatedOrders") || "[]");
    const activeOrders = allOrders.filter(order => {
        const status = (order.status || "pending").toLowerCase();
        return ["pending", "assigned", "preparing", "delivering"].includes(status);
    });

    const $btn = $("#trackingBtn");
    const $count = $("#trackingCount");

    if (activeOrders.length > 0) {
        $btn.show();
        $count.text(activeOrders.length).attr("data-active", "true");
    } else {
        $btn.hide();
        $count.attr("data-active", "false");
    }
}

function loadPage(fileName) {
    $("#mobileMenu").hide();
    const pageMap = {
        Main: "Main.html",
        Menu: "Menu.html",
        Story: "Story.html",
        Contact: "Contact.html",
        Tracking: "Tracking.html"
    };

    // Hide orderLookup section when loading pages other than Main
    const isMainPage = fileName === "Main.html";
    $("#orderLookup").toggle(isMainPage);
    
    $("#Content").load(fileName, function () {
        $("#categoryFilter input[type=radio]").each(function () {
            this.checked = pageMap[$(this).val()] === fileName;
        });
        if (fileName === "Menu.html") {
            window.ChanhTeaCatalog.loadCatalog();
        }
        renderCartList();
        window.ChanhTeaLocation.syncLocationDom();
    });
}

function getOrders() {
    return window.ChanhTeaStorage.read("orderDetails", []);
}

function saveOrders(orders) {
    window.ChanhTeaStorage.write("orderDetails", orders);
    updateCountDisplay(orders);
    updateTotalAmount(orders);
    updateTrackingButton();
}

function updateCountDisplay(orders) {
    const total = orders.reduce((sum, item) => sum + item.quantity, 0);
    $("#count").text(total).toggle(total > 0);
    $("#emptyCart").toggle(total === 0);
    $("#cartContent").toggle(total > 0);
}

function updateTotalAmount(orders) {
    const total = orders.reduce((sum, item) => {
        const price = parseInt(item.price.replace(/[^\d]/g, ""));
        return sum + price * item.quantity;
    }, 0);
    const formatted = total.toLocaleString("vi-VN") + " ₫";
    $(".total, .subtotal").text(formatted);
}

function renderCartItem(item, index) {
    return `
    <div class="Cart flex" data-index="${index}" data-product-id="${item.product_id || ""}">
        <div style="display:flex;align-items:center;gap:16px;">
            <div class="image-layout"><img src="${item.photo}" alt="${item.name}"></div>
            <div><strong>${item.name}</strong><br><span style="color:gray;">${item.price}</span></div>
        </div>
        <div class="quantity-wrapper">
            <div class="quantity-control">
                <a class="btn minus" data-index="${index}">−</a>
                <span class="count">${item.quantity}</span>
                <a class="btn plus" data-index="${index}">+</a>
            </div>
            <a class="flex remove-btn" data-index="${index}" title="Xoá">
                <svg stroke="#de2626" width="20px" height="20px" viewBox="0 0 24 24" fill="none">
                    <path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7M8 7H16" stroke-width="2"/>
                </svg>
            </a>
        </div>
    </div>`;
}

function renderCartList() {
    const orders = getOrders();
    const $list = $("#list-carts").empty();
    orders.forEach((item, index) => $list.append(renderCartItem(item, index)));
    updateCountDisplay(orders);
    updateTotalAmount(orders);
}

function Addproduct(product) {
    const $product = $(product);
    const name = $product.find("h3").text().trim();
    const price = $product.find(".price").text().trim();
    const photo = $product.find("img").attr("src");
    const productId = $product.data("product-id") || name;
    const category = $product.data("category") || "";

    const orders = getOrders();
    const found = orders.find(item => item.product_id === productId);
    found ? found.quantity++ : orders.push({ product_id: productId, category, name, price, photo, quantity: 1 });

    saveOrders(orders);
    renderCartList();
}

function clearCart() {
    window.ChanhTeaStorage.remove("orderDetails");
    renderCartList();
}

function toggleMenu() {
    $("#mobileMenu").slideToggle(200);
}

$(document).ready(function () {
    const routePageMap = {
        "/": "Main.html",
        "/menu": "Menu.html",
        "/story": "Story.html",
        "/contact": "Contact.html",
        "/cart": "Cart.html",
        "/tracking": "Tracking.html"
    };

    const initialPage = routePageMap[window.location.pathname] || "Main.html";
    loadPage(initialPage);
    
    // Ensure orderLookup is visible for Main.html
    if (initialPage === "Main.html") {
        $("#orderLookup").show();
    }
    
    renderCartList();
    updateTrackingButton();
    window.ChanhTeaLocation.syncLocationDom();

    $(document).on("click", ".plus, .minus, .remove-btn", function () {
        const index = $(this).data("index");
        const orders = getOrders();

        if ($(this).hasClass("plus")) orders[index].quantity++;
        else if ($(this).hasClass("minus")) {
            if (orders[index].quantity > 1) orders[index].quantity--;
            else orders.splice(index, 1);
        } else if ($(this).hasClass("remove-btn")) {
            orders.splice(index, 1);
        }

        saveOrders(orders);
        renderCartList();
    });

    $(document).on("click", ".delete", event => {
        event.preventDefault();
        clearCart();
    });

    $(document).on("click", '[data-action="detect-location"], [data-action="open-location-panel"]', event => {
        event.preventDefault();
        window.ChanhTeaLocation.requestCustomerLocation();
    });

    $(document).on("input", "#customerAddress", function () {
        const address = $(this).val().trim();
        if (address.length >= 8 && !window.ChanhTeaLocation.getCustomerLocation()) {
            window.ChanhTeaLocation.saveCustomerLocation({ source: "manual", address, captured_at: new Date().toISOString() });
        }
    });

    $(document).on("submit", "#guestCheckoutForm", async function (event) {
        event.preventDefault();
        await window.ChanhTeaOrders.createLocalOrder(this, getOrders());
    });

    $(document).on("submit", "#orderLookupForm", async function (event) {
        event.preventDefault();
        const code = $("#lookupOrderCode").val().trim();
        const phone = $("#lookupPhone").val().trim();
        try {
            const order = await window.ChanhTeaOrders.findOrder(code, phone);
            if (!order) {
                $("#lookupStatusTitle").text("Chưa tìm thấy đơn phù hợp");
                $("#lookupTimeline li").removeClass("is-active is-complete");
                return;
            }
            window.ChanhTeaOrders.renderLookupStatus(order);
        } catch (error) {
            $("#lookupStatusTitle").text(error.message || "Không tra cứu được đơn hàng");
            $("#lookupTimeline li").removeClass("is-active is-complete");
        }
    });

    // Listen for storage changes (when orders are updated from other sources)
    window.addEventListener('storage', function(e) {
        if (e.key === 'chanhTeaCreatedOrders') {
            updateTrackingButton();
        }
    });

    // Listen for custom orders update event
    window.addEventListener('ordersUpdated', function() {
        updateTrackingButton();
    });
});

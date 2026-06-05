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

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderCartImage(item) {
    const name = escapeHtml(item.name);
    if (item.photo) {
        return `<img src="${escapeHtml(item.photo)}" alt="${name}">`;
    }

    return `<div class="cart-image-placeholder" role="img" aria-label="${name}">🍋</div>`;
}

function renderCartItem(item, index) {
    return `
    <div class="Cart flex" data-index="${index}" data-product-id="${escapeHtml(item.product_id || "")}">
        <div style="display:flex;align-items:center;gap:16px;">
            <div class="image-layout">${renderCartImage(item)}</div>
            <div><strong>${escapeHtml(item.name)}</strong><br><span style="color:gray;">${escapeHtml(item.price)}</span></div>
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
    const photo = $product.data("image-url") || $product.find("img").attr("src") || "";
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
    const path = window.location.pathname;

    // Ensure orderLookup is visible for Main page based on pathname
    if (path === "/" || path === "/main") {
        $("#orderLookup").show();
    }
    
    if (path === "/story") {
        if (typeof window.initStoryStack === 'function') {
            setTimeout(window.initStoryStack, 100);
        }
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

    // GSAP Header Animation
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        const header = document.querySelector("header");
        ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (self) => {
                if (self.direction === 1) {
                    gsap.to(header, { y: "-100%", duration: 0.3, ease: "power2.out" });
                }
                else {
                    gsap.to(header, { y: "0%", duration: 0.3, ease: "power2.out" });
                }
            }
        });

        // Card Animation (Slide in Bottom for normal cards)
        const bottomCards = gsap.utils.toArray('.card:not(.gallery-item)');
        bottomCards.forEach(card => {
            card.classList.remove('SlideInBottom');
            gsap.fromTo(card, 
                { opacity: 0, y: 50 },
                { 
                    opacity: 1, 
                    y: 0, 
                    duration: 0.5, 
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: card,
                        start: "top 90%",
                        toggleActions: "play none none none"
                    }
                }
            );
        });

        // Loại bỏ GSAP Animation cho gallery-products để nhường quyền cho Infinite Marquee xử lý
        const rightCards = document.querySelectorAll('#gallery-products .card, .gallery-item');
        rightCards.forEach(card => {
            card.classList.remove('SlideInBottom', 'SlideInRight');
            card.style.opacity = 1;
            card.style.transform = ''; // Xóa transform inline để nhường quyền cho CSS
        });
    }

    // Horizontal Scroll for .list and .horizontal-scroll-container (Continuous smooth auto-scroll)
    const scrollContainers = document.querySelectorAll('.list, .horizontal-scroll-container');
    scrollContainers.forEach(container => {
        // Prevent scrolling if content fits within the container
        if (container.scrollWidth <= container.clientWidth) {
            return;
        }

        let animationFrameId;
        let isHovered = false;
        const scrollSpeed = 1; // Pixels per frame
        let resumeTimeout;

        const loopScroll = () => {
            if (!isHovered) {
                container.scrollLeft += scrollSpeed;
                
                // Infinite loop logic: remove first, add to last
                const firstChild = container.firstElementChild;
                const secondChild = firstChild ? firstChild.nextElementSibling : null;
                
                if (firstChild && secondChild) {
                    const firstRect = firstChild.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    
                    // If the first child has fully scrolled out of view to the left
                    if (firstRect.right < containerRect.left) {
                        // Calculate exact width + gap by measuring distance to second child
                        const shiftAmount = secondChild.getBoundingClientRect().left - firstRect.left;
                        
                        // Move the first element to the end of the container
                        container.appendChild(firstChild);
                        
                        // Adjust scroll position to prevent visual jumping
                        container.scrollLeft -= shiftAmount;
                    }
                }
            }
            animationFrameId = requestAnimationFrame(loopScroll);
        };

        const startAutoScroll = () => {
            stopAutoScroll();
            isHovered = false;
            animationFrameId = requestAnimationFrame(loopScroll);
        };

        const stopAutoScroll = () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            isHovered = true;
        };

        const pauseAndDelayResume = () => {
            stopAutoScroll();
            clearTimeout(resumeTimeout);
            resumeTimeout = setTimeout(startAutoScroll, 3000); // Resume after 3s of no interaction
        };

        // Start initially
        startAutoScroll();

        // Pause on interaction
        container.addEventListener('mouseenter', pauseAndDelayResume);
        container.addEventListener('mouseleave', () => {
            clearTimeout(resumeTimeout);
            resumeTimeout = setTimeout(startAutoScroll, 1000); // Shorter delay on leave
        });
        container.addEventListener('touchstart', pauseAndDelayResume, { passive: true });
        container.addEventListener('touchend', () => {
            clearTimeout(resumeTimeout);
            resumeTimeout = setTimeout(startAutoScroll, 2000);
        }, { passive: true });

        container.addEventListener('wheel', (e) => {
            pauseAndDelayResume();
            if (e.deltaY !== 0) {
                e.preventDefault();
                const scrollAmount = Math.sign(e.deltaY) * 120;
                container.scrollBy({
                    left: scrollAmount,
                    behavior: 'smooth'
                });
            }
        }, { passive: false });
    });
});

// BounceCards logic
document.addEventListener('DOMContentLoaded', () => {
    const bounceContainer = document.querySelector('.bounceCardsContainer');
    if (!bounceContainer) return;

    const cards = Array.from(bounceContainer.querySelectorAll('.card'));
    const cardTransforms = [
        { x: -420, rotation: -5 },
        { x: -210, rotation: -2.5 },
        { x: 0, rotation: 0 },
        { x: 210, rotation: 2.5 },
        { x: 420, rotation: 5 }
    ];

    if (typeof gsap === 'undefined') {
        console.warn('GSAP is not loaded. BounceCards animation disabled.');
        return;
    }

    // Initial animation using native GSAP properties
    cards.forEach((card, i) => {
        if (i < 5) {
            gsap.fromTo(card, 
                { scale: 0, x: 0, rotation: 0, opacity: 0 },
                {
                    scale: 1,
                    x: cardTransforms[i].x,
                    rotation: cardTransforms[i].rotation,
                    opacity: 1,
                    duration: 1,
                    ease: 'elastic.out(1, 0.8)',
                    delay: 0.2 + (i * 0.06)
                }
            );
        }
    });

    const pushSiblings = (hoveredIdx) => {
        cards.forEach((target, i) => {
            gsap.killTweensOf(target);
            if (i === hoveredIdx) {
                gsap.to(target, {
                    x: cardTransforms[i].x,
                    rotation: 0,
                    scale: 1.1,
                    zIndex: 10,
                    duration: 0.4,
                    ease: 'back.out(1.4)',
                    overwrite: 'auto'
                });
            } else {
                const offsetX = i < hoveredIdx ? -100 : 100; // Spread distance
                const offsetRot = i < hoveredIdx ? -2.5 : 2.5; // Tilt away from hovered card
                const distance = Math.abs(hoveredIdx - i);
                
                gsap.to(target, {
                    x: cardTransforms[i].x + offsetX,
                    rotation: cardTransforms[i].rotation + offsetRot,
                    scale: 0.95,
                    zIndex: i,
                    duration: 0.4,
                    ease: 'back.out(1.4)',
                    delay: distance * 0.05,
                    overwrite: 'auto'
                });
            }
        });
    };

    const resetSiblings = () => {
        cards.forEach((target, i) => {
            gsap.killTweensOf(target);
            gsap.to(target, {
                x: cardTransforms[i].x,
                rotation: cardTransforms[i].rotation,
                scale: 1,
                zIndex: i,
                duration: 0.4,
                ease: 'back.out(1.4)',
                overwrite: 'auto'
            });
        });
    };

    cards.forEach((card, idx) => {
        card.style.zIndex = idx;
        card.addEventListener('mouseenter', () => pushSiblings(idx));
        card.addEventListener('mouseleave', resetSiblings);
    });
});

// Story Image Stack Logic
window.initStoryStack = function() {
    const container = document.getElementById('story-image-stack');
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = "true";

    let cards = Array.from(container.querySelectorAll('.stack-card'));
    if (!cards.length) return;

    let isPaused = false;
    let isDragging = false;
    let startX = 0, startY = 0;
    
    const renderStack = () => {
        cards.forEach((card, index) => {
            const rotateZ = (cards.length - index - 1) * 4 * (index % 2 === 0 ? -1 : 1);
            const scale = 1 + (index * 0.06) - (cards.length * 0.06);
            
            // Reset state
            card.style.cursor = (index === cards.length - 1) ? 'grab' : 'default';
            card.dataset.origRot = rotateZ;
            card.dataset.origScale = scale;

            gsap.to(card, {
                x: 0,
                y: 0,
                rotation: rotateZ,
                scale: scale,
                transformOrigin: '90% 90%',
                zIndex: index,
                duration: 0.5,
                ease: "back.out(1.2)",
                overwrite: "auto"
            });
        });
    };

    const sendToBack = () => {
        const topCard = cards.pop();
        cards.unshift(topCard);
        renderStack();
    };

    renderStack();

    // Drag Logic
    const onDragStart = (e) => {
        const topCard = cards[cards.length - 1];
        if (!topCard.contains(e.target) && topCard !== e.target) return;
        
        isDragging = true;
        isPaused = true;
        topCard.style.cursor = 'grabbing';
        
        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
            e.preventDefault();
        }
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        
        const topCard = cards[cards.length - 1];
        let currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        let currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        let dx = currentX - startX;
        let dy = currentY - startY;

        const origRot = parseFloat(topCard.dataset.origRot);
        const origScale = parseFloat(topCard.dataset.origScale);

        gsap.set(topCard, {
            x: dx,
            y: dy,
            rotation: origRot + dx * 0.05,
            scale: origScale
        });
    };

    const onDragEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        isPaused = false;
        
        const topCard = cards[cards.length - 1];
        topCard.style.cursor = 'grab';

        let currentX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
        let currentY = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;
        let dx = currentX - startX;
        let dy = currentY - startY;

        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
             sendToBack();
             return;
        }

        if (Math.abs(dx) > 100 || Math.abs(dy) > 100) {
            gsap.to(topCard, {
                x: dx * 1.5,
                y: dy * 1.5,
                opacity: 0,
                duration: 0.2,
                onComplete: () => {
                    gsap.set(topCard, { opacity: 1 });
                    sendToBack();
                }
            });
        } else {
            gsap.to(topCard, {
                x: 0,
                y: 0,
                rotation: parseFloat(topCard.dataset.origRot),
                duration: 0.4,
                ease: "back.out(1.2)"
            });
        }
    };

    container.addEventListener('mousedown', onDragStart);
    container.addEventListener('touchstart', onDragStart, { passive: false });
    
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);

    setInterval(() => {
        if (!isPaused) sendToBack();
    }, 3000);

    container.addEventListener('mouseenter', () => isPaused = true);
    container.addEventListener('mouseleave', () => isPaused = false);
};

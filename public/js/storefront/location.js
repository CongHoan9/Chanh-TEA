(function () {
    const LOCATION_KEY = "chanhTeaCustomerLocation";
    const RESOLVED_STORE_KEY = "chanhTeaResolvedStore";

    function getCustomerLocation() {
        return window.ChanhTeaStorage.read(LOCATION_KEY, null);
    }

    function getResolvedStore() {
        return window.ChanhTeaStorage.read(RESOLVED_STORE_KEY, null);
    }

    function saveCustomerLocation(location) {
        window.ChanhTeaStorage.write(LOCATION_KEY, location);
        syncLocationDom();
    }

    async function resolveNearestStore(location, cartItems = []) {
        if (!location?.lat || !location?.lng) return null;
        const response = await fetch("/api/public/resolve-store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                location,
                items: cartItems.map(item => ({ product_id: item.product_id }))
            })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Không tìm được cửa hàng phù hợp.");
        window.ChanhTeaStorage.write(RESOLVED_STORE_KEY, payload.data);
        syncLocationDom();
        return payload.data;
    }

    function syncLocationDom() {
        const location = getCustomerLocation();
        const store = getResolvedStore();

        if (location) {
            $("#customerLat").val(location.lat || "");
            $("#customerLng").val(location.lng || "");
            $("#locationStatus").text(location.source === "browser"
                ? `Đã lấy vị trí hiện tại (${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}).`
                : "Đã lưu địa chỉ thủ công. Cần tọa độ để tự động gán cửa hàng.");
        }

        if (store) {
            const distanceKm = store.distance_m ? `${(store.distance_m / 1000).toFixed(1)} km` : "đang tính khoảng cách";
            $("#activeStoreName").text(store.name);
            $("#activeStoreMeta").text(`${store.address} · ${distanceKm}`);
            $("#assignedStoreCard")
                .attr("data-store-id", store.id)
                .html(`<strong>${store.name}</strong><p>${store.address} · Cách khoảng ${distanceKm}</p>`);
        }
    }

    function requestCustomerLocation() {
        if (!navigator.geolocation) {
            $("#locationStatus").text("Trình duyệt không hỗ trợ lấy vị trí. Vui lòng nhập địa chỉ.");
            return;
        }

        $("#locationStatus").text("Đang lấy vị trí...");
        navigator.geolocation.getCurrentPosition(
            async position => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    source: "browser",
                    captured_at: new Date().toISOString()
                };
                saveCustomerLocation(location);
                try {
                    await resolveNearestStore(location);
                } catch (error) {
                    $("#locationStatus").text(error.message);
                }
            },
            () => {
                $("#locationStatus").text("Không thể lấy vị trí. Vui lòng nhập địa chỉ giao hàng.");
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    }

    window.ChanhTeaLocation = {
        getCustomerLocation,
        getResolvedStore,
        saveCustomerLocation,
        resolveNearestStore,
        syncLocationDom,
        requestCustomerLocation
    };
})();

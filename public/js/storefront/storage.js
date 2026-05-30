(function () {
    function read(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch (error) {
            return fallback;
        }
    }

    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function remove(key) {
        localStorage.removeItem(key);
    }

    window.ChanhTeaStorage = {
        read,
        write,
        remove
    };
})();

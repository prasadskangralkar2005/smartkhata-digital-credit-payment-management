// =====================================================
// SMARTKHATA GLOBAL THEME
// =====================================================

(function () {

    function getUserId() {

        return localStorage.getItem(
            "smartkhata_current_user"
        );
    }


    function getTheme() {

        const userId = getUserId();

        if (!userId) {
            return "light";
        }


        try {

            const saved =
                localStorage.getItem(
                    `smartkhata_preferences_${userId}`
                );


            if (!saved) {
                return "light";
            }


            const preferences =
                JSON.parse(saved);


            return preferences.theme || "light";


        } catch (error) {

            console.warn(
                "Unable to load theme preference:",
                error
            );

            return "light";
        }
    }


    function applyTheme(theme) {

        if (theme === "dark") {

            document.documentElement.setAttribute(
                "data-theme",
                "dark"
            );

        } else {

            document.documentElement.removeAttribute(
                "data-theme"
            );
        }
    }


    // Apply saved theme immediately
    applyTheme(
        getTheme()
    );


    // Make theme functions available
    window.SmartKhataTheme = {

        get: getTheme,

        apply: applyTheme
    };

})();
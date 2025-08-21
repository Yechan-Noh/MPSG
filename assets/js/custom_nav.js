// /assets/js/custom_nav.js

document.addEventListener("DOMContentLoaded", function () {
    // --- 1. SETUP ---
    // Find the main header container. If it doesn't exist, stop the script.
    const root = document.querySelector("[data-mpsg-masthead]");
    if (!root) return;

    // Select essential elements
    const body = document.body;
    const toggle = root.querySelector("#mpsg-nav-toggle");
    const nav = root.querySelector("#mpsg-site-nav");
    const menu = root.querySelector("[data-mpsg-menu]");
    const scrim = root.querySelector(".mpsg-scrim");

    // If the main toggle or nav elements are missing, stop the script.
    if (!toggle || !nav || !menu) return;

    // Get all menu items that have a submenu (dropdowns)
    const dropdownItems = Array.from(menu.querySelectorAll(".mpsg-item--has-children"));


    // --- 2. HELPER FUNCTIONS ---
    // Checks if the mobile navigation is currently open
    const isOpen = () => body.classList.contains("mpsg-nav-open");

    // Opens the mobile navigation
    const openNav = () => {
        body.classList.add("mpsg-nav-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close menu");
    };

    // Closes the mobile navigation and any open dropdowns
    const closeNav = () => {
        body.classList.remove("mpsg-nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        dropdownItems.forEach(closeSubmenu); // Close all submenus when nav closes
    };

    // Opens a specific dropdown submenu
    const openSubmenu = (item) => {
        const btn = item.querySelector(".mpsg-submenu-toggle");
        const panel = item.querySelector(".mpsg-submenu");
        if (!btn || !panel) return;
        item.classList.add("mpsg-item--open");
        btn.setAttribute("aria-expanded", "true");
    };

    // Closes a specific dropdown submenu
    const closeSubmenu = (item) => {
        const btn = item.querySelector(".mpsg-submenu-toggle");
        const panel = item.querySelector(".mpsg-submenu");
        if (!btn || !panel) return;
        item.classList.remove("mpsg-item--open");
        btn.setAttribute("aria-expanded", "false");
    };


    // --- 3. EVENT LISTENERS ---
    // Toggles the mobile navigation when the hamburger button is clicked
    toggle.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevents the 'document' click listener from firing
        isOpen() ? closeNav() : openNav();
    });

    // Allows the background scrim (overlay) to close the mobile navigation
    if (scrim) {
        scrim.addEventListener("click", closeNav);
    }

    // Closes the mobile navigation if a user clicks outside of the header
    document.addEventListener("click", (e) => {
        if (isOpen() && !root.contains(e.target)) {
            closeNav();
        }
    });

    // Handles clicks on dropdown toggles
    dropdownItems.forEach((item) => {
        const btn = item.querySelector(".mpsg-submenu-toggle");
        if (!btn) return;

        btn.addEventListener("click", (e) => {
            e.preventDefault(); // Prevents link navigation if the button is an '<a>' tag
            e.stopPropagation(); // Prevents the 'document' click listener

            const isItemOpen = item.classList.contains("mpsg-item--open");

            // Close any other open dropdowns first
            dropdownItems.forEach((siblingItem) => {
                if (siblingItem !== item) {
                    closeSubmenu(siblingItem);
                }
            });

            // Toggle the clicked dropdown
            isItemOpen ? closeSubmenu(item) : openSubmenu(item);
        });
    });

    // Closes the navigation when the 'Escape' key is pressed
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isOpen()) {
            closeNav();
            toggle.focus(); // Return focus to the toggle button for accessibility
        }
    });

    // Closes the mobile navigation automatically if the window is resized to desktop width
    window.addEventListener("resize", () => {
        if (window.matchMedia("(min-width: 801px)").matches && isOpen()) {
            closeNav();
        }
    });
});
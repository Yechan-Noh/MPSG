// /assets/js/custom_nav.js
document.addEventListener("DOMContentLoaded", function () {
    const root = document.querySelector("[data-mpsg-masthead]");
    if (!root) return;

    const body = document.body;
    const toggle = root.querySelector("#mpsg-nav-toggle");
    const nav = root.querySelector("#mpsg-site-nav");
    const menu = root.querySelector("[data-mpsg-menu]");
    const scrim = root.querySelector(".mpsg-scrim");
    if (!toggle || !nav || !menu) return;

    const dropdownItems = Array.from(menu.querySelectorAll(".mpsg-item--has-children"));

    const isOpen = () => body.classList.contains("mpsg-nav-open");
    const openNav = () => {
        body.classList.add("mpsg-nav-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close menu");
    };
    const closeNav = () => {
        body.classList.remove("mpsg-nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        dropdownItems.forEach(closeSubmenu);
    };

    const openSubmenu = (li) => {
        const btn = li.querySelector(".mpsg-submenu-toggle");
        const panel = li.querySelector(".mpsg-submenu");
        if (!btn || !panel) return;
        li.classList.add("mpsg-item--open");
        btn.setAttribute("aria-expanded", "true");
    };
    const closeSubmenu = (li) => {
        const btn = li.querySelector(".mpsg-submenu-toggle");
        const panel = li.querySelector(".mpsg-submenu");
        if (!btn || !panel) return;
        li.classList.remove("mpsg-item--open");
        btn.setAttribute("aria-expanded", "false");
    };

    // Main toggle
    toggle.addEventListener("click", (e) => {
        e.stopPropagation(); // don't trigger document click
        isOpen() ? closeNav() : openNav();
    });

    // Scrim closes the menu
    if (scrim) scrim.addEventListener("click", closeNav);

    // Close when clicking outside the header
    document.addEventListener("click", (e) => {
        if (isOpen() && !root.contains(e.target)) closeNav();
    });

    // Dropdown toggles
    dropdownItems.forEach((li) => {
        const btn = li.querySelector(".mpsg-submenu-toggle");
        if (!btn) return;
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const open = li.classList.contains("mpsg-item--open");
            dropdownItems.forEach((sib) => { if (sib !== li) closeSubmenu(sib); });
            open ? closeSubmenu(li) : openSubmenu(li);
        });
    });

    // Close on Escape
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isOpen()) {
            closeNav();
            toggle.focus();
            dropdownItems.forEach(closeSubmenu);
        }
    });

    // Match your CSS breakpoint (800px)
    window.addEventListener("resize", () => {
        if (window.matchMedia("(min-width: 801px)").matches) closeNav();
    });
});

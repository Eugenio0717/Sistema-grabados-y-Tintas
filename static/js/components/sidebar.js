let sidebarOpen = false;
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    const header = document.querySelector('.header');
    const hamburger = document.querySelector('.hamburger');
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        header.classList.add('sidebar-open');
        hamburger.classList.add('active');
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        header.classList.remove('sidebar-open');
        hamburger.classList.remove('active');
    }
}

function toggleSubmenu(element) {
    const submenu = element.nextElementSibling;
    const navItem = element;
    const wasOpen = submenu.style.display === 'block';
    // Close all submenus first
    document.querySelectorAll('.submenu').forEach(sub => {
        if (sub !== submenu) { // Don't close the one we might be opening
            sub.style.display = 'none';
            sub.previousElementSibling.classList.remove('submenu-open');
        }
    });
    // Toggle the clicked one
    if (!wasOpen) {
        submenu.style.display = 'block';
        navItem.classList.add('submenu-open');
    } else {
        submenu.style.display = 'none';
        navItem.classList.remove('submenu-open');
    }
}

function refreshPage() {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.classList.add('spinning');
    }
    // Add a query parameter to the URL to indicate a refresh
    const url = new URL(window.location);
    url.searchParams.set('reloaded', 'true');
    window.location.href = url.href;
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const hamburger = document.querySelector('.hamburger');
    
    if (sidebarOpen && !sidebar.contains(event.target) && !hamburger.contains(event.target)) {
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Keep submenu open if a child is active on page load
    const activeSubmenuItem = document.querySelector('.submenu-item.active');
    if (activeSubmenuItem) {
        const submenu = activeSubmenuItem.closest('.submenu');
        if (submenu) {
            submenu.style.display = 'block';
            submenu.previousElementSibling.classList.add('submenu-open');
        }
    }

    // Check for refresh notification
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('reloaded')) {
        const notification = document.getElementById('refresh-notification');
        if (notification) {
            notification.textContent = 'Página actualizada correctamente.';
            notification.classList.add('show');

            // Hide the notification after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);

            // Clean the URL
            const url = new URL(window.location);
            url.searchParams.delete('reloaded');
            history.replaceState(null, '', url.href);
        }
    }
});
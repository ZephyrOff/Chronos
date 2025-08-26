
// Context Menu Logic
function createMenu(options, parentUl) {
    options.forEach(option => {
        const li = document.createElement('li');
        if (option.svg) {
            const svgContainer = document.createElement('div');
            svgContainer.innerHTML = option.svg;
            svgContainer.classList.add('menu-icon');
            li.appendChild(svgContainer);
        }
        li.appendChild(document.createTextNode(option.text));

        if (option.hoverColor) {
            li.style.setProperty('--hover-color', option.hoverColor);
            li.classList.add('has-hover-color');
        }

        if (option.submenu) {
            li.classList.add('has-submenu');
            const submenuUl = document.createElement('ul');
            submenuUl.className = 'submenu';
            createMenu(option.submenu, submenuUl);
            li.appendChild(submenuUl);

            li.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the parent menu from closing

                // Check for available space and position submenu
                const rect = li.getBoundingClientRect();
                const winWidth = window.innerWidth;
                if (rect.right + submenuUl.offsetWidth > winWidth) {
                    submenuUl.classList.add('submenu-left');
                } else {
                    submenuUl.classList.remove('submenu-left');
                }

                // Hide other submenus at the same level
                const siblings = li.parentNode.childNodes;
                siblings.forEach(sibling => {
                    if (sibling !== li && sibling.nodeName === 'LI') {
                        const sub = sibling.querySelector('.submenu');
                        if (sub) sub.classList.remove('submenu-visible');
                    }
                });
                // Toggle current submenu
                submenuUl.classList.toggle('submenu-visible');
            });
        } else {
            li.addEventListener('click', (e) => {
                option.action(e);
                closeAllContextMenus();
            });
        }
        parentUl.appendChild(li);
    });
}

function closeAllContextMenus() {
    document.querySelectorAll('.context-menu').forEach(menu => {
        menu.classList.add('hidden');
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
        closeAllContextMenus();
    }
});
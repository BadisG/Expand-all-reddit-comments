// ==UserScript==
// @name         Automatic Reddit Comment Expander
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Expands visible and nearby collapsed comments on Reddit with 1.5X extended view, including "X more replies"
// @match        https://www.reddit.com/*
// @match        https://old.reddit.com/*
// @match        https://new.reddit.com/*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';
    const selectors = [
        'button[aria-label="Expand"]', // New Reddit
        '.expand', // Old Reddit
        'button._1nGapmdexvR0BuOkfAi6wa:not(._1zN1-lYh2LfbYOMAho_O8g)', // Controversial comments
        'p._2HYsucNpMdUpYlGBMviq8M._23013peWUhznY89KuYPZKv' // X more replies
    ];
    const selectorString = selectors.join(',');
    const extensionFactor = 1.5;
    let intersectionObserver;
    let mutationObserver;

    function initialize() {
        if (intersectionObserver) {
            intersectionObserver.disconnect();
        }
        if (mutationObserver) {
            mutationObserver.disconnect();
        }

        function calculateRootMargin() {
            const windowHeight = window.innerHeight;
            const extendedHeight = windowHeight * extensionFactor;
            return `${extendedHeight}px 0px ${extendedHeight}px 0px`;
        }

        let observerOptions = {
            rootMargin: calculateRootMargin(),
            threshold: 0
        };

        function createIntersectionObserver() {
            intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        intersectionObserver.unobserve(entry.target);
                        setTimeout(() => {
                            entry.target.click();
                            // Re-run expansion after a short delay
                            setTimeout(expandVisibleComments, 500);
                        }, 0);
                    }
                });
            }, observerOptions);
        }

        createIntersectionObserver();

        function expandVisibleComments() {
            const buttons = document.querySelectorAll(selectorString);
            buttons.forEach(button => {
                if (!button.__isObserved) {
                    intersectionObserver.observe(button);
                    button.__isObserved = true;
                }
            });
        }

        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        }

        const throttledExpandComments = debounce(expandVisibleComments, 20);

        function onResize() {
            intersectionObserver.disconnect();
            observerOptions.rootMargin = calculateRootMargin();
            createIntersectionObserver();
            expandVisibleComments();
        }

        window.removeEventListener('scroll', throttledExpandComments);
        window.addEventListener('scroll', throttledExpandComments, { passive: true });

        window.removeEventListener('resize', debounce(onResize, 20));
        window.addEventListener('resize', debounce(onResize, 20));

        mutationObserver = new MutationObserver(debounce(expandVisibleComments, 20));
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });

        // Initial expansion
        expandVisibleComments();
    }

    // Initialize on page load
    initialize();

    // Reinitialize on URL change
    function onUrlChange() {
        setTimeout(initialize, 1000); // Delay to allow page to load
    }

    // Listen for URL changes
    window.addEventListener('popstate', onUrlChange);

    // Monkey-patch history.pushState and history.replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function() {
        originalPushState.apply(this, arguments);
        onUrlChange();
    };

    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        onUrlChange();
    };
})();

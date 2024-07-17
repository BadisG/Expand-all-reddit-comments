// ==UserScript==
// @name         Automatic Reddit Comment Expander
// @namespace    http://tampermonkey.net/
// @version      1.1
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

    function calculateRootMargin() {
        const windowHeight = window.innerHeight;
        const extendedHeight = windowHeight * extensionFactor;
        return `${extendedHeight}px 0px ${extendedHeight}px 0px`;
    }

    let observerOptions = {
        rootMargin: calculateRootMargin(),
        threshold: 0
    };

    let intersectionObserver;

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

    window.addEventListener('scroll', throttledExpandComments, { passive: true });
    window.addEventListener('resize', debounce(onResize, 20));

    const mutationObserver = new MutationObserver(debounce(expandVisibleComments, 20));
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });

    // Initial expansion
    expandVisibleComments();
})();

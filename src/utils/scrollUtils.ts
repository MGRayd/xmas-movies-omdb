/**
 * Utility functions for scrolling
 */

/**
 * Scrolls the window to the top of the page smoothly
 */
export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};

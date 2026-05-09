export function useA11yChecker() {
  const check = {
    // Verificar contraste
    contrastRatio: (foreground, background) => {
      // Convertir hex a RGB
      const toRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
            }
          : null;
      };

      const fg = toRgb(foreground);
      const bg = toRgb(background);

      if (!fg || !bg) return null;

      const getLuminance = (rgb) => {
        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
          const sRgb = c / 255;
          return sRgb <= 0.03928
            ? sRgb / 12.92
            : Math.pow((sRgb + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const l1 = getLuminance(fg);
      const l2 = getLuminance(bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);

      return (lighter + 0.05) / (darker + 0.05);
    },

    // Verificar que los elementos interactivos sean clickeables (mín 44x44)
    minTouchSize: (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.width >= 44 && rect.height >= 44;
    },

    // Verificar enfoque visible
    hasFocusIndicator: (element) => {
      if (!element) return false;
      const styles = window.getComputedStyle(element, ':focus-visible');
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    },

    // Verificar que las imágenes tengan alt text
    imageHasAlt: (element) => {
      return element.hasAttribute('alt') && element.getAttribute('alt').trim() !== '';
    }
  };

  return check;
}
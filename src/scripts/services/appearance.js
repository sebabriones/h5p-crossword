/**
 * Appearance handling for the CFRD line.
 *
 * Los estilos se publican como variables CSS con prefijo `--cw-` sobre el
 * elemento de la actividad. La versión anterior inyectaba reglas en el head,
 * lo que además afectaba a cualquier otro crucigrama de la misma página.
 */

/** @constant {string} VARIABLE_PREFIX Prefix shared by every custom property. */
const VARIABLE_PREFIX = '--cw-';

/**
 * Mapping between theme parameters and the custom properties they feed.
 * @constant {object}
 */
const THEME_VARIABLES = {
  gridColor: 'grid-border-color',
  cellBackgroundColor: 'cell-bg',
  cellColor: 'cell-color',
  clueIdColor: 'clue-id-color',
  cellBackgroundColorHighlight: 'cell-highlight-bg',
  cellColorHighlight: 'cell-highlight-color',
  clueIdColorHighlight: 'clue-id-highlight-color'
};

/**
 * Build a linear gradient declaration from the CFRD gradient group.
 * @param {object} [gradient] Gradient settings.
 * @returns {string} CSS value, empty when not usable.
 */
export const buildLinearGradient = (gradient = {}) => {
  if (!gradient.colorStart || !gradient.colorEnd) {
    return '';
  }

  const angle = (typeof gradient.angle === 'number') ? gradient.angle : 180;

  return `linear-gradient(${angle}deg, ${gradient.colorStart}, ${gradient.colorEnd})`;
};

/**
 * Write custom properties on an element, removing the empty ones.
 * @param {HTMLElement} element Target element.
 * @param {object} variables Map of names (without prefix) to values.
 */
export const applyVariables = (element, variables = {}) => {
  if (!element) {
    return;
  }

  Object.keys(variables).forEach((name) => {
    const value = variables[name];
    const property = `${VARIABLE_PREFIX}${name}`;

    if (value === undefined || value === null || value === '') {
      element.style.removeProperty(property);
    }
    else {
      element.style.setProperty(property, value);
    }
  });
};

/**
 * Apply the theme colors of the activity.
 * @param {HTMLElement} element Target element.
 * @param {object} [theme] Theme settings.
 */
export const applyThemeAppearance = (element, theme = {}) => {
  const variables = {};

  Object.keys(THEME_VARIABLES).forEach((key) => {
    variables[THEME_VARIABLES[key]] = theme[key];
  });

  applyVariables(element, variables);
};

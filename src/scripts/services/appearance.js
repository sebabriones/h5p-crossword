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
 * Resolve the background of a CFRD surface group.
 * @param {object} [group] Group holding the background settings.
 * @returns {string} CSS value, empty when not configured.
 */
const resolveBackground = (group = {}) => {
  if (group.useGradientBackground) {
    return buildLinearGradient(group.gradientBackground);
  }

  return group.backgroundColor || '';
};

/**
 * Apply the theme colors of the activity.
 * @param {HTMLElement} element Target element.
 * @param {object} [theme] Theme settings.
 */
export const applyThemeAppearance = (element, theme = {}) => {
  const clues = theme.cluesText || {};
  const scrollbar = theme.scrollbar || {};
  const inputs = theme.clueInputs || {};
  const correct = theme.correctColors || {};
  const wrong = theme.wrongColors || {};
  const neutral = theme.neutralColors || {};
  const solutionWord = theme.solutionWord || {};
  const overlay = theme.extraClueOverlay || {};
  const variables = {
    'activity-bg': resolveBackground(theme.activityArea),
    'clue-color': clues.clueColor,
    'clue-title-color': clues.titleColor,
    'clue-input-bg': inputs.backgroundColor,
    'clue-input-color': inputs.textColor,
    'clue-input-border-color': inputs.borderColor,
    'correct-bg': correct.background,
    'correct-color': correct.text,
    'wrong-bg': wrong.background,
    'wrong-color': wrong.text,
    'neutral-bg': neutral.background,
    'neutral-color': neutral.text,
    'solution-word-border': solutionWord.borderColor,
    'solution-marker-color': solutionWord.markerColor,
    'overlay-bg': overlay.backgroundColor,
    'overlay-color': overlay.textColor,
    'overlay-close-color': overlay.closeButtonColor,
    'scrollbar-width': (scrollbar.width > 0) ? `${scrollbar.width}px` : '',
    'scrollbar-track': (scrollbar.showTrack === false) ? 'transparent' : scrollbar.track,
    'scrollbar-thumb': scrollbar.thumb,
    'scrollbar-thumb-hover': scrollbar.thumbHover
  };

  Object.keys(THEME_VARIABLES).forEach((key) => {
    variables[THEME_VARIABLES[key]] = theme[key];
  });

  applyVariables(element, variables);
};

/**
 * Multiplier the author set for the automatic clue font size.
 * @param {object} [theme] Theme settings.
 * @returns {number} Scale, 1 when not configured.
 */
export const getCluesFontScale = (theme = {}) => {
  const scale = theme.cluesText && theme.cluesText.fontScale;

  return (typeof scale === 'number' && scale > 0) ? scale : 1;
};

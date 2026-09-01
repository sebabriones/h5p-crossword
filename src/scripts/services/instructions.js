/**
 * Instrucciones CFRD (H5P.Instructions) — mismo contrato que el resto de la línea 1.0.
 */

/**
 * @param {*} value Value to check.
 * @returns {boolean} True if the value represents a truthy editor field.
 */
function isTruthy(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/**
 * @param {object} instance Crossword instance.
 * @returns {object|null} Normalized options, or null when there is nothing to show.
 */
export function getInstructionsOptions(instance) {
  const instructions = instance?.params?.instructions;

  if (!instructions || !isTruthy(instructions.enabled)) {
    return null;
  }

  const text = (instructions.text === undefined || instructions.text === null) ?
    '' :
    String(instructions.text).trim();

  if (!text) {
    return null;
  }

  return {
    id: instance.contentId || instance.id,
    text: text,
    displayMode: instructions.displayMode || 'both',
    introButtonLabel: instructions.introButtonLabel || 'Start',
    tabButtonLabel: instructions.tabButtonLabel || 'Instructions',
    animation: H5P.jQuery.extend(true, {}, instructions.animation || {}),
    appearance: H5P.jQuery.extend(true, {}, instructions.appearance || {}),
    startCollapsed: instructions.startCollapsed === undefined ?
      true :
      isTruthy(instructions.startCollapsed),
  };
}

/**
 * Embedded instances (Course Presentation, Interactive Video) delegate
 * instructions to the host, which sizes them for the whole activity.
 * @param {object} instance Crossword instance.
 * @returns {boolean} True when the instance is not the root content.
 */
export function isEmbeddedInstance(instance) {
  return !!(instance && typeof instance.isRoot === 'function' && !instance.isRoot());
}

/**
 * @param {object} instance Crossword instance.
 * @param {H5P.jQuery} $container Root container of the activity.
 */
export function scheduleInstructionsAttach(instance, $container) {
  if (isEmbeddedInstance(instance) || !$container || !$container.length) {
    return;
  }

  [0, 200, 500].forEach((delay) => {
    setTimeout(() => {
      const instructions = getInstructionsOptions(instance);

      if (!instructions) {
        return;
      }

      if (
        $container.find('.h5p-instructions-root').length ||
        ($container.parent().length && $container.parent().children('.h5p-instructions-root').length)
      ) {
        instance.trigger('resize');
        return;
      }

      if (H5P.Instructions && typeof H5P.Instructions.attach === 'function') {
        if (H5P.Instructions.attach($container, instructions)) {
          instance.trigger('resize');
        }
      }
    }, delay);
  });
}

/**
 * @param {object} instance Crossword instance.
 */
export function refreshInstructionsScale(instance) {
  const instructions = getInstructionsOptions(instance);
  const $target = (instance.$playArea && instance.$playArea.length) ?
    instance.$playArea :
    instance.$container;

  if (!instructions || !$target || !$target.length) {
    return;
  }

  if (H5P.Instructions && typeof H5P.Instructions.updateScale === 'function') {
    H5P.Instructions.updateScale($target, instructions);
  }
}

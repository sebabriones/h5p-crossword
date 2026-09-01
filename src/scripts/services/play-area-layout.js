/**
 * Play area 16:9 — mismo contrato que Sort Paragraphs / Memory Game CFRD.
 */

/**
 * @param {H5P.jQuery} $container Root container of the activity.
 * @returns {H5P.jQuery} Play area element.
 */
export function setupPlayAreaLayout($container) {
  const $ = H5P.jQuery;
  let $playArea = $container.children('.h5p-cw-play-area').first();
  const playAreaSelectors = [
    '.h5p-question-image',
    '.h5p-question-video',
    '.h5p-question-audio',
    '.h5p-question-introduction',
    '.h5p-question-content',
  ];

  if (!$playArea.length) {
    $playArea = $('<div>', { class: 'h5p-cw-play-area' });
    $container.prepend($playArea);
  }

  playAreaSelectors.forEach((selector) => {
    $container.children(selector).appendTo($playArea);
  });

  return $playArea;
}

/**
 * Move inline scorebar/feedback out of the play area.
 *
 * @param {H5P.jQuery} $container Root container.
 */
export function normalizeInlineEvaluationLayout($container) {
  const $ = H5P.jQuery;
  const $playArea = $container.children('.h5p-cw-play-area').first();
  let $feedback;
  let $scorebar;
  let $buttons;

  if (!$playArea.length) {
    return;
  }

  $playArea.children('.h5p-question-feedback:not(.h5p-question-popup)').appendTo($container);
  $playArea.children('.h5p-question-scorebar').appendTo($container);

  $feedback = $container.children('.h5p-question-feedback:not(.h5p-question-popup)');
  $scorebar = $container.children('.h5p-question-scorebar');
  $buttons = $container.children('.h5p-question-buttons');

  if ($scorebar.length && $buttons.length) {
    $scorebar.insertBefore($buttons);
  }

  if ($feedback.length && $scorebar.length) {
    $feedback.insertBefore($scorebar);
  }
  else if ($feedback.length && $buttons.length) {
    $feedback.insertBefore($buttons);
  }
}

/**
 * @param {H5P.jQuery} $container Root container.
 * @param {object} [instance] Crossword instance.
 * @param {object} [options] Options.
 * @param {boolean} [options.normalizeInline=true] Whether to normalize inline layout.
 */
export function scheduleInlineEvaluationLayout($container, instance, options) {
  const normalizeInline = !options || options.normalizeInline !== false;

  [0, 50, 160, 350].forEach((delay) => {
    setTimeout(() => {
      if ($container && $container.length) {
        if (normalizeInline) {
          normalizeInlineEvaluationLayout($container);
        }

        if (instance && typeof instance.trigger === 'function') {
          instance.trigger('resize');
        }
      }
    }, delay);
  });
}

/**
 * @param {object} instance Crossword instance.
 */
export function scheduleDeferredResize(instance) {
  requestAnimationFrame(() => {
    instance.trigger('resize');

    requestAnimationFrame(() => {
      instance.trigger('resize');
    });
  });

  [50, 150, 350].forEach((delay) => {
    setTimeout(() => {
      instance.trigger('resize');
    }, delay);
  });
}

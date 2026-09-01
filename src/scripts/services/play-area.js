import {
  setupPlayAreaLayout,
  scheduleDeferredResize,
  scheduleInlineEvaluationLayout
} from '@services/play-area-layout.js';
import {
  scheduleInstructionsAttach,
  refreshInstructionsScale
} from '@services/instructions.js';

/**
 * @returns {object|undefined} Play area API exposed on H5P.CrosswordCFRD.
 */
function getPlayAreaApi() {
  return H5P.CrosswordCFRD && H5P.CrosswordCFRD.PlayArea;
}

/**
 * Wire 16:9 play area resize and layout onto a Crossword instance.
 *
 * @param {object} instance Crossword instance.
 * @param {object} options Options.
 * @param {Function} options.originalAttach Original attach method.
 * @param {Function} [options.onAttach] Callback after attach (background, etc.).
 */
export function wirePlayArea(instance, options) {
  const playAreaApi = getPlayAreaApi();
  let resizeRaf = null;

  instance.playAreaSize = playAreaApi ? playAreaApi.getDesignSize() : null;

  const clearPlayAreaScaleCache = () => {
    instance._cwLastScaleKey = null;
    instance._cwLastHeightPx = null;
    instance._cwLastWidth = null;
    instance._cwLastCenterHorizontal = null;
    instance._cwLastFullscreen = null;
  };

  const applyPlayAreaScale = () => {
    const api = getPlayAreaApi();
    const design = instance.playAreaSize || (api ? api.getDesignSize() : null);

    if (!api || !design || !instance.$playArea || !instance.$playArea.length) {
      if (instance.content) {
        instance.content.resize();
      }
      return;
    }

    const rootEl = (instance.$container && instance.$container.length) ?
      instance.$container[0] :
      instance.$playArea[0];
    const layout = api.getLayoutDimensions(rootEl);
    const scaleKey = layout.scale.toFixed(4);
    const fontSize = layout.fontSize + 'px';

    if (
      instance._cwLastScaleKey === scaleKey &&
      instance._cwLastHeightPx === layout.heightPx &&
      instance._cwLastWidth === layout.width &&
      instance._cwLastCenterHorizontal === layout.centerHorizontal &&
      instance._cwLastFullscreen === layout.isFullscreen
    ) {
      return;
    }

    instance._cwLastScaleKey = scaleKey;
    instance._cwLastHeightPx = layout.heightPx;
    instance._cwLastWidth = layout.width;
    instance._cwLastCenterHorizontal = layout.centerHorizontal;
    instance._cwLastFullscreen = layout.isFullscreen;

    if (instance.$container && instance.$container.length) {
      if (layout.isFullscreen) {
        instance.$container.css({
          width: '100%',
          maxWidth: '100%',
          height: '100%',
          maxHeight: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: layout.centerHorizontal ? 'center' : 'stretch',
          justifyContent: 'flex-start',
        });
      }
      else {
        instance.$container.css({
          width: layout.widthPx,
          maxWidth: '100%',
          height: layout.heightPx,
          maxHeight: 'none',
          display: '',
          flexDirection: '',
          alignItems: '',
          justifyContent: '',
        });
      }
    }

    if (layout.isFullscreen) {
      instance.$playArea.css({
        width: layout.centerHorizontal ? layout.widthPx : '100%',
        maxWidth: '100%',
        height: '',
        flex: '1 1 0',
        minHeight: 0,
        maxHeight: 'none',
        marginLeft: layout.centerHorizontal ? 'auto' : '',
        marginRight: layout.centerHorizontal ? 'auto' : '',
        fontSize: fontSize,
        '--cw-scale': scaleKey,
      });
    }
    else {
      instance.$playArea.css({
        width: '100%',
        maxWidth: '100%',
        height: '',
        flex: '',
        minHeight: '',
        maxHeight: 'none',
        marginLeft: '',
        marginRight: '',
        fontSize: fontSize,
        '--cw-scale': scaleKey,
      });
    }

    instance.$playArea.addClass('h5p-cw-layout-ready');

    const $popup = instance.$playArea.find('.h5p-question-feedback.h5p-question-popup');
    $popup.css('fontSize', fontSize);

    if ($popup.length && $popup.hasClass('h5p-question-visible')) {
      setTimeout(() => {
        instance.trigger('resize', { repositionOnly: true });
      }, 0);
    }

    refreshInstructionsScale(instance);

    if (instance.content) {
      instance.content.resize();
    }
  };

  const originalSetFeedback = instance.setFeedback;
  if (typeof originalSetFeedback === 'function') {
    instance.setFeedback = function (content, score, maxScore, scoreBarLabel, helpText, popupSettings) {
      const result = originalSetFeedback.apply(instance, arguments);
      const isPopup = popupSettings != null &&
        popupSettings.showAsPopup === true &&
        content !== undefined &&
        String(content).trim().length > 0;

      if (instance.$container && instance.$container.length) {
        scheduleInlineEvaluationLayout(instance.$container, instance, {
          normalizeInline: !isPopup,
        });
      }

      return result;
    };
  }

  const originalAttach = options.originalAttach;
  instance.attach = ($container) => {
    instance.$container = $container;
    originalAttach.call(instance, $container);

    if (typeof options.onAttach === 'function') {
      options.onAttach($container);
    }

    instance.$playArea = setupPlayAreaLayout($container);
    scheduleInstructionsAttach(instance, instance.$playArea);

    if (window.ResizeObserver && !instance.playAreaResizeObserver && instance.$playArea.length) {
      instance.playAreaResizeObserver = new ResizeObserver(() => {
        instance.trigger('resize');
      });
      const parentEl = instance.$playArea.parent()[0];
      if (parentEl) {
        instance.playAreaResizeObserver.observe(parentEl);
      }
    }

    scheduleDeferredResize(instance);
  };

  instance.on('enterFullScreen', () => {
    clearPlayAreaScaleCache();
    instance.trigger('resize');
  });

  instance.on('exitFullScreen', () => {
    clearPlayAreaScaleCache();
    if (instance.$container && instance.$container.length) {
      instance.$container.css({
        width: '',
        height: '',
        maxWidth: '',
        maxHeight: '',
        display: '',
        flexDirection: '',
        alignItems: '',
        justifyContent: '',
      });
    }
    if (instance.$playArea && instance.$playArea.length) {
      instance.$playArea.css({
        maxHeight: 'none',
        width: '',
        height: '',
        flex: '',
        minHeight: '',
        marginLeft: '',
        marginRight: '',
      });
      instance.$playArea.parent().css('maxHeight', 'none');
    }
    instance.trigger('resize');
  });

  instance.on('resize', (event) => {
    if (event && event.data && event.data.repositionOnly) {
      return;
    }

    if (!instance.$playArea || !instance.$playArea.length || !getPlayAreaApi()) {
      if (instance.content) {
        instance.content.resize();
      }
      refreshInstructionsScale(instance);
      return;
    }

    if (!instance.$playArea.is(':visible')) {
      scheduleDeferredResize(instance);
      return;
    }

    if (resizeRaf !== null) {
      cancelAnimationFrame(resizeRaf);
    }

    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        applyPlayAreaScale();
      });
    });
  });
}

var H5P = H5P || {};

H5P.CrosswordCFRD = H5P.CrosswordCFRD || {};

/**
 * Play area 16:9 — Course Presentation style.
 * Normal / LTI: width-driven integer height (stable iframe).
 * Fullscreen: largest 16:9 that fits the real viewport.
 */
H5P.CrosswordCFRD.PlayArea = (function () {
  var BASE_WIDTH = 640;
  var ASPECT_RATIO = 16 / 9;
  var BASE_HEIGHT = Math.round(BASE_WIDTH / ASPECT_RATIO);
  var BASE_FONT_SIZE = 16;
  var MIN_SCALE = 0.35;
  var MAX_SCALE = 1;

  function getDesignSize() {
    return {
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      ratio: ASPECT_RATIO,
      baseWidth: BASE_WIDTH,
      baseHeight: BASE_HEIGHT,
      baseFontSize: BASE_FONT_SIZE
    };
  }

  function getScale(width, height) {
    var scaleW = (!width || width <= 0) ? 1 : width / BASE_WIDTH;
    var scaleH = (!height || height <= 0) ? Number.POSITIVE_INFINITY : height / BASE_HEIGHT;
    var scale = Math.min(scaleW, scaleH);

    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
  }

  function getScaledFontSize(width, height) {
    return BASE_FONT_SIZE * getScale(width, height);
  }

  function getExplicitHeight(width, maxHeightPx) {
    if (!width || width <= 0) {
      return BASE_HEIGHT;
    }

    var height = width / ASPECT_RATIO;

    if (maxHeightPx > 0 && height > maxHeightPx) {
      return Math.round(maxHeightPx);
    }

    return Math.round(height);
  }

  function hasFullscreenClass(node) {
    return !!(node && node.classList &&
      (node.classList.contains('h5p-fullscreen') ||
        node.classList.contains('h5p-semi-fullscreen')));
  }

  function isFullscreenContext(playAreaElement) {
    if (typeof H5P !== 'undefined' && H5P.isFullscreen) {
      return true;
    }

    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement) {
      return true;
    }

    var root = document.documentElement;
    var body = document.body;
    if (hasFullscreenClass(root) || hasFullscreenClass(body)) {
      return true;
    }

    var node = playAreaElement;
    while (node) {
      if (hasFullscreenClass(node)) {
        return true;
      }
      node = node.parentElement;
    }

    var frame = window.frameElement;
    if (frame) {
      var host = frame.parentElement;
      while (host) {
        if (hasFullscreenClass(host)) {
          return true;
        }
        host = host.parentElement;
      }
    }

    return false;
  }

  function getMeasureWidth(playAreaElement) {
    if (!playAreaElement) {
      return 0;
    }

    var parent = playAreaElement.parentElement;
    var frame = window.frameElement;
    var parentWidth = 0;
    var frameWidth = 0;

    if (parent) {
      parent.getBoundingClientRect();
      parentWidth = parent.clientWidth;
    }

    if (frame) {
      frame.getBoundingClientRect();
      frameWidth = frame.clientWidth;
    }

    if (frameWidth > 0) {
      if (parentWidth > 0) {
        return Math.min(parentWidth, frameWidth);
      }
      return frameWidth;
    }

    if (parentWidth > 0) {
      return parentWidth;
    }

    playAreaElement.getBoundingClientRect();
    return playAreaElement.clientWidth;
  }

  function getMeasureViewportHeight(playAreaElement) {
    var viewHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    var frame = window.frameElement;
    var frameHeight = 0;

    if (frame) {
      frame.getBoundingClientRect();
      frameHeight = frame.clientHeight;
    }

    if (isFullscreenContext(playAreaElement)) {
      return Math.max(viewHeight, frameHeight);
    }

    if (frameHeight > 0 && viewHeight > 0) {
      return Math.min(frameHeight, viewHeight);
    }

    return frameHeight || viewHeight;
  }

  /**
   * Viewport size for H5P fullscreen (iframe may still report the old height).
   */
  function getFullscreenViewportSize(playAreaElement) {
    var width = window.innerWidth || 0;
    var height = window.innerHeight || 0;
    var fsEl = document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement;
    var host;
    var frame = window.frameElement;
    var parent;

    if (fsEl && fsEl.clientWidth && fsEl.clientHeight) {
      width = Math.max(width, fsEl.clientWidth);
      height = Math.max(height, fsEl.clientHeight);
    }

    host = document.querySelector(
      '.h5p-content.h5p-fullscreen, .h5p-container.h5p-fullscreen, ' +
      '.h5p-content.h5p-semi-fullscreen, .h5p-container.h5p-semi-fullscreen'
    );
    if (host && host.clientWidth && host.clientHeight) {
      width = Math.max(width, host.clientWidth);
      height = Math.max(height, host.clientHeight);
    }

    if (frame) {
      parent = frame.parentElement;
      while (parent) {
        if (hasFullscreenClass(parent)) {
          if (parent.clientWidth) {
            width = Math.max(width, parent.clientWidth);
          }
          if (parent.clientHeight) {
            height = Math.max(height, parent.clientHeight);
          }
          break;
        }
        parent = parent.parentElement;
      }

      if (frame.clientWidth) {
        width = Math.max(width, frame.clientWidth);
      }
      if (frame.clientHeight) {
        height = Math.max(height, frame.clientHeight);
      }
    }

    if (playAreaElement) {
      var measured = getMeasureWidth(playAreaElement);
      if (measured > width) {
        width = measured;
      }
    }

    return {
      width: width || BASE_WIDTH,
      height: height || getExplicitHeight(width || BASE_WIDTH, 0)
    };
  }

  function getPlayAreaMaxHeight(playAreaElement, width) {
    if (!width || width <= 0 || !isFullscreenContext(playAreaElement)) {
      return 0;
    }

    var viewportHeight = getMeasureViewportHeight(playAreaElement);
    if (!viewportHeight || viewportHeight <= 0) {
      return 0;
    }

    var naturalHeight = width / ASPECT_RATIO;
    if (naturalHeight <= viewportHeight) {
      return 0;
    }

    return viewportHeight;
  }

  function fitAspectRatioInViewport(viewportWidth, viewportHeight) {
    if (!viewportWidth || viewportWidth <= 0) {
      viewportWidth = BASE_WIDTH;
    }

    if (!viewportHeight || viewportHeight <= 0) {
      return {
        width: Math.round(viewportWidth),
        height: getExplicitHeight(viewportWidth, 0)
      };
    }

    if (viewportWidth / viewportHeight > ASPECT_RATIO) {
      return {
        width: Math.round(viewportHeight * ASPECT_RATIO),
        height: Math.round(viewportHeight)
      };
    }

    return {
      width: Math.round(viewportWidth),
      height: Math.round(viewportWidth / ASPECT_RATIO)
    };
  }

  /**
   * @param {HTMLElement} rootElement
   * @returns {{width: number, height: number, scale: number, fontSize: number, maxHeightPx: number, heightPx: string, widthPx: string, centerHorizontal: boolean, isFullscreen: boolean}}
   */
  function getLayoutDimensions(rootElement) {
    var availableWidth = getMeasureWidth(rootElement);
    var layoutWidth;
    var height;
    var viewport;
    var fullscreen = isFullscreenContext(rootElement);
    var centerHorizontal = false;

    if (!availableWidth || availableWidth <= 0) {
      availableWidth = BASE_WIDTH;
    }

    if (fullscreen) {
      viewport = getFullscreenViewportSize(rootElement);
      var fitted = fitAspectRatioInViewport(viewport.width, viewport.height);
      layoutWidth = fitted.width;
      height = fitted.height;
      centerHorizontal = layoutWidth < viewport.width - 1;
    }
    else {
      layoutWidth = availableWidth;
      height = getExplicitHeight(layoutWidth, 0);
    }

    var scale = getScale(layoutWidth, height);

    return {
      width: layoutWidth,
      height: height,
      scale: scale,
      fontSize: getScaledFontSize(layoutWidth, height),
      maxHeightPx: fullscreen && viewport ? viewport.height : 0,
      heightPx: height + 'px',
      widthPx: centerHorizontal ? (Math.round(layoutWidth) + 'px') : '100%',
      centerHorizontal: centerHorizontal,
      isFullscreen: fullscreen
    };
  }

  return {
    BASE_WIDTH: BASE_WIDTH,
    BASE_HEIGHT: BASE_HEIGHT,
    ASPECT_RATIO: ASPECT_RATIO,
    BASE_FONT_SIZE: BASE_FONT_SIZE,
    MIN_SCALE: MIN_SCALE,
    MAX_SCALE: MAX_SCALE,
    getDesignSize: getDesignSize,
    getScale: getScale,
    getScaledFontSize: getScaledFontSize,
    getExplicitHeight: getExplicitHeight,
    getMeasureWidth: getMeasureWidth,
    getMeasureViewportHeight: getMeasureViewportHeight,
    isFullscreenContext: isFullscreenContext,
    getPlayAreaMaxHeight: getPlayAreaMaxHeight,
    fitAspectRatioInViewport: fitAspectRatioInViewport,
    getFullscreenViewportSize: getFullscreenViewportSize,
    getLayoutDimensions: getLayoutDimensions
  };
})();

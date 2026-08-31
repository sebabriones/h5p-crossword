import CrosswordClueAnnouncer from '@components/h5p-crossword-clue-announcer.js';
import CrosswordInput from '@components/h5p-crossword-input.js';
import CrosswordTable from '@components/h5p-crossword-table.js';
import CrosswordSolutionWord from '@components/h5p-crossword-solution-word.js';
import Util from '@services/util.js';
import CrosswordGenerator from '@services/h5p-crossword-generator.js';
import { applyThemeAppearance, getCluesFontScale } from '@services/appearance.js';
import './h5p-crossword-content.scss';

/** @constant {number} MIN_WORDS_FOR_CROSSWORD Minimum number of words for crossword. */
const MIN_WORDS_FOR_CROSSWORD = 2;

/** @constant {number} MAXIMUM_TRIES Maximum number of tries to generate crossword grid */
const MAXIMUM_TRIES = 20;

/** @constant {number} CLUES_COLUMN_MIN_WIDTH_PX Width below which clues stack under the grid. */
const CLUES_COLUMN_MIN_WIDTH_PX = 400;

/** @constant {number} CLUES_ROW_MIN_WIDTH_PX Width needed to put both clue groups side by side. */
const CLUES_ROW_MIN_WIDTH_PX = 1280;

/** @constant {number} CLUES_FONT_SIZE_RATIO Clue font size as a share of the content width. */
const CLUES_FONT_SIZE_RATIO = 0.015;

/** @constant {number} CLUES_FONT_SIZE_MIN_PX Lower bound for the clue font size. */
const CLUES_FONT_SIZE_MIN_PX = 11;

/** @constant {number} CLUES_FONT_SIZE_MAX_PX Upper bound for the clue font size. */
const CLUES_FONT_SIZE_MAX_PX = 18;

/** @constant {number} INSTRUCTIONS_CLEARANCE_REM Room the instructions tab needs on top. */
const INSTRUCTIONS_CLEARANCE_REM = 2.75;

/** @constant {number} INSTRUCTIONS_BASE_WIDTH_PX Reference width used by H5P.Instructions. */
const INSTRUCTIONS_BASE_WIDTH_PX = 900;

/** @constant {number} INSTRUCTIONS_MIN_SCALE Lower bound used by H5P.Instructions. */
const INSTRUCTIONS_MIN_SCALE = 0.35;

/** @constant {number} MIN_GRID_HEIGHT_PX Below this the height reading is not trustworthy. */
const MIN_GRID_HEIGHT_PX = 120;

/** Class representing the content */
export default class CrosswordContent {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks) {
    this.params = params;

    this.contentId = params.contentId;

    this.content = document.createElement('div');
    this.content.classList.add('h5p-crossword-content');

    this.callbacks = callbacks || {};
    this.callbacks.onInitialized = callbacks.onInitialized || (() => {});
    this.callbacks.onRead = callbacks.onRead || (() => {});
    this.callbacks.onTableFilled = callbacks.onTableFilled || (() => {});

    this.answerGiven = false;

    this.setCurrentState(this.params.previousState);

    // El contenido puede estrecharse sin que H5P dispare resize (columna de un LMS,
    // panel embebido), así que el layout se observa directamente sobre la caja.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateLayoutState();
      });
      this.resizeObserver.observe(this.content);
    }
  }

  /**
   * Set current state.
   * @param {object} state State to set, must match return value from getCurrentState.
   */
  setCurrentState(state = {}) {
    state = this.sanitizeState(state);

    this.content.innerHTML = ''; // Clean state

    // Only support uppercase
    this.params.words = (this.params.words || [])
      .filter((word) => {
        return (
          typeof word.answer !== 'undefined' &&
          typeof word.clue !== 'undefined'
        );
      })
      .map((word) => {
        word.answer = Util.stripHTML(Util.htmlDecode(Util.toUpperCase(word.answer, Util.UPPERCASE_EXCEPTIONS)));
        word.clue = Util.stripHTML(Util.htmlDecode(word.clue));
        return word;
      });

    // Restore previous cells or create crossword
    if (state?.crosswordLayout) {
      this.crosswordLayout = state.crosswordLayout;
    }
    else {
      const errorMessages = [];
      let crosswordGenerator;
      let grid;

      if (this.params.words.length < MIN_WORDS_FOR_CROSSWORD) {
        errorMessages.push(params.l10n.couldNotGenerateCrosswordTooFewWords);
      }
      else {
        crosswordGenerator = new CrosswordGenerator({
          words: this.params.words,
          config: {
            poolSize: this.params.poolSize
          }
        });
        grid = crosswordGenerator.getSquareGrid(MAXIMUM_TRIES);

        if (!grid) {
          errorMessages.push(this.params.l10n.couldNotGenerateCrossword);
        }
      }

      let badWords = crosswordGenerator?.getBadWords();
      if (badWords?.length) {
        badWords = badWords.map((badWord) => `${badWord.answer}`).join(', ');

        errorMessages.push(this.params.l10n.problematicWords.replace(/@words/g, badWords));
      }

      if (errorMessages.length) {
        console.warn(`H5P.CrosswordCFRD: ${errorMessages.join(' ')}`);
      }

      if (!grid) {
        const message = document.createElement('div');
        message.classList.add('h5p-crossword-message');
        message.innerText = errorMessages.join(' ');
        this.content.appendChild(message);

        this.couldNotGenerateCrossword = true;
        this.callbacks.onInitialized(false);
        return;
      }

      this.crosswordLayout = crosswordGenerator.export(grid);
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.classList.add('h5p-crossword-table-wrapper');

    // Clue announcer
    this.clueAnnouncer = new CrosswordClueAnnouncer();
    tableWrapper.appendChild(this.clueAnnouncer.getDOM());

    this.crosswordLayout.result = this.crosswordLayout.result.map((word) => {
      word.clue = this.params.words[word.index].clue;
      word.answer = this.params.words[word.index].answer;
      word.extraClue = this.params.words[word.index].extraClue;

      return word;
    });

    // Table
    this.table = new CrosswordTable(
      {
        scoreWords: this.params.scoreWords,
        applyPenalties: this.params.applyPenalties,
        theme: this.params.theme,
        contentId: this.contentId,
        dimensions: {
          rows: this.crosswordLayout.rows,
          columns: this.crosswordLayout.cols
        },
        instantFeedback: this.params.instantFeedback,
        solutionWord: this.params.solutionWord,
        words: this.crosswordLayout.result,
        a11y: this.params.a11y,
        l10n: {
          across: this.params.l10n.across,
          down: this.params.l10n.down
        }
      },
      {
        onInput: ((params, quiet) => {
          this.handleTableInput(params, quiet);
        }),
        onFocus: ((params) => {
          this.handleTableFocus(params);
        }),
        onRead: ((text) => {
          this.callbacks.onRead(text);
        })
      }
    );
    tableWrapper.appendChild(this.table.getDOM());
    this.content.appendChild(tableWrapper);

    const cellsWithMarkers = this.table.addSolutionWord(this.params.solutionWord, state.solutionCells);
    if (this.params.solutionWord !== '') {
      if (cellsWithMarkers.length > 0) {
        this.solutionWord = new CrosswordSolutionWord({
          cellsWithMarkers: cellsWithMarkers,
          tableWidth: this.crosswordLayout.cols
        });
        tableWrapper.appendChild(this.solutionWord.getDOM());
      }
      else {
        console.warn(
          'H5P.CrosswordCFRD: There are not enough matching characters for the overall solution word in the crossword.'
        );
      }
    }

    // Input Area
    this.inputarea = new CrosswordInput(
      {
        words: this.crosswordLayout.result.filter((word) => word.orientation !== 'none'),
        contentId: this.contentId,
        overlayContainer: this.content,
        applyPenalties: this.params.applyPenalties,
        l10n: {
          across: this.params.l10n.across,
          down: this.params.l10n.down,
          extraClue: this.params.l10n.extraClue,
          closeWindow: this.params.l10n.closeWindow
        },
        a11y: this.params.a11y
      },
      {
        onFieldInput: ((params) => {
          this.handleFieldInput(params);
        }),
        onRead: ((text) => {
          this.callbacks.onRead(text);
        })
      }
    );
    this.content.appendChild(this.inputarea.getDOM());

    // Restore previous cells
    if (state.cells) {
      this.table.setAnswers(state.cells);
      this.answerGiven = true;
    }

    // Restore previous focus
    if (typeof state.focus?.position?.row === 'number') {
      this.table.setcurrentOrientation(
        state.focus.orientation,
        state.focus.position
      );

      this.table.focusCell(state.focus.position);
    }

    this.overrideCSS(this.params.theme);

    this.resize();
    this.callbacks.onInitialized(true);
  }

  /**
   * Sanitize state.
   * TODO: This is just rudimentary, should be improved.
   * @param {object} state Previous state object.
   * @returns {object} Sanitized state object.
   */
  sanitizeState(state = {}) {
    if (state.crosswordLayout) {
      if (typeof state.crosswordLayout?.cols !== 'number') {
        delete state.crosswordLayout.cols;
      }

      if (typeof state.crosswordLayout?.rows !== 'number') {
        delete state.crosswordLayout.rows;
      }
    }

    if (
      !Array.isArray(state.cells) ||
      state.cells.some((char) => typeof char !== 'string' && char !== undefined && char !== null)
    ) {
      delete state.cells;
    }

    if (typeof state.focus?.position?.row !== 'number' || typeof state.focus?.position?.column !== 'number') {
      delete state.focus;
    }

    if (state.focus) {
      if (state.focus.orientation !== 'across' && state.focus.orientation !== 'down') {
        delete state.focus.orientation;
      }
    }

    return state;
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Pick the layout variant that fits the space the content actually got.
   */
  updateLayoutState() {
    const width = this.content.getBoundingClientRect().width;
    if (width === 0) {
      return; // Not displayed yet; a later resize will settle this.
    }

    const isNarrow = width < CLUES_COLUMN_MIN_WIDTH_PX;

    this.content.classList.toggle('h5p-crossword-layout-narrow', isNarrow);
    this.content.classList.toggle('h5p-crossword-layout-wide', !isNarrow);
    this.content.classList.toggle(
      'h5p-crossword-layout-clues-row', width >= CLUES_ROW_MIN_WIDTH_PX
    );

    // Las dos columnas se conservan hasta anchos muy pequeños: en lugar de apilar,
    // las pistas encogen su tipografía junto con el espacio disponible.
    const cluesFontSizePx = Math.min(
      CLUES_FONT_SIZE_MAX_PX,
      Math.max(CLUES_FONT_SIZE_MIN_PX, width * CLUES_FONT_SIZE_RATIO)
    ) * getCluesFontScale(this.params.theme);
    this.content.style.setProperty(
      '--h5p-crossword-clues-font-size', `${cluesFontSizePx}px`
    );

    this.updateInstructionsClearance(width);
  }

  /**
   * Reserve room for the instructions tab, following the scale H5P.Instructions uses.
   * @param {number} width Current content width in pixels.
   */
  updateInstructionsClearance(width) {
    const root = this.content.closest('.h5p-crossword');
    if (!root) {
      return;
    }

    const scale = Math.max(
      INSTRUCTIONS_MIN_SCALE, Math.min(1, width / INSTRUCTIONS_BASE_WIDTH_PX)
    );

    root.style.setProperty(
      '--h5p-crossword-instructions-clearance',
      `${INSTRUCTIONS_CLEARANCE_REM * scale}rem`
    );
  }

  /**
   * Height the grid may use before it starts covering the score bar and buttons.
   * @returns {number} Available height in pixels, or 0 when the host does not cap it.
   */
  getAvailableGridHeight() {
    const host = this.content.parentElement;

    // Fuera de pantalla completa la altura la define el propio contenido, así que
    // no hay techo que respetar y medirlo daría un valor engañoso.
    if (!host || !this.content.closest('.h5p-fullscreen, .h5p-semi-fullscreen')) {
      return 0;
    }

    const available = host.clientHeight -
      (this.content.getBoundingClientRect().top - host.getBoundingClientRect().top);

    // Una medición tomada antes de que el navegador asiente el layout dejaría la
    // rejilla diminuta; en ese caso es preferible dimensionar solo por ancho.
    return (available >= MIN_GRID_HEIGHT_PX) ? available : 0;
  }

  resize() {
    this.updateLayoutState();

    if (!this.table) {
      return;
    }
    const tableRect = this.table.resize({
      maxHeight: this.getAvailableGridHeight()
    });
    this.inputarea.resize({ height: tableRect.height });

    if (this.solutionWord) {
      this.solutionWord.resize();
    }
  }

  /**
   * Get correct responses pattern for xAPI.
   * @returns {string[]} Correct response for each cell.
   */
  getXAPICorrectResponsesPattern() {
    return this.table.getXAPICorrectResponsesPattern();
  }

  /**
   * Get current response for xAPI.
   * @returns {string} Responses for each cell joined by [,].
   */
  getXAPIResponse() {
    return this.table.getXAPIResponse();
  }

  /**
   * Get xAPI description suitable for H5P's reporting module.
   * @returns {string} HTML with placeholders for fields to be filled in.
   */
  getXAPIDescription() {
    return this.table.getXAPIDescription();
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.keepCorrectAnswers] If true, correct answers are kept.
   */
  reset(params = {}) {
    if (this.params.words.length < MIN_WORDS_FOR_CROSSWORD) {
      return;
    }

    this.inputarea.reset();

    const answerWasKept = this.table.reset(
      { keepCorrectAnswers: params.keepCorrectAnswers }
    );

    if (this.solutionWord) {
      this.solutionWord.reset(
        { keepCorrectAnswers: params.keepCorrectAnswers }
      );
    }

    this.answerGiven = answerWasKept;
  }

  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.answerGiven;
  }

  /**
   * Get score.
   * @returns {number} Score.
   */
  getScore() {
    if (this.params.words.length < MIN_WORDS_FOR_CROSSWORD || !this.table) {
      return 0;
    }

    return this.table.getScore();
  }

  /**
   * Get maximum score
   * @returns {number} Maximum score.
   */
  getMaxScore() {
    if (this.params.words.length < MIN_WORDS_FOR_CROSSWORD || !this.table) {
      return 0;
    }

    return this.table.getMaxScore();
  }

  /**
   * Answer call to return the current state.
   * @returns {object|undefined} Current state.
   */
  getCurrentState() {
    if (this.params.words.length < MIN_WORDS_FOR_CROSSWORD || !this.table) {
      return;
    }

    const cells = this.table.getAnswers();
    const focus = this.table.getFocus();
    /*
     * H5P integrations may (for instance) show a restart button if there is
     * a previous state set, so here not storing the state if no answer has been
     * given by the user and there's no order stored previously - preventing
     * to show up that restart button without the need to.
     */
    if (
      !cells.some((item) => item !== undefined) &&
      typeof focus.position.row === 'undefined'
    ) {
      return;
    }

    // Position of the solution word cells in the crossword
    const solutionCells = this.table?.getSolutionWordCellPositions();

    const crosswordLayout = {
      cols: this.crosswordLayout.cols,
      rows: this.crosswordLayout.rows,
      result: this.crosswordLayout.result.map((word) => {
        return {
          index: word.index,
          clueId: word.clueId,
          orientation: word.orientation,
          startx: word.startx,
          starty: word.starty,
        };
      })
    };

    return { crosswordLayout, cells, focus, solutionCells };
  }

  /**
   * Check answer.
   */
  checkAnswer() {
    this.disable();

    if (this.params.scoreWords) {
      const results = this.table.checkAnswerWords();
      this.inputarea.checkAnswerWords(results);
    }
    else {
      const results = this.table.checkAnswer();
      this.inputarea.checkAnswer(results);
    }
  }

  /**
   * Check whether all relevant cells have been filled.
   * @returns {boolean} True, if all relevant cells have been filled, else false.
   */
  isTableFilled() {
    return this.table && this.table.isFilled();
  }

  /**
   * Show solution.
   */
  showSolutions() {
    if (this.params.words.length < MIN_WORDS_FOR_CROSSWORD) {
      return;
    }

    this.disable();

    this.table.showSolutions();

    if (this.solutionWord) {
      this.solutionWord.showSolutions();
    }

    this.inputarea.showSolutions(this.crosswordLayout.result);
  }

  /**
   * Handle input from input fields.
   * @param {object} params parameters.
   */
  handleFieldInput(params) {
    this.table.fillGrid(params);
    this.answerGiven = true;
  }

  /**
   * Handle input from table.
   * @param {object} params parameters.
   * @param {boolean} [quiet] If true, only sync.
   */
  handleTableInput(params, quiet = false) {
    if (this.solutionWord && params.solutionWordId) {
      this.solutionWord.setCell(params.solutionWordId - 1, params.answer);
    }

    if (params.inputFieldUpdates) {
      this.inputarea.fillFields(params.inputFieldUpdates);
    }

    this.answerGiven = true;

    if (params.checkFilled && this.isTableFilled() && !quiet) {
      this.callbacks.onTableFilled();
    }
  }

  /**
   * Handle table getting focus.
   * @param {object} params parameters.
   */
  handleTableFocus(params) {
    const wordData = this.crosswordLayout.result
      .filter((word) => word.orientation !== 'none')
      .filter((word) => word.orientation === params.orientation && word.clueId === params.clueId);

    if (wordData.length > 0) {
      this.clueAnnouncer.setClue({
        clue: wordData[0].clue,
        orientation: this.params.l10n[wordData[0].orientation],
        clueId: wordData[0].clueId,
        answerLength: wordData[0].answer.length
      });
    }

    this.inputarea.focusClue(params);
  }

  /**
   * Enable content.
   */
  enable() {
    this.table.enable();
    this.inputarea.enable();
  }

  /**
   * Disable content.
   */
  disable() {
    this.table.disable();
    this.table.unhighlight();
    this.inputarea.disable();
    this.inputarea.unhighlight();
    this.clueAnnouncer.reset();
  }

  /**
   * Apply the theme colors as custom properties scoped to this activity.
   * @param {object} theme Theme settings.
   */
  overrideCSS(theme = {}) {
    applyThemeAppearance(this.content, theme);

    // Sin configuración propia se respetan la barra y los campos nativos del navegador.
    const clues = this.content.querySelector('.h5p-crossword-input-container');
    if (clues) {
      clues.classList.toggle(
        'h5p-crossword-custom-scrollbar', !!(theme.scrollbar)
      );
      clues.classList.toggle(
        'h5p-crossword-custom-inputs', !!(theme.clueInputs)
      );
    }
  }
}

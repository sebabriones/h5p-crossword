var H5PPresave = H5PPresave || {};

/**
 * Resolve the presave logic for Crossword (CFRD).
 *
 * Calcula maxScore al guardar y valida que existan palabras.
 * Las migraciones de parámetros legacy van en upgrades.js.
 *
 * @param {object} content
 * @param {function} finished
 */
H5PPresave['H5P.CrosswordCFRD'] = function (content, finished) {
  var presave = H5PEditor.Presave;
  var score = 0;
  var scoreWords;
  var validWords;
  var i;

  if (!content || !Array.isArray(content.words) || content.words.length === 0) {
    throw new presave.exceptions.InvalidContentSemanticsException(
      'Invalid Crossword Error'
    );
  }

  validWords = content.words.filter(function (word) {
    return word && typeof word.answer === 'string' && word.answer.trim().length > 0;
  });

  // Alineado con semantics: scoreWords default true.
  scoreWords = !(content.behaviour && content.behaviour.scoreWords === false);

  if (scoreWords) {
    score = validWords.length;
  }
  else {
    for (i = 0; i < validWords.length; i++) {
      score += validWords[i].answer.replace(/\s/g, '').length;
    }
  }

  if (score < 1) {
    score = 1;
  }

  presave.validateScore(score);
  finished({ maxScore: score });
};

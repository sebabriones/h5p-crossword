import Crossword from '@scripts/h5p-crossword.js';

// Preserve PlayArea from play-area-scale.js (loaded before this bundle).
const playAreaApi = H5P.CrosswordCFRD && H5P.CrosswordCFRD.PlayArea;

H5P.CrosswordCFRD = Crossword;

if (playAreaApi) {
  H5P.CrosswordCFRD.PlayArea = playAreaApi;
}

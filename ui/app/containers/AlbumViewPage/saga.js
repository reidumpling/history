/* global fetch */
import { Dropbox } from 'dropbox';
import {
  all, call, put, select, takeLatest,
} from 'redux-saga/effects';

import normalizeError from '../../utils/error';
import request from '../../utils/request';

import { LOAD_ALBUM, LOAD_NEXT_THUMB_PAGE, PAGE_SIZE } from './constants';
import {
  albumLoadSuccess,
  albumLoadError,
  nextPageSuccess,
  nextPageError,
  thumbsLoaded,
} from './actions';
import { selectNextPage } from './selectors';
import { getItemNodes, parseItemNode } from './transformXmlToJson';
import { getPage } from './paging';
import config from '../../../../config.json';

const dbx = new Dropbox({ accessToken: process.env.HISTORY_DROPBOX_ACCESS_TOKEN, fetch });


export const argsAlbumXmlPath = ({ gallery, album }) => ({
  path: `/public/gallery-${gallery}/xml/album_${album}.xml`,
});


const getYear = (filename = '') => filename.substr(0, 4);
const getFileExt = filename => filename.match(/\.[0-9a-z]+$/i)[0].substring(1);
export const videoExtToJpg = (filename) => {
  if (config.supportedFileTypes.video.includes(getFileExt(filename))) {
    return filename.replace(getFileExt(filename), 'jpg');
  }

  return filename;
};

const replaceFileExtWithJpg = (filename = '') => `${filename.substr(0, filename.lastIndexOf('.'))}.jpg`;


export const argsThumbImgPath = ({ gallery, filename }) => {
  const year = getYear(filename);
  const jpgFilename = replaceFileExtWithJpg(filename);

  return {
    path: `/public/gallery-${gallery}/media/thumbs/${year}/${jpgFilename}`,
  };
};


export function thumbFilenameCallsDropbox({ gallery, thumbs }) {
  const queueSagaCalls = thumb => call(
    [dbx, 'filesGetTemporaryLink'],
    argsThumbImgPath({ gallery, filename: thumb.filename }),
  );
  return thumbs.map(queueSagaCalls);
}


// saga WORKER for LOAD_ALBUM
export function* getAlbumFileOnDropbox({ album, gallery, host }) {
  try {
    const xmlUrl = yield call([dbx, 'filesGetTemporaryLink'], argsAlbumXmlPath({ gallery, album }));
    const xmlFile = yield call(request, xmlUrl.link);
    const memories = getItemNodes(xmlFile).map(parseItemNode);

    yield put(albumLoadSuccess({ host, memories }));
  } catch (error) {
    yield put(albumLoadError(normalizeError(error)));
  }
}

export function* getAlbumFileLocally({ album, gallery, host }) {
  try {
    const xmlFile = yield call(request, `http://localhost:8000/view/album/${gallery}/${album}`);
    const memories = getItemNodes(xmlFile).map(parseItemNode);
    yield put(albumLoadSuccess({ host, memories }));
  } catch (error) {
    yield put(albumLoadError(normalizeError(error)));
  }
}


export function* getAlbumFile({ album, gallery, host }) {
  if (host === 'dropbox') {
    yield call(getAlbumFileOnDropbox, { album, gallery, host });
  } else if (host === 'local') {
    yield call(getAlbumFileLocally, { album, gallery, host });
  }
}


// saga WORKER for LOAD_NEXT_THUMB_PAGE
export function* getThumbPathsOnDropbox({
  album,
  gallery,
  memories,
  page: prevPage,
}) {
  try {
    if (!memories || memories.length === 0) {
      throw new Error(`Empty or malformed album; memories=(${JSON.stringify(memories)})`);
    }

    const page = prevPage + 1;
    const pagedMemories = getPage({ page, pageSize: PAGE_SIZE, list: memories });

    const hasMore = (PAGE_SIZE * page) < memories.length;

    const dropboxResults = yield all(thumbFilenameCallsDropbox({ gallery, thumbs: pagedMemories }));
    const linkedMemories = pagedMemories.map((memory, index) => ({ ...memory, thumbLink: dropboxResults[index].link }));

    if (!hasMore) { // all pages processed so thumbs all have Dropbox links
      yield put(thumbsLoaded({
        gallery, album, newMemories: linkedMemories, page,
      }));
      return;
    }

    yield put(nextPageSuccess({
      gallery, album, newMemories: linkedMemories, page,
    }));
  } catch (error) {
    yield put(nextPageError(normalizeError(error)));
  }
}

export function* getThumbPathsLocally({
  gallery,
  memories: missingPathMemories,
}) {
  try {
    if (!missingPathMemories || missingPathMemories.length === 0) {
      throw new Error(`Empty or malformed album; missingPathMemories=(${JSON.stringify(missingPathMemories)})`);
    }

    const memories = missingPathMemories.map(memory => ({
      ...memory,
      thumbLink: `http://localhost:8000/static/gallery-${gallery}/media/thumbs/${getYear(memory.filename)}/${videoExtToJpg(memory.filename)}`,
    }));

    yield put(albumLoadSuccess({ memories, host: 'local' }));
  } catch (error) {
    yield put(albumLoadError(normalizeError(error)));
  }
}


export function* getThumbPaths() {
  const args = yield select(selectNextPage);

  if (args.host === 'dropbox') {
    yield call(getThumbPathsOnDropbox, args);
  } else if (args.host === 'local') {
    yield call(getThumbPathsLocally, args);
  }
}

// ROOT saga manages WATCHER lifecycle
export default function* AlbumViewPageSagaWatcher() {
  yield takeLatest(LOAD_ALBUM, getAlbumFile);
  yield takeLatest(LOAD_NEXT_THUMB_PAGE, getThumbPaths);
}

import findIndex from 'lodash.findindex'
import prepareSearchQueryParams from '~/utils/prepare-search-query-params'
import decodeMediaData from '~/utils/decode-media-data'
import {
  FETCH_AUDIO,
  FETCH_IMAGE,
  FETCH_MEDIA,
  HANDLE_MEDIA_ERROR,
  HANDLE_NO_MEDIA,
  SET_FILTERS_FROM_URL,
  SET_SEARCH_STATE_FROM_URL,
  UPDATE_QUERY,
  UPDATE_SEARCH_TYPE,
} from '~/constants/action-types'
import {
  FETCH_END_MEDIA,
  FETCH_MEDIA_ERROR,
  FETCH_START_MEDIA,
  MEDIA_NOT_FOUND,
  REPLACE_QUERY,
  RESET_MEDIA,
  SET_AUDIO,
  SET_IMAGE,
  SET_MEDIA,
  SET_Q,
  SET_QUERY,
  SET_SEARCH_TYPE,
  UPDATE_FILTERS,
} from '~/constants/mutation-types'
import {
  SEND_RESULT_CLICKED_EVENT,
  SEND_SEARCH_QUERY_EVENT,
} from '~/constants/usage-data-analytics-types'
import {
  filtersToQueryData,
  queryStringToSearchType,
} from '~/utils/search-query-transform'
import { ALL_MEDIA, AUDIO, IMAGE } from '~/constants/media'
import { FILTER, USAGE_DATA } from '~/constants/store-modules'
import AudioService from '~/data/audio-service'
import ImageService from '~/data/image-service'

/**
 * Current search results data
 * @return {{
 * image: {}, audio: {}, searchType: string,
 * query: {}, errorMessage: (null|string),
 * pageCount: {image: number, audio: number},
 * resultCount: {image: number, audio: number},
 * isFetching: {image: boolean, audio: boolean},
 * isFetchingError: {image: boolean, audio: boolean},
 * currentPage: {image: number, audio: number},
 * searchResults: {
 * image: import('../store/types').ImageDetail[],
 * audio: import('../store/types').AudioDetail[]
 * }}}
 */
export const state = () => ({
  resultCount: {
    audio: 0,
    image: 0,
  },
  pageCount: {
    image: 0,
    audio: 0,
  },
  currentPage: {
    audio: 1,
    image: 1,
  },
  isFetching: {
    audio: false,
    image: false,
  },
  isFetchingError: {
    audio: true,
    image: true,
  },
  errorMessage: null,
  searchType: ALL_MEDIA,
  query: {},
  searchResults: {
    audio: [],
    image: [],
  },
  audio: {},
  image: {},
})

export const createActions = (services) => ({
  async [FETCH_MEDIA](
    { commit, dispatch, rootState, state },
    { page = undefined, shouldPersistMedia = false } = {}
  ) {
    // does not send event if user is paginating for more results
    // Default media type for 'All' search is 'image'
    let mediaType = state.searchType
    if (mediaType === ALL_MEDIA) {
      mediaType = IMAGE
    }

    const sessionId = rootState.user.usageSessionId
    if (!page) {
      dispatch(
        `${USAGE_DATA}/${SEND_SEARCH_QUERY_EVENT}`,
        { query: state.query.q, sessionId },
        { root: true }
      )
      commit(RESET_MEDIA, { mediaType })
    }

    commit(FETCH_START_MEDIA, { mediaType })
    const searchQuery = { ...state.query }
    if (page) {
      searchQuery.page = page
    }
    const queryParams = prepareSearchQueryParams(searchQuery)
    if (!Object.keys(services).includes(mediaType)) {
      throw new Error(`Cannot fetch unknown media type "${mediaType}"`)
    }
    await services[mediaType]
      .search(queryParams)
      .then(({ data }) => {
        commit(FETCH_END_MEDIA, { mediaType })
        const mediaCount = data.result_count
        commit(SET_MEDIA, {
          mediaType,
          mediaCount,
          shouldPersistMedia,
          media: data.results,
          pageCount: data.page_count,
          page: page,
        })
        dispatch(HANDLE_NO_MEDIA, { mediaType, mediaCount })
      })
      .catch((error) => {
        dispatch(HANDLE_MEDIA_ERROR, { mediaType, error })
      })
  },
  async [FETCH_AUDIO]({ commit, dispatch, state, rootState }, params) {
    dispatch(
      `${USAGE_DATA}/${SEND_RESULT_CLICKED_EVENT}`,
      {
        query: state.query.q,
        resultUuid: params.id,
        resultRank: findIndex(
          state.searchResults.audio,
          (item) => item.id === params.id
        ),
        sessionId: rootState.user.usageSessionId,
      },
      { root: true }
    )
    commit(SET_AUDIO, { audio: {} })
    await services[AUDIO].getMediaDetail(params)
      .then(({ data }) => {
        commit(SET_AUDIO, { audio: data })
      })
      .catch((error) => {
        if (error.response && error.response.status === 404) {
          commit(MEDIA_NOT_FOUND, { mediaType: AUDIO })
        } else {
          dispatch(HANDLE_MEDIA_ERROR, { mediaType: AUDIO, error })
        }
      })
  },
  async [FETCH_IMAGE]({ commit, dispatch, state, rootState }, params) {
    dispatch(
      `${USAGE_DATA}/${SEND_RESULT_CLICKED_EVENT}`,
      {
        query: state.query.q,
        resultUuid: params.id,
        resultRank: findIndex(
          state.searchResults.image,
          (img) => img.id === params.id
        ),
        sessionId: rootState.user.usageSessionId,
      },
      { root: true }
    )

    commit(SET_IMAGE, { image: {} })
    await services[IMAGE].getMediaDetail(params)
      .then(({ data }) => {
        commit(SET_IMAGE, { image: data })
      })
      .catch((error) => {
        if (error.response && error.response.status === 404) {
          commit(MEDIA_NOT_FOUND, { mediaType: IMAGE })
        } else {
          throw new Error(`Error fetching the image: ${error.message}`)
        }
      })
  },
  async [HANDLE_MEDIA_ERROR]({ commit }, { mediaType, error }) {
    let errorMessage
    if (error.response) {
      errorMessage =
        error.response.status === 500
          ? 'There was a problem with our servers'
          : error.response.message
      commit(FETCH_MEDIA_ERROR, { mediaType, errorMessage })
    } else {
      commit(FETCH_MEDIA_ERROR, { mediaType, errorMessage: error.message })
      throw new Error(error)
    }
  },
  [HANDLE_NO_MEDIA]({ commit }, { mediaCount, mediaType }) {
    if (!mediaCount) {
      commit(FETCH_MEDIA_ERROR, {
        errorMessage: `No ${mediaType} found for this query`,
      })
    }
  },

  /**
   * On the first server load, parses the URL to set:
   * - `searchType`,
   * - filters store `filters`,
   * - `query`.
   * Query update is done after filters are set, because SET_FILTERS_FROM_URL
   * correctly chooses which filters can be set for current media type.
   * Eg., it will not set an extension=png filter for audio.
   * @param commit
   * @param dispatch
   * @param {string} url
   */
  [SET_SEARCH_STATE_FROM_URL]({ commit, dispatch }, { url }) {
    const searchType = queryStringToSearchType(url)
    commit(SET_SEARCH_TYPE, { searchType })

    commit(`${FILTER}/${SET_FILTERS_FROM_URL}`, { url }, { root: true })

    dispatch(UPDATE_QUERY)
  },
  [UPDATE_SEARCH_TYPE]({ commit }, { searchType }) {
    commit(SET_SEARCH_TYPE, { searchType })
    commit(`${FILTER}/${UPDATE_FILTERS}`, { searchType }, { root: true })
  },
  [UPDATE_QUERY]({ commit, state, rootState }) {
    const query = filtersToQueryData(rootState.filter.filters, state.searchType)
    commit(REPLACE_QUERY, {
      query: {
        q: state.query.q,
        ...query,
      },
    })
  },
})

const supportedSearchType = (st) => {
  if (st === ALL_MEDIA) {
    return IMAGE
  }
  return [AUDIO, IMAGE].includes(st) ? st : null
}

export const getters = {
  isSearchFinished(state, getters) {
    return (
      state.currentPage[getters.supportedType] >=
      state.pageCount[getters.supportedType]
    )
  },
  supportedType(state) {
    return supportedSearchType(state.searchType)
  },
  mediaResults(state) {
    const type = supportedSearchType(state.searchType)
    return type ? state.searchResults[type] : []
  },
  mediaResultsCount(state) {
    const type = supportedSearchType(state.searchType)
    return type ? state.resultCount[type] : 0
  },
  /**
   * Returns data about the search fetching state, similar to Nuxt's
   * $fetchState, with additional parameter of `isFinished`
   * @param state
   * @param getters
   * @return {import('./types').MediaFetchState}
   */
  mediaFetchState(state, getters) {
    const mediaType = getters.supportedType
    return {
      isFetching: state.isFetching[mediaType],
      fetchingError: state.isFetchingError[mediaType]
        ? state.errorMessage
        : null,
      isFinished: state.currentPage[mediaType] >= state.pageCount[mediaType],
    }
  },
  currentMediaPage(state, getters) {
    return state.currentPage[getters.supportedType]
  },
}

export const mutations = {
  [FETCH_START_MEDIA](_state, { mediaType }) {
    _state.isFetching[mediaType] = true
    _state.isFetchingError[mediaType] = false
  },
  [FETCH_END_MEDIA](_state, { mediaType }) {
    _state.isFetching[mediaType] = false
  },
  [FETCH_MEDIA_ERROR](_state, params) {
    const { mediaType, errorMessage } = params
    _state.isFetching[mediaType] = false
    _state.isFetchingError[mediaType] = true
    _state.errorMessage = errorMessage
  },
  [SET_AUDIO](_state, params) {
    _state.audio = decodeMediaData(params.audio, AUDIO)
  },
  [SET_IMAGE](_state, params) {
    _state.image = decodeMediaData(params.image)
  },
  [SET_MEDIA](_state, params) {
    const {
      mediaType,
      media,
      mediaCount,
      page,
      pageCount,
      shouldPersistMedia,
    } = params
    let mediaToSet = media.map((item) => decodeMediaData(item))
    if (shouldPersistMedia) {
      mediaToSet = _state.searchResults[mediaType].concat(mediaToSet)
    }
    _state.searchResults[mediaType] = mediaToSet
    _state.resultCount[mediaType] = mediaCount || 0
    _state.currentPage[mediaType] = page || 1
    _state.pageCount[mediaType] = pageCount
  },
  /**
   * Merges the query object from parameters with the existing
   * query object. Used on 'Search' button click.
   * @param _state
   * @param {object} query
   */
  [SET_QUERY](_state, { query }) {
    _state.query = Object.assign({}, _state.query, query)
    _state.searchResults.image = []
    _state.searchResults.audio = []
  },
  /**
   * When a new search term is searched for, sets the `q`
   * parameter for the API request query and resets the media.
   * Leaves other query parameters for filters as before.
   * @param _state
   * @param {string} q
   */
  [SET_Q](_state, { q }) {
    _state.query.q = q
    _state.searchResults.image = []
    _state.searchResults.audio = []
  },
  /**
   * Replaces the query object completely and resets all the
   * media. Called when filters are updated.
   * @param _state
   * @param {object} query
   */
  [REPLACE_QUERY](_state, { query }) {
    _state.query = query
    _state.searchResults.image = []
    _state.searchResults.audio = []
  },
  [MEDIA_NOT_FOUND](_state, params) {
    throw new Error(`Media of type ${params.mediaType} not found`)
  },
  [SET_SEARCH_TYPE](_state, params) {
    _state.searchType = params.searchType
  },
  [RESET_MEDIA](_state, params) {
    const { mediaType } = params
    _state.searchResults[mediaType] = []
    _state.resultCount[mediaType] = 0
    _state.currentPage[mediaType] = undefined
    _state.pageCount[mediaType] = 0
  },
}

const mediaServices = { [AUDIO]: AudioService, [IMAGE]: ImageService }
const actions = createActions(mediaServices)

export default {
  state,
  getters,
  actions,
  mutations,
}

<template>
  <div class="browse-page">
    <div class="search columns is-gapless m-0">
      <div class="desk:hidden">
        <AppModal v-if="isFilterVisible" @close="onToggleSearchGridFilter">
          <SearchGridFilter />
        </AppModal>
      </div>
      <aside
        v-if="isFilterVisible"
        class="column is-narrow grid-sidebar is-hidden-touch"
      >
        <SearchGridFilter />
      </aside>
      <div class="column search-grid-ctr">
        <SearchGridForm @onSearchFormSubmit="onSearchFormSubmit" />
        <SearchTypeTabs />
        <FilterDisplay v-if="shouldShowFilterTags" />
        <SearchGrid
          :id="`tab-${searchType}`"
          role="tabpanel"
          :aria-labelledby="searchType"
          data-testid="search-grid"
        >
          <template #media>
            <NuxtChild
              :key="$route.path"
              :media="mediaResults"
              :media-fetch-state="mediaFetchState"
              :current-media-page="currentMediaPage"
              :is-filter-visible="isFilterVisible"
              @load-more="fetchMedia"
            />
          </template>
        </SearchGrid>
        <ScrollButton
          data-testid="scroll-button"
          :show-btn="showScrollButton"
        />
      </div>
    </div>
  </div>
</template>
<script>
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex'
import { ALL_MEDIA, IMAGE } from '~/constants/media'
import { FILTER, SEARCH } from '~/constants/store-modules'
import {
  FETCH_MEDIA,
  SET_SEARCH_STATE_FROM_URL,
  UPDATE_SEARCH_TYPE,
} from '~/constants/action-types'
import { SET_QUERY, SET_FILTER_IS_VISIBLE } from '~/constants/mutation-types'
import { queryStringToSearchType } from '~/utils/search-query-transform'
import { screenWidth } from '~/utils/get-browser-info'
import local from '~/utils/local'
import debounce from 'lodash.debounce'

const BrowsePage = {
  name: 'browse-page',
  layout({ store }) {
    return store.state.nav.isEmbedded ? 'embedded' : 'default'
  },
  scrollToTop: false,
  async fetch() {
    // For the first server load of the page, set the Vuex store values for
    // search type, query and filters from the path.
    // If the current searchType media results are empty,
    // fetch the media from API using query data from Vuex store.
    if (process.server) {
      const url = this.$route.fullPath
      await this.setSearchStateFromUrl({ url })
    }
    if (!this.mediaResults.length) {
      await this.fetchMedia()
    }
  },
  data: () => ({
    showScrollButton: false,
  }),
  created() {
    this.debounceScrollHandling = debounce(this.checkScrollLength, 100)
  },
  mounted() {
    const localFilterState = () =>
      local.get(process.env.filterStorageKey)
        ? local.get(process.env.filterStorageKey) === 'true'
        : true

    const MIN_SCREEN_WIDTH_FILTER_VISIBLE_BY_DEFAULT = 800
    const isDesktop = () =>
      screenWidth() > MIN_SCREEN_WIDTH_FILTER_VISIBLE_BY_DEFAULT
    this.setFilterVisibility({
      isFilterVisible: isDesktop() ? localFilterState() : false,
    })
    window.addEventListener('scroll', this.debounceScrollHandling)
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.debounceScrollHandling)
  },
  computed: {
    ...mapState(SEARCH, ['query', 'searchType']),
    ...mapState(FILTER, ['isFilterVisible']),
    ...mapGetters(SEARCH, [
      'currentMediaPage',
      'mediaFetchState',
      'mediaResults',
      'supportedType',
    ]),
    mediaType() {
      // Default to IMAGE until media search/index is generalized
      return this.searchType !== ALL_MEDIA ? this.searchType : IMAGE
    },
  },
  methods: {
    ...mapActions(SEARCH, {
      fetchMedia: FETCH_MEDIA,
      setSearchStateFromUrl: SET_SEARCH_STATE_FROM_URL,
      updateSearchType: UPDATE_SEARCH_TYPE,
    }),
    ...mapMutations(FILTER, { setFilterVisibility: SET_FILTER_IS_VISIBLE }),
    ...mapMutations(SEARCH, { setQuery: SET_QUERY }),
    onSearchFormSubmit(searchParams) {
      this.setQuery(searchParams)
    },
    onToggleSearchGridFilter() {
      this.setFilterVisibility({
        isFilterVisible: !this.isFilterVisible,
      })
    },
    shouldShowFilterTags() {
      return (
        this.$route.path === '/search/' || this.$route.path === '/search/image'
      )
    },
    checkScrollLength() {
      this.showScrollButton = window.scrollY > 70
    },
  },
  watch: {
    async query(newQuery) {
      if (newQuery) {
        const newPath = this.localePath({
          path: this.$route.path,
          query: newQuery,
        })
        this.$router.push(newPath)
        await this.fetchMedia()
      }
    },
    async $route(route) {
      this.updateSearchType({ searchType: queryStringToSearchType(route.path) })
      // Only fetch if supported media type is chosen, and the results array
      // for current media type empty in the Vuex search store.
      if (!!this.supportedType && !this.mediaResults.length) {
        this.fetchMedia()
      }
    },
  },
}

export default BrowsePage
</script>

<style lang="scss" scoped>
.search-grid-ctr {
  padding: 0;
  background-color: $color-wp-gray-0;
  min-height: 600px;

  @include mobile {
    width: 100%;
    flex: none;
  }
}
</style>

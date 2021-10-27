<template>
  <section class="search-grid">
    <div v-show="!isFetching" class="results-meta">
      <span class="caption font-semibold">
        {{ _imagesCount }}
      </span>
      <SearchRating
        v-if="query.q"
        :search-term="query.q"
        class="desk:mr-auto desk:pl-6"
      />
      <SaferBrowsing />
    </div>
    <ImageGrid
      :images="images"
      :is-fetching="isFetching"
      :fetching-error="isFetchingError"
      :error-message="errorMessage"
      :is-finished="isFinished"
      @onLoadMoreImages="onLoadMoreImages"
    />
    <MetaSearchForm
      type="image"
      :noresult="imagesCount === 0"
      :query="query"
      :supported="true"
    />
  </section>
</template>

<script>
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex'
import { SEARCH } from '~/constants/store-modules'
import { IMAGE } from '~/constants/media'
import { FETCH_MEDIA } from '~/constants/action-types'
import { SET_MEDIA } from '~/constants/mutation-types'
import ImageGrid from '~/components/ImageGrid/ImageGrid'
import SearchRating from '~/components/SearchRating'

export default {
  name: 'SearchGrid',
  components: { ImageGrid, SearchRating },
  async fetch() {
    if (!this.images.length) {
      await this.fetchMedia({
        ...this.query,
        mediaType: IMAGE,
      })
    }
  },
  computed: {
    ...mapState(SEARCH, [
      'images',
      'imagePage',
      'errorMessage',
      'query',
      'imagesCount',
      'pageCount',
    ]),
    ...mapGetters(SEARCH, ['isFetching', 'isFetchingError']),
    _imagesCount() {
      const count = this.imagesCount
      if (count === 0) {
        return this.$t('browse-page.image-no-results')
      }
      const localeCount = count.toLocaleString(this.$i18n?.locale)
      let i18nKey = 'browse-page.image-result-count'
      if (count > 1000) {
        i18nKey = `${i18nKey}-more`
      }
      return this.$tc(i18nKey, count, { localeCount })
    },
    isFinished() {
      return this.imagePage >= this.pageCount.images
    },
  },
  methods: {
    ...mapMutations(SEARCH, { setMedia: SET_MEDIA }),
    ...mapActions(SEARCH, { fetchMedia: FETCH_MEDIA }),
    onLoadMoreImages() {
      const searchParams = {
        page: this.imagePage + 1,
        shouldPersistMedia: true,
        ...this.query,
      }
      this.$emit('onLoadMoreImages', searchParams)
    },
  },
}
</script>

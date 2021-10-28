<template>
  <section class="search-grid">
    <div
      v-show="!mediaFetchState.isFetching"
      class="results-meta flex flex-col desk:flex-row justify-between px-6"
    >
      <div class="font-semibold caption flex desk:me-auto justify-between">
        <span class="pe-6">
          {{ mediaCount }}
        </span>
        <SearchRating v-if="query.q" :search-term="query.q" />
      </div>
      <SaferBrowsing />
    </div>
    <slot name="media" />
    <MetaSearchForm
      :type="searchType"
      :noresult="noresult"
      :query="query"
      :supported="supported"
    />
  </section>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { SEARCH } from '~/constants/store-modules'
import { ALL_MEDIA, AUDIO, IMAGE } from '~/constants/media'
import SearchRating from '~/components/SearchRating'

export default {
  name: 'SearchGrid',
  components: { SearchRating },
  computed: {
    ...mapState(SEARCH, ['query', 'searchType']),
    ...mapGetters(SEARCH, ['mediaFetchState', 'mediaResultsCount']),
    mediaCount() {
      const count = this.mediaResultsCount
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
    noresult() {
      // noresult for audio and video are hardcoded since Openverse
      // does not yet support built-in audio search
      return [IMAGE, ALL_MEDIA].includes(this.searchType)
        ? this.mediaCount === 0
        : false
    },
    supported() {
      if (this.searchType === AUDIO) {
        // Only show audio results if non-image results are supported
        return process.env.enableAudio
      } else {
        return [IMAGE, ALL_MEDIA].includes(this.searchType)
      }
    },
  },
}
</script>

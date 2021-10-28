<template>
  <ImageGrid
    :images="mediaResults"
    :can-load-more="true"
    :is-fetching="isFetching"
    :fetching-error="isFetchingError"
    :error-message="errorMessage"
    :is-finished="isSearchFinished"
    @load-more="onLoadMore"
  />
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { SEARCH } from '~/constants/store-modules'

export default {
  name: 'ImageSearch',
  props: {
    media: {},
    query: {},
  },
  computed: {
    ...mapState(SEARCH, ['errorMessage', 'currentPage']),
    ...mapGetters(SEARCH, [
      'isFetching',
      'isFetchingError',
      'mediaResults',
      'pageCount',
      'isSearchFinished',
      'supportedType',
    ]),
  },
  methods: {
    onLoadMore() {
      const searchParams = {
        page: this.currentPage[this.supportedType] + 1,
        shouldPersistMedia: true,
      }
      this.$emit('load-more', searchParams)
    },
  },
}
</script>

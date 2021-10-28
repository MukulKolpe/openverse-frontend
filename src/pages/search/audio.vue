<template>
  <section>
    <div class="px-6 pt-6">
      <AudioTrack
        v-for="audio in media"
        :key="audio.id"
        :audio="audio"
        :size="audioTrackSize"
        layout="row"
      />
    </div>

    <template v-if="isError" class="m-auto w-1/2 text-center pt-6">
      <h5>{{ errorHeader }}</h5>
      <p>{{ mediaFetchState.fetchingError }}</p>
    </template>
    <LoadMoreButton
      :is-error="isError"
      :is-fetching="mediaFetchState.isFetching"
      :is-finished="mediaFetchState.isFinished"
      data-testid="load-more"
      @onLoadMore="onLoadMore"
    />
  </section>
</template>

<script>
export default {
  name: 'AudioSearch',
  props: {
    media: {},
    currentMediaPage: {},
    //  isFetching, fetchingError, isFinished?
    mediaFetchState: {},
    isFilterVisible: {},
  },
  computed: {
    audioTrackSize() {
      return this.isFilterVisible ? 'm' : 's'
    },
    isError() {
      return !!this.mediaFetchState.fetchingError
    },
    typeString() {
      return this.$t('browse-page.search-form.audio')
    },
    buttonLabel() {
      if (!this.mediaFetchState.isFinished) {
        return this.$t('browse-page.load')
      }
      return this.$t('browse-page.no-more', { type: this.typeString })
    },
    errorHeader() {
      return this.$t('browse-page.fetching-error', {
        type: this.typeString,
      })
    },
  },
  methods: {
    onLoadMore() {
      if (!this.supported) return
      const searchParams = {
        page: this.currentMediaPage + 1,
        shouldPersistMedia: true,
      }
      this.$emit('load-more', searchParams)
    },
  },
}
</script>

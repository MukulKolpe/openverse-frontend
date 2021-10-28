<template>
  <ImageGrid
    :images="media"
    :can-load-more="true"
    :fetch-state="mediaFetchState"
    @load-more="onLoadMore"
  />
</template>

<script>
export default {
  name: 'ImageSearch',
  props: {
    media: {},
    currentMediaPage: {},
    mediaFetchState: {},
  },
  methods: {
    onLoadMore() {
      const searchParams = {
        page: this.currentMediaPage + 1,
        shouldPersistMedia: true,
      }
      this.$emit('load-more', searchParams)
    },
  },
}
</script>

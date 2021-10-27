import SearchGrid from '~/components/SearchGrid'
import { fireEvent, render, screen } from '@testing-library/vue'
import Vuex from 'vuex'
import VueI18n from 'vue-i18n'
import { createLocalVue } from '@vue/test-utils'
import SaferBrowsing from '~/components/SaferBrowsing'

const messages = require('~/locales/en.json')

describe('SearchGrid', () => {
  let options = {}
  const localVue = createLocalVue()
  localVue.use(Vuex)
  localVue.use(VueI18n)
  let storeMock

  const i18n = new VueI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en: messages },
  })
  localVue.prototype.$nuxt = {
    nbFetching: 0,
  }
  localVue.component('SaferBrowsing', SaferBrowsing)

  beforeEach(() => {
    storeMock = new Vuex.Store({
      modules: {
        filter: {
          namespaced: true,
          state: {
            filters: {
              licenseTypes: [
                { code: 'commercial', name: 'Commercial usage' },
                { code: 'modification', name: 'Allows modification' },
              ],
            },
          },
        },
        search: {
          namespaced: true,
          state: {
            query: { q: 'foo' },
            imagesCount: 4,
            imagePage: 1,
            images: [
              { id: 'image1', url: 'https://wp.org/image1.jpg' },
              { id: 'image2', url: 'https://wp.org/image2.svg' },
            ],
            pageCount: { images: 2 },
            isFetchingError: { images: false },
          },
          getters: { isFetching: () => false, isFetchingError: () => false },
        },
      },
    })
    options = {
      stubs: {
        // SearchRating: true,
        LoadingIcon: true,
        MetaSearchForm: true,
        NuxtLink: true,
        // SaferBrowsing: true,
        LicenseIcons: true,
      },
      store: storeMock,
      localVue,
      i18n,
    }
  })

  it('should render correct contents', async () => {
    render(SearchGrid, options)

    // Meta information
    // Result count
    screen.getByText(/4 image results/)
    // Search rating
    screen.getByText(/search-rating.content/)
    screen.getAllByRole('button', { text: /yes/i })
    screen.getAllByRole('button', { text: /no/i })
    // Safer browsing
    screen.getAllByRole('button', { text: /safer-browsing/i })

    // Images
    const images = screen.getAllByRole('img')
    expect(images.length).toEqual(2)
  })

  it('clicking on load more button loads more images', async () => {
    render(SearchGrid, options)

    // Load more button
    const loadMoreButton = screen.getByText(/browse-page.load/i)
    await fireEvent.click(loadMoreButton)

    // Cannot test emitted event with testing library
  })
})

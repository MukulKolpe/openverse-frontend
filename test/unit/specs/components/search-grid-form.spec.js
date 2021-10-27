import Vuex from 'vuex'
import { createLocalVue } from '@vue/test-utils'
import SearchGridForm from '~/components/SearchGridForm'
import render from '../../test-utils/render'

describe('SearchGridForm', () => {
  it('should render correct contents', () => {
    const localVue = createLocalVue()
    const storeMock = new Vuex.Store({
      modules: {
        filter: {
          namespaced: true,
          state: { isFilterVisible: true },
        },
        search: {
          namespaced: true,
          state: { query: { q: 'foo' } },
        },
      },
    })
    localVue.use(Vuex)

    const wrapper = render(SearchGridForm, {
      store: storeMock,
      localVue,
      mocks: {
        $route: { path: '/search' },
      },
    })

    expect(wrapper.find('form').vm).toBeDefined()
  })
})

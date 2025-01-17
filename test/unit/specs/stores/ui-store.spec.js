import { setActivePinia, createPinia } from '~~/test/unit/test-utils/pinia'

import { useUiStore } from '~/stores/ui'

const initialState = {
  instructionsSnackbarState: 'not_shown',
  innerFilterVisible: false,
  isFilterDismissed: false,
  isDesktopLayout: false,
  isMobileUa: true,
}

const VISIBLE_AND_DISMISSED = {
  innerFilterVisible: true,
  isFilterDismissed: true,
}
const NOT_VISIBLE_AND_DISMISSED = {
  innerFilterVisible: false,
  isFilterDismissed: true,
}
const VISIBLE_AND_NOT_DISMISSED = {
  innerFilterVisible: true,
  isFilterDismissed: false,
}
const NOT_VISIBLE_AND_NOT_DISMISSED = {
  innerFilterVisible: false,
  isFilterDismissed: false,
}

describe('Ui Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  describe('state', () => {
    it('sets the initial state correctly', () => {
      const uiStore = useUiStore()
      for (const key of Object.keys(initialState)) {
        expect(uiStore[key]).toEqual(initialState[key])
      }
    })
  })

  describe('getters', () => {
    test.each`
      status         | isVisible
      ${'not_shown'} | ${false}
      ${'visible'}   | ${true}
      ${'dismissed'} | ${false}
    `(
      'areInstructionsVisible return $isVisible when status is $status',
      ({ status, isVisible }) => {
        const uiStore = useUiStore()
        uiStore.$patch({ instructionsSnackbarState: status })

        expect(uiStore.areInstructionsVisible).toEqual(isVisible)
      }
    )

    test.each`
      isDesktopLayout | innerFilterVisible | isFilterDismissed | isVisible
      ${true}         | ${true}            | ${true}           | ${true}
      ${true}         | ${true}            | ${false}          | ${true}
      ${true}         | ${false}           | ${true}           | ${false}
      ${true}         | ${false}           | ${false}          | ${true}
      ${false}        | ${true}            | ${true}           | ${true}
      ${false}        | ${true}            | ${false}          | ${true}
      ${false}        | ${false}           | ${true}           | ${false}
      ${false}        | ${false}           | ${false}          | ${false}
    `(
      'isFilterVisible return $isVisible when isDesktopLayout is $isDesktopLayout, innerFilterVisible is $innerFilterVisible, and isFilterDismissed is $isFilterDismissed',
      ({
        innerFilterVisible,
        isFilterDismissed,
        isDesktopLayout,
        isVisible,
      }) => {
        const uiStore = useUiStore()
        uiStore.$patch({
          isDesktopLayout,
          innerFilterVisible,
          isFilterDismissed,
        })

        expect(uiStore.isFilterVisible).toEqual(isVisible)
      }
    )
  })

  describe('actions', () => {
    it('initFromCookies sets initial state without cookie', () => {
      const uiStore = useUiStore()
      uiStore.initFromCookies({})
      for (const key of Object.keys(initialState)) {
        // isMobileUa is set to true only if we explicitly get a mobile UA
        // from cookie or the browser request
        if (key === 'isMobileUa') {
          expect(uiStore[key]).toEqual(false)
        } else {
          expect(uiStore[key]).toEqual(initialState[key])
        }
      }
    })

    it('initFromCookies sets initial state with a desktop cookie', () => {
      const uiStore = useUiStore()
      uiStore.initFromCookies({
        uiIsDesktopLayout: true,
        uiIsFilterDismissed: true,
      })

      expect(uiStore.instructionsSnackbarState).toEqual('not_shown')
      expect(uiStore.isDesktopLayout).toEqual(true)
      expect(uiStore.isMobileUa).toEqual(false)
      expect(uiStore.isFilterVisible).toEqual(false)
      expect(uiStore.isFilterDismissed).toEqual(true)
    })

    it('initFromCookies sets initial state with a mobile cookie', () => {
      const uiStore = useUiStore()
      uiStore.initFromCookies({
        uiIsMobileUa: true,
        uiIsFilterDismissed: false,
      })

      expect(uiStore.instructionsSnackbarState).toEqual('not_shown')
      expect(uiStore.isDesktopLayout).toEqual(false)
      expect(uiStore.isMobileUa).toEqual(true)
      expect(uiStore.isFilterDismissed).toEqual(false)
      expect(uiStore.isFilterVisible).toEqual(false)
    })
  })

  test.each`
    before         | after
    ${'not_shown'} | ${'visible'}
    ${'visible'}   | ${'visible'}
    ${'dismissed'} | ${'dismissed'}
  `(
    'showInstructionsSnackbar changes instructionsSnackbarState from $before to $after',
    ({ before, after }) => {
      const uiStore = useUiStore()
      uiStore.$patch({ instructionsSnackbarState: before })
      uiStore.showInstructionsSnackbar()

      expect(uiStore.instructionsSnackbarState).toEqual(after)
    }
  )

  test.each`
    before         | after
    ${'not_shown'} | ${'dismissed'}
    ${'visible'}   | ${'dismissed'}
    ${'dismissed'} | ${'dismissed'}
  `(
    'hideInstructionsSnackbar changes instructionsSnackbarState from $before to $after',
    ({ before, after }) => {
      const uiStore = useUiStore()
      uiStore.$patch({ instructionsSnackbarState: before })
      uiStore.hideInstructionsSnackbar()

      expect(uiStore.instructionsSnackbarState).toEqual(after)
    }
  )

  test.each`
    initialState     | isDesktopLayout | expected
    ${[true, false]} | ${false}        | ${{ isDesktopLayout: false, isMobileUa: false }}
    ${[false, true]} | ${true}         | ${{ isDesktopLayout: true, isMobileUa: true }}
  `(
    'updateBreakpoint gets isDesktopLayout $isDesktopLayout and returns $expected',
    ({ initialState, isDesktopLayout, expected }) => {
      const uiStore = useUiStore()
      uiStore.$patch({
        isDesktopLayout: initialState[0],
        isMobileUa: initialState[1],
      })
      uiStore.updateBreakpoint(isDesktopLayout)
      const actualOutput = {
        isDesktopLayout: uiStore.isDesktopLayout,
        isMobileUa: uiStore.isMobileUa,
      }

      expect(actualOutput).toEqual(expected)
    }
  )

  test.each`
    isDesktopLayout | currentState                     | visible  | expectedState
    ${true}         | ${VISIBLE_AND_NOT_DISMISSED}     | ${true}  | ${VISIBLE_AND_NOT_DISMISSED}
    ${true}         | ${VISIBLE_AND_DISMISSED}         | ${false} | ${NOT_VISIBLE_AND_DISMISSED}
    ${true}         | ${NOT_VISIBLE_AND_DISMISSED}     | ${true}  | ${VISIBLE_AND_NOT_DISMISSED}
    ${true}         | ${NOT_VISIBLE_AND_DISMISSED}     | ${false} | ${NOT_VISIBLE_AND_DISMISSED}
    ${false}        | ${VISIBLE_AND_NOT_DISMISSED}     | ${true}  | ${VISIBLE_AND_NOT_DISMISSED}
    ${false}        | ${VISIBLE_AND_NOT_DISMISSED}     | ${false} | ${NOT_VISIBLE_AND_NOT_DISMISSED}
    ${false}        | ${NOT_VISIBLE_AND_NOT_DISMISSED} | ${true}  | ${VISIBLE_AND_NOT_DISMISSED}
    ${false}        | ${NOT_VISIBLE_AND_DISMISSED}     | ${true}  | ${VISIBLE_AND_DISMISSED}
    ${false}        | ${NOT_VISIBLE_AND_DISMISSED}     | ${false} | ${NOT_VISIBLE_AND_DISMISSED}
  `(
    'setFiltersState sets state to $expectedState when visible is $visible and isDesktopLayout is $isDesktopLayout',
    ({ isDesktopLayout, currentState, visible, expectedState }) => {
      const uiStore = useUiStore()
      uiStore.$patch({
        isDesktopLayout,
        ...currentState,
      })

      uiStore.setFiltersState(visible)

      expect(uiStore.isFilterVisible).toEqual(expectedState.innerFilterVisible)
      expect(uiStore.isFilterDismissed).toEqual(expectedState.isFilterDismissed)
    }
  )

  test.each`
    isDesktopLayout | currentState                     | expectedState
    ${true}         | ${VISIBLE_AND_NOT_DISMISSED}     | ${NOT_VISIBLE_AND_DISMISSED}
    ${true}         | ${VISIBLE_AND_DISMISSED}         | ${NOT_VISIBLE_AND_DISMISSED}
    ${true}         | ${NOT_VISIBLE_AND_DISMISSED}     | ${VISIBLE_AND_NOT_DISMISSED}
    ${true}         | ${NOT_VISIBLE_AND_DISMISSED}     | ${VISIBLE_AND_NOT_DISMISSED}
    ${false}        | ${VISIBLE_AND_NOT_DISMISSED}     | ${NOT_VISIBLE_AND_NOT_DISMISSED}
    ${false}        | ${NOT_VISIBLE_AND_NOT_DISMISSED} | ${VISIBLE_AND_NOT_DISMISSED}
    ${false}        | ${NOT_VISIBLE_AND_DISMISSED}     | ${VISIBLE_AND_DISMISSED}
    ${false}        | ${VISIBLE_AND_NOT_DISMISSED}     | ${NOT_VISIBLE_AND_NOT_DISMISSED}
    ${false}        | ${NOT_VISIBLE_AND_DISMISSED}     | ${VISIBLE_AND_DISMISSED}
  `(
    'toggleFilters sets state to $expectedState when isDesktopLayout is $isDesktopLayout',
    ({ isDesktopLayout, currentState, expectedState }) => {
      const uiStore = useUiStore()
      uiStore.$patch({
        isDesktopLayout,
        ...currentState,
      })

      uiStore.toggleFilters()

      expect(uiStore.isFilterVisible).toEqual(expectedState.innerFilterVisible)
      expect(uiStore.isFilterDismissed).toEqual(expectedState.isFilterDismissed)
    }
  )
})

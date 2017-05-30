// @flow

import React from 'react'
import { UserCoursePreferences, Refreshed } from '../UserCoursePreferences'
import * as courseTemplates from '../../../../api/canvas-api/__templates__/course'
import * as navigatorTemplates from '../../../../__templates__/helm'
import explore from '../../../../../test/helpers/explore'
import setProps from '../../../../../test/helpers/setProps'
import { Alert } from 'react-native'
import { ERROR_TITLE } from '../../../../redux/middleware/error-handler'

import renderer from 'react-test-renderer'

jest
  .mock('TouchableHighlight', () => 'TouchableHighlight')
  .mock('Alert', () => ({
    alert: jest.fn(),
  }))
  .mock('../../../../routing/Screen', () => 'Screen')

let templates = { ...courseTemplates, ...navigatorTemplates }

let defaultProps: any = {
  navigator: templates.navigator(),
  course: templates.course(),
  color: '#333',
  updateCourseColor: jest.fn(),
  refreshCourses: jest.fn(),
  updateCourse: jest.fn(() => { console.log('default') }),
  refresh: jest.fn(),
  refreshing: false,
  pending: 0,
  error: '',
}

describe('UserCoursePreferences', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders', () => {
    let tree = renderer.create(
      <UserCoursePreferences {...defaultProps} />
    ).toJSON()

    expect(tree).toMatchSnapshot()
  })

  it('renders without a course image url', () => {
    let customProps = {
      ...defaultProps,
    }

    customProps.course.image_download_url = null

    let tree = renderer.create(
      <UserCoursePreferences {...customProps} />
    ).toJSON()

    expect(tree).toMatchSnapshot()
  })

  it('renders the refreshed component', () => {
    let component = renderer.create(
      <Refreshed {...defaultProps} course={null} pending={1} />
    )

    expect(component.toJSON()).toMatchSnapshot()
    component.getInstance().refresh()
    setProps(component, defaultProps)
    expect(defaultProps.refreshCourses).toHaveBeenCalled()
  })

  it('calls dismiss when done is pressed', () => {
    let tree = renderer.create(
      <UserCoursePreferences {...defaultProps} />
    )
    tree.getInstance().dismiss()
    expect(defaultProps.navigator.dismiss).toHaveBeenCalled()
  })

  it('calls props.updateCourseColor when a color is pressed', () => {
    let tree = renderer.create(
      <UserCoursePreferences {...defaultProps} />
    ).toJSON()

    let color = explore(tree).selectByID('colorButton.#F26090') || {}
    color.props.onPress()

    expect(defaultProps.updateCourseColor).toHaveBeenCalledWith(defaultProps.course.id, '#F26090')
  })

  it('presents error alert', () => {
    jest.useFakeTimers()
    let component = renderer.create(
      <UserCoursePreferences {...defaultProps} />
    )

    let errorMessage = 'error'

    setProps(component, { error: errorMessage })
    jest.runAllTimers()

    expect(Alert.alert).toHaveBeenCalledWith(ERROR_TITLE, errorMessage)
  })

  it('dismisses error alert and resets name', () => {
    jest.useFakeTimers()
    let component = renderer.create(
      <UserCoursePreferences {...defaultProps} />
    )

    let errorMessage = 'error'

    setProps(component, { course: { ...defaultProps.course, name: 'New Course Name' }, error: errorMessage })
    jest.runAllTimers()

    expect(Alert.alert).toHaveBeenCalledWith(ERROR_TITLE, errorMessage)
    expect(component.toJSON()).toMatchSnapshot()
  })

  it('dismisses modal activity upon save error', () => {
    let component = renderer.create(
      <UserCoursePreferences {...defaultProps} />
    )
    let updateCourse = jest.fn(() => {
      setProps(component, { pending: 0, error: 'error' })
    })
    component.update(<UserCoursePreferences {...defaultProps} updateCourse={updateCourse} />)
    const doneButton: any = explore(component.toJSON()).selectRightBarButton('done_button')
    doneButton.action()
    expect(component.toJSON()).toMatchSnapshot()
  })

  it('dismisses modal after course updates', () => {
    let component = renderer.create(
      <UserCoursePreferences {...defaultProps} />
    )
    let updateCourse = jest.fn(() => {
      setProps(component, { pending: 0 })
    })
    component.update(<UserCoursePreferences {...defaultProps} updateCourse={updateCourse} />)
    let nameField: any = explore(component.toJSON()).selectByID('nameInput')
    nameField.props.onChangeText('New Course Name')
    const doneButton: any = explore(component.toJSON()).selectRightBarButton('done_button')
    doneButton.action()
    expect(defaultProps.navigator.dismissAllModals).toHaveBeenCalled()
  })

  it('calls update with new course values on done', () => {
    let component = renderer.create(
      <UserCoursePreferences {...defaultProps} />
    )
    let newName = 'New Course Name'
    let nameField: any = explore(component.toJSON()).selectByID('nameInput')
    nameField.props.onChangeText(newName)
    const doneButton: any = explore(component.toJSON()).selectRightBarButton('done_button')
    doneButton.action()
    let updated = {
      ...defaultProps.course,
      name: newName,
    }
    expect(defaultProps.updateCourse).toHaveBeenCalledWith(updated, defaultProps.course)
  })

  test('refresh function first test', () => {
    const refreshCourses = jest.fn()
    let refreshProps = {
      ...defaultProps,
      refreshCourses,
    }
    let refreshed = renderer.create(
      <Refreshed {...refreshProps} />
    )
    expect(refreshed.toJSON()).toMatchSnapshot()
    refreshed.getInstance().refresh()
    expect(refreshCourses).toHaveBeenCalled()
  })

  test('refresh function second test', () => {
    const refreshCourses = jest.fn()
    let refreshProps = {
      ...defaultProps,
      refreshCourses,
    }
    let refreshed = renderer.create(
      <Refreshed {...refreshProps} />
    )
    expect(refreshed.toJSON()).toMatchSnapshot()
    refreshed.getInstance().refresh()
    setProps(refreshed, refreshProps)
    expect(refreshCourses).toHaveBeenCalled()
  })
})

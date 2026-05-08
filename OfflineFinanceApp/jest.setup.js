/* global jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    }),
  ),
}));

jest.mock('react-native-paper', () => {
  const React = require('react');

  return {
    Provider: ({children}) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');

  return {
    NavigationContainer: ({children}) =>
      React.createElement(React.Fragment, null, children),
  };
});

const mockCreateNavigator = () => {
  const React = require('react');

  return {
    Navigator: ({children}) =>
      React.createElement(React.Fragment, null, children),
    Screen: ({component: Component}) =>
      Component ? React.createElement(Component) : null,
  };
};

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => mockCreateNavigator(),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => mockCreateNavigator(),
}));

jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() =>
    Promise.resolve({
      executeSql: jest.fn(() =>
        Promise.resolve([
          {
            rows: {
              length: 0,
              item: jest.fn(),
            },
          },
        ]),
      ),
    }),
  ),
}));

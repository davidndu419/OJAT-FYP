import React from 'react';
import {View} from 'react-native';

const PassthroughView = React.forwardRef(({children, style, ...props}, ref) => (
  <View ref={ref} style={style} {...props}>
    {children}
  </View>
));

export const Screen = PassthroughView;
export const NativeScreen = PassthroughView;
export const InnerScreen = PassthroughView;
export const ScreenContainer = PassthroughView;
export const NativeScreenContainer = PassthroughView;
export const NativeScreenNavigationContainer = PassthroughView;
export const ScreenStack = PassthroughView;
export const ScreenStackHeaderConfig = PassthroughView;
export const ScreenStackHeaderSubview = PassthroughView;
export const ScreenStackHeaderLeftView = PassthroughView;
export const ScreenStackHeaderCenterView = PassthroughView;
export const ScreenStackHeaderRightView = PassthroughView;
export const ScreenStackHeaderBackButtonImage = PassthroughView;
export const ScreenStackHeaderSearchBarView = PassthroughView;
export const SearchBar = PassthroughView;
export const NativeSearchBar = PassthroughView;
export const FullWindowOverlay = PassthroughView;

export const ScreenContext = React.createContext(null);
export const GHContext = React.createContext(null);
export const NativeScreensModule = {};
export const NativeSearchBarCommands = {};

export const enableScreens = () => {};
export const enableFreeze = () => {};
export const screensEnabled = () => false;
export const freezeEnabled = () => false;
export const shouldUseActivityState = false;
export const isSearchBarAvailableForCurrentPlatform = false;
export const isNewBackTitleImplementation = false;
export const executeNativeBackPress = () => false;

export const useTransitionProgress = () => ({
  progress: 1,
  closing: 0,
  goingForward: 0,
});

export default {
  Screen,
  ScreenContainer,
  ScreenStack,
  screensEnabled,
  enableScreens,
};

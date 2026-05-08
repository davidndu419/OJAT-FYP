import React from 'react';
import {View} from 'react-native';

export default function codegenNativeComponent() {
  return React.forwardRef((props, ref) => <View ref={ref} {...props} />);
}

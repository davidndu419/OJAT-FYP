import React from 'react';
import {Text} from 'react-native';

const ICONS = {
  google: 'G',
};

function FontAwesome({name, size = 18, color = '#ffffff', style}) {
  return (
    <Text
      style={[
        {
          color,
          fontSize: size,
          fontWeight: '700',
          lineHeight: size + 2,
        },
        style,
      ]}>
      {ICONS[name] || name?.slice(0, 1)?.toUpperCase() || ''}
    </Text>
  );
}

export default FontAwesome;

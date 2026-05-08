import React from 'react';

export function Path(props) {
  return React.createElement('path', props);
}

export default function Svg({children, height, viewBox, width, ...props}) {
  return React.createElement(
    'svg',
    {
      height,
      viewBox,
      width,
      ...props,
    },
    children,
  );
}

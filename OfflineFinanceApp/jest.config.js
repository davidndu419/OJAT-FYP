module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '\\.(bmp|gif|jpg|jpeg|png|webp)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFiles: ['./jest.setup.js'],
};

import { defaults as tsjPresets } from 'ts-jest/presets'

export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.jsx?$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-react'] }],
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/data/**',
  ],
  testMatch: [
    '**/__tests__/**/*.{js,jsx}',
    '**/*.{test,spec}.{js,jsx}',
  ],
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  moduleDirectories: ['node_modules', 'src'],
}

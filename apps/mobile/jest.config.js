module.exports = {
    preset: 'react-native',
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo-secure-store|@stellar/wallet-kit)/)',
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
}

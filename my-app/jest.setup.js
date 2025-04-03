require("@testing-library/jest-dom")

// Mock the TextEncoder which is used in the middleware for JWT verification
global.TextEncoder = require("util").TextEncoder


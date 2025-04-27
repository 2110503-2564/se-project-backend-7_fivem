const mongoose = require("mongoose");
const connectDB = require("../config/db");

// Mock mongoose methods and console/process
jest.mock("mongoose", () => ({
  set: jest.fn(),
  connect: jest.fn(),
}));

jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(process, "exit").mockImplementation(() => {});

describe("connectDB", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Set test environment variable
    process.env.MONGO_URI = "mongodb://test:test@localhost:27017/testdb";
  });

  it("should set strictQuery to true and connect successfully", async () => {
    // Mock successful connection
    const mockHost = "localhost";
    mongoose.connect.mockResolvedValue({ connection: { host: mockHost } });

    // Execute the function
    await connectDB();

    // Assertions
    expect(mongoose.set).toHaveBeenCalledWith("strictQuery", true);
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
    expect(console.log).toHaveBeenCalledWith(
      `MongoDB connected: ${mockHost}`
    );
  });

  it("should handle connection errors and exit process", async () => {
    // Mock connection failure
    const errorMessage = "Test connection error";
    mongoose.connect.mockRejectedValue(new Error(errorMessage));

    // Execute the function
    await connectDB();

    // Assertions
    expect(console.error).toHaveBeenCalledWith(
      `Error: ${errorMessage}`
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
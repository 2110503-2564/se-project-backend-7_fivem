const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");

//load env vars
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: "./config/.env.test" });
} else {
  dotenv.config({ path: "./config/config.env" });
}

connectDB();

//Route files
const campgrounds = require("./routes/campgrounds");
const bookings = require("./routes/bookings");
const auth = require("./routes/auth");
// เพิ่ม
const paymentmethod = require("./routes/paymentmethod");
const transaction = require("./routes/transaction");

const app = express();

//body parser
app.use(express.json());

//cookie parser
app.use(cookieParser());

//Sanitize data
app.use(mongoSanitize());

//Set security headers
app.use(helmet());

//Prevent XSS attacks
app.use(xss());

//Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 10 mins
  max: 1000,
});
app.use(limiter);

//Prevent http param pollutions
app.use(hpp());

//Enable CORS
app.use(cors());

//Swagger options
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Campground Booking API",
      version: "1.0.0",
      description: "A simple Express Campground Booking API",
    },
    servers: [
      {
        url: "http://localhost:5003/api/v1",
      },
      {
        url: "https://your-vercel-app-url.vercel.app/api/v1",
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs));

//Mount routers
app.use("/api/v1/bookings", bookings);
app.use("/api/v1/campgrounds", campgrounds);
app.use("/api/v1/auth", auth);
app.use("/api/v1/paymentmethod", paymentmethod);
app.use("/api/v1/transaction", transaction);

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
    );
  });

  process.on("unhandledRejection", (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

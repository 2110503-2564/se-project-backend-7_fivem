const Booking = require("../models/Booking");
const Campground = require("../models/Campground");
const schedule = require("node-schedule");
const Transaction = require("../models/Transaction");

//@desc     Get all bookings
//@route    GET /api/v1/bookings
//@access   Public
exports.getBookings = async (req, res, next) => {
  let query;
  //General users can see only their bookings!
  if (req.user.role !== "admin") {
    query = Booking.find({ user: req.user.id }).populate({
      path: "campground",
      select: "name province tel",
    });
  } else {
    //If you are an admin, you can see all!
    if (req.params.campgroundId) {
      console.log(req.params.campgroundId);
      query = Booking.find({ campground: req.params.campgroundId }).populate({
        path: "campground",
        select: "name province tel",
      });
    } else
      query = Booking.find().populate({
        path: "campground",
        select: "name province tel",
      });
  }
  try {
    const bookings = await query;
    res
      .status(200)
      .json({ success: true, count: bookings.length, data: bookings });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Booking" });
  }
};

//@desc     Get single booking
//@route    GET /api/v1/bookings/:id
//@access   Public
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: "campground",
      select: "name province tel",
    });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No Booking with the id of ${req.params.id}`,
      });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Cannot find Booking" });
  }
};

//@desc     Add booking
//@route    POST /api/v1/campgrounds/:campgroundId/bookings
//@access   Private
exports.addBooking = async (req, res, next) => {
  try {
    req.body.campground = req.params.campgroundId;

    const campground = await Campground.findById(req.params.campgroundId);
    if (!campground) {
      return res.status(404).json({
        success: false,
        message: `No Campground with the id of ${req.params.campgroundId}`,
      });
    }

    // add user Id to req.body
    req.body.user = req.user.id;

    // Check for existed booking
    const existedBooking = await Booking.find({ user: req.user.id });

    // Prevent bookings on past dates
    const bookDate = new Date(req.body.apptDate);
    if (bookDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot book a past date",
      });
    }

    // Limit for non-admin users
    if (req.user.role !== "admin" && existedBooking.length >= 3) {
      return res.status(400).json({
        success: false,
        message: `The user with id of ${req.user.id} has only made 3 bookings`,
      });
    }
    if (!req.body.paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    // สร้าง booking
    const booking = await Booking.create(req.body);

    // สร้าง transaction ทันทีหลัง booking สำเร็จ
    const transaction = await Transaction.create({
      user: req.user.id,
      booking: booking._id,
      campground: req.params.campgroundId,
      paymentMethod: req.body.paymentMethod, // ต้องแน่ใจว่าใน req.body มี paymentMethod มาด้วยนะ
      amount: campground.price, // และ amount เช่นกัน
      paidAt: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        booking,
        transaction,
      },
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Cannot create Booking" });
  }
};

//@desc     Update booking
//@route    PUT /api/v1/bookings/:id
//@access   Private
exports.updateBooking = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No Booking with the id of ${req.params.id}`,
      });
    }

    //Make sure user is booking owner
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this booking`,
      });
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Cannot update Booking" });
  }
};

//@desc     Delete booking
//@route    DELETE /api/v1/bookings/:id
//@access   Private
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No Booking with the id of ${req.params.id}`,
      });
    }

    //Make sure user is booking owner
    if (booking.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this booking`,
      });
    }
    
    await Transaction.deleteOne({ booking: booking._id });
    await booking.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Cannot delete Booking" });
  }
};

// Additional requirement
const deleteExpiredBookings = async () => {
  try {
    const now = new Date();
    const expiredBookings = await Booking.find({ apptDate: { $lt: now } });

    if (expiredBookings.length > 0) {
      await Booking.deleteMany({ apptDate: { $lt: now } });
      console.log(`Deleted ${expiredBookings.length} expired bookings.`);
    } else {
      console.log("No expired bookings found.");
    }
  } catch (err) {
    console.error("Error deleting expired bookings:", err);
  }
};
// Set the function to run every day at 00:00.
schedule.scheduleJob("0 0 * * *", deleteExpiredBookings);
// Additional requirement
